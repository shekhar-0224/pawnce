import { motion } from 'framer-motion'

type Props = {
  /** Your winning chances, 0 to 100, or null while the first judgement is coming. */
  myWinPct: number | null
  botName: string
}

function describe(pct: number, botName: string): string {
  if (pct >= 85) return "You're winning!"
  if (pct >= 60) return "You're doing better"
  if (pct > 40) return 'About even'
  if (pct > 15) return `The ${botName} is doing better`
  return `The ${botName} is winning`
}

// A twisted-rope texture made of diagonal stripes.
const rope = (base: string) =>
  `repeating-linear-gradient(115deg, ${base} 0 6px, color-mix(in srgb, ${base} 72%, black) 6px 9px)`

/**
 * The win % "rope": a tug of war between you and the bot. The knot slides
 * toward whoever is more likely to win.
 */
export function WinRope({ myWinPct, botName }: Props) {
  const pct = myWinPct ?? 50
  const shown = Math.round(pct)
  return (
    <section aria-label="Winning chances" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm font-bold">
        <span className="text-accent">
          You <span className="font-display text-lg">{shown}%</span>
        </span>
        <span className="text-muted">
          <span className="font-display text-lg">{100 - shown}%</span> {botName}
        </span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-label={`Your winning chances: ${shown}%`}
        className="relative h-4 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,.5)]"
        style={{ background: rope('var(--surface-2)') }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: rope('var(--accent)') }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {/* The knot in the middle of the rope */}
        <motion.div
          className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-board-light shadow-soft"
          initial={false}
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <p className="text-center text-sm font-semibold text-muted">
        {myWinPct === null ? 'Sizing up the position…' : describe(pct, botName)}
      </p>
    </section>
  )
}
