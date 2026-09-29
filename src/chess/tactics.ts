/*
 * Spots the tactic a move creates: fork, pin, skewer, discovered attack
 * (and discovered / double check). Pure board geometry with chess.js,
 * no engine needed. Only tactics created by the move itself are reported.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { otherColor } from './game'

export type TacticKind =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered-attack'
  | 'discovered-check'
  | 'double-check'

export type Tactic = {
  kind: TacticKind
  /** The piece doing the tactic (for discovered ones: the piece uncovered). */
  by: PieceSymbol
  /**
   * The pieces it hits. Fork: everything attacked. Pin and skewer: the front
   * piece, then the one behind it. Discovered: the piece attacked.
   */
  targets: PieceSymbol[]
}

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

const DIAGONALS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const STRAIGHTS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function directionsFor(type: PieceSymbol): number[][] {
  if (type === 'b') return DIAGONALS
  if (type === 'r') return STRAIGHTS
  if (type === 'q') return [...DIAGONALS, ...STRAIGHTS]
  return []
}

const fileOf = (s: Square) => s.charCodeAt(0) - 97
const rankOf = (s: Square) => Number(s[1]) - 1
const toSquare = (f: number, r: number): Square | null =>
  f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${String.fromCharCode(97 + f)}${r + 1}` as Square)

/** Pieces met walking from `start` in one direction (not including start). */
function walk(game: Chess, start: Square, [df, dr]: number[]) {
  const found: { square: Square; type: PieceSymbol; color: Color }[] = []
  let f = fileOf(start) + df
  let r = rankOf(start) + dr
  for (let sq = toSquare(f, r); sq; f += df, r += dr, sq = toSquare(f, r)) {
    const p = game.get(sq)
    if (p) found.push({ square: sq, type: p.type, color: p.color })
  }
  return found
}

/** Is the piece worth announcing as a target of `attackerType`? */
function worthy(game: Chess, square: Square, type: PieceSymbol, owner: Color, attackerType: PieceSymbol) {
  if (type === 'k') return true
  if (VALUE[type] > VALUE[attackerType]) return true
  const undefended = game.attackers(square, owner).length === 0
  return undefended && type !== 'p'
}

export function detectTactics(fenBefore: string, move: Pick<Move, 'from' | 'to' | 'promotion'>): Tactic[] {
  const before = new Chess(fenBefore)
  const me = before.turn()
  const them = otherColor(me)
  const after = new Chess(fenBefore)
  try {
    after.move({ from: move.from, to: move.to, promotion: move.promotion })
  } catch {
    return []
  }
  const moved = after.get(move.to)
  if (!moved) return []
  const tactics: Tactic[] = []

  // Fork: the moved piece attacks two or more worthwhile targets.
  const forked: PieceSymbol[] = []
  for (const row of after.board()) {
    for (const p of row) {
      if (!p || p.color !== them) continue
      if (!after.attackers(p.square, me).includes(move.to)) continue
      if (worthy(after, p.square, p.type, them, moved.type)) forked.push(p.type)
    }
  }
  if (forked.length >= 2) {
    tactics.push({ kind: 'fork', by: moved.type, targets: forked.sort((a, b) => VALUE[b] - VALUE[a]) })
  }

  // Pins and skewers: a line piece lines up two enemy pieces.
  for (const dir of directionsFor(moved.type)) {
    const [first, second] = walk(after, move.to, dir)
    if (!first || !second || first.color !== them || second.color !== them) continue
    // Pins of pawns are too common to be worth teaching; only pieces count.
    if (first.type !== 'k' && first.type !== 'p' && (second.type === 'k' || (VALUE[second.type] > VALUE[first.type] && VALUE[second.type] >= 5))) {
      tactics.push({ kind: 'pin', by: moved.type, targets: [first.type, second.type] })
    } else if (
      (first.type === 'k' || first.type === 'q' || first.type === 'r') &&
      VALUE[first.type] > VALUE[second.type] &&
      second.type !== 'p'
    ) {
      tactics.push({ kind: 'skewer', by: moved.type, targets: [first.type, second.type] })
    }
  }

  // Discovered attacks: moving away opened a line for another of my pieces.
  const movedGivesCheck = after.inCheck() && givesCheckFrom(after, move.to, them)
  for (const row of before.board()) {
    for (const p of row) {
      if (!p || p.color !== me || p.square === move.from) continue
      for (const dir of directionsFor(p.type)) {
        const beforeLine = walk(before, p.square, dir)
        if (beforeLine[0]?.square !== move.from) continue
        const target = walk(after, p.square, dir)[0]
        if (!target || target.color !== them) continue
        if (target.type === 'k') {
          tactics.push({
            kind: movedGivesCheck ? 'double-check' : 'discovered-check',
            by: p.type,
            targets: ['k'],
          })
        } else if (worthy(after, target.square, target.type, them, p.type)) {
          tactics.push({ kind: 'discovered-attack', by: p.type, targets: [target.type] })
        }
      }
    }
  }

  return tactics
}

/** Does the piece on `square` attack the king of `kingColor`? */
function givesCheckFrom(game: Chess, square: Square, kingColor: Color): boolean {
  const king = game.findPiece({ type: 'k', color: kingColor })[0]
  return !!king && game.attackers(king, otherColor(kingColor)).includes(square)
}

const PRIORITY: TacticKind[] = [
  'double-check',
  'discovered-check',
  'fork',
  'skewer',
  'pin',
  'discovered-attack',
]

/** The single most striking tactic in a list (or null). */
export function mainTactic(tactics: Tactic[]): Tactic | null {
  return [...tactics].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0] ?? null
}
