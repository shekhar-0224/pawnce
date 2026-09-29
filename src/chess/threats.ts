/*
 * Threat alerts: what the opponent would do if it were their move again.
 * We "pass" (hand the move back to them) and let the engine pick their best
 * move; if that move is a tactic or wins material, we warn, e.g.
 * "Watch out: their knight threatens a fork on c2, hitting your king and rook."
 */
import { Chess, type Square } from 'chess.js'
import { PIECE_NAMES, otherColor, parseUci } from './game'
import { VALUE, detectTactics, mainTactic } from './tactics'

export type Threat = {
  text: string
  /** The threatening move, then lines to what it would hit. */
  arrows: { from: Square; to: Square }[]
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The same position with the other side to move, or null when passing
 * isn't legal (you're in check).
 */
export function passFen(fen: string): string | null {
  const g = new Chess(fen)
  if (g.inCheck()) return null
  const parts = fen.split(' ')
  parts[1] = otherColor(parts[1] as 'w' | 'b')
  parts[3] = '-' // no en passant after a pass
  const passed = parts.join(' ')
  try {
    new Chess(passed)
  } catch {
    return null
  }
  return passed
}

/**
 * @param passed   the position with the opponent to move (from passFen)
 * @param uci      the engine's best move for them there
 * @param mateIn   their forced mate, if the engine sees one
 */
export function describeThreat(passed: string, uci: string, mateIn: number | null): Threat | null {
  const g = new Chess(passed)
  const them = g.turn()
  const me = otherColor(them)
  let move
  try {
    move = g.move(parseUci(uci))
  } catch {
    return null
  }
  const piece = PIECE_NAMES[move.piece]

  if (mateIn !== null && mateIn > 0 && mateIn <= 3) {
    return {
      text:
        mateIn === 1
          ? `Watch out: their ${piece} threatens checkmate on ${move.to}.`
          : `Watch out: they threaten a checkmate attack, starting with ${piece} to ${move.to}.`,
      arrows: [{ from: move.from, to: move.to }],
    }
  }

  const tactic = mainTactic(detectTactics(passed, move))
  if (tactic && (tactic.kind === 'fork' || tactic.kind === 'skewer' || tactic.kind === 'pin' || tactic.kind === 'discovered-attack')) {
    const names = tactic.targets.map((t) => PIECE_NAMES[t])
    const what: Record<string, string> = {
      fork: `a fork on ${move.to}, hitting your ${list(names)}`,
      pin: `a pin from ${move.to}, trapping your ${names[0]} in front of your ${names[1]}`,
      skewer: `a skewer from ${move.to}: your ${names[0]} must move and your ${names[1]} falls`,
      'discovered-attack': `a discovered attack on your ${names[0]}`,
    }
    return {
      text: `Watch out: their ${piece} threatens ${what[tactic.kind]}.`,
      arrows: [
        { from: move.from, to: move.to },
        ...tactic.squares.slice(1).map((t) => ({ from: tactic.squares[0], to: t })),
      ],
    }
  }

  if (move.captured) {
    const before = new Chess(passed)
    const free = before.attackers(move.to, me).length === 0
    if (free || VALUE[move.captured] > VALUE[move.piece]) {
      return {
        text: `Watch out: their ${piece} on ${move.from} threatens to take your ${PIECE_NAMES[move.captured]} on ${move.to}${free ? ', which is unprotected' : ''}.`,
        arrows: [{ from: move.from, to: move.to }],
      }
    }
  }
  return null
}
