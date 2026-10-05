/*
 * Pawnce analytics: one Vercel Function, no personal data.
 *
 *   POST /api/analytics          the app records an event (page view, game start, …)
 *   GET  /api/analytics?days=30  the /admin dashboard reads the numbers
 *                                (needs "Authorization: Bearer <ADMIN_PASSWORD>")
 *
 * Storage: daily counters in Upstash Redis (free tier), added to the Vercel
 * project from the Marketplace (it sets KV_REST_API_URL / KV_REST_API_TOKEN).
 * Unique visitors are counted with HyperLogLog, so no list of visitor ids is
 * ever stored. No IP addresses are kept: only the country Vercel already
 * knows, and the screen size class (phone / tablet / desktop).
 */

/** Anything that runs Redis commands in one round trip. */
export type Store = { run(cmds: (string | number)[][]): Promise<unknown[]> }

const PREFIX = 'pc'
const KEEP_SECONDS = 400 * 24 * 3600

/** Events the app may send, and the properties each one may carry. */
const EVENTS: Record<string, string[]> = {
  page_view: ['path', 'first', 'ref'],
  game_start: ['bot', 'side', 'tc'],
  game_end: ['bot', 'result', 'reason', 'moves', 'ms'],
  hint: [],
  takeback: [],
  slip: ['q'],
  word_new: ['id'],
  word_open: ['id'],
  word_pause: ['id'],
  deck_open: ['from', 'n'],
  quiz_done: ['score', 'total'],
  report_open: [],
  theme: ['to'],
}

export type TrackBody = {
  e: string
  p?: Record<string, string | number | boolean>
  vid: string
  sid: string
  /** Viewport width, for phone / tablet / desktop. */
  w?: number
}

const clean = (v: unknown, max = 60) =>
  String(v ?? '')
    .replace(/[^\w\-./:@ ]/g, '')
    .slice(0, max)

const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10)

/** /game/abc123/summary → /game/*\/summary, /words/fork → /words/* (pages, not ids). */
export function normalizePath(path: string): string {
  const p = clean(path, 80) || '/'
  if (/^\/game\/[^/]+\/summary/.test(p)) return '/game/*/summary'
  if (/^\/words\/.+/.test(p)) return '/words/*'
  return p
}

const deviceOf = (w?: number) => (!w ? 'unknown' : w < 600 ? 'phone' : w < 1024 ? 'tablet' : 'desktop')

/** The Redis commands that record one event. */
export function eventCommands(body: TrackBody, ctx: { now: number; country: string }): (string | number)[][] | null {
  const allowed = EVENTS[body.e]
  if (!allowed || !body.vid || !body.sid) return null
  const p: Record<string, string> = {}
  for (const k of allowed) if (body.p && body.p[k] !== undefined) p[k] = clean(body.p[k])
  const day = dayOf(ctx.now)
  const h = `${PREFIX}:d:${day}`
  const vid = clean(body.vid, 40)
  const sid = clean(body.sid, 40)
  const inc = (field: string, by = 1) => ['HINCRBY', h, field, by]
  const cmds: (string | number)[][] = [inc(`e:${body.e}`)]
  const num = (k: string) => Math.max(0, Math.min(10_000_000, Math.round(Number(p[k]) || 0)))

  switch (body.e) {
    case 'page_view': {
      cmds.push(inc(`p:${normalizePath(p.path)}`), inc(`dev:${deviceOf(body.w)}`))
      if (p.first === 'true') {
        cmds.push(inc(`c:${clean(ctx.country, 2) || '??'}`), inc('sessions'))
        let ref = 'direct'
        try {
          if (p.ref) ref = new URL(p.ref).hostname.replace(/^www\./, '') || 'direct'
        } catch {
          ref = 'direct'
        }
        cmds.push(inc(`ref:${ref}`))
      }
      cmds.push(['PFADD', `${PREFIX}:uv:${day}`, vid], ['PFADD', `${PREFIX}:us:${day}`, sid])
      break
    }
    case 'game_start':
      cmds.push(inc(`bot:${p.bot}`), inc(`side:${p.side}`), inc(`tc:${p.tc}`), ['PFADD', `${PREFIX}:up:${day}`, vid])
      break
    case 'game_end':
      cmds.push(
        inc(`res:${p.result}`),
        inc(`reason:${p.reason}`),
        inc(`botres:${p.bot}:${p.result}`),
        inc('sum:moves', num('moves')),
        inc('sum:secs', Math.round(num('ms') / 1000)),
        ['PFADD', `${PREFIX}:uf:${day}`, vid],
      )
      break
    case 'slip':
      cmds.push(inc(`q:${p.q}`))
      break
    case 'word_new':
      cmds.push(inc(`w:${p.id}`))
      break
    case 'word_open':
    case 'word_pause':
      cmds.push(inc(`wo:${p.id}`))
      break
    case 'deck_open':
      cmds.push(inc(`deck:${p.from}`), ['PFADD', `${PREFIX}:ud:${day}`, vid])
      break
    case 'quiz_done':
      cmds.push(inc('sum:quiz_score', num('score')), inc('sum:quiz_total', num('total')))
      break
    case 'theme':
      cmds.push(inc(`theme:${p.to}`))
      break
  }
  for (const set of ['d', 'uv', 'us', 'up', 'uf', 'ud']) cmds.push(['EXPIRE', `${PREFIX}:${set}:${day}`, KEEP_SECONDS])
  // A short live feed for the dashboard (no ids in it).
  const feed = JSON.stringify({ t: ctx.now, e: body.e, p, c: clean(ctx.country, 2), dev: deviceOf(body.w) })
  cmds.push(['LPUSH', `${PREFIX}:recent`, feed], ['LTRIM', `${PREFIX}:recent`, 0, 99])
  return cmds
}

