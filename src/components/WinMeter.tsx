import { motion } from 'framer-motion'
import { outcomeChances } from '../engine/winChance'

type Props = {
  /** Your expected score, 0 to 100 (null before the first judgement). */
  myWinPct: number | null
  botName: string
  /** Once the game ends: the final result. */
  final: 'win' | 'loss' | 'draw' | null
  /** One slim line, for phones. */
  compact?: boolean
}

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const

/** Win / draw / loss chances as one bar, like a sports broadcast. */
export function WinMeter({ myWinPct, botName, final, compact = false }: Props) {
  const c =
    final === 'win'
      ? { win: 100, draw: 0, loss: 0 }
      : final === 'loss'
        ? { win: 0, draw: 0, loss: 100 }
        : final === 'draw'
          ? { win: 0, draw: 100, loss: 0 }
          : outcomeChances(myWinPct ?? 50)
  const r = (n: number) => Math.round(n)
  const bar = (
    <div className="flex h-3 min-w-0 flex-1 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <motion.div className="bg-accent" initial={false} animate={{ flexGrow: c.win }} transition={spring} style={{ flexBasis: 0 }} />
      <motion.div className="bg-muted/40" initial={false} animate={{ flexGrow: c.draw }} transition={spring} style={{ flexBasis: 0 }} />
      <motion.div className="bg-[var(--piece-dark)]" initial={false} animate={{ flexGrow: c.loss }} transition={spring} style={{ flexBasis: 0 }} />
    </div>
  )
  if (compact) {
    return (
      <section
        aria-label={`Win chances: you ${r(c.win)}%, draw ${r(c.draw)}%, ${botName} ${r(c.loss)}%`}
        className="flex items-center gap-2 text-xs"
      >
        <span className="shrink-0 text-muted">You</span>
        <span className="shrink-0 font-mono font-semibold text-accent">{r(c.win)}%</span>
        {bar}
        <span className="shrink-0 font-mono font-semibold text-text">{r(c.loss)}%</span>
        <span className="shrink-0 text-muted">{botName}</span>
      </section>
    )
  }
  return (
    <section
      aria-label={`Win chances: you ${r(c.win)}%, draw ${r(c.draw)}%, ${botName} ${r(c.loss)}%`}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted">You</p>
          <p className="font-mono text-2xl font-semibold leading-none text-accent">{r(c.win)}%</p>
        </div>
        <div className="pb-0.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Win chances</p>
          <p className="text-xs font-semibold text-muted">Draw {r(c.draw)}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted">{botName}</p>
          <p className="font-mono text-2xl font-semibold leading-none text-text">{r(c.loss)}%</p>
        </div>
      </div>
      {bar}
      {myWinPct === null && !final && <p className="text-xs text-muted">Sizing up the position…</p>}
    </section>
  )
}
