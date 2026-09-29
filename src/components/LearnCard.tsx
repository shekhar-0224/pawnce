import { motion } from 'framer-motion'
import type { Color, Move } from '../chess/game'
import { WORDS, WORDS_BY_ID } from '../chess/glossary'
import { describeTactic, plainName } from '../chess/naming'
import { explainOpening } from '../chess/openingInfo'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import { isKnown, isNew, useLearned } from '../storage/learned'
import { Button } from './Button'
import type { MoveVerdict } from './useAnalysis'
import type { LearnCardData } from './useVocab'

type Props = {
  card: LearnCardData
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  myColor: Color
  bot: Bot
  onGotIt: () => void
  /** In a deck: "2 / 5". */
  progress?: string
  /** The button text (default "Got it"). */
  actionLabel?: string
}

const moveNo = (ply: number) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}`

/** What just happened in this game that shows the word. */
function contextFor(card: LearnCardData, move: Move, verdict: MoveVerdict | null, byMe: boolean, bot: Bot): string {
  const who = byMe ? 'You' : `The ${bot.name}`
  if (card.kind === 'opening') {
    return `${byMe ? 'You' : `The ${bot.name}`} chose it with ${moveNo(card.ply)} ${move.san}.`
  }
  const tactic = mainTactic(detectTactics(move.before, move))
  if (tactic && tactic.kind === card.id) return describeTactic(tactic, byMe, bot.name, move.piece)
  if (byMe && verdict?.betterMove) {
    const missed = mainTactic(detectTactics(move.before, verdict.betterMove))
    if (missed && missed.kind === card.id) {
      return `You missed one: instead of ${move.san}, ${verdict.better} was a ${WORDS_BY_ID[card.id].name.toLowerCase()}.`
    }
  }
  switch (card.id) {
    case 'stalemate':
    case 'insufficient':
    case 'threefold':
    case 'fifty-moves':
    case 'flag':
    case 'resign':
      return `This game ended this way.`
    case 'blunder':
    case 'mistake':
    case 'inaccuracy':
      return verdict
        ? `${move.san} cost about ${Math.max(0.5, Math.round(verdict.cpLoss / 50) / 2)} pawns’ worth.${verdict.better ? ` ${verdict.better} was better.` : ''}`
        : `${move.san} weakened your position.`
    case 'best':
      return `${move.san} was exactly the engine’s top choice. Nice!`
    case 'book':
      return `${move.san} is a standard opening move.`
    default:
      return `${who} played ${move.san}: ${plainName(move).toLowerCase()}.`
  }
}

/**
 * A flash card for a chess word (or an opening) met in this game: what it
 * means, where it happened, and a tip. "Got it" marks the word as known.
 */
export function LearnCard({ card, moves, verdicts, myColor, bot, onGotIt, progress, actionLabel = 'Got it' }: Props) {
  const learned = useLearned()
  const move = moves[card.ply]
  const byMe = move?.color === myColor
  const word = card.kind === 'word' ? WORDS_BY_ID[card.id] : null
  const title = word ? word.name : card.kind === 'opening' ? card.name : ''
  const fresh = word ? isNew(learned.words[word.id]) : !learned.openings[card.kind === 'opening' ? card.family : '']
  const label = word ? `${fresh ? 'New word' : 'Chess word'} · ${word.category}` : fresh ? 'New opening' : 'Opening'
  const meaning = word ? word.meaning : card.kind === 'opening' ? explainOpening(card.name) : ''
  const tip = word
    ? word.tip
    : 'An opening is a named way to start a game. Names help players study and talk about them.'
  const known = WORDS.filter((w) => isKnown(learned.words[w.id])).length

  return (
    <motion.section
      aria-label="Learn"
      className="flex flex-col gap-3 rounded-card border border-accent/50 bg-surface p-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">{label}</p>
        <p className="font-mono text-[11px] text-muted">
          {progress ?? (word ? `${known} / ${WORDS.length} words` : '')}
        </p>
      </div>
      <div>
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-1 text-[15px] leading-snug">{meaning}</p>
      </div>
      {move && (
        <p className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
          <span className="text-muted">In this game: </span>
          {contextFor(card, move, verdicts[card.ply] ?? null, byMe, bot)}
        </p>
      )}
      <p className="text-sm text-muted">
        <span className="font-semibold text-text">Tip: </span>
        {tip}
      </p>
      <Button variant="primary" onClick={onGotIt} className="w-full">
        {actionLabel}
      </Button>
    </motion.section>
  )
}
