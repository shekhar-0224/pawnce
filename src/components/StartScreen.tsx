import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { TIME_CONTROLS, timeControlName } from '../chess/clock'
import { BASIC_WORDS, PATTERN_WORDS } from '../chess/glossary'
import { BOTS, BOT_LIST } from '../engine/bots'
import { isKnown, isLearnedPattern, useLearned } from '../storage/learned'
import { loadRecentGames, playStreak } from '../storage/recentGames'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'
import { type DeckItem, FlashDeck } from './FlashDeck'
import { Logo } from './Logo'
import { Mascot } from './Mascot'
import { type GameSetup, NewGameFlow } from './NewGameFlow'
import { Sheet } from './Sheet'

export type SidePref = 'white' | 'black' | 'random'

type Props = {
  /** The last game's setup, for "Play again". */
  setup: GameSetup
  /** Start a game with this setup (and remember it). */
  onPlay: (setup: GameSetup) => void
  onRecent: () => void
  /** Open a finished game's summary. */
  onOpenGame: (id: string) => void
}

const SIDE_LABEL: Record<SidePref, string> = { white: 'White', black: 'Black', random: 'Random side' }

const RESULT_TAG = {
  win: { label: 'Win', className: 'bg-accent text-white' },
  loss: { label: 'Loss', className: 'bg-danger text-white' },
  draw: { label: 'Draw', className: 'bg-warn text-white' },
} as const

// Words to start with when you haven't met any yet.
const STARTER_WORDS = ['pawn', 'knight', 'check', 'castling', 'fork']

const pop = (delay = 0) => ({
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 24, delay },
})

/**
 * Small colorful counters in the top bar, like a game's HUD. Each has a
 * label (shown on wider screens) and a short explanation on hover or tap.
 */
function StatPill({ icon, value, label, hint, tone }: { icon: ReactNode; value: ReactNode; label: string; hint: string; tone: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="group relative">
      <button
        type="button"
        className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-2 border-border bg-surface px-2.5 py-1 text-sm font-black hover:bg-surface-2 ${tone}`}
        aria-label={`${value} ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        {icon}
        {value}
        <span className="hidden text-xs font-extrabold text-muted sm:inline">{label}</span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute right-0 top-full z-30 mt-2 w-max max-w-[12rem] rounded-xl bg-text px-3 py-2 text-xs font-bold leading-snug text-bg shadow-lg transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="block font-black">
          {value} {label}
        </span>
        {hint}
      </span>
    </span>
  )
}

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="currentColor" d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4.2 2.4-5.4.2 1.7 1 2.9 2.1 3.5C11 8.6 10.9 5.4 12 2z" />
  </svg>
)
const BookIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="currentColor" d="M5 3h9a4 4 0 0 1 4 4v14H8a3 3 0 0 1-3-3V3zm3 15a1 1 0 0 0 0 2h8v-2H8z" />
  </svg>
)
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4 5 5 0 0 1-3 2.8V17h3v4H8v-4h3v-2.2A5 5 0 0 1 8 12a4 4 0 0 1-4-4V5h3V3zm-1 4v1a2 2 0 0 0 1.3 1.9A7 7 0 0 1 7 8V7H6zm11 0v1a7 7 0 0 1-.3 1.9A2 2 0 0 0 18 8V7h-1z" />
  </svg>
)

/** A ring that fills up as you learn words. */
function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <svg viewBox="0 0 76 76" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
      <motion.circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke="var(--learn)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

/**
 * Home: Pawny and one big Play button, then practice for your chess words
 * and your recent games. One column on phones; a sidebar on wide screens.
 */
