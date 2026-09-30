import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { formatClock } from '../chess/clock'

type Props = {
  /** Time left when this clock last stopped or started, in ms. */
  remainingMs: number
  /** Date.now() when it started ticking, or null if it's stopped. */
  runningSince: number | null
  label: string
}

const LOW_TIME_MS = 10_000

/** A chess clock face. Ticks on its own, so the rest of the screen stays still. */
export function Clock({ remainingMs, runningSince, label }: Props) {
  const running = runningSince !== null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])

  const ms = running ? Math.max(0, remainingMs - (now - runningSince)) : remainingMs
  const low = ms < LOW_TIME_MS

  const tone = low
    ? 'bg-danger text-white'
    : running
      ? 'bg-accent text-on-accent'
      : 'border border-border bg-surface text-muted'

  return (
    <motion.div
      role="timer"
      aria-label={`${label}: ${formatClock(ms)}`}
      className={`min-w-[5.5rem] rounded-lg px-3 py-1.5 text-center font-mono text-lg font-semibold tabular-nums transition-colors ${tone}`}
      animate={low && running ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={low && running ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
    >
      {formatClock(ms)}
    </motion.div>
  )
}
