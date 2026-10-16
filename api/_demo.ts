/*
 * Sample traffic for the /admin dashboard (demos and screenshots).
 *
 * Simulates 79 people using Pawnce since analytics went live (5 Oct 2026): visits, games,
 * hints, mistakes, words, flash cards. Nothing is written to the database:
 * the events are replayed into memory and added to the real numbers when the
 * ANALYTICS_DEMO=1 environment variable is set. Remove that variable to go
 * back to real data only.
 *
 * The same seed gives the same people, so numbers stay steady between
 * refreshes; today's activity fills in as the hours pass (events "in the
 * future" are left out).
 */
import { eventCommands, memoryStore, readStats, type Stats, type TrackBody } from './analytics.js'

const PEOPLE = 79
const DAY = 86_400_000
/** Analytics went live on 5 Oct 2026 (06:32 UTC): no sample activity before that. */
const LAUNCH = Date.parse('2026-10-05T06:32:00Z')

/** Small seeded random generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rand = () => number
const pick = <T extends string>(r: Rand, weights: Record<T, number>): T => {
  const entries = Object.entries(weights) as [T, number][]
  let x = r() * entries.reduce((s, [, w]) => s + w, 0)
  for (const [k, w] of entries) if ((x -= w) < 0) return k
  return entries[entries.length - 1][0]
}
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
const id = (r: Rand) => Math.floor(r() * 2 ** 48).toString(36)

const COUNTRIES = { IN: 30, US: 17, GB: 8, DE: 5, CA: 5, BR: 4, AU: 4, AE: 3, FR: 3, NL: 2, SG: 2, ES: 2, PL: 2, NG: 2, PH: 2, IT: 2, SE: 1, JP: 1 }
const DEVICES = { phone: 62, desktop: 30, tablet: 8 }
const WIDTH = { phone: 390, tablet: 820, desktop: 1440 }
const REFS = {
  direct: 60,
  'https://www.linkedin.com/': 20,
  'https://x.com/': 11,
  'https://www.reddit.com/': 9,
}
const BOTS = { ant: 48, frog: 37, jaguar: 15 }
const SIDES = { white: 50, random: 30, black: 20 }
const CLOCKS = { none: 55, 'rapid-10': 12, 'blitz-5': 10, 'blitz-3': 8, 'rapid-15': 4, 'classical-30': 4, 'bullet-1': 4, 'bullet-2': 3 }
const RESULTS: Record<string, Record<'win' | 'loss' | 'draw', number>> = {
  ant: { win: 62, loss: 28, draw: 10 },
  frog: { win: 38, loss: 52, draw: 10 },
  jaguar: { win: 12, loss: 82, draw: 6 },
}
const DRAWS = { threefold: 35, stalemate: 30, insufficient: 25, 'fifty-moves': 10 }
const SLIPS = { inaccuracy: 45, mistake: 33, blunder: 22 }
/** Words in roughly the order a beginner meets them. */
const WORDS = [
  'pawn', 'knight', 'bishop', 'capture', 'check', 'opening', 'development', 'center', 'castling', 'kingside-castling',
  'rook', 'queen', 'king', 'trade', 'hanging-piece', 'book', 'best', 'inaccuracy', 'mistake', 'blunder',
  'fork', 'material', 'piece-values', 'minor-piece', 'pin', 'checkmate', 'middlegame', 'miss', 'major-piece', 'promotion',
  'queenside-castling', 'skewer', 'discovered-attack', 'passed-pawn', 'endgame', 'mate-threat', 'battery', 'fianchetto', 'open-file', 'doubled-pawns',
  'back-rank-mate', 'resign', 'bishop-pair', 'isolated-pawn', 'en-passant', 'sacrifice', 'connected-rooks', 'outpost', 'the-exchange', 'pawn-chain',
  'double-check', 'discovered-check', 'removing-the-defender', 'seventh-rank', 'stalemate', 'trapped-piece', 'rook-endgame', 'threefold', 'brilliant', 'scholars-mate',
]

type Ev = { t: number; c: string; body: TrackBody }

