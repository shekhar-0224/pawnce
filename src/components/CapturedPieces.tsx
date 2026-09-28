import type { Color, PieceSymbol } from '../chess/game'
import { pieceCode, pieceSet } from '../theme/pieces'

type Props = {
  label: string
  /** Pieces this side has taken. */
  pieces: PieceSymbol[]
  /** Color of those taken pieces. */
  pieceColor: Color
  /** Material lead in pawns, shown as "+3" when positive. */
  lead: number
}

export function CapturedPieces({ label, pieces, pieceColor, lead }: Props) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm font-semibold text-muted">{label}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {pieces.length > 0 && (
          // A light chip so dark pieces stay visible on the dark panel.
          <span className="flex flex-wrap items-center rounded-full bg-board-light/90 py-0.5 pl-1.5 pr-3">
            {pieces.map((p, i) => {
              const Piece = pieceSet[pieceCode(pieceColor, p)]
              return (
                <span key={i} className="-mr-1.5 block size-6">
                  <Piece />
                </span>
              )
            })}
          </span>
        )}
        {lead > 0 && <span className="text-sm font-bold text-muted">+{lead}</span>}
      </span>
    </div>
  )
}
