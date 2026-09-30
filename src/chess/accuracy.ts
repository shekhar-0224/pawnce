import type { Quality } from './naming'

type Graded = { quality: Quality; winBefore: number; winAfter: number }

/** Lichess-style accuracy for one move, from the drop in winning chances. */
export function moveAccuracy(v: Graded): number {
  const drop = Math.max(0, v.winBefore - v.winAfter)
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  // A big material giveaway caps the score even when chances barely moved.
  const cap = v.quality === 'blunder' ? 30 : v.quality === 'mistake' ? 55 : 100
  return Math.min(cap, Math.max(0, acc))
}

/** Average accuracy of a set of graded moves (0–100), or null if there are none. */
export function averageAccuracy(moves: Graded[]): number | null {
  return moves.length ? Math.round(moves.reduce((s, v) => s + moveAccuracy(v), 0) / moves.length) : null
}