export type DayStats = { day: string; h: Record<string, number>; visitors: number; sessions: number; players: number }

export type Stats = {
  days: DayStats[]
  /** Unique across the whole range. */
  visitors: number
  players: number
  finishers: number
  deckUsers: number
  /** Every counter summed over the range. */
  totals: Record<string, number>
  recent: { t: number; e: string; p: Record<string, string>; c: string; dev: string }[]
}

/** The dashboard's numbers for the last `days` days (today included). */
export async function readStats(store: Store, days: number, now: number): Promise<Stats> {
  const list = Array.from({ length: days }, (_, i) => dayOf(now - (days - 1 - i) * 86_400_000))
  const k = (set: string) => list.map((d) => `${PREFIX}:${set}:${d}`)
  const cmds: (string | number)[][] = [
    ...list.map((d) => ['HGETALL', `${PREFIX}:d:${d}`]),
    ...k('uv').map((key) => ['PFCOUNT', key]),
    ...k('us').map((key) => ['PFCOUNT', key]),
    ...k('up').map((key) => ['PFCOUNT', key]),
    ['PFCOUNT', ...k('uv')],
    ['PFCOUNT', ...k('up')],
    ['PFCOUNT', ...k('uf')],
    ['PFCOUNT', ...k('ud')],
    ['LRANGE', `${PREFIX}:recent`, 0, 49],
  ]
  const out = await store.run(cmds)
  const n = list.length
  const toMap = (v: unknown): Record<string, number> => {
    // Upstash returns HGETALL as [field, value, field, value, …]
    const m: Record<string, number> = {}
    if (Array.isArray(v)) for (let i = 0; i < v.length; i += 2) m[String(v[i])] = Number(v[i + 1]) || 0
    else if (v && typeof v === 'object') for (const [f, x] of Object.entries(v)) m[f] = Number(x) || 0
    return m
  }
  const totals: Record<string, number> = {}
  const daysOut = list.map((day, i) => {
    const h = toMap(out[i])
    for (const [f, x] of Object.entries(h)) totals[f] = (totals[f] ?? 0) + x
    return { day, h, visitors: Number(out[n + i]) || 0, sessions: Number(out[2 * n + i]) || 0, players: Number(out[3 * n + i]) || 0 }
  })
  const recentRaw = (out[4 * n + 4] as string[] | null) ?? []
  const recent = recentRaw.flatMap((s) => {
    try {
      return [JSON.parse(s)]
    } catch {
      return []
    }
  })
  return {
    days: daysOut,
    visitors: Number(out[4 * n]) || 0,
    players: Number(out[4 * n + 1]) || 0,
    finishers: Number(out[4 * n + 2]) || 0,
    deckUsers: Number(out[4 * n + 3]) || 0,
    totals,
    recent,
  }
}

