import { AnimatePresence, motion } from 'framer-motion'
import type { Color, Move } from '../chess/game'
import { plainName } from '../chess/naming'
import { explainOpening } from '../chess/openingInfo'
import type { Threat } from '../chess/threats'
import type { Bot } from '../engine/bots'
import { BADGE, NOTE_TONES, botReplyNote, isSlip, yourMoveWhy } from './coachText'
import { ThinkingDots } from './ThinkingDots'
import { WordChips } from './WordTag'
import { type MoveVerdict, costLine } from './useAnalysis'

type Props = {
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  myColor: Color
  bot: Bot
  showingBetter: boolean
  onToggleBetter: () => void
  /** Per move: the opening name it newly reached, and the opening after it. */
  openings: { reached: (string | null)[]; current: (string | null)[] }
  /** What the bot threatens next, if anything. */
  threat: Threat | null
  /** The new chess words a move showed (each gets a NEW chip). */
  newWordsAt: (ply: number) => string[]
}

/**
 * The coach: talks about YOUR last move (how good it was, and why), then
 * the bot's reply, only saying more when it matters to you.
 */
export function Coach({ moves, verdicts, myColor, bot, showingBetter, onToggleBetter, openings, threat, newWordsAt }: Props) {
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
  // A newly named opening on the latest moves gets its own card (and isn't repeated below).
  const replyPly = mine >= 0 ? mine + 1 : 0
  const openingNow = (reply && openings.reached[replyPly]) || (mine >= 0 ? openings.reached[mine] : null) || null
  const openingBy = openingNow && reply && openings.reached[replyPly] === openingNow ? bot.name : 'you'

  return (
    <section aria-label="Coach" className="flex flex-col gap-3">
      <AnimatePresence initial={false}>{openingNow && <OpeningCard key={openingNow} name={openingNow} by={openingBy} />}</AnimatePresence>
      {mine < 0 ? (
        <p className="text-[15px]">
          {reply
            ? `The ${bot.name} opened with ${reply.san}. Your move!${openingNow ? '' : ' A good start: put a pawn or knight toward the center.'}`
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
              reached={openingNow ? null : (openings.reached[mine] ?? null)}
              current={openings.current[mine] ?? null}
              botName={bot.name}
              newWords={newWordsAt(mine)}
              showingBetter={showingBetter}
              onToggleBetter={onToggleBetter}
              replied={!!reply}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {reply && mine >= 0 && (
        <BotReply
          key={reply.after}
          newWords={newWordsAt(mine + 1)}
          move={reply}
          verdict={replyVerdict ?? null}
          bot={bot}
          reached={openingNow ? null : (openings.reached[mine + 1] ?? null)}
          threat={threat}
        />
      )}
    </section>
  )
}

function YourMove({
  move,
  verdict,
  reached,
  current,
  botName,
  newWords,
  showingBetter,
  onToggleBetter,
  replied,
}: {
  /** The bot has answered: the better move is shown on the earlier position. */
  replied: boolean
  newWords: string[]
  move: Move
  verdict: MoveVerdict | null
  reached: string | null
  current: string | null
  botName: string
  showingBetter: boolean
  onToggleBetter: () => void
}) {
  const badge = verdict ? BADGE[verdict.quality] : null
  const bad = isSlip(verdict)
  const why = yourMoveWhy(move, verdict, reached, current, botName)

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
      {why && (
        <p
          className={`text-[15px] leading-snug ${
            verdict?.quality === 'mistake' || verdict?.quality === 'blunder'
              ? 'rounded-lg border border-danger/50 bg-danger/10 px-3 py-2'
              : ''
          }`}
        >
          {why}
        </p>
      )}
      <WordChips ids={newWords} />
      {bad && verdict && <p className="font-mono text-xs text-muted">{costLine(verdict)}</p>}
      {bad && verdict?.better && (
        <button
          type="button"
          onClick={onToggleBetter}
          className="self-start rounded-lg border border-accent/50 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          {showingBetter ? (replied ? 'Back to game' : 'Hide better move') : replied ? `See ${verdict.better} on the board before your move` : `Show better move (${verdict.better})`}
        </button>
      )}
    </div>
  )
}

function BotReply({
  move,
  verdict,
  bot,
  reached,
  threat,
  newWords,
}: {
  newWords: string[]
  move: Move
  verdict: MoveVerdict | null
  bot: Bot
  reached: string | null
  threat: Threat | null
}) {
  const note = botReplyNote(move, verdict, bot, reached, threat)

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{bot.name} replied</p>
      <p className="text-[15px]">
        <span className="font-mono font-semibold">{move.san}</span>
        <span className="text-muted"> · {plainName(move)}</span>
      </p>
      {note && <p className={`rounded-lg px-3 py-2 text-sm ${NOTE_TONES[note.tone]}`}>{note.text}</p>}
      <WordChips ids={newWords} />
    </div>
  )
}

/** A named opening, the moment the game reaches it: a card, not a question. */
function OpeningCard({ name, by }: { name: string; by: string }) {
  return (
    <motion.div
      role="status"
      aria-label={`Opening: ${name}`}
      className="flex gap-3 rounded-2xl border-2 border-learn/40 bg-learn/10 p-3"
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-learn text-white">
        <svg viewBox="0 0 24 24" className="size-5">
          <path fill="currentColor" d="M5 3h9a4 4 0 0 1 4 4v14H8a3 3 0 0 1-3-3V3zm3 15a1 1 0 0 0 0 2h8v-2H8z" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-learn">Opening · played by {by}</p>
        <p className="font-black leading-tight">{name}</p>
        <p className="mt-1 text-sm leading-snug">{explainOpening(name)}</p>
      </div>
    </motion.div>
  )
}
