/*
 * Small helpers around chess.js. No React and no UI in here.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export type { Color, Move, PieceSymbol, Square }

export type Side = 'white' | 'black'

export const sideToColor = (side: Side): Color => (side === 'white' ? 'w' : 'b')
export const colorToSide = (color: Color): Side => (color === 'w' ? 'white' : 'black')
export const otherColor = (color: Color): Color => (color === 'w' ? 'b' : 'w')

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Rebuild a game from its list of moves (so React state can stay simple). */
export function replay(moves: Move[]): Chess {
  const game = new Chess()
  for (const m of moves) game.move({ from: m.from, to: m.to, promotion: m.promotion })
  return game
}

/** Legal moves for the piece on `square` (empty if there is none, or it's not its turn). */
export function legalMovesFrom(game: Chess, square: Square): Move[] {
  return game.moves({ square, verbose: true })
}

/** Is moving from -> to a pawn promotion (so we need to ask which piece)? */
export function isPromotionMove(game: Chess, from: Square, to: Square): boolean {
  return legalMovesFrom(game, from).some((m) => m.to === to && m.isPromotion())
}

/** Square of the king of `color`. */
export function kingSquare(game: Chess, color: Color): Square | undefined {
  return game.findPiece({ type: 'k', color })[0]
}

/** Square a captured piece stood on (differs from `to` for en passant). */
export function capturedSquare(move: Move): Square | undefined {
  if (!move.captured) return undefined
  if (move.isEnPassant()) return `${move.to[0]}${move.from[1]}` as Square
  return move.to
}

export type Captures = {
  /** Pieces white has taken (so they are black pieces), sorted by value. */
  byWhite: PieceSymbol[]
  byBlack: PieceSymbol[]
  /** Material lead for white in pawns (negative when black is ahead). */
  whiteLead: number
}

export function capturedPieces(moves: Move[]): Captures {
  const byWhite: PieceSymbol[] = []
  const byBlack: PieceSymbol[] = []
  let whiteLead = 0
  for (const m of moves) {
    if (m.captured) {
      ;(m.color === 'w' ? byWhite : byBlack).push(m.captured)
      whiteLead += (m.color === 'w' ? 1 : -1) * PIECE_VALUES[m.captured]
    }
    if (m.promotion) {
      whiteLead += (m.color === 'w' ? 1 : -1) * (PIECE_VALUES[m.promotion] - 1)
    }
  }
  const byValue = (a: PieceSymbol, b: PieceSymbol) => PIECE_VALUES[a] - PIECE_VALUES[b]
  return { byWhite: byWhite.sort(byValue), byBlack: byBlack.sort(byValue), whiteLead }
}

export type MovePair = { number: number; white?: Move; black?: Move }

/** Group moves into numbered pairs: 1. e4 e5, 2. Nf3 Nc6 ... */
export function movePairs(moves: Move[]): MovePair[] {
  const pairs: MovePair[] = []
  for (const m of moves) {
    if (m.color === 'w' || pairs.length === 0) {
      pairs.push({ number: pairs.length + 1, [m.color === 'w' ? 'white' : 'black']: m })
    } else {
      pairs[pairs.length - 1].black = m
    }
  }
  return pairs
}

/** Parse a UCI move from the engine ("e2e4", "e7e8q"). */
export function parseUci(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci[4] as PieceSymbol | undefined) || undefined,
  }
}

/**
 * FEN of the position with a pawn shown on its promotion square, used while
 * the player chooses which piece to promote to.
 */
export function previewPawnMove(game: Chess, from: Square, to: Square): string {
  const copy = new Chess(game.fen())
  const pawn = copy.remove(from)
  if (pawn) {
    copy.remove(to)
    copy.put(pawn, to)
  }
  return copy.fen()
}
