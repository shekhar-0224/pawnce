# Pawnce design system

## Direction
Minimal, modern jungle. Muted deep-green neutrals, one fresh accent (lime),
a modern sans-serif, flat surfaces, thin borders, no bubbly shapes, lots of
whitespace. The jungle shows up through color and, later, the animal
pieces and illustrations, never through decoration on every surface.

Tagline: **Play the move. Learn its name.**

## Layout principles
- **Mobile first, frictionless.** Design for a phone first. While playing,
  the board, the win-chances line, the move ticker and the coach's verdict
  on your last move are all visible without scrolling. Every tap target is
  44px or more. Leaving a game asks first (keep playing / resign and leave).
- **Home screen: bento grid.** One large Play tile (headline, current setup,
  the Play button) plus smaller tiles for Opponent, Side, Clock and Recent
  games. On phones the tiles stack, Play tile first.
- **Game screen: minimal, not bento.** The board dominates. One clean side
  panel holds winning chances, the coach (move labels and feedback), hints
  and the move list. A slim ticker above the board names the last two moves.
- **Game-over summary: bento grid.** Result, Key moments, Patterns played
  (opening, tactics, rule terms), a move-by-move Replay, and Play again.
- Generous whitespace: 8px spacing grid, 16 to 24px inside tiles, 12 to 16px
  between tiles.

## Colors
All colors are CSS variables in `src/theme/tokens.css`, exposed to Tailwind
in `src/index.css`. Never hard-code a hex value in a component.

| Token           | Value                     | Use                                         |
| --------------- | ------------------------- | ------------------------------------------- |
| `--bg`          | `#0B100D`                 | Page background (deep green-black)          |
| `--surface`     | `#111814`                 | Tiles, panels                               |
| `--surface-2`   | `#172019`                 | Raised or selected controls, hover          |
| `--border`      | `#222D26`                 | Thin 1px borders and dividers               |
| `--text`        | `#E9EEEA`                 | Primary text                                |
| `--text-muted`  | `#8C9A91`                 | Secondary text, labels                      |
| `--accent`      | `#C6F36B`                 | The one accent (lime): Play, selection, focus, good moves, hints |
| `--on-accent`   | `#0B100D`                 | Text on the accent                          |
| `--warn`        | `#F2B84B`                 | Inaccuracies and mistakes                   |
| `--danger`      | `#F2555A`                 | Blunders, check, errors                     |
| `--board-light` | `#DDE4D6`                 | Light squares (soft sage-cream)             |
| `--board-dark`  | `#6F8F76`                 | Dark squares (muted sage)                   |
| `--last-move`   | `rgba(198,243,107,0.30)`  | From/to squares of the last move            |

`--success` and `--accent-2` are kept as aliases of `--accent` so there is
only one accent color in practice.

## Typography (Google Fonts, loaded in `index.html`)
- **Geist** for everything: 600 to 700 for headings, 400 to 500 for body.
- **Geist Mono** for numbers that tick or compare: clocks, percentages.
- Headings are tight (letter-spacing -0.02em), never outlined or shadowed.
- Small uppercase labels (11 to 12px, +0.08em tracking, muted) name each tile.

## Shape
- Tiles and panels: 12px radius, 1px `--border`, no drop shadows.
- Buttons and inputs: 8px radius (not pills), at least 44px tall for touch.
- Small tags (quality, tactic, level): 6px radius, 12px text.
- Selected state: 1px accent border plus a faint accent tint. No glows.

## Board
- Flat sage board, coordinates shown in small Geist.
- Selected piece: accent ring. Legal moves: small dots; captures: a ring.
- Last move: `--last-move`. Check: the king's square pulses `--danger` twice.
- Hints: accent arrows, strongest boldest. Better move: accent arrow.

## Win chances meter
Top of the side panel, like a sports broadcast: "You 52%" on the left,
the bot's % on the right, "Draw 9%" in the middle, one thin bar split into
accent / muted / light. Win % comes from the engine score (Lichess
formula); the draw share is sized for everyday players.

## Coach and teaching moments
- Coach, in the side panel: "Your move" first (verdict tag, the move in words,
  one sentence on why, "Show better move"), then the bot's reply with a note
  only when it matters to you.
- Ticker above the board: the last two moves with who played them and how
  good they were.
- A mistake or blunder pauses the game (clock too) with a card over the lower
  board: what it cost, the better move, Take it back / Show better / Play on.

## Naming comes first
Every piece of feedback names a pattern in board terms; grades and numbers
are secondary.
- **Slips (inaccuracy, mistake, blunder)** are explained by the opponent's
  best reply: what it captures, what it attacks, any tactic it creates, or a
  forced mate. E.g. "The bishop on c8 can capture your queen on g4 for free."
  Win % and pawns' worth sit underneath as one small mono line.
- During a teaching moment the board draws that reply in `--danger`
  (targets fainter); "Show better" swaps it for the better move in accent.
- **Tactics are verified before praise.** "Fork!" (or any tactic) is
  celebrated only when the move is graded good, best or book. Otherwise:
  "That looks like a fork, but the queen on d8 can capture your knight on c7
  for free." A bot tactic that fails reads "The Ant tried a fork, but it
  doesn't work", plus how to punish it. Only working tactics count in the
  ticker and the game summary.
- **Openings are naming moments.** When a move enters a new opening family
  the coach names it and says whose choice it was: "You're in the Petrov's
  Defense. Black copies White and counter-attacks e4…" or "The Frog steered
  into the Italian Game." A deeper variation of the same family only updates
  the moves header ("Petrov's Defense · chosen by the Frog"); it is not
  re-announced. Later book moves read "Still in the Petrov's Defense: a
  standard move here." A book move that loses 80+ centipawns is graded
  normally, never "book".
- **Hints are honest.** Each hint shows the move and its idea, no win %.
  "Wins a free knight" only when the engine line (the move plus 3 moves
  each) still has that material won. Otherwise: "Takes the pawn, but they
  can win it back", "you come out a little ahead", or a plain trade.
- The teaching-moment card never covers the board: under the board on
  phones, at the top of the side panel on desktop.

## Move quality
Compared with the best move on the whole board, by winning chances lost
(10 / 20 / 30 points) and score lost in pawns (0.8 / 1.5 / 3), keeping the
harsher. Tags: Best and Good in accent, Book in muted, Inaccuracy and
Mistake in `--warn`, Blunder in `--danger`. Marks: ★ ?! ? ??.

## Pieces
Loaded only through `src/theme/pieces.ts`, swappable in one file. The
jungle set comes later: Knight = frog, Bishop = snake, Rook = rhino,
Queen = jaguar, King = silverback gorilla, Pawns = army ants. The UI always
uses standard piece names (Knight, Rook, check, fork). Bots are shown with
simple monogram tiles until the animal art exists (no emoji in the UI).

## Motion
Quick and quiet: 150 to 250ms, ease-out. Pieces slide 200ms; captures
shrink and fade; tiles fade in; buttons press to 0.98. No bouncing
decorations. `prefers-reduced-motion` turns non-essential motion off.

## Voice
Plain and direct. Name the move, then say why it matters in one sentence.
