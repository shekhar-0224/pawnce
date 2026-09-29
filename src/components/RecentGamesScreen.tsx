import { useState } from 'react'
import { TIME_CONTROLS } from '../chess/clock'
import { BOTS } from '../engine/bots'
import type { EndReason, Result } from '../chess/outcome'
import { loadRecentGames } from '../storage/recentGames'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'

const BADGE: Record<Result, { label: string; className: string }> = {
  win: { label: 'Win', className: 'bg-accent/15 text-accent' },
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
  timeout: 'On time',
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

export function RecentGamesScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const [games] = useState(loadRecentGames)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Recent games</h1>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
      </div>

      {games.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-lg font-semibold">No games yet</p>
          <p className="mt-1 text-muted">Finish a game and it will show up here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((g) => {
            const bot = BOTS[g.bot] ?? BOTS.ant
            const badge = BADGE[g.result] ?? BADGE.draw
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onOpen(g.id)}
                  aria-label={`vs. ${bot.name}, ${badge.label}: open summary`}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-card border border-border bg-surface p-3 text-left hover:border-muted/40 sm:gap-4 sm:p-4"
                >
                  <BotAvatar bot={bot} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      vs. {bot.name} <span className="text-muted">({bot.level})</span>
                    </p>
                    <p className="truncate text-sm text-muted">
                      {g.myColor === 'white' ? 'White' : 'Black'} · {REASON[g.reason] ?? ''} ·{' '}
                      {g.moves} {g.moves === 1 ? 'move' : 'moves'}
                      {g.timeControl && TIME_CONTROLS[g.timeControl]?.speed
                        ? ` · ${TIME_CONTROLS[g.timeControl].label}`
                        : ''}
                    </p>
                    <p className="text-xs text-muted/80">{formatDate(g.date)}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span aria-hidden className="text-muted">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
