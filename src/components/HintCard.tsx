import { motion } from 'framer-motion'
import { HINT_ALPHAS, type Hint } from './useAnalysis'

/** The three suggested moves and the idea behind each. */
export function HintCard({ hints }: { hints: Hint[] }) {
  return (
    <motion.section
      aria-label="Hint"
      className="rounded-lg border border-accent/40 bg-accent/5 p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h2 className="mb-2 text-sm font-semibold text-accent">
        {hints.length === 1 ? 'The strongest move' : `${hints.length} strong moves`}
      </h2>
      <ol className="flex flex-col gap-2">
        {hints.map((h) => (
          <li key={h.rank} className="flex gap-3">
            <span
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs font-bold text-on-accent"
              style={{
                background: `color-mix(in srgb, var(--accent-2) ${HINT_ALPHAS[h.rank] * 100}%, var(--surface))`,
              }}
            >
              {h.rank + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">{h.san}</span>
                <span className="text-xs font-bold text-muted">you {Math.round(h.winPct)}%</span>
              </div>
              <p className="text-sm text-muted">{h.idea}</p>
            </div>
          </li>
        ))}
      </ol>
    </motion.section>
  )
}
