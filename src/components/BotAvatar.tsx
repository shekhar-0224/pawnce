import type { Color } from '../chess/game'
import type { Bot } from '../engine/bots'
import { pieceCode, pieceSet } from '../theme/pieces'

/** Bots get a simple monogram tile until the jungle animal art exists. */
export function BotAvatar({ bot, size = 40 }: { bot: Bot; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-lg border border-border bg-surface-2 font-display font-bold text-text"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {bot.name[0]}
    </span>
  )
}

/** The player's own avatar: a pawn in their piece color. */
export function YouAvatar({ color, size = 40 }: { color: Color; size?: number }) {
  const Pawn = pieceSet[pieceCode(color, 'p')]
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-lg border border-accent/60 bg-surface-2 p-1.5"
      style={{ width: size, height: size }}
    >
      <Pawn />
    </span>
  )
}
