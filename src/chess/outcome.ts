/*
 * Works out if and how a game ended, and explains it in plain words.
 */
import type { Chess, Color, PieceSymbol, Square } from 'chess.js'
import { hasMatingMaterial } from './clock'
import { PIECE_NAMES, kingSquare, otherColor } from './game'

export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'threefold'
  | 'insufficient'
  | 'fifty-moves'
  | 'resignation'
  | 'timeout'

export type Result = 'win' | 'loss' | 'draw'

export type Outcome = {
  reason: EndReason
  /** Winning color, or null for a draw. */
  winner: Color | null
}

/** How the game ended by the rules, or null if it goes on. */
export function detectOutcome(game: Chess): Outcome | null {
  if (game.isCheckmate()) return { reason: 'checkmate', winner: otherColor(game.turn()) }
  if (game.isStalemate()) return { reason: 'stalemate', winner: null }
  if (game.isInsufficientMaterial()) return { reason: 'insufficient', winner: null }
  if (game.isThreefoldRepetition()) return { reason: 'threefold', winner: null }
  if (game.isDrawByFiftyMoves()) return { reason: 'fifty-moves', winner: null }
  return null
}

/** `flagged` ran out of time: they lose, unless the opponent could never mate. */
export function timeoutOutcome(game: Chess, flagged: Color): Outcome {
  const opponent = otherColor(flagged)
  return { reason: 'timeout', winner: hasMatingMaterial(game, opponent) ? opponent : null }
}

export function resultFor(outcome: Outcome, me: Color): Result {
  if (outcome.winner === null) return 'draw'
  return outcome.winner === me ? 'win' : 'loss'
}

export function headline(result: Result, reason: EndReason): string {
  if (reason === 'checkmate') return result === 'win' ? 'You win!' : 'Checkmate'
  if (reason === 'resignation') return 'You resigned'
  if (reason === 'timeout' && result === 'win') return 'You win on time!'
  if (reason === 'timeout' && result === 'loss') return "Time's up!"
  if (reason === 'stalemate') return 'Stalemate!'
  return "It's a draw"
}

const IMPORTANCE: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p', 'k']

/**
 * Which of the winner's piece types took part in the mate: anything
 * attacking the king's square or a square next to it.
 */
function matingPieces(game: Chess, winner: Color): PieceSymbol[] {
  const king = kingSquare(game, otherColor(winner))
  if (!king) return []
  const file = king.charCodeAt(0)
  const rank = Number(king[1])
  const types = new Set<PieceSymbol>()
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      const f = file + df
      const r = rank + dr
      if (f < 97 || f > 104 || r < 1 || r > 8) continue
      const sq = `${String.fromCharCode(f)}${r}` as Square
      for (const from of game.attackers(sq, winner)) {
        const piece = game.get(from)
        if (piece) types.add(piece.type)
      }
    }
  }
  const list = IMPORTANCE.filter((t) => types.has(t))
  // The king only "helps"; mention it only if it's the lone partner.
  return list.length > 1 ? list.filter((t) => t !== 'k').slice(0, 3) : list
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** One friendly sentence explaining why the game ended. */
export function explain(game: Chess, outcome: Outcome, me: Color, botName: string): string {
  switch (outcome.reason) {
    case 'checkmate': {
      const winnerIsMe = outcome.winner === me
      const pieces = matingPieces(game, outcome.winner!).map((t) => PIECE_NAMES[t])
      const unique = pieces.length ? joinNames(pieces) : 'pieces'
      if (winnerIsMe) return `Checkmate! Your ${unique} trapped the king.`
      return `The ${botName}'s ${unique} trapped your king. Every escape square was covered.`
    }
    case 'stalemate':
      return game.turn() === me
        ? "Your king isn't in check, but you have no legal moves. That's a draw."
        : `The ${botName}'s king isn't in check, but it has no legal moves. That's a draw.`
    case 'threefold':
      return 'The same position came up three times, so the game is a draw by repetition.'
    case 'insufficient':
      return "Neither side has enough pieces left to checkmate, so it's a draw."
    case 'fifty-moves':
      return 'Fifty moves each passed with no capture and no pawn move: a draw by the 50-move rule.'
    case 'timeout': {
      if (outcome.winner === me) return `The ${botName}'s clock ran out. You win on time!`
      if (outcome.winner !== null) return `Your clock ran out, so the ${botName} wins on time. Try a longer time control?`
      const iFlagged = game.turn() === me
      return iFlagged
        ? `Your clock ran out, but the ${botName} doesn't have enough pieces left to checkmate, so it's a draw.`
        : `The ${botName}'s clock ran out, but you don't have enough pieces left to checkmate, so it's a draw.`
    }
    case 'resignation':
      return `You gave up this one. The ${botName} takes the win. Ready for a rematch?`
  }
}
