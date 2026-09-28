import { AnimatePresence, motion } from 'framer-motion'
import type { Color, Move } from '../chess/game'
import {
  QUALITY_LABELS,
  type Quality,
  TACTIC_LABELS,
  describeTactic,
  plainName,
  termsFor,
} from '../chess/naming'
import type { Opening } from '../chess/openings'
import type { Bot } from '../engine/bots'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { MoveVerdict } from './useAnalysis'

type Entry = { move: Move; verdict: MoveVerdict | null }

type Props = {
  /** The last two moves (usually yours and the bot's reply), oldest first. */
  entries: Entry[]
  myColor: Color
  bot: Bot
  opening: Opening | null
}

const QUALITY_TONE: Record<Quality, string> = {
  book: 'bg-surface-2 text-muted',
  best: 'bg-success/15 text-success',
  good: 'bg-success/10 text-success',
  inaccuracy: 'bg-accent/10 text-accent',
  mistake: 'bg-accent/20 text-accent',
  blunder: 'bg-danger/15 text-danger',
}

function qualityLine(v: MoveVerdict, byMe: boolean, botName: string): string {
  // Always told from the player's side of the board.
  const from = Math.round(byMe ? v.winBefore : 100 - v.winBefore)
  const to = Math.round(byMe ? v.winAfter : 100 - v.winAfter)
  const change = `Your winning chances went from ${from}% to ${to}%.`
  const better = v.better ? ` Better was ${v.better}.` : ''
  switch (v.quality) {
    case 'book':
      return 'A well-known opening move, played by masters for years.'
    case 'best':
      return byMe ? "That's exactly what the engine would play." : `The ${botName} found the strongest move.`
    case 'good':
      return byMe ? 'A solid move.' : `A solid move by the ${botName}.`
    case 'inaccuracy':
    case 'mistake':
      return byMe ? `${change}${better}` : `The ${botName} slipped. ${change}`
    case 'blunder':
      return byMe
        ? `${change}${better}`
        : `The ${botName} blundered! ${change} Look for a way to punish it.`
  }
}

/**
 * Names the latest moves and teaches the words that go with them:
 * the opening, rule terms, any tactic, and how good each move was.
 */
export function MoveCard({ entries, myColor, bot, opening }: Props) {
  return (
    <section aria-label="Last moves" className="flex flex-col gap-2 rounded-2xl bg-bg/40 p-3">
      {opening && (
        <p className="text-xs font-bold text-muted">
          {opening.eco} · {opening.name}
        </p>
      )}
      {entries.length === 0 && (
        <p className="text-sm text-muted">
          Every move gets named here, along with the chess words that go with it.
        </p>
      )}
      <AnimatePresence initial={false}>
        {[...entries].reverse().map(({ move, verdict }, i) => (
          <MoveEntry
            key={move.after}
            move={move}
            verdict={verdict}
            byMe={move.color === myColor}
            bot={bot}
            latest={i === 0}
          />
        ))}
      </AnimatePresence>
    </section>
  )
}

function MoveEntry({
  move,
  verdict,
  byMe,
  bot,
  latest,
}: {
  move: Move
  verdict: MoveVerdict | null
  byMe: boolean
  bot: Bot
  latest: boolean
}) {
  const botName = bot.name
  const terms = termsFor(move)
  const tactic = mainTactic(detectTactics(move.before, move))
  // The most interesting thing to explain: a tactic, else a rule term.
  const lesson = tactic
    ? describeTactic(tactic, byMe, botName, move.piece)
    : terms.find((t) => t.explain)?.explain
  // For the bot's moves, only talk about quality when it matters to you.
  const showQuality =
    byMe || (verdict && (verdict.quality === 'mistake' || verdict.quality === 'blunder'))

  return (
    <motion.div
      layout
      // A colored stripe says whose move it is: mango for you, grey for the bot.
      className={`flex flex-col gap-1.5 border-l-4 pl-3 ${byMe ? 'border-accent' : 'border-muted/40'}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: latest ? 1 : 0.8, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            byMe ? 'bg-accent text-on-accent' : 'bg-surface-2 text-text'
          }`}
        >
          {byMe ? 'You' : `${bot.emoji} ${botName}`}
        </span>
        <span className="font-display text-lg font-semibold">{move.san}</span>
      </div>
      <p className="text-sm text-muted">{plainName(move)}</p>

      {(tactic || terms.length > 0 || (verdict && showQuality)) && (
        <div className="flex flex-wrap gap-1.5">
          {tactic && (
            <motion.span
              className="rounded-full bg-accent-2 px-2.5 py-0.5 text-xs font-bold text-bg"
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.15, 1] }}
              transition={{ duration: 0.35 }}
            >
              {TACTIC_LABELS[tactic.kind]}!
            </motion.span>
          )}
          {terms.map((t) => (
            <span key={t.id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold">
              {t.label}
            </span>
          ))}
          {verdict && showQuality && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${QUALITY_TONE[verdict.quality]}`}>
              {QUALITY_LABELS[verdict.quality]}
            </span>
          )}
        </div>
      )}

      {lesson && <p className="text-sm">{lesson}</p>}
      {byMe && !verdict && <p className="text-sm text-muted">Judging the move…</p>}
      {verdict && showQuality && (
        <p className="text-sm text-muted">{qualityLine(verdict, byMe, botName)}</p>
      )}
    </motion.div>
  )
}
