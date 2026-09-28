import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type TimeControl, hasClock } from '../chess/clock'
import type { Bot } from '../engine/bots'
import { chooseBotMove } from '../engine/chooseMove'
import { engine } from '../engine/stockfish'
import {
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
  colorToSide,
  parseUci,
  replay,
} from '../chess/game'
import {
  type Outcome,
  detectOutcome,
  explain,
  headline,
  resultFor,
  timeoutOutcome,
} from '../chess/outcome'
import { saveGame } from '../storage/recentGames'

export type MoveInput = { from: Square; to: Square; promotion?: PieceSymbol }

const BOT_DELAY_MIN = 400
const BOT_DELAY_MAX = 900

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type ClockState = {
  /** Time left for each side when the current turn began, in ms. */
  remaining: Record<Color, number>
  /** When the side to move's clock started ticking (Date.now()), or null if stopped. */
  runningSince: number | null
}

/** Time left for `side` right now. */
export function timeLeft(clock: ClockState, side: Color, turn: Color, now = Date.now()): number {
  const running = clock.runningSince !== null && side === turn
  return clock.remaining[side] - (running ? now - clock.runningSince! : 0)
}

/**
 * All the state of one game against a bot. Mount a fresh one (via a React
 * `key`) for every new game.
 */
export function useGame(bot: Bot, myColor: Color, timeControl: TimeControl) {
  const [moves, setMoves] = useState<Move[]>([])
  const [resigned, setResigned] = useState(false)
  const [flagged, setFlagged] = useState<Color | null>(null)

  // Clocks. They start once both sides have made their first move.
  const clockOn = hasClock(timeControl)
  const [clock, setClock] = useState<ClockState>(() => ({
    remaining: { w: timeControl.initialMs, b: timeControl.initialMs },
    runningSince: null,
  }))
  const clockRef = useRef(clock)
  const updateClock = useCallback((next: ClockState) => {
    clockRef.current = next
    setClock(next)
  }, [])

  const game = useMemo(() => replay(moves), [moves])
  const fen = game.fen()
  const turn = game.turn()

  const outcome: Outcome | null = useMemo(() => {
    if (resigned) return { reason: 'resignation', winner: myColor === 'w' ? 'b' : 'w' }
    if (flagged) return timeoutOutcome(game, flagged)
    return detectOutcome(game)
  }, [game, resigned, flagged, myColor])

  const isOver = outcome !== null
  const myTurn = !isOver && turn === myColor

  // Latest moves, readable from callbacks without waiting for a re-render.
  const movesRef = useRef(moves)

  /** Try a move; returns false (and changes nothing) if it's illegal. */
  const play = useCallback((input: MoveInput): boolean => {
    const g = replay(movesRef.current)
    const mover = g.turn()
    let move: Move
    try {
      move = g.move(input)
    } catch {
      return false
    }
    if (clockOn) {
      const now = Date.now()
      const c = clockRef.current
      const remaining = { ...c.remaining }
      if (c.runningSince !== null) {
        remaining[mover] -= now - c.runningSince
        if (remaining[mover] <= 0) return false // too late: the flag has fallen
        remaining[mover] += timeControl.incrementMs
      }
      const clocksStarted = movesRef.current.length + 1 >= 2
      updateClock({ remaining, runningSince: clocksStarted && !g.isGameOver() ? now : null })
    }
    movesRef.current = [...movesRef.current, move]
    setMoves(movesRef.current)
    return true
  }, [clockOn, timeControl.incrementMs, updateClock])

  /** Stop the running clock, keeping the time used so far. */
  const stopClock = useCallback(() => {
    const c = clockRef.current
    if (!clockOn || c.runningSince === null) return
    const side = replay(movesRef.current).turn()
    const remaining = { ...c.remaining }
    remaining[side] = Math.max(0, remaining[side] - (Date.now() - c.runningSince))
    updateClock({ remaining, runningSince: null })
  }, [clockOn, updateClock])

  // Flag fall: when the side to move runs out of time, the game ends.
  useEffect(() => {
    if (!clockOn || isOver || clock.runningSince === null) return
    const left = timeLeft(clock, turn, turn)
    const t = setTimeout(() => {
      updateClock({ remaining: { ...clockRef.current.remaining, [turn]: 0 }, runningSince: null })
      setFlagged(turn)
    }, Math.max(0, left))
    return () => clearTimeout(t)
  }, [clock, turn, isOver, clockOn, updateClock])

  // Development only (removed from production builds): lets automated
  // browser tests jump to a position by playing a list of moves.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __pawnceSetMoves?: (sans: string[]) => void }
    w.__pawnceSetMoves = (sans) => {
      const g = replay([])
      for (const san of sans) g.move(san)
      movesRef.current = g.history({ verbose: true })
      setMoves(movesRef.current)
    }
    return () => {
      delete w.__pawnceSetMoves
    }
  }, [])

  // Clear the engine's memory at the start of each game.
  useEffect(() => engine.newGame(), [])

  // The bot's turn: ask the engine, wait a natural moment, then move.
  useEffect(() => {
    if (isOver || turn === myColor) return
    let cancelled = false
    let delay = BOT_DELAY_MIN + Math.random() * (BOT_DELAY_MAX - BOT_DELAY_MIN)
    let movetimeMs = bot.movetimeMs
    if (clockOn) {
      // On a clock the bot budgets its time, and speeds up when it runs low.
      const left = timeLeft(clockRef.current, turn, turn)
      const budget = left / 40 + timeControl.incrementMs * 0.6
      movetimeMs = Math.round(Math.min(bot.movetimeMs, Math.max(50, budget)))
      delay = Math.min(delay, Math.max(120, left / 30))
    }
    const started = performance.now()
    chooseBotMove(fen, bot, movetimeMs).then(async (uci) => {
      const rest = delay - (performance.now() - started)
      if (rest > 0) await sleep(rest)
      if (cancelled) return
      if (uci) play(parseUci(uci))
    })
    return () => {
      cancelled = true
    }
  }, [fen, isOver, turn, myColor, bot, play, clockOn, timeControl.incrementMs])

  // Save the finished game on this device, once.
  const saved = useRef(false)
  useEffect(() => {
    if (!outcome || saved.current) return
    saved.current = true
    const g = replay(moves)
    g.setHeader('Event', 'Pawnce vs. bot')
    g.setHeader('Site', 'Pawnce')
    g.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'))
    g.setHeader('White', myColor === 'w' ? 'You' : `${bot.name} (${bot.level})`)
    g.setHeader('Black', myColor === 'b' ? 'You' : `${bot.name} (${bot.level})`)
    if (clockOn) {
      g.setHeader('TimeControl', `${timeControl.initialMs / 1000}+${timeControl.incrementMs / 1000}`)
    }
    g.setHeader('Result', outcome.winner === null ? '1/2-1/2' : outcome.winner === 'w' ? '1-0' : '0-1')
    saveGame({
      date: new Date().toISOString(),
      bot: bot.id,
      myColor: colorToSide(myColor),
      result: resultFor(outcome, myColor),
      reason: outcome.reason,
      moves: Math.ceil(moves.length / 2),
      timeControl: timeControl.id,
      pgn: g.pgn(),
    })
  }, [outcome, moves, bot, myColor, clockOn, timeControl])

  const summary = useMemo(() => {
    if (!outcome) return null
    const result = resultFor(outcome, myColor)
    return {
      result,
      reason: outcome.reason,
      title: headline(result, outcome.reason),
      detail: explain(game, outcome, myColor, bot.name),
    }
  }, [outcome, game, myColor, bot.name])

  return {
    game,
    fen,
    moves,
    lastMove: moves[moves.length - 1],
    turn,
    myTurn,
    /** The bot is thinking whenever it's its turn. */
    thinking: !isOver && turn !== myColor,
    isOver,
    summary,
    play,
    clockOn,
    clock,
    resign: () => {
      stopClock()
      setResigned(true)
    },
  }
}
