/*
 * Opening names from the Lichess chess-openings dataset (public domain).
 * The data (about 3,800 openings) is loaded only when first needed, so the
 * start screen stays fast. Rebuild it with: node scripts/build-openings.mjs
 */
export type Opening = { eco: string; name: string }

type OpeningData = Record<string, string[]>

let data: OpeningData | null = null
let loading: Promise<OpeningData> | null = null

/** Start downloading the openings list (safe to call many times). */
export function loadOpenings(): Promise<OpeningData> {
  loading ??= import('./openings-data.json').then((m) => {
    data = m.default as OpeningData
    return data
  })
  return loading
}

/** Position key: piece placement, side to move, castling, en passant. */
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

/** The named opening for exactly this position, if it's a known one. */
export function openingAt(fen: string): Opening | null {
  const hit = data?.[positionKey(fen)]
  return hit ? { eco: hit[0], name: hit[1] } : null
}

/**
 * The most specific opening reached so far, looking back through the game,
 * and the move (index into `fens`) that reached it, so we know who chose it.
 */
export function openingOf(fens: string[]): (Opening & { ply: number }) | null {
  for (let i = fens.length - 1; i >= 0; i--) {
    const o = openingAt(fens[i])
    if (o) return { ...o, ply: i }
  }
  return null
}
