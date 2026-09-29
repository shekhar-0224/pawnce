import { AnimatePresence, motion } from 'framer-motion'
import type { Color, Move } from '../chess/game'
import { type Quality, describeTactic, plainName, termsFor } from '../chess/naming'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import { ThinkingDots } from './ThinkingDots'
import { type MoveVerdict, costLine } from './useAnalysis'

type Props = {
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  myColor: Color
  bot: Bot
  showingBetter: boolean
  onToggleBetter: () => void
}

const BADGE: Record<Quality, { mark: string; word: string; tone: string }> = {
  book: { mark: 'B', word: 'a book move', tone: 'border border-border bg-surface-2 text-muted' },
  best: { mark: '★', word: 'the best move!', tone: 'bg-accent text-on-accent' },
  good: { mark: '✓', word: 'a good move', tone: 'bg-accent/20 text-accent' },
  inaccuracy: { mark: '?!', word: 'an inaccuracy', tone: 'bg-warn/20 text-warn' },
  mistake: { mark: '?', word: 'a mistake', tone: 'bg-warn text-on-accent' },
  blunder: { mark: '??', word: 'a blunder', tone: 'bg-danger text-text' },
}

const pct = (n: number) => `${Math.round(n)}%`

/**
 * The coach: talks about YOUR last move (how good it was, and why), then
 * the bot's reply, only saying more when it matters to you.
 */
export function Coach({ moves, verdicts, myColor, bot, showingBetter, onToggleBetter }: Props) {
  // Your most recent move, and the bot's reply to it (if it has replied).
  let mine = -1
  for (let i = moves.length - 1; i >= 0; i--) {
    if (moves[i].color === myColor) {
      mine = i
      break
    }
  }
  const reply = mine >= 0 ? moves[mine + 1] : moves[0] // as Black, the bot moves first
  const replyVerdict = mine >= 0 ? verdicts[mine + 1] : verdicts[0]

  return (
    <section aria-label="Coach" className="flex flex-col gap-3">
      {mine < 0 ? (
        <p className="text-[15px]">
          {reply
            ? `The ${bot.name} opened. Your move! A good start: put a pawn or knight toward the center.`
            : 'Your move! A good start: put a pawn in the middle, like e4 or d4.'}
        </p>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={moves[mine].after}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <YourMove
              move={moves[mine]}
              verdict={verdicts[mine]}
              botName={bot.name}
              showingBetter={showingBetter}
              onToggleBetter={onToggleBetter}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {reply && mine >= 0 && (
        <BotReply move={reply} verdict={replyVerdict ?? null} bot={bot} />
      )}
    </section>
  )
}

function YourMove({
  move,
  verdict,
  botName,
  showingBetter,
  onToggleBetter,
}: {
  move: Move
  verdict: MoveVerdict | null
  botName: string
  showingBetter: boolean
  onToggleBetter: () => void
}) {
  const tactic = mainTactic(detectTactics(move.before, move))
  const term = termsFor(move).find((t) => t.explain)
  const badge = verdict ? BADGE[verdict.quality] : null
  const bad = verdict && ['inaccuracy', 'mistake', 'blunder'].includes(verdict.quality)

  let why: string | null = null
  // A slip is explained by what the opponent can now do, in board terms.
  if (bad && verdict) why = verdict.refutation?.text ?? null
  else if (tactic) why = describeTactic(tactic, true, botName, move.piece)
  else if (term) why = term.explain
  else if (verdict?.quality === 'book') why = 'A well-known opening move that masters play all the time.'

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Your move</p>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg font-mono text-base font-bold ${
            badge ? badge.tone : 'bg-surface-2'
          }`}
        >
          {badge ? badge.mark : <ThinkingDots />}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight">
            {move.san}
            <span className="text-muted"> {badge ? `was ${badge.word}` : ''}</span>
          </p>
          <p className="text-sm text-muted">{plainName(move)}</p>
        </div>
      </div>
      {!verdict && <p className="text-sm text-muted">Checking your move…</p>}
      {why && <p className="text-[15px] leading-snug">{why}</p>}
      {bad && verdict && <p className="font-mono text-xs text-muted">{costLine(verdict)}</p>}
      {bad && verdict?.better && (
        <button
          type="button"
          onClick={onToggleBetter}
          className="self-start rounded-lg border border-accent/50 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          {showingBetter ? 'Hide better move' : `Show better move (${verdict.better})`}
        </button>
      )}
    </div>
  )
}

function BotReply({ move, verdict, bot }: { move: Move; verdict: MoveVerdict | null; bot: Bot }) {
  const tactic = mainTactic(detectTactics(move.before, move))
  const slipped = verdict && (verdict.quality === 'mistake' || verdict.quality === 'blunder')
  const helped = verdict && verdict.quality === 'inaccuracy'

  let note: { text: string; tone: string } | null = null
  if (tactic) {
    note = { text: `Watch out! ${describeTactic(tactic, false, bot.name, move.piece)}`, tone: 'border border-danger/40 bg-danger/10 text-text' }
  } else if (move.san.endsWith('+')) {
    note = { text: 'Check! Your king is attacked: move it, block, or capture the attacker.', tone: 'border border-danger/40 bg-danger/10 text-text' }
  } else if (slipped && verdict) {
    note = {
      text: `The ${bot.name} slipped! Your chances went from ${pct(100 - verdict.winBefore)} to ${pct(100 - verdict.winAfter)}. Look for a strong move.`,
      tone: 'border border-accent/40 bg-accent/10 text-text',
    }
  } else if (helped && verdict) {
    note = {
      text: `Not the ${bot.name}'s best. That helped you: ${pct(100 - verdict.winBefore)} → ${pct(100 - verdict.winAfter)}.`,
      tone: 'border border-border bg-surface-2 text-text',
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{bot.name} replied</p>
      <p className="text-[15px]">
        <span className="font-mono font-semibold">{move.san}</span>
        <span className="text-muted"> · {plainName(move)}</span>
      </p>
      {note && <p className={`rounded-lg px-3 py-2 text-sm ${note.tone}`}>{note.text}</p>}
    </div>
  )
}
