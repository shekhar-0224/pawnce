import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Color, type Move, type Square, parseUci } from '../chess/game'
import { describeIdea } from '../chess/ideas'
import { type Quality, classifyMove } from '../chess/naming'
import { type Refutation, explainSlip } from '../chess/refutation'
import { loadOpenings, openingAt } from '../chess/openings'
import { type Threat, describeThreat, passFen } from '../chess/threats'
import type { Result } from '../chess/outcome'
import { analyst } from '../engine/stockfish'
import { cappedCp, winPercentForMover } from '../engine/winChance'

export const HINTS_PER_GAME = 2

/** Strength shades for hint 1, 2 and 3, on the arrows and in the card. */
export const HINT_ALPHAS = [1, 0.62, 0.38]

/** Think time for judging each position, and for a hint. */
const EVAL_MS = 400
const HINT_MS = 1200

export type Hint = {
  rank: number
  from: Square
  to: Square
  san: string
  idea: string
}

/** The engine's verdict on one position. */
type Evaluation = {
  /** White's winning chances, 0 to 100. */
  winWhite: number
  /** The engine's score for White in centipawns (100 = a pawn), capped at ±2000. */
  cpWhite: number
  /** The engine's best move here (UCI), if any. */
  best: string | null
  /** Moves to a forced mate for the side to move (negative: it gets mated). */
  mate: number | null
  /** The engine's main line from here (UCI), best move first. */
  pv: string[]
}

/** How one move went: its grade and the chances before and after, for the mover. */
export type MoveVerdict = {
  quality: Quality
  winBefore: number
  winAfter: number
  /** How much worse than the best move this was, in centipawns (100 = a pawn). */
  cpLoss: number
  /** The engine's preferred move instead (SAN), when it differs. */
  better: string | null
  /** The same move as squares, for drawing it on the board. */
  betterMove: { from: Square; to: Square } | null
  /** For slips: what the opponent's best reply does, in board terms. */
  refutation: Refutation | null
}

const turnOf = (fen: string) => fen.split(' ')[1] as Color

/** How much a "pass" must help the opponent (centipawns) to count as a threat. */
const THREAT_CP = 120

/**
 * Everything the full-strength `analyst` engine tells us: the live win %
 * (the rope), a grade for every move played, and the hint orbs.
 */
