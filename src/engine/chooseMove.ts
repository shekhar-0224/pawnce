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

function isLegal(fen: string, uci: string): boolean {
  return new Chess(fen).moves({ verbose: true }).some((m) => m.lan === uci)
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
    const uci = await engine.bestMove({
      fen,
      skillLevel: bot.skillLevel,
      movetimeMs,
      depth: bot.depth,
    })
    // Never let the game get stuck: an empty or illegal answer falls back to a legal move.
    return uci && isLegal(fen, uci) ? uci : randomMove(fen)
  } catch (err) {
    if (!warned) {
      warned = true
      console.warn('Stockfish unavailable, the bot will play random moves.', err)
    }
    return randomMove(fen)
  }
}
