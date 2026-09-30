/*
 * What the coach says, as plain text, so the full coach (side panel) and
 * the one-line verdict under the board on phones always agree.
 */
import type { Move } from '../chess/game'
import { type Quality, TACTIC_LABELS, describeTactic, termsFor } from '../chess/naming'
import { explainOpening } from '../chess/openingInfo'
import type { Threat } from '../chess/threats'
import { detectTactics, mainTactic, tacticHolds } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import type { MoveVerdict } from './useAnalysis'

export const BADGE: Record<Quality, { mark: string; word: string; tone: string }> = {
  book: { mark: 'B', word: 'a book move', tone: 'border border-border bg-surface-2 text-muted' },
  best: { mark: '★', word: 'the best move!', tone: 'bg-accent text-on-accent' },
  good: { mark: '✓', word: 'a good move', tone: 'bg-accent/20 text-accent' },
  inaccuracy: { mark: '?!', word: 'an inaccuracy', tone: 'bg-warn/20 text-warn' },
  mistake: { mark: '?', word: 'a mistake', tone: 'bg-danger/25 text-danger' },
  blunder: { mark: '??', word: 'a blunder', tone: 'bg-danger text-white' },
}

const pct = (n: number) => `${Math.round(n)}%`
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export const isSlip = (v: MoveVerdict | null | undefined) =>
  !!v && (v.quality === 'inaccuracy' || v.quality === 'mistake' || v.quality === 'blunder')

/** The one sentence about your move: why it was good or bad, in board terms. */
export function yourMoveWhy(
  move: Move,
  verdict: MoveVerdict | null,
  reached: string | null,
  current: string | null,
  botName: string,
): string | null {
  const tactic = mainTactic(detectTactics(move.before, move))
  const term = termsFor(move).find((t) => t.explain)
  // Only praise a tactic that holds up; if it fails, say why.
  const holds = tacticHolds(verdict?.quality)
  if (tactic && holds === false) {
    const name = TACTIC_LABELS[tactic.kind].toLowerCase()
    return verdict?.refutation
      ? `That looks like a ${name}, but ${lowerFirst(verdict.refutation.text)}`
      : `That looks like a ${name}, but it doesn't work here.`
  }
  if (isSlip(verdict)) return verdict?.refutation?.text ?? null
  if (tactic && holds) return describeTactic(tactic, true, botName, move.piece)
  if (reached) return `You're in the ${reached}. ${explainOpening(reached)}`
  if (term) return term.explain
  if (verdict?.quality === 'book') return current ? `Still in the ${current}: a standard move here.` : 'A standard opening move.'
  return null
}

export type NoteTone = 'danger' | 'good' | 'warn' | 'plain'

export const NOTE_TONES: Record<NoteTone, string> = {
  danger: 'border border-danger/40 bg-danger/10 text-text',
  good: 'border border-accent/40 bg-accent/10 text-text',
  warn: 'border border-warn/50 bg-warn/10 text-text',
  plain: 'border border-border bg-surface-2 text-text',
}

/** What to say about the bot's reply, only when it matters to you. */
export function botReplyNote(
  move: Move,
  verdict: MoveVerdict | null,
  bot: Bot,
  reached: string | null,
  threat: Threat | null,
): { text: string; tone: NoteTone } | null {
  const tactic = mainTactic(detectTactics(move.before, move))
  const holds = tacticHolds(verdict?.quality)
  if (tactic && holds) return { text: `Watch out! ${describeTactic(tactic, false, bot.name, move.piece)}`, tone: 'danger' }
  if (tactic && holds === false) {
    const name = TACTIC_LABELS[tactic.kind].toLowerCase()
    return {
      text: `The ${bot.name} tried a ${name}, but it doesn't work. ${verdict?.refutation?.text ?? 'Look for the strongest answer.'}`,
      tone: 'good',
    }
  }
  if (move.san.endsWith('+')) return { text: 'Check! Your king is attacked: move it, block, or capture the attacker.', tone: 'danger' }
  if (verdict && (verdict.quality === 'mistake' || verdict.quality === 'blunder')) {
    return { text: `The ${bot.name} slipped! ${verdict.refutation?.text ?? 'Look for a strong move.'}`, tone: 'good' }
  }
  if (threat) return { text: threat.text, tone: 'warn' }
  if (verdict && verdict.quality === 'inaccuracy') {
    return {
      text: `Not the ${bot.name}'s best. That helped you: ${pct(100 - verdict.winBefore)} → ${pct(100 - verdict.winAfter)}.`,
      tone: 'plain',
    }
  }
  if (reached) return { text: `The ${bot.name} steered into the ${reached}. ${explainOpening(reached)}`, tone: 'plain' }
  return null
}
