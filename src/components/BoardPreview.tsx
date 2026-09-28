import { Chessboard } from 'react-chessboard'
import { color, readToken } from '../theme'
import { pieceSet } from '../theme/pieces'

// A knight has just jumped to c7, forking the king and the rook.
const FORK_POSITION = 'r1bqkbnr/ppNp1ppp/2n5/4p3/4P3/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4'

/** A still board on the home screen that shows what Pawnce teaches. */
export function BoardPreview() {
  const accent = readToken('--accent', '#c6f36b')
  return (
    <div className="relative" aria-hidden>
      <div className="overflow-hidden rounded-lg border border-border">
        <Chessboard
          options={{
            id: 'preview',
            position: FORK_POSITION,
            pieces: pieceSet,
            allowDragging: false,
            showNotation: false,
            showAnimations: false,
            arrows: [
              { startSquare: 'c7', endSquare: 'e8', color: accent },
              { startSquare: 'c7', endSquare: 'a8', color: accent },
            ],
            lightSquareStyle: { backgroundColor: color.boardLight },
            darkSquareStyle: { backgroundColor: color.boardDark },
          }}
        />
      </div>
      <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
        Fork
      </span>
    </div>
  )
}
