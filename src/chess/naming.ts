/*
 * Names every move in plain words and tags it with the chess vocabulary
 * it shows off: rule terms (castling, en passant, promotion, check),
 * tactics (fork, pin, skewer, discovered attack) and move quality
 * (best, good, inaccuracy, mistake, blunder).
 */
import type { Move, PieceSymbol } from 'chess.js'
import { PIECE_NAMES } from './game'
import type { Tactic, TacticKind } from './tactics'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Knight to f3", "Bishop takes knight on c6", "Castles kingside". */
export function plainName(move: Move): string {
  if (move.isKingsideCastle()) return 'Castles kingside'
  if (move.isQueensideCastle()) return 'Castles queenside'
  const piece = cap(PIECE_NAMES[move.piece])
  let text = move.captured
    ? `${piece} takes ${PIECE_NAMES[move.captured]} on ${move.to}`
    : `${piece} to ${move.to}`
  if (move.isEnPassant()) text += ' (en passant)'
  if (move.promotion) text += `, becomes a ${PIECE_NAMES[move.promotion]}`
  if (move.san.endsWith('#')) text += ', checkmate'
  else if (move.san.endsWith('+')) text += ', check'
  return text
}

export type TermId =
  | 'checkmate'
  | 'check'
  | 'castling'
  | 'en-passant'
  | 'promotion'
  | 'underpromotion'
  | 'capture'

export type Term = { id: TermId; label: string; explain: string }

const TERMS: Record<TermId, Omit<Term, 'id'>> = {
  checkmate: {
    label: 'Checkmate',
    explain: 'Checkmate: the king is attacked and has no way out. Game over.',
  },
  check: {
    label: 'Check',
    explain: 'Check: the king is attacked and must escape, block or capture right away.',
  },
  castling: {
    label: 'Castling',
    explain:
      'Castling: the king steps two squares toward a rook, and the rook hops over it. It tucks the king away and wakes up the rook.',
  },
  'en-passant': {
    label: 'En passant',
    explain:
      'En passant: a pawn that just jumped two squares can be captured as if it had moved only one. You only get one chance to do it.',
  },
  promotion: {
    label: 'Promotion',
    explain: 'Promotion: a pawn that reaches the last row becomes a queen, rook, bishop or knight.',
  },
  underpromotion: {
    label: 'Underpromotion',
    explain:
      "Underpromotion: turning a pawn into something other than a queen, usually to avoid stalemate or to give a knight's check.",
  },
  capture: { label: 'Capture', explain: '' },
}

/** The rule terms a move shows, most interesting first. */
export function termsFor(move: Move): Term[] {
  const ids: TermId[] = []
  if (move.san.endsWith('#')) ids.push('checkmate')
  if (move.isEnPassant()) ids.push('en-passant')
  if (move.isKingsideCastle() || move.isQueensideCastle()) ids.push('castling')
  if (move.promotion) ids.push(move.promotion === 'q' ? 'promotion' : 'underpromotion')
  if (move.san.endsWith('+')) ids.push('check')
  if (move.captured && !move.isEnPassant()) ids.push('capture')
  return ids.map((id) => ({ id, ...TERMS[id] }))
}

export const TACTIC_LABELS: Record<TacticKind, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  'discovered-attack': 'Discovered attack',
  'discovered-check': 'Discovered check',
  'double-check': 'Double check',
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * One sentence about a tactic, from the player's point of view.
 * `byMe` says whether the player made the move; `botName` names the other side.
 */
export function describeTactic(t: Tactic, byMe: boolean, botName: string, moved: PieceSymbol): string {
  const mine = byMe ? 'Your' : `The ${botName}'s`
  const theirs = byMe ? 'their' : 'your'
  const n = (p: PieceSymbol) => PIECE_NAMES[p]
  switch (t.kind) {
    case 'fork':
      return `Fork! ${mine} ${n(t.by)} attacks ${theirs} ${list(t.targets.map(n))} at the same time. Only one can escape.`
    case 'pin':
      return t.targets[1] === 'k'
        ? `Pin! ${mine} ${n(t.by)} pins ${theirs} ${n(t.targets[0])} to the king. It can't move, because that would expose the king.`
        : `Pin! ${mine} ${n(t.by)} pins ${theirs} ${n(t.targets[0])}: if it moves, the ${n(t.targets[1])} behind it is lost.`
    case 'skewer':
      return `Skewer! ${mine} ${n(t.by)} hits ${theirs} ${n(t.targets[0])}, and once it moves away, the ${n(t.targets[1])} behind it falls.`
    case 'discovered-attack':
      return `Discovered attack! Moving the ${n(moved)} uncovered ${byMe ? 'your' : `the ${botName}'s`} ${n(t.by)}, which now attacks ${theirs} ${n(t.targets[0])}.`
    case 'discovered-check':
      return `Discovered check! Moving the ${n(moved)} uncovered a check from ${byMe ? 'your' : `the ${botName}'s`} ${n(t.by)}.`
    case 'double-check':
      return `Double check! Two pieces give check at once, so the king has to move. Blocking or capturing can't stop both.`
  }
}

export type Quality = 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

/**
 * Lichess-style move grading by how much the mover's winning chances
 * dropped: 10+ points is an inaccuracy, 20+ a mistake, 30+ a blunder.
 */
export function classifyMove(opts: {
  winBefore: number
  winAfter: number
  played: string
  best: string | null
  inBook: boolean
}): Quality {
  if (opts.inBook) return 'book'
  const drop = opts.winBefore - opts.winAfter
  if (drop >= 30) return 'blunder'
  if (drop >= 20) return 'mistake'
  if (drop >= 10) return 'inaccuracy'
  if (opts.best && opts.played === opts.best) return 'best'
  return 'good'
}

export const QUALITY_LABELS: Record<Quality, string> = {
  book: 'Book move',
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

/** The little mark shown next to a move in the list (like "??" for a blunder). */
export const QUALITY_MARKS: Partial<Record<Quality, string>> = {
  best: '★',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}
