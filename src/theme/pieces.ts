/*
 * The piece set used on the board, in the captured-pieces tray and in the
 * promotion picker.
 *
 * To swap in the jungle animal set later (frog knight, snake bishop, rhino
 * rook, jaguar queen, gorilla king, army-ant pawns), change only this file:
 * replace `defaultPieces` with an object that has the same keys
 * (wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK), where each value is a
 * React component that draws that piece and fills its box.
 */
import { defaultPieces, type PieceRenderObject } from 'react-chessboard'

export type PieceCode =
  | 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK'
  | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

export const pieceSet: PieceRenderObject = defaultPieces

/** Build a key like "wN" from chess.js color ('w' | 'b') and type ('n'). */
export function pieceCode(color: 'w' | 'b', type: string): PieceCode {
  return `${color}${type.toUpperCase()}` as PieceCode
}
