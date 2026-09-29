import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { TIME_CONTROLS, timeControlName } from '../chess/clock'
import { BOTS, BOT_LIST } from '../engine/bots'
import { loadRecentGames } from '../storage/recentGames'
import { VocabularyTile } from './Vocabulary'
import { BoardPreview } from './BoardPreview'
import { Button } from './Button'
import { Logo } from './Logo'
import { type GameSetup, NewGameFlow } from './NewGameFlow'

export type SidePref = 'white' | 'black' | 'random'

type Props = {
  /** The last game's setup, for "Play again". */
  setup: GameSetup
  /** Start a game with this setup (and remember it). */
  onPlay: (setup: GameSetup) => void
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

export function StartScreen({ setup, onPlay, onRecent }: Props) {
  const bot = BOTS[setup.botId] ?? BOT_LIST[0]
  const tc = TIME_CONTROLS[setup.timeControl]
  const [recent] = useState(() => loadRecentGames().slice(0, 3))
  // Returning players get a one-tap "Play again" with last time's setup.
  const returning = recent.length > 0
  const [choosing, setChoosing] = useState(false)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 py-5 min-[900px]:px-8 min-[900px]:py-8">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
      </header>

      <div className="grid gap-3 min-[900px]:grid-cols-12">
        {/* Play: the big tile */}
        <motion.section
          aria-labelledby="play-heading"
          className="flex min-w-0 flex-col gap-6 overflow-hidden rounded-card border border-border bg-surface p-6 min-[900px]:col-span-7 min-[900px]:row-span-2 min-[900px]:p-8 min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="max-w-[26rem]">
              <h1 id="play-heading" className="font-display text-4xl font-bold leading-[1.05] min-[900px]:text-5xl min-[1100px]:text-4xl">
                Play the move.
                <br />
                <span className="text-accent">Learn its name.</span>
              </h1>
              <p className="mt-3 text-muted min-[900px]:max-w-[17rem] min-[1100px]:max-w-[20rem]">
                Every move you play gets named, graded and explained, right as it happens.
              </p>
            </div>

            <div className="mt-auto flex flex-col gap-2 min-[900px]:max-w-72">
              {returning ? (
                <>
                  <Button variant="primary" size="lg" className="w-full" onClick={() => onPlay(setup)}>
                    Play again
                  </Button>
                  <p className="text-center text-xs text-muted">
                    vs {bot.name} · {SIDES.find((s) => s.id === setup.side)?.label} · {timeControlName(tc)}
                  </p>
                  <Button size="lg" className="w-full" onClick={() => setChoosing(true)}>
                    New game
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="lg" className="w-full" onClick={() => setChoosing(true)}>
                  New game
                </Button>
              )}
            </div>
          </div>

          <div className="pointer-events-none hidden w-[230px] shrink-0 min-[1100px]:block">
            <BoardPreview />
          </div>
        </motion.section>

        {/* Recent games */}
        <Tile
          label="Recent games"
          id="recent-heading"
          className="order-3 min-[900px]:order-none min-[900px]:col-span-5"
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

        {/* Vocabulary */}
        <Tile label="Your chess vocabulary" id="vocab-heading" className="order-2 min-[900px]:order-none min-[900px]:col-span-5">
          <VocabularyTile />
        </Tile>
      </div>

      <AnimatePresence>
        {choosing && (
          <NewGameFlow
            initial={setup}
            onClose={() => setChoosing(false)}
            onStart={(next) => {
              setChoosing(false)
              onPlay(next)
            }}
          />
        )}
      </AnimatePresence>

      <footer className="pb-2 text-center text-xs text-muted/70">
        Bot animals from{' '}
        <a className="underline hover:text-text" href="https://game-icons.net" target="_blank" rel="noreferrer">
          game-icons.net
        </a>{' '}
        (CC BY 3.0) · Engine: Stockfish · Openings: Lichess
      </footer>
    </div>
  )
}
