import type { Bot } from '../engine/bots'

const TINT: Record<Bot['id'], string> = {
  ant: 'bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface-2))]',
  frog: 'bg-[color-mix(in_srgb,var(--success)_22%,var(--surface-2))]',
  jaguar: 'bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface-2))]',
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