export function useAnalysis(
  moves: Move[],
  fen: string,
  myColor: Color,
  myTurn: boolean,
  result: Result | null,
) {
  const [evals, setEvals] = useState<Record<string, Evaluation>>({})
  const [openingsReady, setOpeningsReady] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_GAME)
  const [hint, setHint] = useState<{ fen: string; lines: Hint[] } | null>(null)
  const [hintLoadingFen, setHintLoadingFen] = useState<string | null>(null)
  // Every move the engine suggested as a hint, by position (UCI moves).
  const [suggested, setSuggested] = useState<Record<string, string[]>>({})
  // What the opponent would do if you passed, keyed by position.
  const [passes, setPasses] = useState<Record<string, { threat: Threat | null; cp: number; mate: number | null }>>({})

  const fenRef = useRef(fen)
  useEffect(() => {
    fenRef.current = fen
  }, [fen])

  useEffect(() => {
    loadOpenings()
      .then(() => setOpeningsReady(true))
      .catch(() => undefined)
  }, [])

  // Judge each position once. Searches queue up in order on the analyst.
  const requested = useRef(new Set<string>())
  const evaluate = useCallback((position: string) => {
    if (requested.current.has(position)) return
    requested.current.add(position)
    analyst
      .search({ fen: position, movetimeMs: EVAL_MS, depth: 18 })
      .then((res) => {
        const line = res.lines[0]
        let winWhite: number
        let cpWhite: number
        const whiteToMove = turnOf(position) === 'w'
        if (line) {
          const mover = winPercentForMover(line)
          winWhite = whiteToMove ? mover : 100 - mover
          cpWhite = whiteToMove ? cappedCp(line) : -cappedCp(line)
        } else {
          // No moves at all: checkmate or stalemate.
          const g = new Chess(position)
          const mated = g.isCheckmate()
          winWhite = mated ? (whiteToMove ? 0 : 100) : 50
          cpWhite = mated ? (whiteToMove ? -2000 : 2000) : 0
        }
        const mate = line?.mate ?? null
        setEvals((e) => ({ ...e, [position]: { winWhite, cpWhite, best: res.bestMove, mate, pv: line?.pv ?? [] } }))
      })
      .catch(() => requested.current.delete(position))
  }, [])

  useEffect(() => {
    evaluate(fen) // the current position first, for the rope
    for (const m of moves) {
      evaluate(m.before)
      evaluate(m.after)
    }
  }, [fen, moves, evaluate])

  // Threat alerts: after the bot moves, ask what it would play if you passed.
  const lastMove = moves[moves.length - 1]
  const threatFen = myTurn && !result && lastMove && lastMove.color !== myColor ? fen : null
  const passRequested = useRef(new Set<string>())
  useEffect(() => {
    if (!threatFen || passRequested.current.has(threatFen)) return
    passRequested.current.add(threatFen)
    const passed = passFen(threatFen)
    if (!passed) return
    analyst
      .search({ fen: passed, movetimeMs: EVAL_MS, depth: 16 })
      .then((res) => {
        const line = res.lines[0]
        if (!line || !res.bestMove) return
        setPasses((p) => ({
          ...p,
          [threatFen]: { threat: describeThreat(passed, res.bestMove!, line.mate ?? null), cp: cappedCp(line), mate: line.mate ?? null },
        }))
      })
      .catch(() => passRequested.current.delete(threatFen))
  }, [threatFen])

  // Only warn when passing would really cost you: the engine must agree.
  let threat: Threat | null = null
  const pass = threatFen ? passes[threatFen] : undefined
  const now = threatFen ? evals[threatFen] : undefined
  if (pass?.threat && now) {
    const botCpNow = myColor === 'w' ? -now.cpWhite : now.cpWhite
    const realMate = pass.mate !== null && pass.mate > 0
    if (realMate || pass.cp - botCpNow >= THREAT_CP) threat = pass.threat
  }

  // A grade for every move, once both positions around it are judged.
  const verdicts = useMemo<(MoveVerdict | null)[]>(
    () =>
      moves.map((m) => {
        const before = evals[m.before]
        const after = evals[m.after]
        if (!before || !after) return null
        const forMover = (e: Evaluation) => (m.color === 'w' ? e.winWhite : 100 - e.winWhite)
        const winBefore = forMover(before)
        const winAfter = forMover(after)
        const sign = m.color === 'w' ? 1 : -1
        const cpLoss = Math.max(0, sign * (before.cpWhite - after.cpWhite))
        const quality = classifyMove({
          winBefore,
          winAfter,
          cpLoss,
          played: m.lan,
          best: before.best,
          inBook: openingsReady && openingAt(m.after) !== null,
          suggested: suggested[m.before]?.includes(m.lan) ?? false,
        })
        let better: string | null = null
        if (before.best && before.best !== m.lan) {
          try {
            better = new Chess(m.before).move(parseUci(before.best)).san
          } catch {
            better = null
          }
        }
        const betterMove = better && before.best ? parseUci(before.best) : null
        const slip = quality === 'inaccuracy' || quality === 'mistake' || quality === 'blunder'
        const view = m.color === myColor ? 'mover' : 'punisher'
        // A mate, else what is really lost down their line (net of trades), else
        // the win you missed. Their reply is only described when it wins something.
        const refutation = slip
          ? explainSlip({
              fenBefore: m.before,
              move: m,
              after: { pv: after.pv, best: after.best, mate: after.mate },
              before: { pv: before.pv[0] === m.lan ? [] : before.pv, mate: before.mate },
              view,
            })
          : null
        return { quality, winBefore, winAfter, cpLoss, better, betterMove, refutation }
      }),
    [moves, evals, openingsReady, myColor, suggested],
  )

  const requestHint = useCallback(async () => {
    if (!myTurn || hintsLeft <= 0 || hintLoadingFen) return
    const at = fen
    setHintLoadingFen(at)
    const res = await analyst.search({ fen: at, movetimeMs: HINT_MS, multiPv: 3 }).catch(() => null)
    setHintLoadingFen(null)
    if (!res || res.lines.length === 0 || fenRef.current !== at) return
    // If the search was cut short mid-update, an older copy of a move can
    // linger in the list; keep each move once, strongest first.
    const unique = res.lines.filter((l, i) => res.lines.findIndex((x) => x.move === l.move) === i)
    const lines: Hint[] = unique.slice(0, 3).map((line, rank) => {
      const { from, to } = parseUci(line.move)
      let san = line.move
      try {
        san = new Chess(at).move(parseUci(line.move)).san
      } catch {
        // keep the UCI text
      }
      return {
        rank,
        from,
        to,
        san,
        idea: describeIdea(at, line.move, line),
      }
    })
    setHintsLeft((n) => n - 1)
    setHint({ fen: at, lines })
    setSuggested((s) => ({ ...s, [at]: unique.slice(0, 3).map((l) => l.move) }))
    // The hint search is longer (and deeper) than the quick judging search,
    // so it becomes this position's verdict too: hint #1 is "best".
    const top = unique[0]
    const whiteToMove = turnOf(at) === 'w'
    setEvals((e) => ({
      ...e,
      [at]: {
        winWhite: whiteToMove ? winPercentForMover(top) : 100 - winPercentForMover(top),
        cpWhite: whiteToMove ? cappedCp(top) : -cappedCp(top),
        best: top.move,
        mate: top.mate ?? null,
        pv: top.pv,
      },
    }))
  }, [myTurn, hintsLeft, hintLoadingFen, fen])

  // The rope: the latest judged position (it catches up after each move),
  // settling on the final result once the game ends.
  let myWinPct: number | null = null
  if (result === 'win') myWinPct = 100
  else if (result === 'loss') myWinPct = 0
  else if (result === 'draw') myWinPct = 50
  else {
    const history = [fen, ...moves.map((m) => m.before).reverse()]
    const latest = history.map((f) => evals[f]).find(Boolean)
    if (latest) myWinPct = myColor === 'w' ? latest.winWhite : 100 - latest.winWhite
  }

  return {
    myWinPct,
    verdicts,
    openingsReady,
    hintsLeft,
    /** What the bot threatens next, if it's a real tactic or material grab. */
    threat,
    hintLoading: hintLoadingFen === fen,
    /** Hints for the current position only; they vanish once you move. */
    hints: hint?.fen === fen ? hint.lines : null,
    canHint: myTurn && hintsLeft > 0 && !hintLoadingFen && hint?.fen !== fen,
    requestHint,
  }
}

/** The small secondary line for a slip: "About 3 pawns · chances 41% → 7%". */
export function costLine(v: MoveVerdict): string {
  const pawns = v.cpLoss / 100
  const worth = pawns >= 0.5 ? `About ${pawns >= 2 ? Math.round(pawns) : pawns.toFixed(1)} pawns · ` : ''
  return `${worth}winning chances ${Math.round(v.winBefore)}% → ${Math.round(v.winAfter)}%`
}

