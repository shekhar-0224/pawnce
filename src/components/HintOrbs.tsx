import { motion } from 'framer-motion'
import { HINTS_PER_GAME } from './useAnalysis'

type Props = {
  left: number
  loading: boolean
  enabled: boolean
  onUse: () => void
}

/** The hint button next to your clock: one dot per hint left. */
export function HintOrbs({ left, loading, enabled, onUse }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onUse}
      disabled={!enabled}
      whileTap={enabled ? { scale: 0.98 } : undefined}
      aria-label={left === 0 ? 'No hints left' : `Use a hint: ${left} of ${HINTS_PER_GAME} left`}
      title={left === 0 ? 'No hints left this game' : 'Show 3 strong moves'}
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-muted enabled:hover:border-accent/50 enabled:hover:text-text disabled:cursor-not-allowed"
    >
      {loading ? 'Thinking…' : 'Hint'}
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: HINTS_PER_GAME }, (_, i) => {
          const full = i < left
          return (
            <motion.span
              key={i}
              className={`block size-2.5 rounded-full ${full ? 'bg-accent' : 'border border-muted/50'} ${
                full && !enabled && !loading ? 'opacity-40' : ''
              }`}
              animate={loading && i === left - 1 ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
              transition={loading ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
            />
          )
        })}
      </span>
    </motion.button>
  )
}
