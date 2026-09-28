import { motion } from 'framer-motion'
import { TIME_CONTROL_GROUPS, TIME_CONTROLS, type TimeControlId } from '../chess/clock'
import { BOT_LIST, type BotId } from '../engine/bots'
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
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center px-4 pt-6 sm:pt-10 md:max-w-4xl [@media(max-height:760px)]:pt-3">
      <Logo className="text-5xl sm:text-6xl [@media(max-height:760px)]:text-4xl" />
      <p className="mt-1 text-muted sm:text-lg">Learn chess by playing.</p>

      <section className="mt-6 w-full max-w-2xl sm:mt-8 [@media(max-height:760px)]:mt-4" aria-labelledby="opponent-heading">
        <h2 id="opponent-heading" className="mb-2 text-center font-display text-lg font-semibold sm:text-xl">
          Choose your opponent
        </h2>
        <div role="radiogroup" aria-labelledby="opponent-heading" className="grid grid-cols-3 gap-2 sm:gap-3">
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
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-card border-2 px-2 py-3 text-center transition-colors sm:[@media(max-height:760px)]:flex-row sm:[@media(max-height:760px)]:justify-center sm:[@media(max-height:760px)]:gap-3 sm:[@media(max-height:760px)]:py-2 ${
                  active
                    ? 'border-accent bg-surface-2 shadow-soft'
                    : 'border-border bg-surface hover:bg-surface-2'
                }`}
              >
                <BotAvatar bot={bot} size={48} />
                <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                    <span className="font-display text-lg font-semibold sm:text-xl">{bot.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        active ? 'bg-accent text-on-accent' : 'bg-bg/60 text-muted'
                      }`}
                    >
                      {bot.level}
                    </span>
                </span>
              </motion.button>
            )
          })}
        </div>
        <p className="mt-2 min-h-10 text-center text-sm text-muted sm:min-h-5">
          {BOT_LIST.find((b) => b.id === botId)?.blurb}
        </p>
      </section>

      {/* Side by side on wider screens so everything fits in one view. */}
      <div className="mt-3 flex w-full flex-col items-center gap-5 md:flex-row md:items-start md:justify-center md:gap-8">
        <section className="flex flex-col items-center" aria-labelledby="side-heading">
          <h2 id="side-heading" className="mb-2 font-display text-lg font-semibold sm:text-xl">
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

        <section className="w-full max-w-xl md:w-auto md:max-w-none" aria-labelledby="clock-heading">
          <h2 id="clock-heading" className="mb-2 text-center font-display text-lg font-semibold sm:text-xl">
            Clock
          </h2>
          <div role="radiogroup" aria-labelledby="clock-heading" className="grid grid-cols-4 gap-2 md:grid-cols-8">
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
                    className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-1 md:w-[4.25rem] transition-colors ${
                      active
                        ? 'border-accent bg-surface-2'
                        : 'border-border bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <span className={`font-display text-lg font-semibold leading-tight ${active ? 'text-accent' : ''}`}>
                      {t.speed ? t.label : '∞'}
                    </span>
                    <span className="text-xs font-bold text-muted">{group.label}</span>
                  </motion.button>
                )
              }),
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted sm:text-sm">
            {TIME_CONTROLS[timeControl].speed
              ? `${TIME_CONTROLS[timeControl].initialMs / 60_000} min each, ${
                  TIME_CONTROLS[timeControl].incrementMs
                    ? `plus ${TIME_CONTROLS[timeControl].incrementMs / 1000}s after every move`
                    : 'no extra time per move'
                }`
              : 'Take all the time you need.'}
          </p>
        </section>
      </div>

      {/* Pinned to the bottom so Play is always on screen, on any device. */}
      <div className="sticky bottom-0 mt-auto flex w-full flex-col items-center bg-gradient-to-t from-bg from-60% to-transparent pb-[max(12px,env(safe-area-inset-bottom))] pt-6">
        <Button variant="primary" size="lg" className="w-full max-w-sm text-xl" onClick={onPlay}>
          Play
        </Button>
        <button
          type="button"
          onClick={onRecent}
          className="mt-1 min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Recent games
        </button>
      </div>
    </div>
  )
}
