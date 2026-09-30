import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { TIME_CONTROLS, timeControlName } from '../chess/clock'
import { PATTERN_WORDS } from '../chess/glossary'
import { BOTS, BOT_LIST } from '../engine/bots'
import { isLearnedPattern, useLearned } from '../storage/learned'
import { loadRecentGames, playStreak } from '../storage/recentGames'
import { formatDuration, loadStats } from '../storage/stats'
import { buildReport } from './report'
import { ReportBody } from './ReportPage'
import { BotAvatar } from './BotAvatar'
import { Button } from './Button'
import { type DeckItem, FlashDeck } from './FlashDeck'
import { Logo } from './Logo'
import { Mascot } from './Mascot'
import { type GameSetup, NewGameFlow } from './NewGameFlow'
import { Sheet } from './Sheet'
import { ThemeToggle } from './ThemeToggle'

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
    <svg viewBox="0 0 76 76" className="size-12 shrink-0 -rotate-90" aria-hidden>
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
  const [stats] = useState(loadStats)
  const report = buildReport(games, stats, learned)
  const [choosing, setChoosing] = useState<{ botId?: GameSetup['botId'] } | null>(null)
  const [deck, setDeck] = useState<DeckItem[] | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  // One short, useful line under the tagline.
  const last = games[0]
  const greeting = !returning
    ? 'Every move you play gets its chess name.'
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

  const LEVEL_TONE: Record<string, string> = { Easy: 'bg-accent', Medium: 'bg-warn', Hard: 'bg-danger' }
  const tileLink =
    'press flex min-w-0 cursor-pointer flex-col gap-2 rounded-card border-2 border-border bg-surface p-3.5 text-left [--edge:var(--border)] hover:bg-surface-2'

  // The report card, as a slim call to action at the top. Opens as a bottom sheet.
  const reportBar = (
    <motion.div {...pop(0)}>
      <button type="button" onClick={() => setReportOpen(true)} aria-label={`Report card: ${report.grade.label}`} className={`${tileLink} w-full !flex-row items-center !gap-3 !py-2.5`}>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-2xl font-black ${report.grade.tone}`} aria-hidden>
          {report.grade.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black leading-tight">Report card</span>
          <span className="line-clamp-2 text-xs font-bold text-muted">
            {report.games === 0
              ? 'Your grade shows up after your first game'
              : `${report.games} ${report.games === 1 ? 'game' : 'games'} · ${formatDuration(report.timeMs)}${report.winRate !== null ? ` · ${report.winRate}% wins` : ''}`}
          </span>
        </span>
        <span aria-hidden className="text-lg font-black text-muted">
          ›
        </span>
      </button>
    </motion.div>
  )

  const hero = (
    <motion.section aria-labelledby="play-heading" className="card flex flex-1 flex-col justify-center gap-3 p-4 wide:gap-4 wide:p-6" {...pop(0.04)}>
      <div className="flex items-center gap-3 tall:flex-col tall:text-center wide:flex-col wide:text-center">
        <span className="shrink-0 short:hidden max-[359px]:hidden tall:[&>svg]:h-auto tall:[&>svg]:w-24 wide:[&>svg]:w-28">
          <Mascot size={64} mood={returning ? 'happy' : 'wow'} />
        </span>
        <div className="min-w-0">
          <h1 id="play-heading" className="font-display text-2xl font-black leading-tight max-[359px]:text-xl tall:text-3xl">
            Play the move. <span className="text-accent">Learn its name.</span>
          </h1>
          <p className="mt-1 text-sm font-bold text-muted [@media(max-height:600px)]:hidden">{greeting}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        {returning ? (
          <Button variant="primary" size="lg" className="w-full flex-col !gap-0 py-2" onClick={() => onPlay(setup)}>
            <span className="text-lg uppercase">Play</span>
            <span className="max-w-full truncate text-xs font-bold normal-case opacity-90">
              vs {bot.name} · {SIDE_LABEL[setup.side]} · {timeControlName(tc)}
            </span>
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="w-full text-lg uppercase" onClick={() => setChoosing({})}>
            Start playing
          </Button>
        )}
        <div role="group" aria-labelledby="opponents-heading" className="flex flex-col gap-1.5">
          <p id="opponents-heading" className="text-center text-[11px] font-black uppercase tracking-[0.08em] text-muted">
            {returning ? 'Or a new game vs' : 'Pick your opponent'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BOT_LIST.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setChoosing({ botId: b.id })}
                aria-label={`Play the ${b.name}, ${b.level}`}
                className="press flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-border bg-surface px-1 py-1.5 [--edge:var(--border)] hover:bg-surface-2 min-[400px]:flex-row min-[400px]:gap-1.5"
              >
                <BotAvatar bot={b} size={28} />
                <span className="flex min-w-0 flex-col items-center leading-tight min-[400px]:items-start">
                  <span className="text-sm font-black">{b.name}</span>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-muted">
                    <span className={`size-1.5 shrink-0 rounded-full ${LEVEL_TONE[b.level] ?? 'bg-muted'}`} />
                    {b.level}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )

  // Patterns: progress and practice. The full list lives on /words.
  const wordsTile = (
    <motion.section aria-labelledby="words-heading" className="card flex min-w-0 flex-col gap-2 p-3" {...pop(0.08)}>
      <Link to="/words" className="flex items-center gap-2 rounded-xl hover:opacity-80">
        <span className="relative shrink-0 max-[359px]:hidden land:hidden">
          <ProgressRing value={known.length} total={PATTERN_WORDS.length} />
          <span className="absolute inset-0 grid place-items-center text-sm font-black text-learn">{known.length}</span>
        </span>
        <span className="min-w-0">
          <span id="words-heading" className="block text-sm font-black leading-tight">
            <span className="sr-only">Patterns learned: </span>
            <span className="text-learn">
              {known.length}/{PATTERN_WORDS.length}
            </span>{' '}
            patterns
          </span>
          <span className="block text-xs font-bold text-muted">See words ›</span>
        </span>
      </Link>
      <Button variant="learn" className="mt-auto min-h-10 w-full whitespace-nowrap px-2 uppercase" onClick={practice}>
        {waiting.length > 0 ? `Practice ${waiting.length}` : known.length > 0 ? 'Review' : 'Learn 5'}
      </Button>
    </motion.section>
  )

  // Recent games: the latest one (three on big screens). All of them on /games.
  const recentTile = (
    <motion.section aria-labelledby="recent-heading" className="card flex min-w-0 flex-col gap-2 p-3" {...pop(0.12)}>
      <div className="flex items-center justify-between gap-1">
        <h2 id="recent-heading" className="whitespace-nowrap text-sm font-black">
          <span className="wide:hidden">Last game</span>
          <span className="hidden wide:inline">Recent games</span>
        </h2>
        {returning && (
          <button type="button" onClick={onRecent} aria-label="All games" className="min-h-8 shrink-0 cursor-pointer rounded-lg px-1.5 text-xs font-extrabold uppercase text-info hover:bg-info/10">
            <span className="max-[359px]:hidden">All </span>›
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="text-xs font-bold text-muted">Your games show up here, every move named.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {recent.map((g, i) => {
            const tag = RESULT_TAG[g.result] ?? RESULT_TAG.draw
            const b = BOTS[g.bot] ?? BOTS.ant
            return (
              <li key={g.id} className={i === 0 ? '' : 'hidden wide:block short:!hidden'}>
                <button
                  type="button"
                  onClick={() => onOpenGame(g.id)}
                  aria-label={`vs ${b.name}, ${tag.label}: open summary`}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl p-1 text-left hover:bg-surface-2"
                >
                  <BotAvatar bot={b} size={32} />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="text-sm font-extrabold leading-tight">vs {b.name}</span>
                    <span className={`rounded-md px-1.5 py-px text-[10px] font-black uppercase ${tag.className}`}>{tag.label}</span>
                  </span>
                  {g.durationMs ? <span className="hidden text-[11px] font-bold text-muted wide:inline">{formatDuration(g.durationMs)}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-3 px-4 pb-3 pt-3 max-[359px]:px-3 wide:px-8 wide:pt-5">
      <header className="flex items-center justify-between gap-2">
        <Logo className="text-2xl" textClassName="max-[359px]:sr-only" />
        <div className="flex min-w-0 items-center gap-1.5 min-[400px]:gap-2">
          <StatPill icon={<FlameIcon />} value={streak} label="day streak" hint="Days in a row you’ve played. Play today to keep it going." tone="text-warn" />
          <span className="hidden min-[340px]:inline-flex">
            <StatPill icon={<BookIcon />} value={known.length} label="patterns" hint="Chess patterns you’ve played yourself, like a fork or castling." tone="text-learn" />
          </span>
          <span className="hidden min-[420px]:inline-flex">
            <StatPill icon={<TrophyIcon />} value={wins} label={wins === 1 ? 'win' : 'wins'} hint="Games you’ve won against the bots." tone="text-info" />
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/*
        One screen, no scrolling. Phones: report bar, the play card, two small tiles.
        Landscape phones and big screens: the play card beside a column of tiles.
      */}
      <div className="flex flex-1 flex-col gap-3 land:grid land:grid-cols-[1fr_minmax(0,300px)] wide:grid wide:grid-cols-[1fr_340px] wide:items-stretch wide:gap-4">
        <div className="land:hidden wide:hidden">{reportBar}</div>
        {hero}
        <div className="grid grid-cols-2 gap-3 land:flex land:flex-col wide:flex wide:flex-col wide:gap-4">
          <div className="hidden land:block wide:block">{reportBar}</div>
          <div className="contents land:grid land:grid-cols-2 land:gap-3">
            {wordsTile}
            {recentTile}
          </div>
        </div>
      </div>

      <footer className="mt-auto text-center text-[10px] font-bold text-muted/80 short:hidden land:hidden max-[359px]:hidden">
        Animals:{' '}
        <a className="underline hover:text-text" href="https://game-icons.net" target="_blank" rel="noreferrer">
          game-icons.net
        </a>{' '}
        (CC BY 3.0) · Stockfish · Lichess openings
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
        {reportOpen && (
          <Sheet key="report" title="Report card" wide onClose={() => setReportOpen(false)}>
            <ReportBody />
          </Sheet>
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
