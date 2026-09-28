# Pawnce design system

## Mood
A playful jungle at dusk. Warm, friendly, alive. Never cluttered.
Rounded shapes, soft shadows, generous spacing.

## Colors
All colors are CSS variables, defined once in `src/theme/tokens.css` and
exposed to Tailwind in `src/index.css` (e.g. `bg-surface`, `text-muted`,
`text-accent`). Never hard-code a hex value in a component.

| Token           | Value                    | Use                                  | Tailwind name   |
| --------------- | ------------------------ | ------------------------------------ | --------------- |
| `--bg`          | `#0E1A14`                | Deep canopy green, page background   | `bg`            |
| `--surface`     | `#16271E`                | Panels and cards                     | `surface`       |
| `--surface-2`   | `#1E3428`                | Raised elements, hover states        | `surface-2`     |
| `--border`      | `#2A4234`                | Borders and dividers                 | `border`        |
| `--text`        | `#EEF3E6`                | Primary text                         | `text`          |
| `--text-muted`  | `#A9BFA8`                | Secondary text                       | `muted`         |
| `--board-light` | `#EDE3C2`                | Light squares                        | `board-light`   |
| `--board-dark`  | `#6B8F4E`                | Dark squares                         | `board-dark`    |
| `--accent`      | `#F5A623`                | Mango: main buttons, selection, focus| `accent`        |
| `--accent-2`    | `#3FB8AF`                | Lagoon: info, hints (later phases)   | `accent-2`      |
| `--danger`      | `#E5484D`                | Hibiscus: check, errors              | `danger`        |
| `--success`     | `#7BC67E`                | Leaf: wins, good moves               | `success`       |
| `--last-move`   | `rgba(245,166,35,0.38)`  | Highlight on from/to squares         | (board only)    |
| `--on-accent`   | `#1B1204`                | Text on mango buttons                | `on-accent`     |

## Typography (Google Fonts, loaded in `index.html`)
- **Display** (logo, headings, big moments): Fredoka 600 to 700. Class `font-display`.
- **Body / UI**: Nunito Sans 400, 600, 700. The default body font.
- **Logo**: the word "Pawnce" in Fredoka, mango (`--accent`).

## Shape and spacing
- Cards: 16px corner radius (`rounded-card`), soft shadow (`shadow-soft`).
- Pills and buttons: 999px radius (`rounded-full`).
- Spacing on an 8px grid (Tailwind steps 2, 4, 6, 8 = 8, 16, 24, 32px).
- Every tappable control is at least 44px tall.

## Board
- Light squares `--board-light`, dark squares `--board-dark`, coordinates shown.
- Selected piece: mango ring on its square.
- Legal moves: small dots on empty squares, a ring on capturable pieces.
- Last move: `--last-move` on the from and to squares.
- Check: the king's square pulses `--danger` twice.

## Clocks
- One clock per player, beside their name above and below the board.
- Running: mango background. Stopped: `--surface-2`, muted text.
- Under 10 seconds: `--danger`, gentle pulse, tenths shown (0:07.4).

## Win chances meter
- Top of the side panel, like a sports broadcast: "You 52%" (mango) on the
  left, the bot's % (cream) on the right, "Draw 9%" in the middle, and one
  bar split in those three colors.
- Win % comes from the engine score (Lichess formula); the draw share is
  sized for everyday players (about 10% when even, less as one side leads).

## Hint orbs
- Two glowing lagoon (`--accent-2`) orbs next to your clock; a used orb
  becomes a dashed outline.
- A hint draws 3 lagoon arrows on the board, strongest one boldest, and a
  lagoon card in the panel naming each move and the idea behind it.

## Coach (naming every move)
- Top of the panel under the meter. "Your move" first: a big verdict badge
  (★ best, ✓ good, 📖 book, ?! ? ??), "f6 was a blunder", the move in words
  ("Pawn f7 → f6"), one sentence on why, and "Show better move" which draws
  it on the board in leaf green.
- Then "<Bot> replied": the move in words, plus a note only when it matters
  to you (a tactic against you, a check, or a slip you can punish).
- The opening name sits in the move list header.

## Move quality
- Compared with the best move on the whole board, two ways, keeping the
  harsher: winning chances lost (10+ inaccuracy, 20+ mistake, 30+ blunder)
  and score lost in pawns (0.8+, 1.5+, 3+). The second catches giving away
  a piece when the game already looks decided. The engine's own pick is
  "best"; positions from the opening book are "book".
- Colors: best/good `--success`, inaccuracy/mistake `--accent`, blunder `--danger`.
- Marks in the move list: ★ best, ?! inaccuracy, ? mistake, ?? blunder.

## Pieces
Loaded only through `src/theme/pieces.ts`. Today that is react-chessboard's
default set. The jungle set replaces that one file later:
Knight = frog, Bishop = snake, Rook = rhino, Queen = jaguar,
King = silverback gorilla, Pawns = army ants. Day jungle vs. night jungle.
The UI always uses standard piece names (Knight, Rook, check, fork).

## Motion
Subtle, fast and fun. Framer Motion for UI, CSS for the board.
- Piece slide: about 200ms, ease-out.
- Capture: captured piece shrinks and fades, about 180ms.
- Check: king square pulses `--danger` twice.
- Bot thinking: three bouncing dots next to the bot's name.
- Screen change: fade plus slight upward slide, 250ms.
- Result card: springs up from the bottom; a win adds a short burst of
  falling leaves (under 2 seconds).
- Buttons: scale to 0.97 on press.
- `prefers-reduced-motion`: non-essential motion is turned off.

## Voice
Friendly and plain. Explain chess words in the moment
("Checkmate! Your queen and rook trapped the king.").
Big, playful feedback moments, but never clutter the screen.
