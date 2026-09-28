import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { TIME_CONTROL_GROUPS, TIME_CONTROLS, type TimeControlId } from '../chess/clock'
import { BOT_LIST, type BotId } from '../engine/bots'
import { BoardPreview } from './BoardPreview'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'
import { Logo } from './Logo'

export type SidePref = 'white' | 'black' | 'random'

type Props = {
  botId: BotId
  side: SidePref
  timeControl: TimeControlId
  onBotChange: (id: BotId) => void
  onSideChange: (side: SidePref) => void
  onTimeControlChange: (id: TimeControlId) => void
  onPlay: () => void
  onRecent: () => void
}

const SIDES: { id: SidePref; label: string }[] = [
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'random', label: 'Random' },
]

const FEATURES = ['Every move named', 'Live winning chances', 'Hints that explain why']

/** A numbered step inside the setup card. */
function Step({ n, title, id, children }: { n: number; title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2 id={id} className="flex items-center gap-2 text-sm font-bold text-muted">
        <span className="grid size-5 place-items-center rounded-full bg-surface-2 text-xs text-text">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Selected / unselected look shared by all the choice tiles. */
const tile = (active: boolean) =>
  `cursor-pointer rounded-2xl border-2 transition-colors ${
    active
      ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-2))]'
      : 'border-transparent bg-surface-2/60 hover:bg-surface-2'
  }`

export function StartScreen({
  botId,
  side,
  timeControl,
  onBotChange,
  onSideChange,
  onTimeControlChange,
  onPlay,
  onRecent,
}: Props) {
  const bot = BOT_LIST.find((b) => b.id === botId) ?? BOT_LIST[0]
  const tc = TIME_CONTROLS[timeControl]
  const clockNote = tc.speed
    ? `${tc.initialMs / 60_000} min each${tc.incrementMs ? `, +${tc.incrementMs / 1000}s per move` : ''}`
    : 'No clock. Take all the time you need.'

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl content-center items-center gap-6 px-4 py-6 min-[900px]:grid-cols-[1fr_minmax(0,440px)] min-[900px]:gap-12 min-[900px]:px-10">
      {/* Left: who we are, and a taste of what the app does */}
      <header className="flex flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left">
        <Logo className="text-5xl min-[900px]:text-7xl" />
        <p className="mt-1 text-lg text-muted min-[900px]:mt-2 min-[900px]:text-2xl">
          Learn chess by playing.
        </p>
        <ul className="mt-5 hidden flex-wrap gap-2 min-[900px]:flex">
          {FEATURES.map((f) => (
            <li key={f} className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted">
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-12 hidden w-full justify-center pb-6 min-[900px]:flex [@media(max-height:640px)]:!hidden">
          <BoardPreview />
        </div>
      </header>

      {/* Right: the whole game setup in one card, with Play right under it */}
      <motion.div
        className="flex flex-col gap-5 rounded-[24px] border border-border bg-surface p-5 shadow-raised sm:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Step n={1} title="Choose your opponent" id="opponent-heading">
          <div role="radiogroup" aria-labelledby="opponent-heading" className="grid grid-cols-3 gap-2">
            {BOT_LIST.map((b) => {
              const active = b.id === botId
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onBotChange(b.id)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col items-center gap-1 px-1 py-3 ${tile(active)}`}
                >
                  <BotAvatar bot={b} size={40} />
                  <span className="font-display text-lg font-semibold leading-tight">{b.name}</span>
                  <span className={`text-xs font-bold ${active ? 'text-accent' : 'text-muted'}`}>
                    {b.level}
                  </span>
                </motion.button>
              )
            })}
          </div>
          <p className="text-sm text-muted">{bot.blurb}</p>
        </Step>

        <Step n={2} title="Your side" id="side-heading">
          <div
            role="radiogroup"
            aria-labelledby="side-heading"
            className="grid grid-cols-3 gap-1 rounded-full bg-surface-2/60 p-1"
          >
            {SIDES.map((s) => {
              const active = s.id === side
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSideChange(s.id)}
                  className={`relative min-h-11 cursor-pointer rounded-full font-bold transition-colors ${
                    active ? 'text-on-accent' : 'text-muted hover:text-text'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="side-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              )
            })}
          </div>
        </Step>

        <Step n={3} title="Clock" id="clock-heading">
          <div role="radiogroup" aria-labelledby="clock-heading" className="grid grid-cols-4 gap-2">
            {TIME_CONTROL_GROUPS.flatMap((group) =>
              group.ids.map((id) => {
                const t = TIME_CONTROLS[id]
                const active = id === timeControl
                return (
                  <motion.button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={t.speed ? `${t.speed} ${t.label}` : 'No clock'}
                    onClick={() => onTimeControlChange(id)}
                    whileTap={{ scale: 0.97 }}
                    className={`flex min-h-12 flex-col items-center justify-center ${tile(active)}`}
                  >
                    <span
                      className={`font-display text-base font-semibold leading-tight ${active ? 'text-accent' : ''}`}
                    >
                      {t.speed ? t.label : '∞'}
                    </span>
                    <span className="text-[11px] font-bold text-muted">{group.label}</span>
                  </motion.button>
                )
              }),
            )}
          </div>
          <p className="text-sm text-muted">{clockNote}</p>
        </Step>

        {/* Sticks to the bottom of the screen only if the card is taller than it. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col items-center gap-1 rounded-b-[24px] bg-surface px-5 pb-4 pt-2 sm:-mx-6 sm:-mb-6 sm:px-6">
          <Button variant="primary" size="lg" className="w-full text-xl" onClick={onPlay}>
            Play vs {bot.name}
          </Button>
          <button
            type="button"
            onClick={onRecent}
            className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Recent games
          </button>
        </div>
      </motion.div>
    </div>
  )
}