/** Upstash Redis over its REST API (one pipeline request per call). */
export function upstashStore(env: Record<string, string | undefined>): Store | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return {
    async run(cmds) {
      const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cmds),
      })
      if (!res.ok) throw new Error(`Upstash ${res.status}`)
      const data = (await res.json()) as { result?: unknown; error?: string }[]
      return data.map((d) => d.result ?? null)
    },
  }
}

/** A tiny in-memory Redis for local development and tests. */
export function memoryStore(): Store {
  const hashes = new Map<string, Map<string, number>>()
  const sets = new Map<string, Set<string>>()
  const lists = new Map<string, string[]>()
  return {
    async run(cmds) {
      return cmds.map(([cmd, key, ...args]) => {
        const k = String(key)
        switch (cmd) {
          case 'HINCRBY': {
            const h = hashes.get(k) ?? new Map<string, number>()
            hashes.set(k, h)
            const v = (h.get(String(args[0])) ?? 0) + Number(args[1])
            h.set(String(args[0]), v)
            return v
          }
          case 'HGETALL':
            return [...(hashes.get(k) ?? new Map()).entries()].flat()
          case 'PFADD': {
            const s = sets.get(k) ?? new Set<string>()
            sets.set(k, s)
            const before = s.size
            for (const a of args) s.add(String(a))
            return s.size > before ? 1 : 0
          }
          case 'PFCOUNT': {
            const all = new Set<string>()
            for (const kk of [k, ...args.map(String)]) for (const v of sets.get(kk) ?? []) all.add(v)
            return all.size
          }
          case 'LPUSH': {
            const l = lists.get(k) ?? []
            lists.set(k, l)
            l.unshift(...args.map(String).reverse())
            return l.length
          }
          case 'LTRIM': {
            const l = lists.get(k) ?? []
            lists.set(k, l.slice(Number(args[0]), Number(args[1]) + 1))
            return 'OK'
          }
          case 'LRANGE':
            return (lists.get(k) ?? []).slice(Number(args[0]), Number(args[1]) + 1)
          case 'EXPIRE':
            return 1
          default:
            throw new Error(`memoryStore: ${String(cmd)} not supported`)
        }
      })
    },
  }
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Equal-time string compare, so the password can't be guessed by timing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The whole API, with the store and settings passed in (so tests and local dev can use memory). */
export async function handle(request: Request, env: Record<string, string | undefined>, store: Store | null, now = Date.now()): Promise<Response> {
  if (request.method === 'POST') {
    // Recording never fails loudly: analytics must not break the app.
    if (!store) return new Response(null, { status: 204 })
    try {
      const text = await request.text()
      if (text.length > 2000) return new Response(null, { status: 204 })
      const body = JSON.parse(text) as TrackBody
      const cmds = eventCommands(body, { now, country: request.headers.get('x-vercel-ip-country') ?? '' })
      if (cmds) await store.run(cmds)
    } catch {
      // ignore bad or failed events
    }
    return new Response(null, { status: 204 })
  }
  if (request.method === 'GET') {
    const password = env.ADMIN_PASSWORD
    if (!password) return json(503, { error: 'setup', missing: ['ADMIN_PASSWORD', ...(store ? [] : ['database'])] })
    const auth = request.headers.get('authorization') ?? ''
    if (!same(auth, `Bearer ${password}`)) return json(401, { error: 'password' })
    if (!store) return json(503, { error: 'setup', missing: ['database'] })
    const days = Math.max(1, Math.min(90, Number(new URL(request.url).searchParams.get('days')) || 30))
    return json(200, await readStats(store, days, now))
  }
  return new Response(null, { status: 405 })
}

// Vercel Function entry points (Web Request/Response handlers).
export function POST(request: Request) {
  return handle(request, process.env, upstashStore(process.env))
}
export function GET(request: Request) {
  return handle(request, process.env, upstashStore(process.env))
}
