import { useState } from 'react'
import { BOTS } from '../engine/bots'
import type { EndReason, Result } from '../chess/outcome'
import { loadRecentGames } from '../storage/recentGames'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'

const BADGE: Record<Result, { label: string; className: string }> = {
  win: { label: 'Win', className: 'bg-success/15 text-success' },
  loss: { label: 'Loss', className: 'bg-danger/15 text-danger' },
  draw: { label: 'Draw', className: 'bg-surface-2 text-muted' },
}

const REASON: Record<EndReason, string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  threefold: 'Repetition',
  insufficient: 'Not enough pieces',
  'fifty-moves': '50-move rule',
  resignation: 'Resigned',
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFormat.format(d)
}

export function RecentGamesScreen({ onBack }: { onBack: () => void }) {
  const [games] = useState(loadRecentGames)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Recent games</h1>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
      </div>

      {games.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
          <p className="font-display text-xl font-semibold">No games yet</p>
          <p className="mt-1 text-muted">Finish a game and it will show up here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((g) => {
            const bot = BOTS[g.bot] ?? BOTS.ant
            const badge = BADGE[g.result] ?? BADGE.draw
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft sm:gap-4 sm:p-4"
              >
                <BotAvatar bot={bot} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    vs. {bot.name} <span className="text-muted">({bot.level})</span>
                  </p>
                  <p className="truncate text-sm text-muted">
                    {g.myColor === 'white' ? 'White' : 'Black'} · {REASON[g.reason] ?? ''} ·{' '}
                    {g.moves} {g.moves === 1 ? 'move' : 'moves'}
                  </p>
                  <p className="text-xs text-muted/80">{formatDate(g.date)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${badge.className}`}>
                  {badge.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
