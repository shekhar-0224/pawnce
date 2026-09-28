import { motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { TIME_CONTROL_GROUPS, TIME_CONTROLS, type TimeControlId, timeControlName } from '../chess/clock'
import { BOTS, BOT_LIST, type BotId } from '../engine/bots'
import { loadRecentGames } from '../storage/recentGames'
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

const RESULT_TAG = {
  win: { label: 'Win', className: 'bg-accent/15 text-accent' },
  loss: { label: 'Loss', className: 'bg-danger/15 text-danger' },
  draw: { label: 'Draw', className: 'bg-surface-2 text-muted' },
} as const

/** One bento tile. */
function Tile({
  label,
  id,
  className = '',
  action,
  children,
}: {
  label: string
  id: string
  className?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <motion.section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-5 ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </h2>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

/** Selected / unselected look shared by the choice controls. */
const choice = (active: boolean) =>
  `cursor-pointer rounded-lg border transition-colors ${
    active
      ? 'border-accent bg-accent/10 text-text'
      : 'border-border bg-bg/40 text-muted hover:border-muted/40 hover:text-text'
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
  const bot = BOTS[botId] ?? BOT_LIST[0]
  const tc = TIME_CONTROLS[timeControl]
  const [recent] = useState(() => loadRecentGames().slice(0, 3))
  const clockNote = tc.speed
    ? `${tc.initialMs / 60_000} min each${tc.incrementMs ? `, +${tc.incrementMs / 1000}s per move` : ''}`
    : 'No clock. Take all the time you need.'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 py-5 min-[900px]:px-8 min-[900px]:py-8">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
      </header>

      <div className="grid gap-3 min-[900px]:grid-cols-12">
        {/* Play: the big tile */}
        <motion.section
          aria-labelledby="play-heading"
          className="relative flex min-w-0 flex-col gap-6 overflow-hidden rounded-card border border-border bg-surface p-6 min-[900px]:col-span-7 min-[900px]:row-span-2 min-[900px]:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="max-w-[26rem]">
            <h1 id="play-heading" className="font-display text-4xl font-bold leading-[1.05] min-[900px]:text-5xl">
              Play the move.
              <br />
              <span className="text-accent">Learn its name.</span>
            </h1>
            <p className="mt-3 text-muted min-[900px]:max-w-[17rem] min-[1100px]:max-w-[20rem]">
              Every move you play gets named, graded and explained, right as it happens.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <p className="text-sm text-muted">
              vs <span className="font-semibold text-text">{bot.name}</span> ({bot.level}) ·{' '}
              <span className="font-semibold text-text">{SIDES.find((s) => s.id === side)?.label}</span> ·{' '}
              <span className="font-semibold text-text">{timeControlName(tc)}</span>
            </p>
            <Button variant="primary" size="lg" className="w-full min-[900px]:w-64" onClick={onPlay}>
              Play vs {bot.name}
            </Button>
          </div>

          <div className="pointer-events-none absolute bottom-8 right-8 hidden w-[230px] min-[1100px]:block">
            <BoardPreview />
          </div>
        </motion.section>

        {/* Opponent */}
        <Tile label="Opponent" id="opponent-heading" className="min-[900px]:col-span-5">
          <div role="radiogroup" aria-labelledby="opponent-heading" className="flex flex-col gap-2">
            {BOT_LIST.map((b) => {
              const active = b.id === botId
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${b.name}, ${b.level}`}
                  onClick={() => onBotChange(b.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-left ${choice(active)}`}
                >
                  <BotAvatar bot={b} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-text">{b.name}</span>
                      <span className={`text-xs font-medium ${active ? 'text-accent' : 'text-muted'}`}>
                        {b.level}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted">{b.blurb}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Tile>

        {/* Side */}
        <Tile label="Your side" id="side-heading" className="min-[900px]:col-span-5">
          <div role="radiogroup" aria-labelledby="side-heading" className="grid grid-cols-3 gap-2">
            {SIDES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === side}
                onClick={() => onSideChange(s.id)}
                className={`min-h-11 text-sm font-semibold ${choice(s.id === side)}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Tile>

        {/* Clock */}
        <Tile label="Clock" id="clock-heading" className="min-[900px]:col-span-7">
          <div role="radiogroup" aria-labelledby="clock-heading" className="grid grid-cols-4 gap-2 min-[560px]:grid-cols-8">
            {TIME_CONTROL_GROUPS.flatMap((group) =>
              group.ids.map((id) => {
                const t = TIME_CONTROLS[id]
                const active = id === timeControl
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={t.speed ? `${t.speed} ${t.label}` : 'No clock'}
                    onClick={() => onTimeControlChange(id)}
                    className={`flex min-h-13 flex-col items-center justify-center ${choice(active)}`}
                  >
                    <span className={`font-mono text-sm font-semibold ${active ? 'text-accent' : 'text-text'}`}>
                      {t.speed ? t.label : '∞'}
                    </span>
                    <span className="text-[11px]">{group.label}</span>
                  </button>
                )
              }),
            )}
          </div>
          <p className="text-xs text-muted">{clockNote}</p>
        </Tile>

        {/* Recent games */}
        <Tile
          label="Recent games"
          id="recent-heading"
          className="min-[900px]:col-span-5"
          action={
            <button
              type="button"
              onClick={onRecent}
              className="min-h-8 cursor-pointer rounded-md px-2 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-text"
            >
              See all
            </button>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Your finished games will show up here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recent.map((g) => {
                const tag = RESULT_TAG[g.result] ?? RESULT_TAG.draw
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      vs {BOTS[g.bot]?.name ?? 'Bot'}{' '}
                      <span className="text-muted">
                        · {g.moves} {g.moves === 1 ? 'move' : 'moves'}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${tag.className}`}>
                      {tag.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Tile>
      </div>
    </div>
  )
}
