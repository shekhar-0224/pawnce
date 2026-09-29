/*
 * "In your game": one sentence about where a chess word showed up in a game.
 */
import type { Move } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import { describeTactic, plainName } from '../chess/naming'
import { detectTactics, mainTactic } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import type { MoveVerdict } from './useAnalysis'
import type { LearnCardData } from './useVocab'

export const moveNo = (ply: number) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}`

/** What just happened in this game that shows the word. */
export function gameContext(card: LearnCardData, move: Move, verdict: MoveVerdict | null, byMe: boolean, bot: Bot): string {
  const who = byMe ? 'You' : `The ${bot.name}`
  if (card.kind === 'opening') {
    return `${byMe ? 'You' : `The ${bot.name}`} chose it with ${moveNo(card.ply)} ${move.san}.`
  }
  const tactic = mainTactic(detectTactics(move.before, move))
  if (tactic && tactic.kind === card.id) return describeTactic(tactic, byMe, bot.name, move.piece)
  if (byMe && verdict?.betterMove) {
    const missed = mainTactic(detectTactics(move.before, verdict.betterMove))
    if (missed && missed.kind === card.id) {
      return `You missed one: instead of ${move.san}, ${verdict.better} was a ${WORDS_BY_ID[card.id].name.toLowerCase()}.`
    }
  }
  switch (card.id) {
    case 'stalemate':
    case 'insufficient':
    case 'threefold':
    case 'fifty-moves':
    case 'flag':
    case 'resign':
      return `This game ended this way.`
    case 'blunder':
    case 'mistake':
    case 'inaccuracy':
      return verdict
        ? `${move.san} cost about ${Math.max(0.5, Math.round(verdict.cpLoss / 50) / 2)} pawns’ worth.${verdict.better ? ` ${verdict.better} was better.` : ''}`
        : `${move.san} weakened your position.`
    case 'best':
      return `${move.san} was exactly the engine’s top choice. Nice!`
    case 'book':
      return `${move.san} is a standard opening move.`
    default:
      return `${who} played ${move.san}: ${plainName(move).toLowerCase()}.`
  }
}

