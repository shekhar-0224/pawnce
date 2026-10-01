/*
 * Explains why a move was bad, in board terms: what the opponent's best
 * reply does (captures, attacks, tactics, mate), e.g.
 * "the pawn on b7 can capture your queen on g4."
 */
import { Chess, type Color, type Square } from 'chess.js'
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

// ---------------------------------------------------------------------------
// The real loss: walk the engine's line and find which of the mover's pieces
// actually ends up lost once even trades are cancelled out.

type Capture = { ply: number; square: Square; victim: string; victimColor: 'w' | 'b'; value: number; id: string | null; by: { type: string; from: Square } }

/**
 * @param fenBefore  the position before the bad move
 * @param move       the bad move (from, to, promotion)
 * @param pv         the engine's best line after the bad move (UCI), opponent first
 * @param view       'mover' ("your bishop"), or 'punisher' ("their bishop")
 * @returns an explanation naming the piece really lost, or null when no
 *          piece (2+ points) is lost net of trades.
 */
export function describeLoss(
  fenBefore: string,
  move: { from: Square; to: Square; promotion?: string },
  pv: string[],
  view: 'mover' | 'punisher' = 'mover',
): Refutation | null {
  const before = new Chess(fenBefore)
  const g = new Chess(fenBefore)
  let mine
  try {
    mine = g.move({ from: move.from, to: move.to, promotion: move.promotion })
  } catch {
    return null
  }
  const me = mine.color
  const them = otherColor(me)
  const afterMove = new Chess(g.fen())
  const P = view === 'mover' ? { Your: 'Your', your: 'your', you: 'you', the: 'the' } : { Your: 'Their', your: 'their', you: 'they', the: 'your' }

  // Follow each of my pieces by where it stood right after my move.
  const idAt = new Map<Square, string>()
  for (const p of g.board().flat()) if (p && p.color === me) idAt.set(p.square, p.square)

  // Walk at least 4 plies, and keep going while captures continue (max 10).
  const captures: Capture[] = []
  for (let i = 0; i < Math.min(pv.length, 10); i++) {
    if (i >= 4 && !(() => {
      try {
        return !!new Chess(g.fen()).move(parseUci(pv[i])).captured
      } catch {
        return false
      }
    })()) break
    let mv
    try {
      mv = g.move(parseUci(pv[i]))
    } catch {
      break
    }
    if (mv.captured) {
      const sq = mv.isEnPassant() ? (`${mv.to[0]}${mv.from[1]}` as Square) : mv.to
      const victimColor = mv.color === 'w' ? 'b' : 'w'
      captures.push({
        ply: i,
        square: sq,
        victim: mv.captured,
        victimColor,
        value: VALUE[mv.captured],
        id: victimColor === me ? (idAt.get(sq) ?? null) : null,
        by: { type: mv.piece, from: mv.from },
      })
      if (victimColor === me) idAt.delete(sq)
    }
    if (mv.color === me) {
      const id = idAt.get(mv.from)
      if (id) {
        idAt.delete(mv.from)
        idAt.set(mv.to, id)
      }
    }
  }

  // Cancel even trades: a capture answered later on the same square by an
  // equal (or bigger) capture from the other side.
  const used = new Set<number>()
  captures.forEach((c, i) => {
    if (used.has(i)) return
    const k = captures.findIndex((n, j) => j > i && !used.has(j) && n.victimColor !== c.victimColor && n.square === c.square && n.value >= c.value)
    if (k >= 0) {
      used.add(i)
      used.add(k)
    }
  })
  const left = captures.filter((_, i) => !used.has(i))
  const myLosses = left.filter((c) => c.victimColor === me).sort((a, b) => b.value - a.value)
  const theirLosses = left.filter((c) => c.victimColor === them)
  // Remaining equal-value losses on both sides also cancel out (same square first).
  for (const t of theirLosses) {
    const same = myLosses.findIndex((m) => m.value === t.value && m.square === t.square)
    const k = same >= 0 ? same : myLosses.findIndex((m) => m.value === t.value)
    if (k >= 0) myLosses.splice(k, 1)
  }
  // Net loss counts every capture in the line (and whatever my move took);
  // the cancelling above only picks which piece to name.
  const net =
    captures.reduce((s, c) => s + (c.victimColor === me ? c.value : -c.value), 0) -
    (mine.captured ? VALUE[mine.captured] : 0)
  const lost = myLosses[0]
  if (!lost || net < 2 || lost.value < 3) return null

  // If their first reply could be taken back evenly, it isn't the real
  // problem: prefer a piece that was already hanging and still is.
  let pick: { victim: string; home: Square } = { victim: lost.victim, home: (lost.id ?? lost.square) as Square }
  if (lost.ply === 0 && evenlyRecapturable(afterMove, pv[0], me)) {
    const hanging = stillHanging(before, afterMove, me, [lost.square, move.to])
    if (hanging) pick = hanging
  }
  const pieceName = PIECE_NAMES[pick.victim as keyof typeof PIECE_NAMES]
  const home = pick.home
  const arrows = [{ from: lost.by.from, to: lost.square }]

  // Was it already attacked before the move, and left where it was?
  if (home !== move.to) {
    const attackers = before.attackers(home, them).filter((s) => afterMove.attackers(home, them).includes(s))
    if (attackers.length && before.get(home)?.color === me) {
      const cheapest = attackers.sort((a, b) => VALUE[before.get(a)!.type] - VALUE[before.get(b)!.type])[0]
      return {
        text: `${P.Your} ${pieceName} on ${home} is still attacked by ${P.the} ${PIECE_NAMES[before.get(cheapest)!.type]} on ${cheapest}, and ${P.you} didn’t move it.`,
        arrows: [{ from: cheapest, to: home }],
      }
    }
  }
  // The piece just moved lands where it can be taken: name the cheapest taker.
  if (home === move.to) {
    const free = afterMove.attackers(move.to, me).length === 0
    const takers = afterMove.attackers(move.to, them).sort((a, b) => VALUE[afterMove.get(a)!.type] - VALUE[afterMove.get(b)!.type])
    const from = takers[0] ?? lost.by.from
    const type = takers[0] ? afterMove.get(takers[0])!.type : lost.by.type
    return {
      text: `${P.Your} ${pieceName} on ${home} can be taken by ${P.the} ${PIECE_NAMES[type as keyof typeof PIECE_NAMES]} on ${from}${free ? ' for free' : ''}.`,
      arrows: [{ from, to: home }],
    }
  }
  // Otherwise it's lost a few moves into their best line.
  const first = new Chess(afterMove.fen()).move(parseUci(pv[0]))
  return {
    text: `${P.Your} ${pieceName} on ${home} gets lost: their best line starts ${first.san} and wins it a few moves later.`,
    arrows: [{ from: first.from, to: first.to }, ...arrows],
  }
}

