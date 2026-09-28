import { useEffect, useRef } from 'react'
import { type Move, movePairs } from '../chess/game'

/** Moves in numbered pairs (1. e4 e5). Scrolls to the newest move. */
export function MoveList({ moves }: { moves: Move[] }) {
  const listRef = useRef<HTMLOListElement>(null)
  const pairs = movePairs(moves)
  const lastIndex = moves.length - 1

  useEffect(() => {
    const el = listRef.current?.parentElement
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [moves.length])

  if (moves.length === 0) {
    return <p className="px-2 py-3 text-sm text-muted">Moves will appear here.</p>
  }

  const cell = (move: Move | undefined, index: number) => (
    <span
      className={`rounded-lg px-2 py-1 font-semibold ${
        index === lastIndex ? 'bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-accent' : ''
      }`}
    >
      {move?.san}
    </span>
  )

  return (
    <ol ref={listRef} className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 text-[15px]">
      {pairs.map((p) => {
        const whiteIndex = (p.number - 1) * 2
        return (
          <li key={p.number} className="contents">
            <span className="px-2 py-1 text-right tabular-nums text-muted">{p.number}.</span>
            {cell(p.white, whiteIndex)}
            {cell(p.black, whiteIndex + 1)}
          </li>
        )
      })}
    </ol>
  )
}
