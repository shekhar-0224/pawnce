import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Color, type Square, parseUci } from '../chess/game'
import { describeIdea } from '../chess/ideas'
import type { Result } from '../chess/outcome'
import { analyst } from '../engine/stockfish'
import { winPercentFor } from '../engine/winChance'

export const HINTS_PER_GAME = 2

/** Strength shades for hint 1, 2 and 3, on the arrows and in the card. */
export const HINT_ALPHAS = [1, 0.62, 0.38]

/** Think time for the win % after each move, and for a hint. */
const EVAL_MS = 450
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

/**
 * Live winning chances (the rope) and the hint orbs, both powered by the
 * full-strength `analyst` engine.
 */
export function useAnalysis(game: Chess, myColor: Color, myTurn: boolean, result: Result | null) {
  const fen = game.fen()
  const turn = game.turn()
  const isOver = result !== null

  const [evaluation, setEvaluation] = useState<number | null>(null)
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_GAME)
  const [hint, setHint] = useState<{ fen: string; lines: Hint[] } | null>(null)
  const [hintLoadingFen, setHintLoadingFen] = useState<string | null>(null)

  const fenRef = useRef(fen)
  useEffect(() => {
    fenRef.current = fen
  }, [fen])

  // Re-judge the position after every move.
  useEffect(() => {
    if (isOver) return
    let cancelled = false
    analyst
      .analyse({ fen, movetimeMs: EVAL_MS, depth: 18 })
      .then((res) => {
        if (cancelled || !res?.lines[0]) return
        setEvaluation(winPercentFor(myColor, turn, res.lines[0]))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [fen, turn, myColor, isOver])

  const requestHint = useCallback(async () => {
    if (!myTurn || hintsLeft <= 0 || hintLoadingFen) return
    const at = fen
    setHintLoadingFen(at)
    const res = await analyst.analyse({ fen: at, movetimeMs: HINT_MS, multiPv: 3 }).catch(() => null)
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
    setEvaluation(lines[0].winPct)
  }, [myTurn, hintsLeft, hintLoadingFen, fen, myColor])

  // The rope settles on the final result once the game ends.
  const myWinPct =
    result === 'win' ? 100 : result === 'loss' ? 0 : result === 'draw' ? 50 : evaluation

  return {
    myWinPct,
    hintsLeft,
    hintLoading: hintLoadingFen === fen,
    /** Hints for the current position only; they vanish once you move. */
    hints: hint?.fen === fen ? hint.lines : null,
    canHint: myTurn && hintsLeft > 0 && !hintLoadingFen && hint?.fen !== fen,
    requestHint,
  }
}