/** After `reply` (a capture), can `me` take back on that square without losing more than they took? */
function evenlyRecapturable(fen: Chess, reply: string, me: Color): boolean {
  const g = new Chess(fen.fen())
  let mv
  try {
    mv = g.move(parseUci(reply))
  } catch {
    return false
  }
  if (!mv.captured) return false
  return g.attackers(mv.to, me).length > 0 && VALUE[mv.piece] >= VALUE[mv.captured]
}

/**
 * My most valuable piece (worth 3+) that was attacked before my move and is
 * still attacked after it, from the same square, by something cheaper or
 * while undefended.
 */
function stillHanging(before: Chess, after: Chess, me: Color, skip: Square[]): { victim: string; home: Square } | null {
  const them = otherColor(me)
  let best: { victim: string; home: Square; value: number } | null = null
  for (const p of after.board().flat()) {
    if (!p || p.color !== me || skip.includes(p.square) || VALUE[p.type] < 3 || p.type === 'k') continue
    if (before.get(p.square)?.type !== p.type || before.get(p.square)?.color !== me) continue
    const now = after.attackers(p.square, them)
    if (!now.length || !before.attackers(p.square, them).length) continue
    const cheapest = Math.min(...now.map((s) => VALUE[after.get(s)!.type]))
    const defended = after.attackers(p.square, me).length > 0
    if (cheapest < VALUE[p.type] || !defended) {
      if (!best || VALUE[p.type] > best.value) best = { victim: p.type, home: p.square, value: VALUE[p.type] }
    }
  }
  return best && { victim: best.victim, home: best.home }
}

/**
 * A winning move you didn't play: walk the engine's best line from the
 * position before your move and see what it wins, net of trades. Returns
 * null unless it wins at least a pawn.
 * "You missed Nxe5, which wins the pawn on e5."
 */
