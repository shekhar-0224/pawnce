import { AnimatePresence, motion } from 'framer-motion'
import type { Color, Move } from '../chess/game'
import { type Quality, QUALITY_MARKS, TACTIC_LABELS } from '../chess/naming'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import type { MoveVerdict } from './useAnalysis'

type Props = {
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  myColor: Color
  bot: Bot
}

const WORD: Record<Quality, string> = {
  book: 'book',
  best: 'best!',
  good: 'good',
  inaccuracy: 'inaccuracy',
  mistake: 'mistake',
  blunder: 'blunder',
}

const TONE: Record<Quality, string> = {
  book: 'text-muted',
  best: 'text-success',
  good: 'text-success',
  inaccuracy: 'text-accent',
  mistake: 'text-accent',
  blunder: 'text-danger',
}

/**
 * A strip right above the board with the last two moves, so you always
 * see what you played, what the bot answered, and how each one was.
 */
export function MoveTicker({ moves, verdicts, myColor, bot }: Props) {
  const start = Math.max(0, moves.length - 2)
  const recent = moves.slice(start)
  return (
    <div className="flex min-h-9 items-center gap-2 overflow-hidden text-sm" aria-live="polite">
      {recent.length === 0 && <span className="text-muted">Make your first move. Every move gets named here.</span>}
      <AnimatePresence initial={false} mode="popLayout">
        {recent.map((move, i) => {
          const ply = start + i
          const mine = move.color === myColor
          const v = verdicts[ply]
          const tactic = mainTactic(detectTactics(move.before, move))
          const botSlip = !mine && v && (v.quality === 'mistake' || v.quality === 'blunder')
          return (
            <motion.div
              key={move.after}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className={`flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 ${
                i === recent.length - 1 ? 'border-border bg-surface' : 'border-transparent bg-surface/50 opacity-75'
              }`}
            >
              <span className={`shrink-0 font-bold ${mine ? 'text-accent' : 'text-text'}`}>
                {mine ? 'You' : `${bot.emoji} ${bot.name}`}
              </span>
              <span className="shrink-0 font-display text-base font-semibold">{move.san}</span>
              {tactic && (
                <span className="shrink-0 rounded-full bg-accent-2 px-2 text-xs font-bold text-bg">
                  {TACTIC_LABELS[tactic.kind]}!
                </span>
              )}
              {v && (mine || botSlip) && (
                <span className={`truncate font-bold ${TONE[v.quality]}`}>
                  {QUALITY_MARKS[v.quality] ?? ''} {botSlip ? 'your chance!' : WORD[v.quality]}
                </span>
              )}
              {!v && mine && <span className="text-muted">…</span>}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
