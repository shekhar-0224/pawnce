import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'

const LEAF_COLORS = ['var(--success)', 'var(--board-dark)', 'var(--accent)', 'var(--success)']
const COUNT = 22

function makeLeaves() {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 14 + Math.random() * 14,
    delay: Math.random() * 0.35,
    duration: 1.1 + Math.random() * 0.45,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() - 0.5) * 540,
    color: LEAF_COLORS[i % LEAF_COLORS.length],
  }))
}

/** A short shower of falling leaves for a win. Plain SVG shapes, gone in under 2s. */
export function LeafBurst() {
  const reduce = useReducedMotion()
  const [leaves] = useState(makeLeaves)
  if (reduce) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {leaves.map((l) => (
        <motion.svg
          key={l.id}
          viewBox="0 0 24 24"
          width={l.size}
          height={l.size}
          className="absolute -top-8"
          style={{ left: `${l.left}%` }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: l.drift, rotate: l.spin, opacity: [1, 1, 0] }}
          transition={{ duration: l.duration, delay: l.delay, ease: 'easeIn' }}
        >
          <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" fill={l.color} />
          <path d="M4 20 15 9" stroke="var(--bg)" strokeWidth="1.4" strokeLinecap="round" opacity=".45" />
        </motion.svg>
      ))}
    </div>
  )
}
