import { motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { BOTS } from '../engine/bots'
import { useLearned } from '../storage/learned'
import { loadRecentGames } from '../storage/recentGames'
import { formatDuration, loadStats } from '../storage/stats'
import { BotAvatar } from './BotAvatar'
import { TopBar } from './TopBar'
import { buildReport } from './report'

const RESULT_DOT = { win: 'bg-accent', draw: 'bg-warn', loss: 'bg-danger' } as const
const RESULT_WORD = { win: 'Win', draw: 'Draw', loss: 'Loss' } as const

/** One number. Phones: a row (label left, value right); wider: a small tile. */
function Stat({ label, value, sub, tone = 'text-text' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card flex min-w-0 items-center justify-between gap-2 px-3 py-2 min-[640px]:flex-col min-[640px]:items-start min-[640px]:justify-center min-[640px]:gap-0.5 min-[640px]:px-4 min-[640px]:py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.06em] text-muted">{label}</p>
        {sub && <p className="text-[10px] font-bold text-muted min-[640px]:hidden">{sub}</p>}
      </div>
      <p className={`shrink-0 whitespace-nowrap text-lg font-black leading-tight min-[640px]:text-2xl ${tone}`}>{value}</p>
      {sub && <p className="hidden text-xs font-bold text-muted min-[640px]:block">{sub}</p>}
    </div>
  )
}

/** /report: your report card — grade, results, time played, accuracy and more. */
export function ReportPage() {
  const learned = useLearned()
  const [games] = useState(loadRecentGames)
  const [stats] = useState(loadStats)
  const r = buildReport(games, stats, learned)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-4">
      <TopBar title="Report card" />

      {/* Compact bento so the whole report fits one screen. */}
      <div className="flex flex-col gap-3">
        <motion.section
          aria-label="Overall grade"
          className="card flex items-center gap-3 p-3 min-[640px]:p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-3xl font-black ${r.grade.tone}`}>{r.grade.letter}</span>
          <div className="min-w-0">
            <p className="font-black leading-tight">{r.grade.label}</p>
            <p className="text-xs font-bold text-muted min-[640px]:text-sm">
              {r.accuracy !== null
                ? `Accuracy ${r.accuracy}% over your last ${r.gradedGames} ${r.gradedGames === 1 ? 'game' : 'games'}.`
                : 'Finish a game to see your grade.'}
              {r.trend !== null && r.trend !== 0 && (
                <span className={r.trend > 0 ? 'text-accent' : 'text-danger'}>
                  {' '}
                  {r.trend > 0 ? `▲ ${r.trend} better` : `▼ ${-r.trend} lower`} lately.
                </span>
              )}
            </p>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4 min-[640px]:gap-3">
          <Stat label="Games" value={r.games} sub={`${r.results.win}W ${r.results.draw}D ${r.results.loss}L`} />
          <Stat label="Win rate" value={r.winRate !== null ? `${r.winRate}%` : '–'} tone="text-info" />
          <Stat label="Time" value={formatDuration(r.timeMs)} tone="text-warn" />
          <Stat label="Accuracy" value={r.accuracy !== null ? `${r.accuracy}%` : '–'} tone="text-accent" />
          <Stat label="Good moves" value={r.goodShare !== null ? `${r.goodShare}%` : '–'} />
          <Stat label="Slips/game" value={r.slipsPerGame ?? '–'} tone="text-danger" />
          <Stat label="Patterns" value={`${r.patterns.learned}/${r.patterns.total}`} tone="text-learn" />
          <Stat label="Openings" value={r.openings} />
        </div>

        <div className="grid gap-3 min-[640px]:grid-cols-2">
          <section aria-label="Record vs bots" className="card flex flex-col gap-2 p-3 min-[640px]:p-4">
            <h2 className="font-black">Record vs bots</h2>
            {r.byBot.length === 0 ? (
              <p className="text-sm font-bold text-muted">No games yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {r.byBot.map((b) => {
                  const n = b.win + b.draw + b.loss
                  return (
                    <li key={b.bot} className="flex items-center gap-2">
                      <BotAvatar bot={BOTS[b.bot]} size={26} />
                      <div className="min-w-0 flex-1">
                        <p className="flex justify-between gap-2 text-xs font-extrabold">
                          <span>{BOTS[b.bot].name}</span>
                          <span className="text-muted">
                            {b.win}W {b.draw}D {b.loss}L
                          </span>
                        </p>
                        <div className="mt-0.5 flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <div className="bg-accent" style={{ width: `${(b.win / n) * 100}%` }} />
                          <div className="bg-warn" style={{ width: `${(b.draw / n) * 100}%` }} />
                          <div className="bg-danger" style={{ width: `${(b.loss / n) * 100}%` }} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-label="Recent form" className="card flex flex-col gap-2 p-3 min-[640px]:p-4">
            <h2 className="font-black">
              Recent form <span className="text-xs font-bold text-muted">newest first</span>
            </h2>
            {r.lastResults.length === 0 ? (
              <p className="text-sm font-bold text-muted">No games yet.</p>
            ) : (
              <ol className="flex flex-wrap gap-1">
                {r.lastResults.map((res, i) => (
                  <li key={i} className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase text-white ${RESULT_DOT[res]}`}>
                    {RESULT_WORD[res]}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
