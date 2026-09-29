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

// ---------------------------------------------------------------------------
// Tactics and strategy spotted from one move (cached: a game's words are
// recomputed as grades arrive, and these checks try many moves).

const V: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const STRAIGHT = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
]
const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

function firstPiece(g: Chess, from: Square, [df, dr]: number[]) {
  for (let f = file(from) + df, r = rank(from) + dr; ; f += df, r += dr) {
    const s = at(f, r)
    if (!s) return null
    const p = g.get(s)
    if (p) return { square: s, ...p }
  }
}

/** Is the piece on `sq` (owned by `owner`) in danger: attacked, and undefended or attacked by something cheaper? */
function inDanger(g: Chess, sq: Square, owner: Color): boolean {
  const piece = g.get(sq)
  if (!piece) return false
  const attackers = g.attackers(sq, otherColor(owner))
  if (attackers.length === 0) return false
  if (g.attackers(sq, owner).length === 0) return true
  return Math.min(...attackers.map((a) => V[g.get(a)!.type])) < V[piece.type]
}

const moveCache = new Map<string, string[]>()

/**
 * Words one move shows by itself: battery, trapped piece, removing the
 * defender, mate threat, open file, seventh rank, fianchetto, outpost,
 * kingside / queenside castling.
 */
export function moveNames(move: Move): string[] {
  const key = `${move.before}|${move.lan}`
  const hit = moveCache.get(key)
  if (hit) return hit
  const out: string[] = []
  const g = new Chess(move.after)
  const me = move.color
  const them = otherColor(me)

  // Battery: the moved queen, rook or bishop lines up with another of ours
  // along a file or diagonal (not along a row: that's just connected rooks).
  if (move.piece === 'q' || move.piece === 'r' || move.piece === 'b') {
    const dirs = [
      ...(move.piece !== 'b' ? STRAIGHT.filter(([df]) => df === 0) : []),
      ...(move.piece !== 'r' ? DIAGONAL : []),
    ]
    for (const d of dirs) {
      const p = firstPiece(g, move.to, d)
      if (!p || p.color !== me) continue
      const diagonal = d[0] !== 0
      if (diagonal ? p.type === 'b' || p.type === 'q' : p.type === 'r' || p.type === 'q') {
        out.push('battery')
        break
      }
    }
  }

  // Trapped piece: our moved piece attacks an enemy piece that is in danger
  // and has no safe square to go to.
  if (!g.inCheck()) {
    for (const p of g.board().flat()) {
      if (!p || p.color !== them || p.type === 'p' || p.type === 'k') continue
      if (!g.attackers(p.square, me).includes(move.to) || !inDanger(g, p.square, them)) continue
      const escapes = g.moves({ square: p.square, verbose: true }).filter((m) => {
        if (m.captured && V[m.captured] >= V[p.type]) return true
        const h = new Chess(g.fen())
        h.move(m)
        return !inDanger(h, m.to, them)
      })
      if (escapes.length === 0) {
        out.push('trapped-piece')
        break
      }
    }
  }

  // Removing the defender: we took a piece that was the only guard of
  // another enemy piece, which is now attacked and undefended.
  if (move.captured) {
    const before = new Chess(move.before)
    for (const p of g.board().flat()) {
      if (!p || p.color !== them || p.type === 'p' || p.type === 'k') continue
      const nowAttacked = g.attackers(p.square, me).length > 0
      const nowDefended = g.attackers(p.square, them).length > 0
      if (nowAttacked && !nowDefended && before.attackers(p.square, them).includes(move.to)) {
        out.push('removing-the-defender')
        break
      }
    }
  }

  // Mate threat: if they ignored this move, we could mate at once.
  if (!g.inCheck() && !g.isGameOver()) {
    const parts = move.after.split(' ')
    parts[1] = me
    parts[3] = '-'
    try {
      const passed = new Chess(parts.join(' '))
      const mates = passed.moves({ verbose: true }).some((m) => {
        const h = new Chess(passed.fen())
        h.move(m)
        return h.isCheckmate()
      })
      if (mates) out.push('mate-threat')
    } catch {
      // Not a legal position to pass in; skip.
    }
  }

  // Strategy
  const pawnsOnFile = (f: number) =>
    [0, 1, 2, 3, 4, 5, 6, 7].some((r) => g.get(at(f, r)!)?.type === 'p')
  if ((move.piece === 'r' || move.piece === 'q') && file(move.from) !== file(move.to) && !pawnsOnFile(file(move.to))) {
    out.push('open-file')
  }
  if (move.piece === 'r' && rank(move.to) === (me === 'w' ? 6 : 1)) out.push('seventh-rank')
  if (
    move.piece === 'b' &&
    ['c1', 'f1', 'c8', 'f8'].includes(move.from) &&
    ['b2', 'g2', 'b7', 'g7'].includes(move.to)
  ) {
    out.push('fianchetto')
  }
  if (move.piece === 'n') {
    const r = rank(move.to)
    const f = file(move.to)
    const enemyHalf = me === 'w' ? r >= 4 : r <= 3
    const back = me === 'w' ? -1 : 1
    const pawnGuard = [-1, 1].some((df) => {
      const s = at(f + df, r + back)
      const p = s ? g.get(s) : null
      return p?.type === 'p' && p.color === me
    })
    // No enemy pawn on a neighbouring file that could still come to attack it.
    const chaseable = [-1, 1].some((df) =>
      [0, 1, 2, 3, 4, 5, 6, 7].some((rr) => {
        const s = at(f + df, rr)
        const p = s ? g.get(s) : null
        return p?.type === 'p' && p.color === them && (me === 'w' ? rr > r : rr < r)
      }),
    )
    if (enemyHalf && pawnGuard && !chaseable) out.push('outpost')
  }
  if (move.isKingsideCastle()) out.push('kingside-castling')
  if (move.isQueensideCastle()) out.push('queenside-castling')

  moveCache.set(key, out)
  return out
}

