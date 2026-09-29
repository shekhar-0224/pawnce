# Pawnce: project brief

## What we're building
Pawnce is a chess learning app. You play real games, and the app teaches
chess vocabulary in the moment: every move gets named (castling, fork, pin,
Italian Game, blunder), you see your winning chances live, and you get
2 hints per game that show 3 strong moves plus the idea behind each.

Goal: learn chess by playing, not by reading.

## Who is building it
A solo, non-developer founder working with Claude Code. So:
- Explain what you're doing in plain language, briefly.
- Build ONE feature at a time, then stop so I can test it in the browser.
- Commit to git after every working feature, with a clear message.
- If something breaks and two fixes fail, roll back to the last commit
  and try a different approach instead of piling on patches.
- Prefer simple, well-known libraries over clever custom code.

## Tech stack
- Vite + React + TypeScript
- chess.js for rules and legal moves
- react-chessboard for the board
- Stockfish in the browser as a Web Worker (npm "stockfish")
- No backend until the "play with friends" phase (then Supabase or Firebase)

## Architecture rules
- Keep chess logic, engine code, and UI in separate folders.
- Piece artwork must be swappable (custom jungle animal pieces come later).
- Layout: board on the left, side panel on the right (stacked on mobile).
- Mobile first: design and test every screen on a phone before desktop.
  It must feel frictionless: the board, your move's feedback and the main
  action are visible without scrolling. The app will later be wrapped for
  iOS/Android.

## Roadmap (do not jump ahead)
1. Playable game vs. Stockfish bot, difficulty levels, move history, game over
2. Chess clocks: bullet, blitz, rapid, classical, with increments
3. Win chances meter: win / draw / loss, broadcast style (win% from the Lichess
   formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1))
   and hint orbs (Stockfish MultiPV = 3, max 2 per game)
4. Move naming: rule terms, opening names (Lichess chess-openings dataset),
   move quality (best / good / inaccuracy / mistake / blunder)
5. Tactic detection: fork, then pin, skewer, discovered attack
6. Play with friends via shareable link (real-time rooms, "learning game" toggle)
7. Jungle pieces and polish: animations, the "FORK!" moment, sounds,
   and a full branding refresh (logo, colors, overall look)
8. Ship: web first, then app stores via Capacitor

## Design direction
- Minimal, modern jungle (see DESIGN.md): muted deep-green neutrals, one lime
  accent, Geist type, flat surfaces, thin borders, no bubbly shapes.
- Bento grids for home and the game-over summary; the game screen stays
  minimal with the board dominant.
- Tagline: "Play the move. Learn its name."
- Pieces keep standard names everywhere in the UI (Knight, Rook, fork, check).
  The jungle theme is visual only.
- Planned jungle set: Knight = frog, Bishop = snake, Rook = rhino,
  Queen = jaguar, King = silverback gorilla, Pawns = army ants.
  Two sides: day jungle vs. night jungle.
- Clear feedback moments (teaching-moment card, "Fork!" tags), never cluttered.

## Current phase
Phases 1 to 5 are built, plus a learning round (teaching moments, take-backs,
move ticker, game summary with replay) and the minimal redesign.
Next: decide between Phase 7 (jungle pieces and polish) and Phase 6 (friends).