export function describeMissed(fenBefore: string, bestPv: string[], view: 'mover' | 'punisher' = 'mover', mateIn: number | null = null): Refutation | null {
  if (!bestPv.length) return null
  const g = new Chess(fenBefore)
  const me = g.turn()
  let first
  try {
    first = new Chess(fenBefore).move(parseUci(bestPv[0]))
  } catch {
    return null
  }
  const captures: { ply: number; square: Square; victim: string; mine: boolean; value: number; from: Square }[] = []
  // Follow the whole line (up to 12 moves): a missed win often pays off a few moves in.
  for (let i = 0; i < Math.min(bestPv.length, 12); i++) {
    let mv
    try {
      mv = g.move(parseUci(bestPv[i]))
    } catch {
      break
    }
    if (mv.captured) {
      const sq = mv.isEnPassant() ? (`${mv.to[0]}${mv.from[1]}` as Square) : mv.to
      // `mine` = one of MY pieces was taken
      captures.push({ ply: i, square: sq, victim: mv.captured, mine: mv.color !== me, value: VALUE[mv.captured], from: mv.from })
    }
  }
  const P0 = view === 'mover' ? 'You' : 'They'
  if (mateIn !== null && mateIn > 0) {
    return { text: `${P0} missed ${first.san}, which ${view === 'mover' ? 'leads' : 'would have led'} to checkmate.`, arrows: [{ from: first.from, to: first.to }] }
  }
  const net = captures.reduce((s, c) => s + (c.mine ? -c.value : c.value), 0)
  // No material in the line: it's an attack (several checks), or simply a much better move.
  if (net < 1) return missedNoMaterial(fenBefore, bestPv, first.san, first.from, first.to, view)
  // Name what's won: cancel even trades on the same square, then take the biggest prize left.
  const used = new Set<number>()
  captures.forEach((c, i) => {
    if (used.has(i)) return
    const k = captures.findIndex((n, j) => j > i && !used.has(j) && n.mine !== c.mine && n.square === c.square && n.value >= c.value)
    if (k >= 0) {
      used.add(i)
      used.add(k)
    }
  })
  const won = captures.filter((c, i) => !used.has(i) && !c.mine).sort((a, b) => b.value - a.value)[0]
  if (!won) return missedNoMaterial(fenBefore, bestPv, first.san, first.from, first.to, view)
  const piece = PIECE_NAMES[won.victim as keyof typeof PIECE_NAMES]
  const P = view === 'mover' ? { You: 'You', the: 'the', which: 'which wins' } : { You: 'They', the: 'your', which: 'which would have won' }
  const now = won.ply === 0
  return {
    text: now
      ? `${P.You} missed ${first.san}, ${P.which} ${P.the} ${piece} on ${won.square}.`
      : `${P.You} missed ${first.san}: it ${view === 'mover' ? 'wins' : 'would have won'} ${P.the} ${piece} on ${won.square} a few moves later.`,
    arrows: [{ from: first.from, to: first.to }],
  }
}

/** A missed move that wins no material within the line: an attack, or just much stronger. */
function missedNoMaterial(fenBefore: string, pv: string[], san: string, from: Square, to: Square, view: 'mover' | 'punisher'): Refutation {
  const g = new Chess(fenBefore)
  const me = g.turn()
  let checks = 0
  for (const u of pv.slice(0, 12)) {
    let mv
    try {
      mv = g.move(parseUci(u))
    } catch {
      break
    }
    if (mv.color === me && mv.san.includes('+')) checks++
  }
  const arrows = [{ from, to }]
  if (checks >= 2) {
    return {
      text: view === 'mover' ? `You missed ${san}: it starts a strong attack on their king.` : `They missed ${san}, which would have started a strong attack on your king.`,
      arrows,
    }
  }
  return { text: view === 'mover' ? `You missed ${san}, a much stronger move.` : `They missed ${san}, a much stronger move.`, arrows }
}

/**
 * Why a slip was a slip, in the order that matters: a forced mate, material
 * you actually lose (net of trades), a win you missed. The opponent's reply
 * is only described when it really wins something.
 */
export function explainSlip(p: {
  fenBefore: string
  move: { from: Square; to: Square; promotion?: string }
  /** The position after the move: the engine's best line and mate count. */
  after: { pv: string[]; best: string | null; mate: number | null }
  /** The position before the move: the engine's best line (and mate, for the mover). */
  before: { pv: string[]; mate?: number | null }
  view?: 'mover' | 'punisher'
}): Refutation | null {
  const view = p.view ?? 'mover'
  const fenAfter = (() => {
    const g = new Chess(p.fenBefore)
    try {
      g.move({ from: p.move.from, to: p.move.to, promotion: p.move.promotion })
    } catch {
      return null
    }
    return g.fen()
  })()
  if (!fenAfter) return null
  if (p.after.mate !== null && p.after.best) return describeRefutation(fenAfter, p.after.best, p.after.mate, view)
  return (p.after.pv.length ? describeLoss(p.fenBefore, p.move, p.after.pv, view) : null) ?? describeMissed(p.fenBefore, p.before.pv, view, p.before.mate ?? null)
}
