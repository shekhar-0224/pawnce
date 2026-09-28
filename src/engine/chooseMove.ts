/*
 * Picks the bot's next move. If Stockfish can't load for some reason, the
 * bot falls back to a random legal move so a game never gets stuck.
 */
import { Chess } from 'chess.js'
import type { Bot } from './bots'
import { engine } from './stockfish'

export type UciMove = string

function randomMove(fen: string): UciMove | null {
  const moves = new Chess(fen).moves({ verbose: true })
  if (moves.length === 0) return null
  return moves[Math.floor(Math.random() * moves.length)].lan
}

let warned = false

export async function chooseBotMove(
  fen: string,
  bot: Bot,
  movetimeMs = bot.movetimeMs,
): Promise<UciMove | null> {
  if (bot.randomMoveChance > 0 && Math.random() < bot.randomMoveChance) {
    return randomMove(fen)
  }
  try {
    return await engine.bestMove({
      fen,
      skillLevel: bot.skillLevel,
      movetimeMs,
      depth: bot.depth,
    })
  } catch (err) {
    if (!warned) {
      warned = true
      console.warn('Stockfish unavailable, the bot will play random moves.', err)
    }
    return randomMove(fen)
  }
}
