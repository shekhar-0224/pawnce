import { motion } from 'framer-motion'
import { type ReactNode, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Color, Move } from '../chess/game'
import { QUALITY_LABELS, QUALITY_MARKS, type Quality, TACTIC_LABELS, termsFor, plainName } from '../chess/naming'
import type { Opening } from '../chess/openings'
import type { Result } from '../chess/outcome'
import { detectTactics, mainTactic, tacticHolds, type TacticKind } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import { color } from '../theme'
import { pieceSet } from '../theme/pieces'
import { Button } from './Button'
import type { MoveVerdict } from './useAnalysis'

type Props = {
  bot: Bot
  myColor: Color
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  opening: (Opening & { ply: number }) | null
  result: Result
  title: string
  detail: string
  onPlayAgain: () => void
  onChangeOpponent: () => void
  onClose: () => void
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const QUALITY_TONE: Record<Quality, string> = {
  book: 'text-muted',
  best: 'text-accent',
  good: 'text-accent',
  inaccuracy: 'text-warn',
  mistake: 'text-warn',
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
    <section className={`flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-5 ${className}`}>
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
  const [ply, setPly] = useState(moves.length - 1)
  const current = ply >= 0 ? moves[ply] : null
  const currentVerdict = ply >= 0 ? verdicts[ply] : null

  const resultTone =
    p.result === 'win' ? 'text-accent' : p.result === 'loss' ? 'text-danger' : 'text-muted'
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
        {/* Result */}
        <Tile label="Result" className="order-1 min-[900px]:order-none min-[900px]:col-span-5">
          <h1 id="summary-title" className={`text-3xl font-bold ${resultTone}`}>
            {p.title}
          </h1>
          <p className="text-muted">{p.detail}</p>
          <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border p-2">
              <dt className="text-[11px] text-muted">Accuracy</dt>
              <dd className="font-mono text-xl font-semibold">{stats.accuracy ?? '–'}{stats.accuracy !== null && '%'}</dd>
            </div>
            <div className="rounded-lg border border-border p-2">
              <dt className="text-[11px] text-muted">Best / good</dt>
              <dd className="font-mono text-xl font-semibold text-accent">
                {(counts.best ?? 0) + (counts.good ?? 0) + (counts.book ?? 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-2">
              <dt className="text-[11px] text-muted">Slips</dt>
              <dd className="font-mono text-xl font-semibold">
                <span className="text-warn">{(counts.inaccuracy ?? 0) + (counts.mistake ?? 0)}</span>
                <span className="text-muted"> / </span>
                <span className="text-danger">{counts.blunder ?? 0}</span>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">Slips: inaccuracies and mistakes / blunders.</p>
        </Tile>

        {/* Replay */}
        <Tile label="Replay" className="order-4 min-[900px]:order-none min-[900px]:col-span-7 min-[900px]:row-span-3">
          <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg">
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

        {/* Key moments */}
        <Tile label="Key moments" className="order-3 min-[900px]:order-none min-[900px]:col-span-5">
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
        <Tile label="Patterns played" className="order-5 min-[900px]:order-none min-[900px]:col-span-5">
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
        <section className="order-2 flex flex-col gap-2 rounded-card border border-border bg-surface p-5 min-[900px]:order-last min-[900px]:col-span-12 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <p className="text-sm text-muted">Ready for another? Every game teaches something new.</p>
          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
            <Button variant="primary" onClick={p.onPlayAgain}>
              Play again
            </Button>
            <Button onClick={p.onChangeOpponent}>Change opponent</Button>
            <Button variant="ghost" onClick={p.onClose}>
              Back to board
            </Button>
          </div>
        </section>
      </div>
    </motion.div>
  )
}
