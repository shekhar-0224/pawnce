/*
 * Board patterns behind the vocabulary: which piece moved, named checkmates
 * (back-rank, smothered, Scholar's, Fool's, ladder) and game phases
 * (middlegame, endgame, king-and-pawn and rook endgames). Pure chess.js,
 * no engine.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { kingSquare, otherColor } from './game'

export const PIECE_WORD: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const file = (s: Square) => s.charCodeAt(0) - 97
const rank = (s: Square) => Number(s[1]) - 1
const at = (f: number, r: number): Square | null =>
  f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${String.fromCharCode(97 + f)}${r + 1}` as Square)

function neighbours(s: Square): Square[] {
  const out: Square[] = []
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df || dr) {
        const n = at(file(s) + df, rank(s) + dr)
        if (n) out.push(n)
      }
    }
  }
  return out
}

/** Named checkmate patterns shown by a mating move (usually zero or one). */
export function mateNames(move: Move, ply: number): string[] {
  if (!move.san.endsWith('#')) return []
  const g = new Chess(move.after)
  const loser: Color = g.turn()
  const winner = otherColor(loser)
  const king = kingSquare(g, loser)
  if (!king) return []
  const checkers = g.attackers(king, winner)
  const checker = checkers.length === 1 ? g.get(checkers[0]) : null
  const out: string[] = []

  // Fool's mate: mated before White's third move.
  if (ply <= 3) out.push('fools-mate')
  // Scholar's mate: an early queen takes on f7 (or f2) with mate.
  else if (move.piece === 'q' && move.captured && (move.to === 'f7' || move.to === 'f2') && ply <= 14) {
    out.push('scholars-mate')
  }

  // Smothered mate: a knight mates a king boxed in by its own pieces.
  if (checker?.type === 'n' && neighbours(king).every((s) => g.get(s)?.color === loser)) {
    out.push('smothered-mate')
  }

  // Back-rank mate: a rook or queen mates along the king's back row, with
  // the king's own pawns in front of it.
  const backRank = loser === 'w' ? 0 : 7
  const forward = loser === 'w' ? 1 : -1
  if (checker && (checker.type === 'r' || checker.type === 'q') && rank(king) === backRank && rank(checkers[0]) === backRank) {
    const shield = [-1, 0, 1]
      .map((df) => at(file(king) + df, rank(king) + forward))
      .filter((s): s is Square => !!s)
      .filter((s) => {
        const p = g.get(s)
        return p?.color === loser && p.type === 'p'
      })
    if (shield.length >= 2) out.push('back-rank-mate')
  }

  // Ladder mate: two heavy pieces (rook/queen), one checking along the edge
  // row or column, the other guarding the line next to it.
  if (!out.includes('back-rank-mate') && checker && (checker.type === 'r' || checker.type === 'q')) {
    const heavy = g
      .board()
      .flat()
      .filter((p) => p && p.color === winner && (p.type === 'r' || p.type === 'q'))
    const onEdgeRank = rank(king) === 0 || rank(king) === 7
    const onEdgeFile = file(king) === 0 || file(king) === 7
    const alongRank = onEdgeRank && rank(checkers[0]) === rank(king)
    const alongFile = onEdgeFile && file(checkers[0]) === file(king)
    if (heavy.length >= 2 && (alongRank || alongFile)) out.push('ladder-mate')
  }
  return out
}

type Census = { nonPawn: number; pawns: number; rooksW: number; rooksB: number; others: number }

function census(fen: string): Census {
  const c: Census = { nonPawn: 0, pawns: 0, rooksW: 0, rooksB: 0, others: 0 }
  for (const p of new Chess(fen).board().flat()) {
    if (!p || p.type === 'k') continue
    if (p.type === 'p') c.pawns++
    else {
      c.nonPawn++
      if (p.type === 'r') {
        if (p.color === 'w') c.rooksW++
        else c.rooksB++
      } else c.others++
    }
  }
  return c
}

/** Game-phase words that describe a position (the caller keeps the first time only). */
export function phaseNames(fen: string, ply: number): string[] {
  const c = census(fen)
  const out: string[] = []
  // Endgame: at most 6 pieces (not counting kings and pawns) left on the board.
  const endgame = c.nonPawn <= 6
  if (endgame) out.push('endgame')
  if (c.nonPawn === 0 && c.pawns > 0) out.push('pawn-endgame')
  if (c.others === 0 && c.rooksW > 0 && c.rooksB > 0) out.push('rook-endgame')
  // Middlegame: past move 8 each, with most pieces off the back rows.
  if (!endgame && ply >= 15) {
    const g = new Chess(fen)
    const home = (['b1', 'c1', 'f1', 'g1', 'b8', 'c8', 'f8', 'g8'] as Square[]).filter((s) => {
      const p = g.get(s)
      return p && (p.type === 'n' || p.type === 'b')
    }).length
    if (home <= 3) out.push('middlegame')
  }
  return out
}

/** Material for one side, in piece values (kings not counted). */
export function materialOf(fen: string, color: Color): number {
  const V: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
  return new Chess(fen)
    .board()
    .flat()
    .reduce((sum, p) => sum + (p && p.color === color ? V[p.type] : 0), 0)
}
