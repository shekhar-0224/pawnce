import { motion } from 'framer-motion'
import type { Move } from '../chess/game'
import { plainName } from '../chess/naming'
import { Button } from './Button'
import { type MoveVerdict, costLine } from './useAnalysis'

type Props = {
  move: Move
  verdict: MoveVerdict
  showingBetter: boolean
  onTakeBack: () => void
  onShowBetter: () => void
  onPlayOn: () => void
}

/**
 * The game pauses (clock too) when you make a mistake or blunder, so you can
 * see what went wrong, try again, or carry on.
 */
export function MomentCard({ move, verdict, showingBetter, onTakeBack, onShowBetter, onPlayOn }: Props) {
  const blunder = verdict.quality === 'blunder'
  return (
    <motion.div
      role="alertdialog"
      aria-label={blunder ? 'Blunder' : 'Mistake'}
      className="rounded-card border border-danger/40 bg-surface p-4"
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg font-mono text-base font-bold ${
            blunder ? 'bg-danger text-text' : 'bg-warn text-on-accent'
          }`}
        >
          {blunder ? '??' : '?'}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight">
            {blunder ? 'Blunder!' : 'Mistake'} <span className="text-muted">{move.san}</span>
          </p>
          <p className="text-sm text-muted">{plainName(move)}</p>
          <p className="mt-1 text-[15px] leading-snug">
            {verdict.refutation?.text ?? 'This lets your opponent take over.'}
            {verdict.better ? ` ${verdict.better} was better.` : ''}
          </p>
          <p className="mt-1 font-mono text-xs text-muted">{costLine(verdict)} · clock paused</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="primary" onClick={onTakeBack} className="px-2 text-sm">
          Take it back
        </Button>
        <Button onClick={onShowBetter} className="px-2 text-sm" disabled={!verdict.betterMove}>
          {showingBetter ? 'Hide move' : 'Show better'}
        </Button>
        <Button onClick={onPlayOn} className="px-2 text-sm">
          Play on
        </Button>
      </div>
    </motion.div>
  )
}
