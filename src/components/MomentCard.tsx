import { motion } from 'framer-motion'
import type { Move } from '../chess/game'
import { plainName } from '../chess/naming'
import { Button } from './Button'
import type { MoveVerdict } from './useAnalysis'

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
  const pawns = verdict.cpLoss / 100
  const cost =
    pawns >= 0.8
      ? `It gives away about ${pawns >= 2 ? Math.round(pawns) : pawns.toFixed(1)} pawns' worth.`
      : `Your winning chances drop from ${Math.round(verdict.winBefore)}% to ${Math.round(verdict.winAfter)}%.`
  return (
    <motion.div
      role="alertdialog"
      aria-label={blunder ? 'Blunder' : 'Mistake'}
      className="absolute inset-x-2 bottom-2 z-30 rounded-2xl border border-border bg-surface/95 p-4 shadow-raised backdrop-blur sm:inset-x-4 sm:bottom-4"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${
            blunder ? 'bg-danger text-text' : 'bg-accent text-bg'
          }`}
        >
          {blunder ? '??' : '?'}
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-tight">
            {blunder ? 'Blunder!' : 'Mistake'} <span className="text-muted">{move.san}</span>
          </p>
          <p className="text-sm text-muted">{plainName(move)}</p>
          <p className="mt-1 text-[15px]">
            {cost} {verdict.better ? `${verdict.better} was better.` : ''} The clock is paused.
          </p>
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
