import { type ReactNode, useEffect, useState } from 'react'
import type { Color, Move } from '../chess/game'
import type { Opening } from '../chess/openings'
import type { Bot } from '../engine/bots'
import { Button } from './Button'
import { MoveList } from './MoveList'
import type { MoveVerdict } from './useAnalysis'

type Props = {
  bot: Bot
  myColor: Color
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  opening: (Opening & { ply: number }) | null
  isOver: boolean
  /** Win / draw / loss chances. */
  meter: ReactNode
  /** The coach's feedback on your last move. */
  coach: ReactNode
  /** The hint card, when a hint is showing. */
  hint: ReactNode
  onNewGame: () => void
  onResign: () => void
  onFlip: () => void
}

/** Right-hand panel: coach first, a slim win chances bar, the move list, then game buttons. */
export function SidePanel({
  bot,
  myColor,
  moves,
  verdicts,
  opening,
  isOver,
  meter,
  coach,
  hint,
  onNewGame,
  onResign,
  onFlip,
}: Props) {
  // Resign needs a second tap, so a stray tap can't end the game.
  const [confirmResign, setConfirmResign] = useState(false)
  useEffect(() => {
    if (!confirmResign) return
    const t = setTimeout(() => setConfirmResign(false), 3000)
    return () => clearTimeout(t)
  }, [confirmResign])

  const botLabel = `${bot.name}`
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
      <div className="pawnce-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
        {hint}
        {coach}
      </div>
      <div className="border-t border-border px-4 py-3">{meter}</div>

      <section aria-label="Moves" className="flex min-h-0 flex-1 flex-col border-t border-border">
        <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Moves</h2>
          {opening && (
            <span className="min-w-0 truncate text-xs font-semibold text-muted" title={opening.name}>
              {opening.name}
              <span className="text-muted/70">
                {' · '}
                {moves[opening.ply]?.color === myColor ? 'chosen by you' : `chosen by the ${bot.name}`}
              </span>
            </span>
          )}
        </div>
        <div className="pawnce-scroll max-h-40 min-h-20 flex-1 overflow-y-auto px-2 pb-2 min-[900px]:max-h-none">
          <MoveList
            moves={moves}
            verdicts={verdicts}
            whiteLabel={myColor === 'w' ? 'You' : botLabel}
            blackLabel={myColor === 'b' ? 'You' : botLabel}
          />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
        <Button onClick={onNewGame} variant={isOver ? 'primary' : 'secondary'} className="whitespace-nowrap px-2 text-sm">
          New game
        </Button>
        <Button
          onClick={() => (confirmResign ? (setConfirmResign(false), onResign()) : setConfirmResign(true))}
          variant={confirmResign ? 'danger' : 'secondary'}
          disabled={isOver}
          className="whitespace-nowrap px-2 text-sm"
        >
          {confirmResign ? 'Sure?' : 'Resign'}
        </Button>
        <Button onClick={onFlip} className="whitespace-nowrap px-2 text-sm">
          Flip board
        </Button>
      </div>
    </aside>
  )
}
