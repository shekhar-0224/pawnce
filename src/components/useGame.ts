import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { type Outcome, detectOutcome, explain, headline, resultFor } from '../chess/outcome'
import { saveGame } from '../storage/recentGames'

export type MoveInput = { from: Square; to: Square; promotion?: PieceSymbol }

const BOT_DELAY_MIN = 400
const BOT_DELAY_MAX = 900

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * All the state of one game against a bot. Mount a fresh one (via a React
 * `key`) for every new game.
 */
export function useGame(bot: Bot, myColor: Color) {
  const [moves, setMoves] = useState<Move[]>([])
  const [resigned, setResigned] = useState(false)

  const game = useMemo(() => replay(moves), [moves])
  const fen = game.fen()
  const turn = game.turn()

  const outcome: Outcome | null = useMemo(() => {
    if (resigned) return { reason: 'resignation', winner: myColor === 'w' ? 'b' : 'w' }
    return detectOutcome(game)
  }, [game, resigned, myColor])

  const isOver = outcome !== null
  const myTurn = !isOver && turn === myColor

  // Latest moves, readable from callbacks without waiting for a re-render.
  const movesRef = useRef(moves)

  /** Try a move; returns false (and changes nothing) if it's illegal. */
  const play = useCallback((input: MoveInput): boolean => {
    const g = replay(movesRef.current)
    let move: Move
    try {
      move = g.move(input)
    } catch {
      return false
    }
    movesRef.current = [...movesRef.current, move]
    setMoves(movesRef.current)
    return true
  }, [])

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
    const delay = BOT_DELAY_MIN + Math.random() * (BOT_DELAY_MAX - BOT_DELAY_MIN)
    const started = performance.now()
    chooseBotMove(fen, bot).then(async (uci) => {
      const rest = delay - (performance.now() - started)
      if (rest > 0) await sleep(rest)
      if (cancelled) return
      if (uci) play(parseUci(uci))
    })
    return () => {
      cancelled = true
    }
  }, [fen, isOver, turn, myColor, bot, play])

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
    g.setHeader('Result', outcome.winner === null ? '1/2-1/2' : outcome.winner === 'w' ? '1-0' : '0-1')
    saveGame({
      date: new Date().toISOString(),
      bot: bot.id,
      myColor: colorToSide(myColor),
      result: resultFor(outcome, myColor),
      reason: outcome.reason,
      moves: Math.ceil(moves.length / 2),
      pgn: g.pgn(),
    })
  }, [outcome, moves, bot, myColor])

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
    resign: () => setResigned(true),
  }
}