/** Words about the pawns and pieces in a position (the caller keeps the first time only). */
export function structureNames(fen: string): string[] {
  const g = new Chess(fen)
  const out: string[] = []
  const pawns: Record<Color, { f: number; r: number }[]> = { w: [], b: [] }
  const bishops: Record<Color, number> = { w: 0, b: 0 }
  for (const p of g.board().flat()) {
    if (!p) continue
    if (p.type === 'p') pawns[p.color].push({ f: file(p.square), r: rank(p.square) })
    if (p.type === 'b') bishops[p.color]++
  }
  for (const c of ['w', 'b'] as Color[]) {
    const mine = pawns[c]
    const theirs = pawns[otherColor(c)]
    const up = c === 'w' ? 1 : -1
    const ahead = (r1: number, r2: number) => (c === 'w' ? r1 > r2 : r1 < r2)
    if (mine.some((a, i) => mine.some((b, j) => i !== j && a.f === b.f))) out.push('doubled-pawns')
    if (mine.some((a) => !mine.some((b) => Math.abs(b.f - a.f) === 1))) out.push('isolated-pawn')
    if (mine.some((a) => !theirs.some((t) => Math.abs(t.f - a.f) <= 1 && ahead(t.r, a.r)))) out.push('passed-pawn')
    if (
      mine.some((a) => {
        const neighbours = mine.filter((b) => Math.abs(b.f - a.f) === 1)
        const stop = a.r + up
        return (
          neighbours.length > 0 &&
          neighbours.every((b) => ahead(b.r, a.r)) &&
          theirs.some((t) => Math.abs(t.f - a.f) === 1 && t.r === stop + up)
        )
      })
    ) {
      out.push('backward-pawn')
    }
    const has = (f: number, r: number) => mine.some((p) => p.f === f && p.r === r)
    if (mine.some((a) => [1, -1].some((df) => has(a.f + df, a.r + up) && has(a.f + 2 * df, a.r + 2 * up)))) {
      out.push('pawn-chain')
    }
    // Connected rooks: both rooks see each other along a row or file.
    const rooks = g.board().flat().filter((p) => p && p.color === c && p.type === 'r')
    if (rooks.length === 2) {
      const [a, b] = rooks.map((p) => p!.square)
      const sameLine = file(a) === file(b) || rank(a) === rank(b)
      if (sameLine) {
        const d = [Math.sign(file(b) - file(a)), Math.sign(rank(b) - rank(a))]
        if (firstPiece(g, a, d)?.square === b) out.push('connected-rooks')
      }
    }
  }
  if ((bishops.w >= 2) !== (bishops.b >= 2)) out.push('bishop-pair')
  return [...new Set(out)]
}