/** Every sample event up to `now`, oldest first. */
export function demoEvents(now: number): Ev[] {
  const today = Math.floor(now / DAY) * DAY
  const launchDay = Math.floor(LAUNCH / DAY) * DAY
  const span = Math.max(0, Math.round((today - launchDay) / DAY))
  const out: Ev[] = []
  for (let i = 0; i < PEOPLE; i++) {
    const r = rng(7919 * (i + 1))
    const vid = `demo-${id(r)}`
    const country = pick(r, COUNTRIES)
    const device = pick(r, DEVICES)
    const w = WIDTH[device] + int(r, -20, 20)
    const skill = r()
    // More people arrive in recent days (the app is growing).
    const firstDay = today - Math.min(span, Math.floor((span + 1) * r() ** 1.2)) * DAY
    const keen = r()
    const visits = keen < 0.42 ? 1 : keen < 0.72 ? int(r, 2, 3) : keen < 0.94 ? int(r, 4, 8) : int(r, 9, 15)
    const plays = r() < 0.83
    const evening = r() < 0.6
    let learned = 0
    let day = firstDay
    let themed = false
    for (let v = 0; v < visits && day <= today; v++) {
      let hour = evening ? int(r, 16, 23) : int(r, 6, 22)
      // Today: a first visit lands in the hours already passed (so everyone shows up); a return visit later today just hasn't happened yet.
      if (day === today && v === 0) hour = Math.min(hour, Math.max(0, Math.floor((now - today) / 3_600_000) - 1))
      // Launch day: only after it went live.
      if (day === launchDay) hour = Math.max(hour, 7)
      let t = day + hour * 3_600_000 + int(r, 0, 59) * 60_000
      const sid = id(r)
      const send = (e: string, p: TrackBody['p'] = {}) => {
        out.push({ t, c: country, body: { e, p, vid, sid, w } })
        t += int(r, 20, 90) * 1000
      }
      const page = (path: string, first = false) =>
        send('page_view', { path, first, ...(first && v === 0 ? { ref: pick(r, REFS) } : {}) })

      page('/', true)
      if (!themed && r() < 0.12) {
        send('theme', { to: r() < 0.75 ? 'dark' : 'light' })
        themed = true
      }
      if (r() < 0.12) {
        send('report_open')
        page('/report')
        page('/')
      }
      const games = plays ? (v === 0 ? int(r, 1, 3) : int(r, 0, 4)) : 0
      for (let g = 0; g < games; g++) {
        const bot = skill > 0.7 && r() < 0.5 ? (r() < 0.5 ? 'jaguar' : 'frog') : pick(r, BOTS)
        const tc = pick(r, CLOCKS)
        send('game_start', { bot, side: pick(r, SIDES), tc })
        page('/play')
        const moves = int(r, 16, 62)
        const hints = r() < 0.55 ? int(r, 1, 2) : 0
        for (let k = 0; k < hints; k++) send('hint')
        const fresh = learned < WORDS.length ? int(r, learned < 12 ? 3 : 1, learned < 12 ? 6 : 3) : 0
        for (let k = 0; k < fresh && learned < WORDS.length; k++) {
          const word = WORDS[learned++]
          send('word_new', { id: word })
          if (r() < 0.45) send('word_pause', { id: word })
        }
        for (let k = int(r, 0, 2); k > 0; k--) send('word_open', { id: WORDS[int(r, 0, Math.max(0, learned - 1))] })
        const slips = int(r, 0, skill < 0.4 ? 4 : 2)
        for (let k = 0; k < slips; k++) send('slip', { q: pick(r, SLIPS) })
        if (r() < 0.25) for (let k = int(r, 1, 2); k > 0; k--) send('takeback')
        // A few games are left unfinished.
        if (r() < 0.2) continue
        const odds = { ...RESULTS[bot] }
        odds.win *= 0.6 + skill * 0.8
        const result = pick(r, odds)
        const reason =
          result === 'draw'
            ? pick(r, DRAWS)
            : pick(r, tc === 'none' ? { checkmate: 64, resignation: 36, timeout: 0 } : { checkmate: 52, resignation: 30, timeout: 18 })
        const secsPerMove = tc === 'none' ? int(r, 10, 26) : tc.startsWith('bullet') ? int(r, 1, 2) : tc.startsWith('blitz') ? int(r, 3, 6) : int(r, 8, 18)
        const ms = moves * secsPerMove * 1000
        t += ms
        send('game_end', { bot, result, reason, moves, ms })
        if (r() < 0.7) {
          page('/game/x/summary')
          if (r() < 0.38) {
            send('deck_open', { n: int(r, 3, 8) })
            if (r() < 0.6) {
              const total = 5
              send('quiz_done', { score: Math.min(total, int(r, 2, 5) + (skill > 0.6 ? 1 : 0)), total })
            }
          }
        }
      }
      if (r() < 0.22) {
        page('/words')
        if (r() < 0.6) page(`/words/${WORDS[int(r, 0, Math.max(0, learned - 1))]}`)
        if (r() < 0.4) send('deck_open', { n: int(r, 5, 12) })
      }
      if (r() < 0.14) page('/games')
      // Next visit: often the next day or two, sometimes a week later.
      day += (r() < 0.6 ? int(r, 1, 2) : int(r, 3, 7)) * DAY
    }
  }
  return out.filter((e) => e.t >= LAUNCH && e.t <= now).sort((a, b) => a.t - b.t)
}

/** The dashboard's numbers for the sample traffic alone. */
export async function demoStats(days: number, now: number): Promise<Stats> {
  const store = memoryStore()
  const cmds: (string | number)[][] = []
  for (const ev of demoEvents(now)) cmds.push(...(eventCommands(ev.body, { now: ev.t, country: ev.c }) ?? []))
  await store.run(cmds)
  return readStats(store, days, now)
}
