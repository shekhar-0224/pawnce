import { motion } from 'framer-motion'
import { HINTS_PER_GAME } from './useAnalysis'

type Props = {
  left: number
  loading: boolean
  enabled: boolean
  onUse: () => void
}

/** The glowing hint orbs next to your clock. Tap to spend one. */
export function HintOrbs({ left, loading, enabled, onUse }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onUse}
      disabled={!enabled}
      whileTap={enabled ? { scale: 0.97 } : undefined}
      aria-label={
        left === 0 ? 'No hints left' : `Use a hint: ${left} of ${HINTS_PER_GAME} left`
      }
      title={left === 0 ? 'No hints left this game' : 'Show 3 strong moves'}
      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 disabled:cursor-not-allowed"
    >
      {Array.from({ length: HINTS_PER_GAME }, (_, i) => {
        const full = i < left
        const pulsing = loading && i === left - 1
        return (
          <motion.span
            key={i}
            className="block size-6 rounded-full"
            style={
              full
                ? {
                    background:
                      'radial-gradient(circle at 35% 30%, #fff 0 8%, var(--accent-2) 45%, color-mix(in srgb, var(--accent-2) 55%, black) 100%)',
                    boxShadow: enabled
                      ? '0 0 12px color-mix(in srgb, var(--accent-2) 70%, transparent)'
                      : 'none',
                    opacity: enabled || loading ? 1 : 0.55,
                  }
                : { border: '2px dashed var(--border)' }
            }
            animate={pulsing ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={pulsing ? { duration: 0.7, repeat: Infinity } : { duration: 0.2 }}
          />
        )
      })}
    </motion.button>
  )
}
