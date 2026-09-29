import type { CSSProperties } from 'react'
import { ANIMALS } from './animals'

export type AnimalType = keyof typeof ANIMALS

const NAMES: Record<AnimalType, string> = { p: 'ant', n: 'frog', q: 'jaguar' }

const ICON_SIZE: Record<AnimalType, number> = { p: 58, n: 62, q: 64 }

/** A bot's animal on a round token (cream for day, deep green for night). */
export function JungleToken({ color, type, svgStyle }: { color: 'w' | 'b'; type: AnimalType; svgStyle?: CSSProperties }) {
  const side = color === 'w' ? 'day' : 'night'
  const size = ICON_SIZE[type]
  const offset = (100 - size) / 2
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={NAMES[type]}
      style={{ width: '100%', height: '100%', display: 'block', ...svgStyle }}
    >
      {/* A thin lower rim gives the token a little depth. */}
      <circle cx="50" cy="52.5" r="42" style={{ fill: `var(--piece-${side}-edge)` }} />
      <circle cx="50" cy="50" r="42" style={{ fill: `var(--piece-${side})` }} />
      <svg
        x={offset}
        y={offset - 1}
        width={size}
        height={size}
        viewBox="0 0 512 512"
        style={{ color: `var(--piece-${side}-ink)` }}
        dangerouslySetInnerHTML={{ __html: ANIMALS[type] }}
      />
    </svg>
  )
}
