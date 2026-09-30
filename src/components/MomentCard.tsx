import { motion } from 'framer-motion'
import type { Move } from '../chess/game'
import { plainName } from '../chess/naming'
import { Button } from './Button'
import { type MoveVerdict, costLine } from './useAnalysis'

type Props = {
  move: Move
  verdict: MoveVerdict
  /** The coach's sentence about the move ("That looks like a fork, but…"), if any. */
  why?: string | null
  showingBetter: boolean
  onTakeBack: () => void
  onShowBetter: () => void
  onPlayOn: () => void
}

/**
 * The game pauses (clock too) when you make a mistake or blunder, so you can
 * see what went wrong, try again, or carry on.
 */
export function MomentCard({ move, verdict, why, showingBetter, onTakeBack, onShowBetter, onPlayOn }: Props) {
  const blunder = verdict.quality === 'blunder'
  const text = why ?? verdict.refutation?.text ?? 'This lets your opponent take over.'
  return (
    <motion.div
      role="alert"
      aria-label={blunder ? 'Blunder' : 'Mistake'}
      className="rounded-card border border-danger/60 bg-danger/10 p-4 narrow:p-3"
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg font-mono text-base font-bold ${
            blunder ? 'bg-danger text-white' : 'bg-danger/25 text-danger'
          }`}
        >
          {blunder ? '??' : '?'}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-danger">
            {blunder ? 'Blunder!' : 'Mistake'} <span className="text-muted">{move.san}</span>
          </p>
          <p className="text-sm text-muted narrow:hidden">{plainName(move)}</p>
          <p className="mt-1 text-[15px] leading-snug narrow:text-sm">
            {text}
            {verdict.better && !text.includes(verdict.better) ? ` ${verdict.better} was better.` : ''}
          </p>
          <p className="mt-1 font-mono text-xs text-muted narrow:hidden">{costLine(verdict)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 narrow:mt-2">
        <Button variant="primary" onClick={onTakeBack} className="whitespace-nowrap px-1.5 text-[13px]">
          Take back
        </Button>
        <Button onClick={onShowBetter} className="whitespace-nowrap px-1.5 text-[13px]" disabled={!verdict.betterMove}>
          {showingBetter ? 'Hide move' : 'Show better'}
        </Button>
        <Button onClick={onPlayOn} className="whitespace-nowrap px-1.5 text-[13px]">
          Got it
        </Button>
      </div>
    </motion.div>
  )
}
