import { motion } from 'framer-motion'
import { outcomeChances } from '../engine/winChance'

type Props = {
  /** Your expected score, 0 to 100 (null before the first judgement). */
  myWinPct: number | null
  botName: string
  /** Once the game ends: the final result. */
  final: 'win' | 'loss' | 'draw' | null
}

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const

/** Win / draw / loss chances as one bar, like a sports broadcast. */
export function WinMeter({ myWinPct, botName, final }: Props) {
  const c =
    final === 'win'
      ? { win: 100, draw: 0, loss: 0 }
      : final === 'loss'
        ? { win: 0, draw: 0, loss: 100 }
        : final === 'draw'
          ? { win: 0, draw: 100, loss: 0 }
          : outcomeChances(myWinPct ?? 50)
  const r = (n: number) => Math.round(n)
  return (
    <section
      aria-label={`Win chances: you ${r(c.win)}%, draw ${r(c.draw)}%, ${botName} ${r(c.loss)}%`}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-bold">You</p>
          <p className="font-display text-2xl font-semibold leading-none text-accent">{r(c.win)}%</p>
        </div>
        <div className="pb-0.5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Win chances</p>
          <p className="text-xs font-semibold text-muted">Draw {r(c.draw)}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{botName}</p>
          <p className="font-display text-2xl font-semibold leading-none text-board-light">{r(c.loss)}%</p>
        </div>
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        <motion.div className="rounded-l-full bg-accent" initial={false} animate={{ flexGrow: c.win }} transition={spring} style={{ flexBasis: 0 }} />
        <motion.div className="bg-muted/40" initial={false} animate={{ flexGrow: c.draw }} transition={spring} style={{ flexBasis: 0 }} />
        <motion.div className="rounded-r-full bg-board-light" initial={false} animate={{ flexGrow: c.loss }} transition={spring} style={{ flexBasis: 0 }} />
      </div>
      {myWinPct === null && !final && <p className="text-xs text-muted">Sizing up the position…</p>}
    </section>
  )
}
