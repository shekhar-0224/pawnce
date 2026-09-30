import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Color, Move } from '../chess/game'
import { QUALITY_LABELS, QUALITY_MARKS, type Quality, TACTIC_LABELS, termsFor, plainName } from '../chess/naming'
import type { Opening } from '../chess/openings'
import type { Result } from '../chess/outcome'
import { detectTactics, mainTactic, tacticHolds, type TacticKind } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import { color } from '../theme'
import { pieceSet } from '../theme/pieces'
import { WORDS_BY_ID } from '../chess/glossary'
import { Button } from './Button'
import { Mascot } from './Mascot'
import { gameContext } from './cardContext'
import { type DeckItem, FlashDeck } from './FlashDeck'
import { Sheet } from './Sheet'
import type { LearnCardData, WordAt } from './useVocab'
import type { MoveVerdict } from './useAnalysis'

type Props = {
  bot: Bot
  myColor: Color
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  opening: (Opening & { ply: number }) | null
  /** Flash cards: every chess word (and opening) met in this game. */
  cards: LearnCardData[]
  /** The chess words each move showed, for highlighting during the replay. */
  wordsAt: WordAt[][]
  /** Word ids met for the very first time in this game. */
  newThisGame: string[]
  result: Result
  title: string
  detail: string
  onPlayAgain: () => void
  onChangeOpponent: () => void
  onClose: () => void
  /** The close button's text ("Back to board" for a live game). */
  closeLabel?: string
  /** Start the replay at this move (e.g. from a word's link). */
  initialPly?: number
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const QUALITY_TONE: Record<Quality, string> = {
  book: 'text-muted',
  best: 'text-accent',
  good: 'text-accent',
  inaccuracy: 'text-warn',
  mistake: 'text-danger',
  blunder: 'text-danger',
}

/** Lichess-style accuracy for one move, from the drop in winning chances. */
function moveAccuracy(v: MoveVerdict): number {
  const drop = Math.max(0, v.winBefore - v.winAfter)
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  // A big material giveaway caps the score even when chances barely moved.
  const cap = v.quality === 'blunder' ? 30 : v.quality === 'mistake' ? 55 : 100
  return Math.min(cap, Math.max(0, acc))
}

type Moment = { ply: number; tone: string; label: string; text: string }

const moveNo = (ply: number) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}`

function Tile({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 card p-5 ${className}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</h2>
      {children}
    </section>
  )
}

/** The game-over screen: result, key moments, patterns, a replay, play again. */
export function GameSummary(p: Props) {
  const { moves, verdicts, myColor, bot } = p

  // Accuracy and grade counts for your moves.
  const stats = useMemo(() => {
    const mine = moves.map((m, i) => ({ m, v: verdicts[i] })).filter((x) => x.m.color === myColor && x.v)
    const counts: Partial<Record<Quality, number>> = {}
    for (const { v } of mine) counts[v!.quality] = (counts[v!.quality] ?? 0) + 1
    const accuracy = mine.length
      ? Math.round(mine.reduce((sum, { v }) => sum + moveAccuracy(v!), 0) / mine.length)
      : null
    return { counts, accuracy }
  }, [moves, verdicts, myColor])

  // Key moments, in game order.
  const moments = useMemo(() => {
    const out: Moment[] = []
    moves.forEach((m, ply) => {
      const v = verdicts[ply]
      const mine = m.color === myColor
      const tactic = mainTactic(detectTactics(m.before, m))
      const slip = v && (v.quality === 'blunder' || v.quality === 'mistake')
      if (mine && tactic && slip) {
        out.push({
          ply,
          tone: QUALITY_TONE[v.quality],
          label: `Looked like a ${TACTIC_LABELS[tactic.kind].toLowerCase()}`,
          text: `${m.san} was a ${v.quality}${v.better ? `; ${v.better} was better` : ''}.`,
        })
        return
      }
      const holds = tacticHolds(v?.quality)
      if (mine && tactic && holds) {
        out.push({ ply, tone: 'text-accent', label: `${TACTIC_LABELS[tactic.kind]}!`, text: `You played ${m.san}.` })
      } else if (!mine && tactic && holds) {
        out.push({ ply, tone: 'text-danger', label: `${bot.name}'s ${TACTIC_LABELS[tactic.kind].toLowerCase()}`, text: `${m.san} hit you.` })
      }
      if (!v) return
      if (mine && (v.quality === 'blunder' || v.quality === 'mistake')) {
        out.push({
          ply,
          tone: QUALITY_TONE[v.quality],
          label: QUALITY_LABELS[v.quality],
          text: `${m.san}${v.better ? `; ${v.better} was better` : ''}.`,
        })
      } else if (mine && v.quality === 'best' && ply > 8) {
        out.push({ ply, tone: 'text-accent', label: 'Best move', text: `${m.san}: exactly the engine's choice.` })
      } else if (!mine && (v.quality === 'blunder' || v.quality === 'mistake')) {
        const reply = verdicts[ply + 1]
        const punished = reply && (reply.quality === 'best' || reply.quality === 'good')
        out.push({
          ply,
          tone: punished ? 'text-accent' : 'text-warn',
          label: punished ? 'You punished a slip' : 'Missed chance',
          text: punished
            ? `${bot.name} played ${m.san}; you answered well.`
            : `${bot.name} played ${m.san}${reply?.better ? `; ${reply.better} would have punished it` : ''}.`,
        })
      }
    })
    return out
  }, [moves, verdicts, myColor, bot.name])

  // Patterns: tactics and rule terms seen in the game.
  const patterns = useMemo(() => {
    const tactics = new Map<TacticKind, { mine: number; theirs: number }>()
    const terms = new Map<string, number>()
    moves.forEach((m, ply) => {
      const t = mainTactic(detectTactics(m.before, m))
      // Count only tactics that actually worked.
      if (t && tacticHolds(verdicts[ply]?.quality)) {
        const entry = tactics.get(t.kind) ?? { mine: 0, theirs: 0 }
        if (m.color === myColor) entry.mine++
        else entry.theirs++
        tactics.set(t.kind, entry)
      }
      for (const term of termsFor(m)) {
        if (term.id !== 'capture') terms.set(term.label, (terms.get(term.label) ?? 0) + 1)
      }
    })
    return { tactics: [...tactics.entries()], terms: [...terms.entries()] }
  }, [moves, verdicts, myColor])

  // Replay position: -1 is the start, otherwise the position after that move.
  const [ply, setPly] = useState(p.initialPly ?? moves.length - 1)
  const current = ply >= 0 ? moves[ply] : null
  // Words this move showed (everyday "capture" left out), one line each.
  const wordsHere = (ply >= 0 ? (p.wordsAt[ply] ?? []) : []).filter(
    (w, i, all) => w.id !== 'capture' && WORDS_BY_ID[w.id] && all.findIndex((x) => x.id === w.id) === i,
  )
  const replayRef = useRef<HTMLDivElement>(null)
  const jumpTo = (target: number) => {
    setPly(target)
    // On phones the replay sits below the list: bring it into view.
    if (window.matchMedia('(max-width: 899px)').matches) {
      replayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  const currentVerdict = ply >= 0 ? verdicts[ply] : null

  // The flash-card deck: each word (and opening) from this game.
  const [deckOpen, setDeckOpen] = useState(false)
  const deck: DeckItem[] = p.cards.flatMap((c): DeckItem[] => {
    const move = moves[c.ply]
    if (!move) return []
    const context = {
      text: gameContext(c, move, verdicts[c.ply] ?? null, move.color === myColor, bot),
      onJump: () => {
        setDeckOpen(false)
        jumpTo(c.ply)
      },
    }
    return c.kind === 'word'
      ? [{ card: { kind: 'word' as const, id: c.id }, context }]
      : [{ card: { kind: 'opening' as const, name: c.name, fen: move.after, last: { from: move.from, to: move.to } }, context }]
  })
  const newSet = new Set(p.newThisGame)

  const counts = stats.counts

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-5 min-[900px]:grid-cols-12 min-[900px]:px-8 min-[900px]:py-8">
        {/* Result: a bright banner with Pawny */}
        <motion.section
          className="order-1 flex min-w-0 flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] p-5 text-white min-[900px]:order-none min-[900px]:col-span-5"
          style={{
            background: `var(--${p.result === 'win' ? 'accent' : p.result === 'loss' ? 'danger' : 'warn'})`,
            boxShadow: `0 6px 0 var(--${p.result === 'win' ? 'accent' : p.result === 'loss' ? 'danger' : 'warn'}-edge)`,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        >
          <div className="flex items-center gap-4">
            <Mascot size={84} mood={p.result === 'win' ? 'happy' : p.result === 'loss' ? 'sad' : 'wow'} />
            <div className="min-w-0">
              <h1 id="summary-title" className="text-3xl font-black leading-tight">
                {p.title}
              </h1>
              <p className="mt-1 font-bold text-white/90">{p.detail}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Accuracy', stats.accuracy !== null ? `${stats.accuracy}%` : '–', 'text-text'],
              ['Good moves', String((counts.best ?? 0) + (counts.good ?? 0) + (counts.book ?? 0)), 'text-accent'],
              ['Slips', String((counts.inaccuracy ?? 0) + (counts.mistake ?? 0) + (counts.blunder ?? 0)), 'text-danger'],
            ].map(([label, value, tone], i) => (
              <motion.div
                key={label}
                className="rounded-2xl bg-white px-2 py-2"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
              >
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</dt>
                <dd className={`text-2xl font-black ${tone}`}>{value}</dd>
              </motion.div>
            ))}
          </dl>
          <p className="text-xs font-bold text-white/85">
            Slips: {counts.inaccuracy ?? 0} inaccuracies · {counts.mistake ?? 0} mistakes · {counts.blunder ?? 0} blunders
          </p>
        </motion.section>

        {/* Replay */}
        <Tile label="Replay" className="order-5 min-[900px]:order-none min-[900px]:col-span-7 min-[900px]:row-span-4">
          <div ref={replayRef} className="relative mx-auto w-full max-w-[420px] scroll-mt-4 overflow-hidden rounded-lg">
            {wordsHere[0] && (
              <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
                {WORDS_BY_ID[wordsHere[0].id].name}
              </span>
            )}
            <Chessboard
              options={{
                id: 'replay',
                position: current ? current.after : START_FEN,
                boardOrientation: myColor === 'w' ? 'white' : 'black',
                pieces: pieceSet,
                allowDragging: false,
                animationDurationInMs: 150,
                lightSquareStyle: { backgroundColor: color.boardLight },
                darkSquareStyle: { backgroundColor: color.boardDark },
                squareStyles: current
                  ? { [current.from]: { background: color.lastMove }, [current.to]: { background: color.lastMove } }
                  : {},
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button onClick={() => setPly(-1)} aria-label="First move" className="px-3" disabled={ply < 0}>
                ⏮
              </Button>
              <Button onClick={() => setPly((n) => Math.max(-1, n - 1))} aria-label="Previous move" className="px-3" disabled={ply < 0}>
                ◀
              </Button>
            </div>
            <span className="font-mono text-sm text-muted">
              {ply < 0 ? 'Start' : `${moveNo(ply)} ${current!.san}`} · {ply + 1}/{moves.length}
            </span>
            <div className="flex gap-1">
              <Button onClick={() => setPly((n) => Math.min(moves.length - 1, n + 1))} aria-label="Next move" className="px-3" disabled={ply >= moves.length - 1}>
                ▶
              </Button>
              <Button onClick={() => setPly(moves.length - 1)} aria-label="Last move" className="px-3" disabled={ply >= moves.length - 1}>
                ⏭
              </Button>
            </div>
          </div>
          <div className="min-h-16 rounded-lg border border-border p-3 text-sm">
            {current ? (
              <>
                <p>
                  <span className="font-semibold">{current.color === myColor ? 'You' : bot.name}</span>{' '}
                  <span className="font-mono font-semibold">{current.san}</span>
                  <span className="text-muted"> · {plainName(current)}</span>
                </p>
                {wordsHere.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2" aria-label="Words at this move">
                    {wordsHere.map((w) => (
                      <li key={w.id}>
                        <span className="font-semibold text-accent">{WORDS_BY_ID[w.id].name}</span>
                        <span className="text-muted">
                          {w.how === 'missed' ? ' (missed) · ' : ' · '}
                          {WORDS_BY_ID[w.id].meaning}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {currentVerdict && (
                  <p className={`mt-1 font-semibold ${QUALITY_TONE[currentVerdict.quality]}`}>
                    {QUALITY_MARKS[currentVerdict.quality] ?? ''} {QUALITY_LABELS[currentVerdict.quality]}
                    {currentVerdict.better && currentVerdict.quality !== 'good' && currentVerdict.quality !== 'best' && currentVerdict.quality !== 'book' && (
                      <span className="font-normal text-muted"> · better was {currentVerdict.better}</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted">The starting position. Step through the game with the arrows.</p>
            )}
          </div>
        </Tile>

        {/* Words from this game */}
        <Tile label="Words from this game" className="order-3 min-[900px]:order-none min-[900px]:col-span-5">
          {p.cards.length === 0 ? (
            <p className="text-sm text-muted">No new chess words this time. Play on!</p>
          ) : (
            <>
              {p.newThisGame.length > 0 && (
                <p className="text-sm">
                  <span className="font-semibold text-accent">
                    {p.newThisGame.length} new {p.newThisGame.length === 1 ? 'word' : 'words'}
                  </span>
                  <span className="text-muted"> this game</span>
                </p>
              )}
              <ul className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
                {p.cards.map((c) => {
                  const word = c.kind === 'word' ? WORDS_BY_ID[c.id] : null
                  const here = ply === c.ply || (c.kind === 'word' && wordsHere.some((w) => w.id === c.id))
                  const fresh = c.kind === 'word' && newSet.has(c.id)
                  return (
                    <li key={c.kind === 'word' ? c.id : `o:${c.family}`}>
                      <button
                        type="button"
                        onClick={() => jumpTo(c.ply)}
                        aria-current={here ? 'true' : undefined}
                        className={`flex w-full cursor-pointer items-baseline gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                          here ? 'bg-accent/10' : 'hover:bg-surface-2'
                        }`}
                      >
                        <span className="w-9 shrink-0 font-mono text-xs text-muted">{moveNo(c.ply)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`font-semibold ${here ? 'text-accent' : ''}`}>{word ? word.name : c.kind === 'opening' ? c.name : ''}</span>
                            {fresh && (
                              <span className="rounded bg-accent px-1 font-mono text-[10px] font-bold uppercase text-on-accent">New</span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {word ? word.meaning : 'The opening this game followed.'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <Button variant="primary" onClick={() => setDeckOpen(true)}>
                Review {p.cards.length} flash {p.cards.length === 1 ? 'card' : 'cards'}
              </Button>
            </>
          )}
        </Tile>

        {/* Key moments */}
        <Tile label="Key moments" className="order-4 min-[900px]:order-none min-[900px]:col-span-5">
          {moments.length === 0 ? (
            <p className="text-sm text-muted">A quiet game: no big swings or tactics.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
              {moments.map((mo, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setPly(mo.ply)}
                    className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2 ${
                      ply === mo.ply ? 'bg-surface-2' : ''
                    }`}
                  >
                    <span className="w-10 shrink-0 font-mono text-xs text-muted">{moveNo(mo.ply)}</span>
                    <span className={`shrink-0 font-semibold ${mo.tone}`}>{mo.label}</span>
                    <span className="min-w-0 truncate text-muted">{mo.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        {/* Patterns played */}
        <Tile label="Patterns played" className="order-6 min-[900px]:order-none min-[900px]:col-span-5">
          {p.opening && (
            <p className="text-sm">
              <span className="text-muted">Opening · </span>
              <span className="font-semibold">{p.opening.name}</span>
              <span className="text-muted">
                {' '}
                ({moves[p.opening.ply]?.color === myColor ? 'chosen by you' : `chosen by the ${bot.name}`})
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {patterns.tactics.map(([kind, n]) => (
              <span key={kind} className="rounded-md border border-border px-2 py-1 text-xs">
                <span className="font-semibold">{TACTIC_LABELS[kind]}</span>
                <span className="text-muted">
                  {n.mine ? ` · you ${n.mine}` : ''}
                  {n.theirs ? ` · ${bot.name} ${n.theirs}` : ''}
                </span>
              </span>
            ))}
            {patterns.terms.map(([label, n]) => (
              <span key={label} className="rounded-md border border-border px-2 py-1 text-xs text-muted">
                {label} ×{n}
              </span>
            ))}
            {patterns.tactics.length === 0 && patterns.terms.length === 0 && (
              <span className="text-sm text-muted">No special patterns this game.</span>
            )}
          </div>
        </Tile>

        {/* Play again */}
        <section className="order-2 flex flex-col gap-2 card p-5 min-[900px]:order-last min-[900px]:col-span-12 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <p className="text-sm text-muted">Ready for another? Every game teaches something new.</p>
          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
            <Button variant="primary" onClick={p.onPlayAgain}>
              Play again
            </Button>
            <Button onClick={p.onChangeOpponent}>Home</Button>
            <Button variant="ghost" onClick={p.onClose}>
              {p.closeLabel ?? 'Back to board'}
            </Button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {deckOpen && deck.length > 0 && (
          <Sheet key="deck" title="Flash cards" wide onClose={() => setDeckOpen(false)}>
            <FlashDeck items={deck} onClose={() => setDeckOpen(false)} />
          </Sheet>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
