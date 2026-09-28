// Copies the Stockfish engine files from node_modules into public/stockfish
// so Vite serves them as plain static files. The engine script finds its
// .wasm file next to itself, so both must live in the same folder.
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', 'stockfish', 'bin')
const to = join(root, 'public', 'stockfish')
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']

mkdirSync(to, { recursive: true })
for (const file of files) {
  copyFileSync(join(from, file), join(to, file))
}
console.log(`Copied Stockfish (${files.join(', ')}) to public/stockfish`)
