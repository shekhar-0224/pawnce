import { motion } from 'framer-motion'
import { BOT_LIST, type BotId } from '../engine/bots'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'
import { Logo } from './Logo'

export type SidePref = 'white' | 'black' | 'random'

type Props = {
  botId: BotId
  side: SidePref
  onBotChange: (id: BotId) => void
  onSideChange: (side: SidePref) => void
  onPlay: () => void
  onRecent: () => void
}

const SIDES: { id: SidePref; label: string }[] = [
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'random', label: 'Random' },
]

export function StartScreen({ botId, side, onBotChange, onSideChange, onPlay, onRecent }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-10 pt-10 sm:pt-16">
      <Logo className="text-6xl sm:text-7xl" />
      <p className="mt-2 text-lg text-muted">Learn chess by playing.</p>

      <section className="mt-10 w-full" aria-labelledby="opponent-heading">
        <h2 id="opponent-heading" className="mb-3 text-center font-display text-xl font-semibold">
          Choose your opponent
        </h2>
        <div role="radiogroup" aria-labelledby="opponent-heading" className="grid gap-3 sm:grid-cols-3">
          {BOT_LIST.map((bot) => {
            const active = bot.id === botId
            return (
              <motion.button
                key={bot.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onBotChange(bot.id)}
                whileTap={{ scale: 0.97 }}
                className={`flex cursor-pointer items-center gap-4 rounded-card border-2 p-4 text-left transition-colors sm:flex-col sm:items-center sm:gap-2 sm:p-5 sm:text-center ${
                  active
                    ? 'border-accent bg-surface-2 shadow-soft'
                    : 'border-border bg-surface hover:bg-surface-2'
                }`}
              >
                <BotAvatar bot={bot} size={56} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 sm:justify-center">
                    <span className="font-display text-xl font-semibold">{bot.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        active ? 'bg-accent text-on-accent' : 'bg-bg/60 text-muted'
                      }`}
                    >
                      {bot.level}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{bot.blurb}</span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </section>

      <section className="mt-8 flex flex-col items-center" aria-labelledby="side-heading">
        <h2 id="side-heading" className="mb-3 font-display text-xl font-semibold">
          Play as
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="side-heading"
          className="relative flex rounded-full border border-border bg-surface p-1"
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
                className={`relative min-h-11 min-w-24 cursor-pointer rounded-full px-5 font-bold transition-colors ${
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
      </section>

      <Button variant="primary" size="lg" className="mt-10 w-full max-w-xs text-xl" onClick={onPlay}>
        Play
      </Button>

      <button
        type="button"
        onClick={onRecent}
        className="mt-4 min-h-11 cursor-pointer rounded-full px-4 font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
      >
        Recent games
      </button>
    </div>
  )
}
