import { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Square } from '../chess/game'
import { color, readToken, withAlpha } from '../theme'
import { pieceSet } from '../theme/pieces'

type Arrow = { from: Square; to: Square }

type Props = {
  /** A unique id for this board on the page. */
  id: string
  fen: string
  /** The move being shown (highlighted, lime arrow). */
  last?: Arrow | null
  /** The opponent's reply (red arrow). */
  next?: Arrow | null
  /** A better move instead (faint lime arrow). */
  better?: Arrow | null
  /** Extra lines, e.g. what a fork hits (lime, fainter). */
  lines?: Arrow[]
  flipped?: boolean
}

/** A small still board for flash cards: a position, one move, and its arrows. */
export function ExampleBoard({ id, fen, last, next, better, lines = [], flipped = false }: Props) {
  const arrows = useMemo(() => {
    const accent = readToken('--accent', '#c6f36b')
    const danger = readToken('--danger', '#f2555a')
    const out = []
    if (last) out.push({ startSquare: last.from, endSquare: last.to, color: withAlpha(accent, 0.9) })
    for (const l of lines) out.push({ startSquare: l.from, endSquare: l.to, color: withAlpha(accent, 0.5) })
    if (next) out.push({ startSquare: next.from, endSquare: next.to, color: withAlpha(danger, 0.85) })
    if (better) out.push({ startSquare: better.from, endSquare: better.to, color: withAlpha(accent, 0.45) })
    return out
  }, [last, next, better, lines])

  return (
    <div className="overflow-hidden rounded-lg border border-border" aria-hidden>
      <Chessboard
        options={{
          id,
          position: fen,
          pieces: pieceSet,
          boardOrientation: flipped ? 'black' : 'white',
          allowDragging: false,
          allowDrawingArrows: false,
          showNotation: false,
          showAnimations: false,
          arrows,
          squareStyles: last
            ? { [last.from]: { background: color.lastMove }, [last.to]: { background: color.lastMove } }
            : {},
          lightSquareStyle: { backgroundColor: color.boardLight },
          darkSquareStyle: { backgroundColor: color.boardDark },
        }}
      />
    </div>
  )
}
