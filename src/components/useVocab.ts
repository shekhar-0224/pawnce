import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { conceptsOf, QUIET_WORDS } from '../chess/concepts'
import type { Color, Move } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import { openingFamily } from '../chess/openingInfo'
import { PIECE_WORD, materialOf, mateNames, moveNames, phaseNames, structureNames } from '../chess/patterns'
import type { EndReason } from '../chess/outcome'
import { type TacticKind, VALUE, detectTactics, mainTactic, tacticHolds } from '../chess/tactics'
import { type Sighting, isNew, learnOpening, loadLearned, recordWord, useLearned } from '../storage/learned'
import { isSlip } from './coachText'
import type { MoveVerdict } from './useAnalysis'

export type WordAt = { id: string; ply: number; how: Sighting }

/** Everyday words taught by tag and flash card, but never worth pausing the game for. */
const NO_PAUSE = new Set([
  'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'minor-piece', 'major-piece',
  // Castling already pauses for its own card.
  'kingside-castling', 'queenside-castling',
])

/** A flash card: a chess word (or opening) met in this game. */
export type LearnCardData =
  | { kind: 'word'; id: string; ply: number }
  | { kind: 'opening'; name: string; family: string; ply: number }

const TACTIC_IDS = new Set<string>(['fork', 'pin', 'skewer', 'discovered-attack', 'discovered-check', 'double-check'])

const END_WORDS: Partial<Record<EndReason, string>> = {
  stalemate: 'stalemate',
  insufficient: 'insufficient',
  threefold: 'threefold',
  'fifty-moves': 'fifty-moves',
  timeout: 'flag',
  resignation: 'resign',
}

/** The chess words one move shows, verified (a tactic only if it works). */
export function wordsForMove(
  move: Move,
  verdict: MoveVerdict | null,
  byMe: boolean,
  ply: number,
  /** The move before it, to spot trades (a capture answered by an equal recapture). */
  prev?: Move,
): WordAt[] {
  const holds = tacticHolds(verdict?.quality)
  const how: Sighting = byMe ? 'played' : 'seen'
  const out: WordAt[] = conceptsOf(move, byMe ? (verdict?.quality ?? null) : null, byMe, ply)
    .filter((id) => !TACTIC_IDS.has(id) || holds)
    .map((id) => ({ id, ply, how }))
  if (move.captured) {
    out.push({ id: 'capture', ply, how })
    // Taking a piece nobody defended: it was hanging. (Not a recapture,
    // which is just finishing a trade.)
    const victim = move.color === 'w' ? 'b' : 'w'
    const recapture = prev?.captured && prev.to === move.to
    if (!recapture && move.captured !== 'p' && new Chess(move.before).attackers(move.to, victim).length === 0) {
      out.push({ id: 'hanging-piece', ply, how })
    }
    // Recapturing an equal piece on the same square: a trade.
    if (prev?.captured && prev.to === move.to && VALUE[prev.captured] === VALUE[move.captured]) {
      out.push({ id: 'trade', ply, how })
    }
  }
  // A tactic you could have played instead of a slip.
  if (byMe && isSlip(verdict) && verdict?.betterMove) {
    const missed = mainTactic(detectTactics(move.before, verdict.betterMove))
    if (missed) out.push({ id: missed.kind as TacticKind, ply, how: 'missed' })
  }
  return out.filter((w) => WORDS_BY_ID[w.id])
}

