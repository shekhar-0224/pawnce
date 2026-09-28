# Pawnce

Learn chess by playing. See `CLAUDE.md` for the project brief and
`DESIGN.md` for the design system.

```bash
npm install
npm run dev     # local dev server
npm run build   # production build (what Vercel runs)
node scripts/build-openings.mjs   # refresh opening names from Lichess (rarely needed)
```

Folders: `src/chess` (game logic), `src/engine` (Stockfish),
`src/components` (UI), `src/theme` (colors, fonts, piece set),
`src/storage` (recent games on this device).
