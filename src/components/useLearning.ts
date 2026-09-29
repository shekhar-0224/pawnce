import { useEffect, useMemo } from 'react'
import { conceptsOf, QUIET_WORDS } from '../chess/concepts'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { Color, Move } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import { openingFamily } from '../chess/openingInfo'
import { learnOpening, learnWord, useLearned } from '../storage/learned'
import type { MoveVerdict } from './useAnalysis'

export type LearnCardData =
  | { kind: 'word'; id: string; ply: number }
  | { kind: 'opening'; name: string; family: string; ply: number }

/**
 * The Learn cards waiting to be shown, in game order: each chess word the
 * first time it appears in any of your games, and each opening family the
 * first time you meet it. "Got it" (dismiss) adds it to your collection.
 */
export function useLearning(
  moves: Move[],
  verdicts: (MoveVerdict | null)[],
  myColor: Color,
  opening: { name: string; ply: number } | null,
) {
  const learned = useLearned()

  const cards = useMemo(() => {
    const out: LearnCardData[] = []
    const seen = new Set<string>()
    moves.forEach((m, ply) => {
      const byMe = m.color === myColor
      for (const id of conceptsOf(m, verdicts[ply]?.quality ?? null, byMe, ply)) {
        if (!WORDS_BY_ID[id] || QUIET_WORDS.has(id) || learned.words[id] || seen.has(id)) continue
        seen.add(id)
        out.push({ kind: 'word', id, ply })
      }
      if (opening && opening.ply === ply) {
        const family = openingFamily(opening.name)
        if (!learned.openings[family]) out.push({ kind: 'opening', name: opening.name, family, ply })
      }
    })
    return out.sort((a, b) => a.ply - b.ply)
  }, [moves, verdicts, myColor, opening, learned])

  // Everyday words are collected quietly, without a card.
  useEffect(() => {
    if (moves.some((m) => m.captured)) learnWord('capture')
  }, [moves])

  const current = cards[0] ?? null

  return {
    current,
    waiting: cards.length,
    dismiss: () => {
      if (!current) return
      if (current.kind === 'word') learnWord(current.id)
      else {
        learnOpening(current.family)
        learnWord('opening')
      }
    },
  }
}

/** Arrows that show the word on the board (for tactics), or the move itself. */
export function learnArrows(card: LearnCardData, moves: Move[]): { from: string; to: string }[] {
  const move = moves[card.ply]
  if (!move) return []
  if (card.kind === 'word') {
    const tactic = mainTactic(detectTactics(move.before, move))
    if (tactic && tactic.kind === card.id) {
      const [from, ...targets] = tactic.squares
      return targets.map((to) => ({ from, to }))
    }
  }
  return [{ from: move.from, to: move.to }]
}
