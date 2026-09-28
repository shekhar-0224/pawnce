import type { Color } from '../chess/game'
import type { Bot } from '../engine/bots'
import { pieceCode, pieceSet } from '../theme/pieces'

const TINT: Record<Bot['id'], string> = {
  ant: 'bg-[color-mix(in_srgb,var(--danger)_30%,var(--board-light))]',
  frog: 'bg-[color-mix(in_srgb,var(--success)_45%,var(--board-light))]',
  jaguar: 'bg-[color-mix(in_srgb,var(--accent)_45%,var(--board-light))]',
}

export function BotAvatar({ bot, size = 44 }: { bot: Bot; size?: number }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full ${TINT[bot.id]}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {bot.emoji}
    </span>
  )
}

/** The player's own avatar: a pawn in their piece color. */
export function YouAvatar({ color, size = 40 }: { color: Color; size?: number }) {
  const Pawn = pieceSet[pieceCode(color, 'p')]
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full bg-board-light p-1.5 ring-2 ring-accent"
      style={{ width: size, height: size }}
    >
      <Pawn />
    </span>
  )
}
