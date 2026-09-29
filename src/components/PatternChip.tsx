import { motion } from 'framer-motion'
import { TACTIC_LABELS } from '../chess/naming'
import type { TacticKind } from '../chess/tactics'

/**
 * A short "FORK!" chip over the board when a tactic really works. It sits
 * on the half of the board away from the tactic, so it never hides it.
 */
export function PatternChip({ kind, mine, atBottom }: { kind: TacticKind; mine: boolean; atBottom: boolean }) {
  return (
    <div aria-live="polite" className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center ${atBottom ? 'bottom-3' : 'top-3'}`}>
      <motion.span
        role="status"
        className={`rounded-lg px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.12em] shadow-lg ${
          mine ? 'bg-accent text-on-accent' : 'bg-danger text-text'
        }`}
        initial={{ opacity: 0, y: -8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        {TACTIC_LABELS[kind]}!
      </motion.span>
    </div>
  )
}
