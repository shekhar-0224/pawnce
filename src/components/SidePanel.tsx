import { useEffect, useState } from 'react'
import { type Color, type Move, capturedPieces, otherColor } from '../chess/game'
import type { Bot } from '../engine/bots'
import { Button } from './Button'
import { CapturedPieces } from './CapturedPieces'
import { MoveList } from './MoveList'
import { PanelSlot } from './PanelSlot'

type Props = {
  bot: Bot
  myColor: Color
  moves: Move[]
  isOver: boolean
  onNewGame: () => void
  onResign: () => void
  onFlip: () => void
}

export function SidePanel({ bot, myColor, moves, isOver, onNewGame, onResign, onFlip }: Props) {
  const captures = capturedPieces(moves)
  const myLead = myColor === 'w' ? captures.whiteLead : -captures.whiteLead
  const mine = myColor === 'w' ? captures.byWhite : captures.byBlack
  const theirs = myColor === 'w' ? captures.byBlack : captures.byWhite

  // Resign needs a second tap, so a stray tap can't end the game.
  const [confirmResign, setConfirmResign] = useState(false)
  useEffect(() => {
    if (!confirmResign) return
    const t = setTimeout(() => setConfirmResign(false), 3000)
    return () => clearTimeout(t)
  }, [confirmResign])

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-soft">
      {/* Phase 3: win % rope goes here */}
      <PanelSlot name="win-rope" />

      <section aria-label="Captured pieces" className="flex flex-col gap-1">
        <CapturedPieces label="You" pieces={mine} pieceColor={otherColor(myColor)} lead={myLead} />
        <CapturedPieces label={bot.name} pieces={theirs} pieceColor={myColor} lead={-myLead} />
      </section>

      {/* Phase 4: move explanation card goes here */}
      <PanelSlot name="move-explain" />

      <section aria-label="Moves" className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 px-2 font-display text-sm font-semibold uppercase tracking-wider text-muted">
          Moves
        </h2>
        <div className="pawnce-scroll max-h-44 min-h-24 flex-1 overflow-y-auto rounded-xl bg-bg/40 p-1 lg:max-h-none">
          <MoveList moves={moves} />
        </div>
      </section>

      {/* Phase 3: hint orbs go here */}
      <PanelSlot name="hint-orbs" />

      <div className="grid grid-cols-3 gap-2">
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
