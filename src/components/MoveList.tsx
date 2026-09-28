import { useEffect, useRef } from 'react'
import { type Move, movePairs } from '../chess/game'
import { QUALITY_LABELS, QUALITY_MARKS, type Quality } from '../chess/naming'
import type { MoveVerdict } from './useAnalysis'

const MARK_TONE: Partial<Record<Quality, string>> = {
  best: 'text-success',
  inaccuracy: 'text-accent/80',
  mistake: 'text-accent',
  blunder: 'text-danger',
}

/** Moves in numbered pairs (1. e4 e5). Scrolls to the newest move. */
type Props = {
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  /** Column headings, e.g. "You" and "🐸 Frog". */
  whiteLabel: string
  blackLabel: string
}

export function MoveList({ moves, verdicts, whiteLabel, blackLabel }: Props) {
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

  const mark = (index: number) => {
    const q = verdicts[index]?.quality
    const symbol = q && QUALITY_MARKS[q]
    if (!q || !symbol) return null
    return (
      <span className={`ml-1 text-xs font-bold ${MARK_TONE[q]}`} title={QUALITY_LABELS[q]}>
        {symbol}
      </span>
    )
  }

  const cell = (move: Move | undefined, index: number) => (
    <span
      className={`rounded-lg px-2 py-1 font-semibold ${
        index === lastIndex ? 'bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-accent' : ''
      }`}
    >
      {move?.san}
      {mark(index)}
    </span>
  )

  return (
    <ol ref={listRef} className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 text-[15px]">
      <li className="contents text-xs font-bold text-muted" aria-hidden>
        <span className="sticky top-0 bg-[color-mix(in_srgb,var(--bg)_40%,var(--surface))]" />
        <span className="sticky top-0 bg-[color-mix(in_srgb,var(--bg)_40%,var(--surface))] px-2 py-1">{whiteLabel}</span>
        <span className="sticky top-0 bg-[color-mix(in_srgb,var(--bg)_40%,var(--surface))] px-2 py-1">{blackLabel}</span>
      </li>
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
