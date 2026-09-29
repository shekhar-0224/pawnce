/*
 * The piece set used on the board, in the captured-pieces tray, the
 * promotion picker and replays: classic Staunton shapes (instantly readable)
 * in Pawnce colors: ivory with forest-green ink for White, near-black with
 * thin lime details for Black. Colors live in tokens.css (--piece-*).
 *
 * To swap the artwork, change only this file (and ./classic): keep the same
 * keys (wP … bK), each a component that draws the piece and fills its box.
 */
import { createElement } from 'react'
import type { PieceRenderObject } from 'react-chessboard'
import { ClassicPiece } from './classic/ClassicPiece'

export type PieceCode =
  | 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK'
  | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

const TYPES = ['p', 'n', 'b', 'r', 'q', 'k']

export const pieceSet: PieceRenderObject = Object.fromEntries(
  (['w', 'b'] as const).flatMap((color) =>
    TYPES.map((type) => {
      const code = `${color}${type.toUpperCase()}`
      return [code, (props?: { svgStyle?: React.CSSProperties }) => createElement(ClassicPiece, { code, svgStyle: props?.svgStyle })]
    }),
  ),
)

/** Build a key like "wN" from chess.js color ('w' | 'b') and type ('n'). */
export function pieceCode(color: 'w' | 'b', type: string): PieceCode {
  return `${color}${type.toUpperCase()}` as PieceCode
}
