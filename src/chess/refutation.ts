/*
 * Explains why a move was bad, in board terms: what the opponent's best
 * reply does (captures, attacks, tactics, mate), e.g.
 * "the pawn on b7 can capture your queen on g4."
 */
import { Chess, type Square } from 'chess.js'
import { PIECE_NAMES, otherColor, parseUci } from './game'
import { TACTIC_LABELS } from './naming'
import { VALUE, detectTactics, mainTactic } from './tactics'

export type Refutation = {
  /** One sentence, e.g. "The pawn on b7 can capture your queen on g4." */
  text: string
  /** Lines to draw on the board: the reply, and what it hits. */
  arrows: { from: Square; to: Square }[]
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * @param fenAfter  the position right after the bad move (opponent to move)
 * @param replyUci  the engine's best reply in that position
 * @param mateIn    moves to mate for the opponent, if the engine sees one
 * @param view      'mover' when you made the bad move ("their bishop can take
 *                  your queen"), 'punisher' when you get to reply ("your
 *                  bishop can take their queen")
 */
export function describeRefutation(
  fenAfter: string,
  replyUci: string,
  mateIn: number | null,
  view: 'mover' | 'punisher' = 'mover',
): Refutation | null {
  // Words for the replying side and the side that slipped.
  const P = view === 'mover' ? { their: 'their', your: 'your', The: 'The', Their: 'Their' } : { their: 'your', your: 'their', The: 'Your', Their: 'Your' }
  const g = new Chess(fenAfter)
  const them = g.turn()
  const me = otherColor(them)
  const { from, to, promotion } = parseUci(replyUci)
  let reply
  try {
    reply = g.move({ from, to, promotion })
  } catch {
    return null
  }
  const piece = PIECE_NAMES[reply.piece]
  const arrow = { from: reply.from, to: reply.to }

  if (mateIn !== null && mateIn > 0) {
    return {
      text:
        mateIn === 1
          ? `It allows checkmate: ${P.their} ${piece} to ${reply.to} ends the game.`
          : `It allows a forced checkmate in ${mateIn}, starting with ${P.their} ${piece} to ${reply.to}.`,
      arrows: [arrow],
    }
  }

  const tactic = mainTactic(detectTactics(fenAfter, reply))
  const before = new Chess(fenAfter)
  const undefended = (sq: Square) => before.attackers(sq, me).length === 0

  // Losing a real piece (knight or more) is the clearest thing to say.
  if (reply.captured && VALUE[reply.captured] >= 3) {
    const free = undefended(reply.to) ? ' for free' : ''
    const extra = tactic && tactic.kind !== 'fork' ? `, with a ${TACTIC_LABELS[tactic.kind].toLowerCase()}` : ''
    return {
      text: `${P.The} ${piece} on ${reply.from} can capture ${P.your} ${PIECE_NAMES[reply.captured]} on ${reply.to}${free}${extra}.`,
      arrows: [arrow],
    }
  }

  if (tactic) {
    const [origin, ...targets] = tactic.squares
    const names = tactic.targets.map((t) => PIECE_NAMES[t])
    const what: Record<string, string> = {
      fork: `a fork, hitting ${P.your} ${list(names)}`,
      pin: `a pin: ${P.your} ${names[0]} gets stuck in front of the ${names[1]}`,
      skewer: `a skewer: ${P.your} ${names[0]} must move and the ${names[1]} behind it falls`,
      'discovered-attack': `a discovered attack on ${P.your} ${names[0]}`,
      'discovered-check': 'a discovered check',
      'double-check': 'a double check',
    }
    return {
      text: `${P.Their} ${piece} can go to ${reply.to} with ${what[tactic.kind]}.`,
      arrows: [arrow, ...targets.map((t) => ({ from: origin, to: t }))],
    }
  }

  if (reply.captured) {
    return {
      text: `${P.The} ${piece} on ${reply.from} can capture ${P.your} pawn on ${reply.to}${undefended(reply.to) ? ' for free' : ''}.`,
      arrows: [arrow],
    }
  }

  // New attacks on your valuable or loose pieces.
  const hit: { name: string; sq: Square }[] = []
  for (const row of g.board()) {
    for (const p of row) {
      if (!p || p.color !== me || p.type === 'k') continue
      if (!g.attackers(p.square, them).includes(reply.to)) continue
      if (VALUE[p.type] > VALUE[reply.piece] || g.attackers(p.square, me).length === 0) {
        hit.push({ name: PIECE_NAMES[p.type], sq: p.square })
      }
    }
  }
  if (hit.length) {
    return {
      text: `${P.Their} ${piece} can go to ${reply.to} and attack ${P.your} ${list(hit.map((h) => `${h.name} on ${h.sq}`))}.`,
      arrows: [arrow, ...hit.map((h) => ({ from: reply.to, to: h.sq }))],
    }
  }

  if (reply.san.endsWith('+')) {
    return { text: `${cap(`${P.their} ${piece}`)} can give check from ${reply.to} and take over.`, arrows: [arrow] }
  }

  return {
    text:
      view === 'mover'
        ? `Their strongest answer is ${piece} to ${reply.to}, and your position gets harder.`
        : `Your strongest answer is ${piece} to ${reply.to}.`,
    arrows: [arrow],
  }
}
