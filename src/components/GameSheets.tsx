import { useState } from 'react'
import type { Color, Move } from '../chess/game'
import type { Opening } from '../chess/openings'
import type { Bot } from '../engine/bots'
import { Button } from './Button'
import { MoveList } from './MoveList'
import type { MoveVerdict } from './useAnalysis'

/** Phones: every move so far, with its grade, and the opening. */
export function MovesSheetBody({
  bot,
  myColor,
  moves,
  verdicts,
  opening,
}: {
  bot: Bot
  myColor: Color
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  opening: (Opening & { ply: number }) | null
}) {
  return (
    <div className="flex flex-col gap-3">
      {opening && (
        <p className="text-sm">
          <span className="font-semibold">{opening.name}</span>
          <span className="text-muted">
            {' · '}
            {moves[opening.ply]?.color === myColor ? 'chosen by you' : `chosen by the ${bot.name}`}
          </span>
        </p>
      )}
      {moves.length === 0 ? (
        <p className="text-sm text-muted">No moves yet.</p>
      ) : (
        <MoveList
          moves={moves}
          verdicts={verdicts}
          whiteLabel={myColor === 'w' ? 'You' : bot.name}
          blackLabel={myColor === 'b' ? 'You' : bot.name}
        />
      )}
    </div>
  )
}

/** Phones: the less common game actions. */
export function MenuSheetBody({
  isOver,
  onNewGame,
  onResign,
  onFlip,
  onHome,
}: {
  isOver: boolean
  onNewGame: () => void
  onResign: () => void
  onFlip: () => void
  onHome: () => void
}) {
  // Resign needs a second tap, so a stray tap can't end the game.
  const [confirmResign, setConfirmResign] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Button variant={isOver ? 'primary' : 'secondary'} onClick={onNewGame}>
        New game
      </Button>
      <Button onClick={onFlip}>Flip board</Button>
      <Button
        variant={confirmResign ? 'danger' : 'secondary'}
        disabled={isOver}
        onClick={() => (confirmResign ? onResign() : setConfirmResign(true))}
      >
        {confirmResign ? 'Tap again to resign' : 'Resign'}
      </Button>
      <Button variant="ghost" onClick={onHome}>
        Back to home
      </Button>
    </div>
  )
}