/** The chess words each move shows (only once its grade is known). */
export function wordsPerMove(
  moves: Move[],
  verdicts: (MoveVerdict | null)[],
  myColor: Color,
  reached: (string | null)[],
): WordAt[][] {
  // Words that belong to the game rather than one move (each piece's first
  // move, the first capture, a phase starting) count only the first time.
  const once = new Set<string>()
  const firstTime = (id: string) => (once.has(id) ? false : (once.add(id), true))
  return moves.map((m, ply) => {
    const byMe = m.color === myColor
    const how: Sighting = byMe ? 'played' : 'seen'
    const extra: WordAt[] = []
    const add = (id: string, h: Sighting = how) => {
      if (firstTime(id)) extra.push({ id, ply, how: h })
    }
    add(PIECE_WORD[m.piece])
    if (m.captured) {
      add('piece-values')
      if (m.captured === 'n' || m.captured === 'b') add('minor-piece')
      if (m.captured === 'r' || m.captured === 'q') add('major-piece')
    }
    // Someone is a piece (3+ points) ahead: "material" matters now.
    if (Math.abs(materialOf(m.after, 'w') - materialOf(m.after, 'b')) >= 3) add('material', 'seen')
    for (const id of mateNames(m, ply)) extra.push({ id, ply, how })
    for (const id of phaseNames(m.after, ply)) add(id, 'seen')
    for (const id of moveNames(m)) add(id)
    for (const id of structureNames(m.after)) add(id, 'seen')

    const v = verdicts[ply] ?? null
    if (!v) return []

    // Sacrifice: the mover ends up 2+ points down after the reply (and still
    // after their next move, so it isn't just the middle of a trade), yet the
    // engine liked the move. Brilliant: a sacrifice that was the best move.
    const reply = moves[ply + 1]
    if (reply?.captured && ['good', 'best', 'book'].includes(v.quality)) {
      const them = m.color === 'w' ? 'b' : 'w'
      const diff = (fen: string) => materialOf(fen, m.color) - materialOf(fen, them)
      const settled = moves[ply + 2]?.after ?? reply.after
      if (diff(m.before) - diff(reply.after) >= 2 && diff(m.before) - diff(settled) >= 2) {
        extra.push({ id: 'sacrifice', ply, how })
        if (v.quality === 'best') extra.push({ id: 'brilliant', ply, how })
      }
    }
    // Miss: the opponent just blundered (or made a mistake) and this move
    // didn't punish it.
    const prevV = verdicts[ply - 1]
    if (prevV && (prevV.quality === 'mistake' || prevV.quality === 'blunder') && (isSlip(v) || v.cpLoss >= 100)) {
      extra.push({ id: 'miss', ply, how })
    }
    // The exchange: a rook traded for a knight or bishop on one square.
    const prev = moves[ply - 1]
    if (m.captured && prev?.captured && prev.to === m.to) {
      const pair = [m.captured, prev.captured].sort().join('')
      if (pair === 'br' || pair === 'nr') extra.push({ id: 'the-exchange', ply, how: 'seen' })
    }
    // Perpetual check: checking into the same position for the third time.
    if (m.san.includes('+')) {
      const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
      const positions = [moves[0].before, ...moves.slice(0, ply + 1).map((x) => x.after)]
      const repeats = positions.filter((f) => key(f) === key(m.after)).length
      const myLast = moves.slice(0, ply + 1).filter((x) => x.color === m.color).slice(-3)
      if (repeats >= 3 && myLast.length === 3 && myLast.every((x) => x.san.includes('+'))) {
        extra.push({ id: 'perpetual-check', ply, how })
      }
    }
    const words = [...wordsForMove(m, v, byMe, ply, moves[ply - 1]), ...extra]
    if (reached[ply]) words.push({ id: 'opening', ply, how: 'seen' })
    return words
  })
}

/** Flash cards for a game: each word (and each opening) it showed, in game order. */
export function gameCards(
  perPly: WordAt[][],
  reached: (string | null)[],
  endReason: EndReason | null,
  moveCount: number,
): LearnCardData[] {
  const out: LearnCardData[] = []
  const seen = new Set<string>()
  perPly.forEach((words, ply) => {
    for (const w of words) {
      if (QUIET_WORDS.has(w.id) || w.id === 'opening' || seen.has(w.id)) continue
      seen.add(w.id)
      out.push({ kind: 'word', id: w.id, ply })
    }
    const name = reached[ply]
    if (name && !seen.has(`o:${openingFamily(name)}`)) {
      seen.add(`o:${openingFamily(name)}`)
      out.push({ kind: 'opening', name, family: openingFamily(name), ply })
    }
  })
  const end = endReason ? END_WORDS[endReason] : undefined
  if (end && !seen.has(end)) out.push({ kind: 'word', id: end, ply: moveCount - 1 })
  return out
}

/**
 * Vocabulary memory for one game: counts every chess word you meet (seen,
 * played, missed) and every opening, and says which words are still New.
 */
export function useVocab(
  moves: Move[],
  verdicts: (MoveVerdict | null)[],
  myColor: Color,
  reached: (string | null)[],
  endReason: EndReason | null,
  /** This game's id, so each word remembers where you first met it. */
  gameId: string,
) {
  const learned = useLearned()
  // What you already knew when this game started, and a key for this game.
  const [before] = useState(loadLearned)
  const gameKey = gameId

  const perPly = useMemo(() => wordsPerMove(moves, verdicts, myColor, reached), [moves, verdicts, myColor, reached])

  useEffect(() => {
    perPly.forEach((words, ply) => {
      for (const w of words) {
        recordWord(w.id, w.how, `${gameKey}:${ply}:${moves[ply].lan}:${w.id}:${w.how}`, { game: gameKey, ply })
      }
      const name = reached[ply]
      if (name) learnOpening(openingFamily(name))
    })
    const end = endReason ? END_WORDS[endReason] : undefined
    if (end) recordWord(end, 'seen', `${gameKey}:end:${end}`, { game: gameKey, ply: Math.max(0, moves.length - 1) })
  }, [perPly, moves, reached, endReason, gameKey])

  /** The word to tag "New" on a move: its first one you haven't learned yet. */
  const newWordAt = (ply: number, opts: { forPause?: boolean } = {}): string | null =>
    perPly[ply]?.find(
      (w) =>
        w.how !== 'missed' &&
        !QUIET_WORDS.has(w.id) &&
        !(opts.forPause && NO_PAUSE.has(w.id)) &&
        isNew(learned.words[w.id]),
    )?.id ?? null

  // Flash cards: each word (and the opening) met this game, in game order.
  const cards = useMemo(
    () => gameCards(perPly, reached, endReason, moves.length),
    [perPly, reached, endReason, moves.length],
  )

  /** Words you met for the very first time in this game. */
  const newThisGame = cards.filter((c) => c.kind === 'word' && !before.words[c.id]).map((c) => (c as { id: string }).id)

  return { newWordAt, cards, newThisGame, perPly }
}
