import { motion, useReducedMotion } from 'framer-motion'

/** Three bouncing dots, shown while the bot is thinking. */
export function ThinkingDots() {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex items-end gap-1" role="status" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1.5 rounded-full bg-accent"
          animate={reduce ? { opacity: [0.4, 1, 0.4] } : { y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
        />
      ))}
    </span>
  )
}
