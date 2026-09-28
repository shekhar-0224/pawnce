/*
 * Explains, in one plain sentence, the idea behind a suggested move.
 * Used by the hint orbs. It looks at what the move does on the board
 * (captures, checks, attacks, safety, development), plus the engine's
 * expected continuation, and picks the most important thing to say.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import { PIECE_NAMES, capturedSquare, otherColor, parseUci } from './game'

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

type Line = { pv: string[]; mate?: number }

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function allSquares(game: Chess, color: Color): { square: Square; type: PieceSymbol }[] {
  const out: { square: Square; type: PieceSymbol }[] = []
  for (const row of game.board()) {
    for (const p of row) if (p && p.color === color) out.push({ square: p.square, type: p.type })
  }
  return out
}

const isHanging = (game: Chess, square: Square, owner: Color) =>
  game.isAttacked(square, otherColor(owner)) && game.attackers(square, owner).length === 0

export function describeIdea(fen: string, uci: string, line: Line): string {
  const before = new Chess(fen)
  const me = before.turn()
  const them = otherColor(me)
  const { from, to, promotion } = parseUci(uci)
  const piece = before.get(from)
  if (!piece) return 'A strong move.'
  const name = PIECE_NAMES[piece.type]

  const after = new Chess(fen)
  let move
  try {
    move = after.move({ from, to, promotion })
  } catch {
    return 'A strong move.'
  }

  // 1. Forced checkmate
  if (line.mate !== undefined && line.mate > 0) {
    return line.mate === 1
      ? 'Checkmate! This ends the game right now.'
      : `Starts a forced checkmate in ${line.mate} moves. Can you find the rest?`
  }

  // 2. Castling and promotion
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    return 'Castles: your king gets safe behind its pawns and your rook joins the game.'
  }
  if (move.isPromotion()) {
    return `Promotes your pawn to a ${PIECE_NAMES[move.promotion!]}. A brand new piece!`
  }

  const check = after.inCheck()

  // 3. Captures: free piece, winning trade, even trade
  if (move.captured) {
    const victim = PIECE_NAMES[move.captured]
    const reply = line.pv[1]
    const retaken = reply?.slice(2, 4) === capturedSquare(move)
    const withCheck = check ? ', with check' : ''
    if (!retaken) return `Wins a free ${victim}${withCheck}.`
    if (VALUE[move.captured] > VALUE[piece.type]) {
      return `Wins material: your ${name} takes their ${victim}, worth more than it${withCheck}.`
    }
    if (move.captured === piece.type) return `Trades ${name}s. A fair swap that simplifies the game.`
    if (VALUE[move.captured] === VALUE[piece.type]) {
      return `Trades your ${name} for their ${victim}, an even swap.`
    }
    return `Takes the ${victim}${withCheck}.`
  }

  // 4. What the moved piece attacks now (forks, checks, threats)
  const targets = allSquares(after, them).filter(
    (p) =>
      after.attackers(p.square, me).includes(to) &&
      (p.type === 'k' ||
        VALUE[p.type] > VALUE[piece.type] ||
        (p.type !== 'p' && after.attackers(p.square, them).length === 0)),
  )
  if (targets.length >= 2) {
    const names = targets
      .sort((a, b) => VALUE[b.type] - VALUE[a.type])
      .map((t) => PIECE_NAMES[t.type])
    return `Fork! Your ${name} attacks the ${list(names)} at the same time.`
  }
  if (check) return 'Gives check, so their king has to deal with it first.'
  if (targets.length === 1) {
    const target = PIECE_NAMES[targets[0].type]
    return `Attacks their ${target}. They'll have to spend a move saving it.`
  }

  // 5. Safety: rescuing a piece in danger, or protecting one
  if (piece.type !== 'p' && piece.type !== 'k' && before.isAttacked(from, them)) {
    const cheapestAttacker = Math.min(
      ...before.attackers(from, them).map((sq) => VALUE[before.get(sq)!.type]),
    )
    if (isHanging(before, from, me) || cheapestAttacker < VALUE[piece.type]) {
      return `Moves your ${name} out of danger.`
    }
  }
  const saved = allSquares(after, me).find(
    (p) =>
      p.type !== 'k' &&
      p.square !== to &&
      isHanging(before, p.square, me) &&
      after.attackers(p.square, me).includes(to),
  )
  if (saved) return `Protects your ${PIECE_NAMES[saved.type]}, which was hanging.`

  // 6. Opening principles
  const moveNumber = Number(fen.split(' ')[5] ?? 1)
  const backRank = me === 'w' ? '1' : '8'
  if (moveNumber <= 12 && (piece.type === 'n' || piece.type === 'b') && from[1] === backRank) {
    return `Develops your ${name}: brings it off the back row and toward the center.`
  }
  if (piece.type === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(to)) {
    return 'Grabs space in the center, where the fight usually happens.'
  }

  // 7. Something general
  if (piece.type === 'p') return 'A useful pawn push that gains space.'
  if (piece.type === 'k') return 'Steps your king to a safer square.'
  return `Puts your ${name} on a better square.`
}
