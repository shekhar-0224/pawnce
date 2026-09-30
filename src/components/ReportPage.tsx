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

function Stat({ label, value, sub, tone = 'text-text' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`text-2xl font-black leading-tight ${tone}`}>{value}</p>
      {sub && <p className="text-xs font-bold text-muted">{sub}</p>}
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <TopBar title="Report card" />

      <motion.section
        aria-label="Overall grade"
        className="card mb-4 flex items-center gap-4 p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className={`grid size-20 shrink-0 place-items-center rounded-3xl text-5xl font-black ${r.grade.tone}`}>{r.grade.letter}</span>
        <div className="min-w-0">
          <p className="text-xl font-black">{r.grade.label}</p>
          <p className="text-sm font-bold text-muted">
            {r.accuracy !== null
              ? `Average accuracy ${r.accuracy}% over your last ${r.gradedGames} ${r.gradedGames === 1 ? 'game' : 'games'}.`
              : 'Finish a game to see your grade.'}
            {r.trend !== null && r.trend !== 0 && (
              <span className={r.trend > 0 ? 'text-accent' : 'text-danger'}>
                {' '}
                {r.trend > 0 ? `▲ ${r.trend} points better` : `▼ ${-r.trend} points lower`} in your last 5.
              </span>
            )}
          </p>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-4">
        <Stat label="Games" value={r.games} sub={`${r.results.win} W · ${r.results.draw} D · ${r.results.loss} L`} />
        <Stat label="Win rate" value={r.winRate !== null ? `${r.winRate}%` : '–'} tone="text-info" />
        <Stat label="Time played" value={formatDuration(r.timeMs)} tone="text-warn" />
        <Stat label="Accuracy" value={r.accuracy !== null ? `${r.accuracy}%` : '–'} tone="text-accent" sub="recent games" />
        <Stat label="Good moves" value={r.goodShare !== null ? `${r.goodShare}%` : '–'} sub="best, good or book" />
        <Stat label="Slips per game" value={r.slipsPerGame ?? '–'} tone="text-danger" sub="mistakes + blunders" />
        <Stat label="Patterns learned" value={`${r.patterns.learned} of ${r.patterns.total}`} tone="text-learn" />
        <Stat label="Openings met" value={r.openings} />
      </div>

      <section aria-label="Record vs bots" className="card mt-4 flex flex-col gap-3 p-5">
        <h2 className="text-lg font-black">Record vs bots</h2>
        {r.byBot.length === 0 ? (
          <p className="text-sm font-bold text-muted">No games yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {r.byBot.map((b) => {
              const n = b.win + b.draw + b.loss
              return (
                <li key={b.bot} className="flex items-center gap-3">
                  <BotAvatar bot={BOTS[b.bot]} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex justify-between gap-2 text-sm font-extrabold">
                      <span>{BOTS[b.bot].name}</span>
                      <span className="text-muted">
                        {b.win} W · {b.draw} D · {b.loss} L
                      </span>
                    </p>
                    <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
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

      {r.lastResults.length > 0 && (
        <section aria-label="Recent form" className="card mt-4 flex flex-col gap-3 p-5">
          <h2 className="text-lg font-black">Recent form</h2>
          <ol className="flex flex-wrap gap-1.5">
            {r.lastResults.map((res, i) => (
              <li key={i} className={`rounded-lg px-2 py-1 text-xs font-black uppercase text-white ${RESULT_DOT[res]}`}>
                {RESULT_WORD[res]}
              </li>
            ))}
          </ol>
          <p className="text-xs font-bold text-muted">Newest first.</p>
        </section>
      )}
    </div>
  )
}
