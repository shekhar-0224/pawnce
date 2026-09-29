import type { ReactNode } from 'react'
import type { Color, PieceSymbol } from '../chess/game'
import { pieceCode, pieceSet } from '../theme/pieces'

type Props = {
  avatar: ReactNode
  name: ReactNode
  /** Pieces this player has captured, and the color of those pieces. */
  captured: PieceSymbol[]
  capturedColor: Color
  /** Material lead in pawns, shown as "+3" when positive. */
  lead: number
  /** Right side: clock, hint orbs, etc. */
  children?: ReactNode
}

/** A row above or below the board: who's playing, what they've taken, their clock. */
export function PlayerBar({ avatar, name, captured, capturedColor, lead, children }: Props) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <div className="flex items-center gap-2">{name}</div>
          <div className="flex h-5 items-center" aria-label={captured.length ? `Captured ${captured.length} pieces` : undefined}>
            {captured.map((p, i) => {
              const Piece = pieceSet[pieceCode(capturedColor, p)]
              return (
                <span key={i} className={`-mr-1 block size-5 ${capturedColor === 'b' ? '[filter:drop-shadow(0_0_1px_var(--board-light))_drop-shadow(0_0_1px_var(--board-light))]' : ''}`}>
                  <Piece />
                </span>
              )
            })}
            {lead > 0 && <span className="ml-2.5 text-xs font-bold text-muted">+{lead}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
