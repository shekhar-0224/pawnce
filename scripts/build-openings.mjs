// Builds src/chess/openings-data.json from the Lichess chess-openings
// dataset (public domain, CC0): https://github.com/lichess-org/chess-openings
//
// Each opening line is replayed with chess.js and stored by its position,
// so the app can name an opening even when it's reached by a different
// move order. Run with: node scripts/build-openings.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'chess', 'openings-data.json')

/** Position key: piece placement, side to move, castling, en passant. */
const positionKey = (fen) => fen.split(' ').slice(0, 4).join(' ')

const data = {}
for (const file of ['a', 'b', 'c', 'd', 'e']) {
  const res = await fetch(`${BASE}/${file}.tsv`)
  if (!res.ok) throw new Error(`Could not download ${file}.tsv: ${res.status}`)
  const rows = (await res.text()).trim().split('\n').slice(1)
  for (const row of rows) {
    const [eco, name, pgn] = row.split('\t')
    const game = new Chess()
    for (const token of pgn.split(/\s+/)) {
      if (!token || /^\d+\.$/.test(token)) continue
      game.move(token)
    }
    // Longer (more specific) lines come later in the files and win.
    data[positionKey(game.fen())] = [eco, name]
  }
}
writeFileSync(out, JSON.stringify(data))
console.log(`Wrote ${Object.keys(data).length} openings to ${out}`)
