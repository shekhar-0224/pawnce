import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { WORDS_BY_ID } from '../chess/glossary'
import { BOTS, type BotId } from '../engine/bots'
import { setTrackingOff, trackingOff } from '../analytics/track'
import { formatDuration } from '../storage/stats'
import { Button } from './Button'
import { TopBar } from './TopBar'

/*
 * /admin: the owner's dashboard. Traffic and product usage from the
 * anonymous events in api/analytics.ts, behind a password (ADMIN_PASSWORD in
 * Vercel). Mobile first; every chart has its numbers in reach.
 */

type DayStats = { day: string; h: Record<string, number>; visitors: number; sessions: number; players: number }
type Stats = {
  days: DayStats[]
  visitors: number
  players: number
  finishers: number
  deckUsers: number
  totals: Record<string, number>
  recent: { t: number; e: string; p: Record<string, string>; c: string; dev: string }[]
}

const KEY = 'pawnce.adminKey'
const RANGES = [7, 30, 90] as const

const EVENT_LABEL: Record<string, string> = {
  page_view: 'Page view',
  game_start: 'Game started',
  game_end: 'Game finished',
  hint: 'Hint used',
  takeback: 'Take back',
  slip: 'Mistake card',
  word_new: 'New word met',
  word_open: 'Word opened',
  word_pause: 'Word card pause',
  deck_open: 'Flash cards opened',
  quiz_done: 'Quiz finished',
  report_open: 'Report card opened',
  theme: 'Theme changed',
}

const countryName = (() => {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    return (code: string) => (code && code !== '??' ? (names.of(code) ?? code) : 'Unknown')
  } catch {
    return (code: string) => code || 'Unknown'
  }
})()

const fmt = (n: number) => n.toLocaleString('en')
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–')
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

/** All counters with a prefix, as [name, value] sorted by value. */
function group(totals: Record<string, number>, prefix: string): [string, number][] {
  return Object.entries(totals)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => [k.slice(prefix.length), v] as [string, number])
    .sort((a, b) => b[1] - a[1])
}

function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`card flex min-w-0 flex-col gap-3 p-4 ${className}`}>
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-muted">{title}</h2>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="text-2xl font-black leading-tight tabular-nums">{value}</p>
      {sub && <p className="truncate text-[11px] font-bold text-muted">{sub}</p>}
    </div>
  )
}

/** One measure per day as thin bars (one hue), with a hover / tap tooltip. */
function DailyBars({ days, value, color, label }: { days: DayStats[]; value: (d: DayStats) => number; color: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const values = days.map(value)
  const max = Math.max(1, ...values)
  const W = 600
  const H = 140
  const gap = days.length > 40 ? 1 : 2
  const bw = (W - gap * (days.length - 1)) / days.length
  const h = hover !== null ? days[hover] : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={`${label} per day, highest ${max}`} onMouseLeave={() => setHover(null)}>
        {/* recessive gridline at the max, labelled */}
        <line x1="0" x2={W} y1="0.5" y2="0.5" stroke="var(--border)" strokeDasharray="3 4" />
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--border)" />
        {values.map((v, i) => {
          const bh = v > 0 ? Math.max(3, (v / max) * (H - 6)) : 0
          const x = i * (bw + gap)
          return (
            <g key={days[i].day}>
              {bh > 0 && <rect x={x} y={H - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {/* a hit target taller and wider than the bar */}
              <rect x={x - gap / 2} y={0} width={bw + gap} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                <title>{`${shortDay(days[i].day)}: ${v}`}</title>
              </rect>
            </g>
          )
        })}
        <text x="0" y={H + 14} fontSize="11" fill="var(--text-muted)" fontWeight="700">
          {shortDay(days[0].day)}
        </text>
        <text x={W} y={H + 14} fontSize="11" fill="var(--text-muted)" fontWeight="700" textAnchor="end">
          {shortDay(days[days.length - 1].day)}
        </text>
      </svg>
      <p className="absolute right-0 top-0 -translate-y-full pb-0.5 text-[10px] font-bold tabular-nums text-muted">max {max}</p>
      {h && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-text px-2.5 py-1 text-xs font-bold text-bg shadow-lg">
          {shortDay(h.day)} · {fmt(values[hover!])} {label.toLowerCase()}
        </div>
      )}
    </div>
  )
}

