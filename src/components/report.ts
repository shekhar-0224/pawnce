import { averageAccuracy } from '../chess/accuracy'
import { PATTERN_WORDS } from '../chess/glossary'
import type { BotId } from '../engine/bots'
import { type Learned, isLearnedPattern } from '../storage/learned'
import type { SavedGame } from '../storage/recentGames'
import type { LifetimeStats } from '../storage/stats'

export type Grade = { letter: string; label: string; tone: string }

/** A school-style grade from your average accuracy. */
export function gradeFor(accuracy: number | null): Grade {
  if (accuracy === null) return { letter: '–', label: 'Play a few games to get a grade', tone: 'bg-surface-2 text-muted' }
  if (accuracy >= 85) return { letter: 'A', label: 'Excellent', tone: 'bg-accent text-white' }
  if (accuracy >= 75) return { letter: 'B', label: 'Strong', tone: 'bg-info text-white' }
  if (accuracy >= 65) return { letter: 'C', label: 'Solid', tone: 'bg-learn text-white' }
  if (accuracy >= 50) return { letter: 'D', label: 'Getting there', tone: 'bg-warn text-white' }
  return { letter: 'E', label: 'Keep practising', tone: 'bg-danger text-white' }
}

/** Your graded moves in one saved game. */
function myGraded(g: SavedGame) {
  const mine = g.myColor === 'black' ? 1 : 0
  return (g.verdicts ?? []).filter((v, i): v is NonNullable<typeof v> => !!v && i % 2 === mine)
}

export type Report = {
  games: number
  results: { win: number; draw: number; loss: number }
  winRate: number | null
  timeMs: number
  /** Average accuracy over your recent graded games. */
  accuracy: number | null
  /** Accuracy of your last 5 games minus the 5 before (null without enough games). */
  trend: number | null
  gradedGames: number
  slipsPerGame: number | null
  goodShare: number | null
  byBot: { bot: BotId; win: number; draw: number; loss: number }[]
  patterns: { learned: number; total: number }
  openings: number
  lastResults: SavedGame['result'][]
  grade: Grade
}

export function buildReport(games: SavedGame[], stats: LifetimeStats, learned: Learned): Report {
  const graded = games.map((g) => ({ g, moves: myGraded(g) })).filter((x) => x.moves.length >= 3)
  const accs = graded.map((x) => averageAccuracy(x.moves)!)
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
  const accuracy = avg(accs)
  const trend = accs.length >= 6 ? avg(accs.slice(0, 5))! - avg(accs.slice(5, 10))! : null
  const allMoves = graded.flatMap((x) => x.moves)
  const slips = allMoves.filter((v) => v.quality === 'mistake' || v.quality === 'blunder').length
  const good = allMoves.filter((v) => v.quality === 'best' || v.quality === 'good' || v.quality === 'book').length
  const order: BotId[] = ['ant', 'frog', 'jaguar']
  return {
    games: stats.games,
    results: stats.results,
    winRate: stats.games ? Math.round((stats.results.win / stats.games) * 100) : null,
    timeMs: stats.timeMs,
    accuracy,
    trend,
    gradedGames: graded.length,
    slipsPerGame: graded.length ? Math.round((slips / graded.length) * 10) / 10 : null,
    goodShare: allMoves.length ? Math.round((good / allMoves.length) * 100) : null,
    byBot: order.filter((b) => stats.byBot[b]).map((b) => ({ bot: b, ...stats.byBot[b]! })),
    patterns: { learned: PATTERN_WORDS.filter((w) => isLearnedPattern(learned.words[w.id])).length, total: PATTERN_WORDS.length },
    openings: Object.keys(learned.openings).length,
    lastResults: games.slice(0, 10).map((g) => g.result),
    grade: gradeFor(accuracy),
  }
}
