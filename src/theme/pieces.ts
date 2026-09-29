/*
 * The piece set used on the board, in the captured-pieces tray, the
 * promotion picker and replays: the jungle animals on round tokens.
 * Day jungle (White): cream tokens. Night jungle (Black): deep green with lime.
 *
 * Knight = frog, Bishop = snake, Rook = rhino, Queen = jaguar,
 * King = silverback gorilla, Pawns = army ants. The names in the UI stay
 * standard (Knight, Rook…); the jungle is visual only.
 *
 * To swap the artwork, change only this file (and ./jungle): keep the same
 * keys (wP … bK), each a component that draws the piece and fills its box.
 */
import { createElement } from 'react'
import type { PieceRenderObject } from 'react-chessboard'
import { type AnimalType, JungleToken } from './jungle/JungleToken'

export type PieceCode =
  | 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK'
  | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

const TYPES: AnimalType[] = ['p', 'n', 'b', 'r', 'q', 'k']

export const pieceSet: PieceRenderObject = Object.fromEntries(
  (['w', 'b'] as const).flatMap((color) =>
    TYPES.map((type) => [
      `${color}${type.toUpperCase()}`,
      (props?: { svgStyle?: React.CSSProperties }) => createElement(JungleToken, { color, type, svgStyle: props?.svgStyle }),
    ]),
  ),
)

/** Build a key like "wN" from chess.js color ('w' | 'b') and type ('n'). */
export function pieceCode(color: 'w' | 'b', type: string): PieceCode {
  return `${color}${type.toUpperCase()}` as PieceCode
}
