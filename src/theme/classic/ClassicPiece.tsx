import type { CSSProperties } from 'react'
import { CLASSIC } from './shapes'

const NAMES: Record<string, string> = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' }

/** One classic piece in Pawnce colors, with a soft shadow so it sits on the board. */
export function ClassicPiece({ code, svgStyle }: { code: string; svgStyle?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 45 45"
      role="img"
      aria-label={`${code[0] === 'w' ? 'White' : 'Black'} ${NAMES[code[1]]}`}
      style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 1.5px 1px rgb(0 0 0 / 0.28))', ...svgStyle }}
      dangerouslySetInnerHTML={{ __html: CLASSIC[code] }}
    />
  )
}
