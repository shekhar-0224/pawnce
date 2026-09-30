import { motion, useReducedMotion } from 'framer-motion'

type Mood = 'happy' | 'sad' | 'wow'

/**
 * Pawny, the Pawnce mascot: a friendly green pawn with big eyes. It bobs
 * gently and blinks now and then. Mood changes the mouth (and brows).
 */
export function Mascot({ size = 120, mood = 'happy', bounce = true }: { size?: number; mood?: Mood; bounce?: boolean }) {
  const reduce = useReducedMotion()
  const float = bounce && !reduce
  return (
    <motion.svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      aria-hidden
      className="shrink-0"
      animate={float ? { y: [0, -6, 0] } : undefined}
      transition={float ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {/* shadow */}
      <ellipse cx="60" cy="124" rx="34" ry="5" fill="rgba(35,57,43,0.12)" />
      {/* body: base, stem and head, with a darker 3D edge */}
      <g style={{ fill: 'var(--accent-edge)' }}>
        <rect x="18" y="98" width="84" height="22" rx="11" />
        <path d="M38 102 C40 84 46 72 50 64 L70 64 C74 72 80 84 82 102 Z" />
        <circle cx="60" cy="44" r="30" />
      </g>
      <g style={{ fill: 'var(--accent)' }}>
        <rect x="18" y="94" width="84" height="22" rx="11" />
        <path d="M38 98 C40 80 46 68 50 60 L70 60 C74 68 80 80 82 98 Z" />
        <circle cx="60" cy="40" r="30" />
      </g>
      {/* shine */}
      <ellipse cx="46" cy="24" rx="8" ry="5" fill="rgba(255,255,255,0.35)" transform="rotate(-25 46 24)" />
      {/* eyes */}
      <motion.g
        style={{ originY: '42px' }}
        animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1, 1] }}
        transition={reduce ? undefined : { duration: 4, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
      >
        <ellipse cx="49" cy="40" rx="8" ry="10" fill="#fff" />
        <ellipse cx="71" cy="40" rx="8" ry="10" fill="#fff" />
        <circle cx={mood === 'sad' ? 49 : 51} cy={mood === 'sad' ? 44 : 41} r="4.5" fill="#23392b" />
        <circle cx={mood === 'sad' ? 71 : 73} cy={mood === 'sad' ? 44 : 41} r="4.5" fill="#23392b" />
      </motion.g>
      {mood === 'sad' && (
        <g stroke="#23392b" strokeWidth="3" strokeLinecap="round">
          <line x1="42" y1="27" x2="54" y2="31" />
          <line x1="78" y1="27" x2="66" y2="31" />
        </g>
      )}
      {/* mouth */}
      {mood === 'happy' && <path d="M50 55 Q60 64 70 55" fill="none" stroke="#23392b" strokeWidth="3.5" strokeLinecap="round" />}
      {mood === 'sad' && <path d="M51 60 Q60 53 69 60" fill="none" stroke="#23392b" strokeWidth="3.5" strokeLinecap="round" />}
      {mood === 'wow' && <ellipse cx="60" cy="58" rx="5" ry="6" fill="#23392b" />}
      {/* cheeks */}
      <circle cx="40" cy="52" r="4" fill="rgba(255,120,120,0.35)" />
      <circle cx="80" cy="52" r="4" fill="rgba(255,120,120,0.35)" />
    </motion.svg>
  )
}
