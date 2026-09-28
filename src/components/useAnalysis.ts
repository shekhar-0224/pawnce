import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Color, type Move, type Square, parseUci } from '../chess/game'
import { describeIdea } from '../chess/ideas'
import { type Quality, classifyMove } from '../chess/naming'
import { loadOpenings, openingAt } from '../chess/openings'
import type { Result } from '../chess/outcome'
import { analyst } from '../engine/stockfish'
import { winPercentFor, winPercentForMover } from '../engine/winChance'

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
  /** Your winning chances after this move, 0 to 100. */
  winPct: number
}

/** The engine's verdict on one position. */
type Evaluation = {
  /** White's winning chances, 0 to 100. */
  winWhite: number
  /** The engine's best move here (UCI), if any. */
  best: string | null
}

/** How one move went: its grade and the chances before and after, for the mover. */
export type MoveVerdict = {
  quality: Quality
  winBefore: number
  winAfter: number
  /** The engine's preferred move instead (SAN), when it differs. */
  better: string | null
}

const turnOf = (fen: string) => fen.split(' ')[1] as Color

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
        if (line) {
          const mover = winPercentForMover(line)
          winWhite = turnOf(position) === 'w' ? mover : 100 - mover
        } else {
          // No moves at all: checkmate or stalemate.
          const g = new Chess(position)
          winWhite = g.isCheckmate() ? (g.turn() === 'w' ? 0 : 100) : 50
        }
        setEvals((e) => ({ ...e, [position]: { winWhite, best: res.bestMove } }))
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
        const quality = classifyMove({
          winBefore,
          winAfter,
          played: m.lan,
          best: before.best,
          inBook: openingsReady && openingAt(m.after) !== null,
        })
        let better: string | null = null
        if (before.best && before.best !== m.lan) {
          try {
            better = new Chess(m.before).move(parseUci(before.best)).san
          } catch {
            better = null
          }
        }
        return { quality, winBefore, winAfter, better }
      }),
    [moves, evals, openingsReady],
  )

  const requestHint = useCallback(async () => {
    if (!myTurn || hintsLeft <= 0 || hintLoadingFen) return
    const at = fen
    setHintLoadingFen(at)
    const res = await analyst.search({ fen: at, movetimeMs: HINT_MS, multiPv: 3 }).catch(() => null)
    setHintLoadingFen(null)
    if (!res || res.lines.length === 0 || fenRef.current !== at) return
    const lines: Hint[] = res.lines.slice(0, 3).map((line, rank) => {
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
        winPct: winPercentFor(myColor, myColor, line),
      }
    })
    setHintsLeft((n) => n - 1)
    setHint({ fen: at, lines })
  }, [myTurn, hintsLeft, hintLoadingFen, fen, myColor])

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
    hintLoading: hintLoadingFen === fen,
    /** Hints for the current position only; they vanish once you move. */
    hints: hint?.fen === fen ? hint.lines : null,
    canHint: myTurn && hintsLeft > 0 && !hintLoadingFen && hint?.fen !== fen,
    requestHint,
  }
}
