import { motion } from 'framer-motion'
import type { Result } from '../chess/outcome'
import type { Bot } from '../engine/bots'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'

type Props = {
  bot: Bot
  result: Result
  title: string
  detail: string
  moveCount: number
  onPlayAgain: () => void
  onChangeOpponent: () => void
  onClose: () => void
}

const BADGE: Record<Result, { label: string; className: string }> = {
  win: { label: 'You won', className: 'bg-success/15 text-success' },
  loss: { label: 'You lost', className: 'bg-danger/15 text-danger' },
  draw: { label: 'Draw', className: 'bg-surface-2 text-muted' },
}

/** Springs up from the bottom when the game ends. */
export function ResultCard(p: Props) {
  const badge = BADGE[p.result]
  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-end justify-center bg-bg/60 p-4 backdrop-blur-[2px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={p.onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-raised"
        initial={{ y: '110%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Close and look at the board"
          className="absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-full text-xl text-muted hover:bg-surface-2 hover:text-text"
        >
          ×
        </button>
        <div className="mx-auto mb-3 w-fit">
          <BotAvatar bot={p.bot} size={64} />
        </div>
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${badge.className}`}>
          {badge.label}
        </span>
        <h2 id="result-title" className="mt-3 font-display text-3xl font-bold">
          {p.title}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-muted">{p.detail}</p>
        <p className="mt-2 text-sm text-muted/80">
          {p.moveCount} {p.moveCount === 1 ? 'move' : 'moves'} vs. {p.bot.name} ({p.bot.level})
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" size="lg" onClick={p.onPlayAgain} autoFocus>
            Play again
          </Button>
          <Button size="lg" onClick={p.onChangeOpponent}>
            Change opponent
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