/** A ranked list with a thin share bar under each row. */
function BarList({ rows, total, empty = 'No data yet.', color = 'var(--info)' }: { rows: [string, number][]; total?: number; empty?: string; color?: string }) {
  const sum = total ?? rows.reduce((s, [, v]) => s + v, 0)
  if (!rows.length) return <p className="text-sm font-bold text-muted">{empty}</p>
  const max = Math.max(...rows.map(([, v]) => v))
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(([name, v]) => (
        <li key={name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-bold">{name}</span>
            <span className="shrink-0 font-bold tabular-nums text-muted">
              {fmt(v)} <span className="text-xs">· {pct(v, sum)}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function AdminPage() {
  const [key, setKey] = useState<string>(() => {
    try {
      return sessionStorage.getItem(KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [draft, setDraft] = useState('')
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'wrong' | 'setup' | 'error'>('idle')
  const [missing, setMissing] = useState<string[]>([])
  const [countMe, setCountMe] = useState(() => !trackingOff())
  const [showTable, setShowTable] = useState(false)

  const load = useCallback(
    async (k: string, days: number) => {
      setState('loading')
      try {
        const res = await fetch(`/api/analytics?days=${days}`, { headers: { Authorization: `Bearer ${k}` } })
        if (res.status === 401) {
          setState('wrong')
          setKey('')
          sessionStorage.removeItem(KEY)
          return
        }
        if (res.status === 503) {
          const body = (await res.json().catch(() => ({}))) as { missing?: string[] }
          setMissing(body.missing ?? [])
          setState('setup')
          return
        }
        if (!res.ok) throw new Error(String(res.status))
        setStats((await res.json()) as Stats)
        setState('idle')
        sessionStorage.setItem(KEY, k)
        // Signing in means this is the owner's browser: stop counting it (it can be switched back on).
        if (localStorage.getItem('pawnce.ownerSeen') !== '1') {
          localStorage.setItem('pawnce.ownerSeen', '1')
          setTrackingOff(true)
          setCountMe(false)
        }
      } catch {
        setState('error')
      }
    },
    [],
  )

  useEffect(() => {
    if (key) void load(key, range)
  }, [key, range, load])

  if (!key || state === 'wrong') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-4">
        <TopBar title="Analytics" />
        <form
          className="card mt-6 flex flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft) {
              setState('idle')
              setKey(draft)
            }
          }}
        >
          <h2 className="text-lg font-black">Owner dashboard</h2>
          <p className="text-sm font-bold text-muted">Traffic and usage for Pawnce. Enter your admin password.</p>
          <input
            type="password"
            autoComplete="current-password"
            aria-label="Admin password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-11 rounded-xl border-2 border-border bg-surface px-3 font-bold outline-none focus:border-accent"
          />
          {state === 'wrong' && <p className="text-sm font-bold text-danger">That password didn’t work.</p>}
          <Button variant="primary" type="submit" className="uppercase">
            Open dashboard
          </Button>
        </form>
      </div>
    )
  }

  if (state === 'setup') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4">
        <TopBar title="Analytics" />
        <section className="card mt-6 flex flex-col gap-3 p-5 text-sm">
          <h2 className="text-lg font-black">Almost there</h2>
          <p className="font-bold text-muted">The dashboard needs two things in your Vercel project:</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 font-bold">
            <li className={missing.includes('database') ? '' : 'text-muted line-through'}>
              A free Upstash Redis database: Vercel → your project → Storage → Create → Upstash (Redis) → connect it to the project.
            </li>
            <li className={missing.includes('ADMIN_PASSWORD') ? '' : 'text-muted line-through'}>
              An <code>ADMIN_PASSWORD</code> environment variable (Settings → Environment Variables).
            </li>
          </ol>
          <p className="font-bold text-muted">Then redeploy (Deployments → ⋯ → Redeploy) and reload this page.</p>
        </section>
      </div>
    )
  }

  const t = stats?.totals ?? {}
  const days = stats?.days ?? []
  const started = t['e:game_start'] ?? 0
  const finished = t['e:game_end'] ?? 0
  const sessions = t['sessions'] ?? days.reduce((s, d) => s + d.sessions, 0)
  const avgGame = finished ? ((t['sum:secs'] ?? 0) * 1000) / finished : 0
  const botName = (id: string) => BOTS[id as BotId]?.name ?? id
  const RESULT_COLOR: Record<string, string> = { win: 'var(--accent)', draw: 'var(--warn)', loss: 'var(--danger)' }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10">
      <TopBar title="Analytics" />

      {/* Filters: one row above the charts */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Date range" className="flex gap-1 rounded-2xl bg-surface-2 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`min-h-9 cursor-pointer rounded-xl px-3 text-xs font-extrabold ${range === r ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
            >
              {r} days
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={countMe}
              onChange={(e) => {
                setCountMe(e.target.checked)
                setTrackingOff(!e.target.checked)
              }}
            />
            Count my visits
          </label>
          <Button className="min-h-9 px-3 text-xs" onClick={() => void load(key, range)} disabled={state === 'loading'}>
            {state === 'loading' ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {state === 'error' && <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm font-bold text-danger">Couldn’t load the numbers. Try Refresh.</p>}

      {!stats ? (
        <p className="text-sm font-bold text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-2 min-[700px]:grid-cols-4">
            <Kpi label="Visitors" value={fmt(stats.visitors)} sub={`${plural(sessions, 'visit')} · ${plural(t['e:page_view'] ?? 0, 'page view')}`} />
            <Kpi label="Players" value={fmt(stats.players)} sub={`${pct(stats.players, stats.visitors)} of visitors played`} />
            <Kpi label="Games" value={fmt(started)} sub={`${fmt(finished)} finished · ${pct(finished, started)}`} />
            <Kpi label="Avg game" value={finished ? formatDuration(avgGame) : '–'} sub={finished ? plural(Math.round((t['sum:moves'] ?? 0) / finished), 'move') : undefined} />
            <Kpi label="Hints used" value={fmt(t['e:hint'] ?? 0)} sub={started ? `${((t['e:hint'] ?? 0) / started).toFixed(1)} per game` : undefined} />
            <Kpi label="Take backs" value={fmt(t['e:takeback'] ?? 0)} />
            <Kpi label="Words met" value={fmt(t['e:word_new'] ?? 0)} sub={`${fmt(t['e:word_open'] ?? 0)} opened by tap`} />
            <Kpi
              label="Flash cards"
              value={fmt(t['e:deck_open'] ?? 0)}
              sub={t['sum:quiz_total'] ? `quiz ${pct(t['sum:quiz_score'] ?? 0, t['sum:quiz_total'])} right` : plural(stats.deckUsers, 'person', 'people')}
            />
          </div>

          <div className="grid gap-3 min-[900px]:grid-cols-2">
            <Card title="Visitors per day">
              <DailyBars days={days} value={(d) => d.visitors} color="var(--info)" label="Visitors" />
            </Card>
            <Card title="Games started per day">
              <DailyBars days={days} value={(d) => d.h['e:game_start'] ?? 0} color="var(--accent)" label="Games" />
            </Card>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setShowTable((v) => !v)} className="cursor-pointer text-xs font-extrabold text-info hover:underline">
              {showTable ? 'Hide daily table' : 'Show daily numbers as a table'}
            </button>
          </div>
          {showTable && (
            <div className="card overflow-x-auto p-2">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="text-muted">
                  <tr>
                    {['Day', 'Visitors', 'Visits', 'Players', 'Games', 'Finished', 'Hints'].map((h) => (
                      <th key={h} className="px-2 py-1 font-black">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => (
                    <tr key={d.day} className="border-t border-border font-bold">
                      <td className="px-2 py-1">{shortDay(d.day)}</td>
                      <td className="px-2 py-1">{d.visitors}</td>
                      <td className="px-2 py-1">{d.sessions}</td>
                      <td className="px-2 py-1">{d.players}</td>
                      <td className="px-2 py-1">{d.h['e:game_start'] ?? 0}</td>
                      <td className="px-2 py-1">{d.h['e:game_end'] ?? 0}</td>
                      <td className="px-2 py-1">{d.h['e:hint'] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-3 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-3">
            <Card title="Funnel (unique people)">
              <BarList
                total={stats.visitors}
                rows={[
                  ['Visited', stats.visitors],
                  ['Started a game', stats.players],
                  ['Finished a game', stats.finishers],
                  ['Opened flash cards', stats.deckUsers],
                ]}
                color="var(--learn)"
              />
            </Card>
            <Card title="Results">
              <ul className="flex flex-col gap-2">
                {(['win', 'draw', 'loss'] as const).map((r) => {
                  const v = t[`res:${r}`] ?? 0
                  return (
                    <li key={r} className="flex items-center justify-between gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: RESULT_COLOR[r] }} aria-hidden />
                        {r === 'win' ? 'Player won' : r === 'draw' ? 'Draw' : 'Bot won'}
                      </span>
                      <span className="tabular-nums text-muted">
                        {fmt(v)} · {pct(v, finished)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <BarList rows={group(t, 'reason:')} empty="No finished games yet." />
            </Card>
            <Card title="Opponents picked">
              <BarList rows={group(t, 'bot:').map(([k, v]) => [botName(k), v])} color="var(--accent)" />
            </Card>
            <Card title="Mistake cards">
              <BarList rows={group(t, 'q:')} color="var(--danger)" empty="No mistakes shown yet." />
            </Card>
            <Card title="Time controls">
              <BarList rows={group(t, 'tc:')} />
            </Card>
            <Card title="Devices">
              <BarList rows={group(t, 'dev:')} />
            </Card>
            <Card title="Countries">
              <BarList rows={group(t, 'c:').slice(0, 8).map(([k, v]) => [countryName(k), v])} />
            </Card>
            <Card title="Where visitors came from">
              <BarList rows={group(t, 'ref:').slice(0, 8)} />
            </Card>
            <Card title="Pages">
              <BarList rows={group(t, 'p:').slice(0, 8)} />
            </Card>
            <Card title="Words met most">
              <BarList rows={group(t, 'w:').slice(0, 8).map(([k, v]) => [WORDS_BY_ID[k]?.name ?? k, v])} color="var(--learn)" />
            </Card>
            <Card title="Words people opened">
              <BarList rows={group(t, 'wo:').slice(0, 8).map(([k, v]) => [WORDS_BY_ID[k]?.name ?? k, v])} color="var(--learn)" />
            </Card>
            <Card title="Live activity">
              {stats.recent.length === 0 ? (
                <p className="text-sm font-bold text-muted">Nothing yet.</p>
              ) : (
                <ul className="pawnce-scroll flex max-h-72 flex-col gap-1.5 overflow-y-auto text-sm">
                  {stats.recent.slice(0, 40).map((r, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-bold">
                        {EVENT_LABEL[r.e] ?? r.e}
                        <span className="font-semibold text-muted">
                          {r.p.path ? ` ${r.p.path}` : ''}
                          {r.p.bot ? ` · ${botName(r.p.bot)}` : ''}
                          {r.p.result ? ` · ${r.p.result}` : ''}
                          {r.p.id ? ` · ${WORDS_BY_ID[r.p.id]?.name ?? r.p.id}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-muted">
                        {r.c || '??'} · {r.dev} · {ago(r.t)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <p className="text-center text-[11px] font-bold text-muted">
            Anonymous: no names, emails or IP addresses. Unique counts are estimates (HyperLogLog, ±1%). Times in UTC.
          </p>
        </div>
      )}
    </div>
  )
}