export function StartScreen({ setup, onPlay, onRecent, onOpenGame }: Props) {
  const bot = BOTS[setup.botId] ?? BOT_LIST[0]
  const tc = TIME_CONTROLS[setup.timeControl]
  const [games] = useState(loadRecentGames)
  const recent = games.slice(0, 3)
  const returning = games.length > 0
  const wins = games.filter((g) => g.result === 'win').length
  const streak = playStreak(games)
  const learned = useLearned()
  // Patterns count once you've played them yourself; seen-only ones wait for practice.
  const known = PATTERN_WORDS.filter((w) => isLearnedPattern(learned.words[w.id]))
  const waiting = PATTERN_WORDS.filter((w) => learned.words[w.id] && !isLearnedPattern(learned.words[w.id]))
  const [choosing, setChoosing] = useState<{ botId?: GameSetup['botId'] } | null>(null)
  const [deck, setDeck] = useState<DeckItem[] | null>(null)

  // One short, useful line under the tagline.
  const last = games[0]
  const greeting = !returning
    ? 'Play a real game. Every move gets its chess name as you go.'
    : streak >= 2
      ? `${streak} days in a row. Keep your streak going!`
      : last?.result === 'win'
        ? `You beat the ${BOTS[last.bot]?.name ?? 'bot'} last time. Again?`
        : last?.result === 'loss'
          ? `The ${BOTS[last.bot]?.name ?? 'bot'} won last time. Rematch?`
          : 'Welcome back. Ready for a game?'

  const practice = () => {
    const ids = waiting.length > 0 ? waiting.map((w) => w.id) : known.length > 0 ? known.map((w) => w.id).slice(-8) : STARTER_WORDS
    setDeck(ids.map((id) => ({ card: { kind: 'word', id } })))
  }

  const hero = (
    <motion.section aria-labelledby="play-heading" className="card flex flex-col items-center gap-5 p-6 text-center" {...pop(0)}>
      <Mascot size={96} mood={returning ? 'happy' : 'wow'} />
      <div className="flex flex-col gap-2">
        <h1 id="play-heading" className="font-display text-3xl font-black leading-tight">
          Play the move. <span className="text-accent">Learn its name.</span>
        </h1>
        <p className="text-sm font-bold text-muted">{greeting}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        {returning ? (
          <>
            <Button variant="primary" size="lg" className="w-full flex-col !gap-0 py-2" onClick={() => onPlay(setup)}>
              <span className="text-lg uppercase">Play</span>
              <span className="text-xs font-bold normal-case opacity-90">
                vs {bot.name} · {SIDE_LABEL[setup.side]} · {timeControlName(tc)}
              </span>
            </Button>
            <Button size="lg" className="w-full uppercase" onClick={() => setChoosing({})}>
              New game
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" className="w-full text-lg uppercase" onClick={() => setChoosing({})}>
            Start playing
          </Button>
        )}
      </div>
    </motion.section>
  )

  const LEVEL_TONE: Record<string, string> = { Easy: 'bg-accent', Medium: 'bg-warn', Hard: 'bg-danger' }
  const opponentsCard = (
    <motion.section aria-labelledby="opponents-heading" className="card flex flex-col gap-3 p-5" {...pop(0.04)}>
      <h2 id="opponents-heading" className="text-xl font-black">
        Pick your opponent
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {BOT_LIST.map((b, i) => (
          <motion.button
            key={b.id}
            type="button"
            onClick={() => setChoosing({ botId: b.id })}
            aria-label={`Play the ${b.name}, ${b.level}`}
            className="press flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-border bg-surface px-2 py-3 [--edge:var(--border)] hover:bg-surface-2"
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 360, damping: 22 }}
          >
            <BotAvatar bot={b} size={56} />
            <span className="font-black">{b.name}</span>
            <span className={`rounded-lg px-2 py-0.5 text-[11px] font-black uppercase text-white ${LEVEL_TONE[b.level] ?? 'bg-muted'}`}>
              {b.level}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )

  const wordsCard = (
    <motion.section aria-labelledby="words-heading" className="card flex flex-col gap-4 p-5" {...pop(0.08)}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProgressRing value={known.length} total={PATTERN_WORDS.length} />
          <span className="absolute inset-0 grid place-items-center text-lg font-black text-learn">{known.length}</span>
        </div>
        <div className="min-w-0">
          <h2 id="words-heading" className="text-lg font-black leading-tight">
            <span className="block">Patterns learned:</span>{' '}
            <span className="text-learn">
              {known.length} of {PATTERN_WORDS.length}
            </span>
          </h2>
          <p className="text-sm font-bold text-muted">
            {waiting.length > 0 ? (
              <span className="text-learn">{waiting.length} seen, not played yet</span>
            ) : (
              'Play a pattern yourself to learn it.'
            )}
          </p>
        </div>
      </div>
      {(waiting.length > 0 || known.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {[...known, ...waiting].slice(0, 8).map((w) => (
            <Link
              key={w.id}
              to={`/words/${w.id}`}
              className={`rounded-xl border-2 px-2.5 py-1 text-xs font-extrabold hover:brightness-95 ${
                isLearnedPattern(learned.words[w.id]) ? 'border-accent/40 bg-accent/10 text-accent-edge' : 'border-learn/40 bg-learn/10 text-learn'
              }`}
            >
              {isLearnedPattern(learned.words[w.id]) ? '✓ ' : ''}
              {w.name}
            </Link>
          ))}
        </div>
      )}
      <div aria-label="Basics" role="group" className="flex flex-col gap-1.5 border-t-2 border-border pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-muted">Basics</p>
        <div className="flex flex-wrap gap-1">
          {BASIC_WORDS.map((w) => (
            <Link
              key={w.id}
              to={`/words/${w.id}`}
              className={`rounded-lg px-1.5 py-0.5 text-[11px] font-bold hover:bg-surface-2 ${isKnown(learned.words[w.id]) ? 'text-text' : 'text-muted'}`}
            >
              {isKnown(learned.words[w.id]) && <span className="text-accent">✓ </span>}
              {w.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="learn" className="w-full whitespace-nowrap uppercase" onClick={practice}>
          {waiting.length > 0 ? `Practice ${waiting.length}` : known.length > 0 ? 'Review' : 'Learn 5'}
        </Button>
        <Link
          to="/words"
          className="press inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-2xl border-2 border-border bg-surface px-4 text-sm font-extrabold uppercase tracking-wide [--edge:var(--border)] hover:bg-surface-2"
        >
          All words
        </Link>
      </div>
    </motion.section>
  )

  const recentCard = (
    <motion.section aria-labelledby="recent-heading" className="card flex flex-col gap-3 p-5" {...pop(0.16)}>
      <div className="flex items-center justify-between">
        <h2 id="recent-heading" className="text-xl font-black">
          Recent games
        </h2>
        {returning && (
          <button type="button" onClick={onRecent} className="min-h-9 cursor-pointer rounded-xl px-2 text-sm font-extrabold uppercase text-info hover:bg-info/10">
            See all
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="text-sm font-bold text-muted">Your finished games will show up here, with every move named.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map((g) => {
            const tag = RESULT_TAG[g.result] ?? RESULT_TAG.draw
            const b = BOTS[g.bot] ?? BOTS.ant
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onOpenGame(g.id)}
                  className="press flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-surface p-2.5 text-left [--edge:var(--border)] hover:bg-surface-2"
                >
                  <BotAvatar bot={b} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">vs {b.name}</span>
                    <span className="block text-xs font-bold text-muted">
                      {g.moves} {g.moves === 1 ? 'move' : 'moves'}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-black uppercase ${tag.className}`}>{tag.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 px-4 pb-8 pt-4 min-[900px]:px-8">
      <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-b-2 border-border bg-bg/95 px-4 py-3 backdrop-blur min-[900px]:static min-[900px]:mx-0 min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:px-0">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-2">
          <StatPill icon={<FlameIcon />} value={streak} label="day streak" hint="Days in a row you’ve played. Play today to keep it going." tone="text-warn" />
          <StatPill icon={<BookIcon />} value={known.length} label="patterns" hint="Chess patterns you’ve played yourself, like a fork or castling." tone="text-learn" />
          <span className="hidden min-[400px]:inline-flex">
            <StatPill icon={<TrophyIcon />} value={wins} label={wins === 1 ? 'win' : 'wins'} hint="Games you’ve won against the bots." tone="text-info" />
          </span>
        </div>
      </header>

      <div className="grid gap-4 min-[900px]:grid-cols-[1fr_340px] min-[900px]:items-start">
        <div className="flex flex-col gap-4">
          {hero}
          {opponentsCard}
          <div className="min-[900px]:hidden">{wordsCard}</div>
          <div className="min-[900px]:hidden">{recentCard}</div>
        </div>
        <aside className="hidden flex-col gap-4 min-[900px]:flex">
          {wordsCard}
          {recentCard}
        </aside>
      </div>

      <footer className="mt-auto pt-2 text-center text-xs font-bold text-muted/80">
        Bot animals from{' '}
        <a className="underline hover:text-text" href="https://game-icons.net" target="_blank" rel="noreferrer">
          game-icons.net
        </a>{' '}
        (CC BY 3.0) · Engine: Stockfish · Openings: Lichess
      </footer>

      <AnimatePresence>
        {choosing && (
          <NewGameFlow
            initial={choosing.botId ? { ...setup, botId: choosing.botId } : setup}
            startStep={choosing.botId ? 1 : 0}
            onClose={() => setChoosing(null)}
            onStart={(next) => {
              setChoosing(null)
              onPlay(next)
            }}
          />
        )}
        {deck && (
          <Sheet key="practice" title="Practice" wide onClose={() => setDeck(null)}>
            <FlashDeck items={deck} onClose={() => setDeck(null)} />
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
