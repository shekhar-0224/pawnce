# How Pawnce thinks

A plain-language guide to how Pawnce recommends moves, grades them, gives
hints and works out winning chances. Numbers here match the code. The files to
look at are named in each section.

---

## 1. Two engines, two jobs

Pawnce runs **Stockfish** (the world's strongest open-source chess engine)
inside your browser, twice:

| Engine | Job | Strength |
|---|---|---|
| `engine` | Plays as the bot | Deliberately weakened (see below) |
| `analyst` | Judges every move, gives hints, winning chances, threats | Full strength, but thinks only briefly |

They never share settings, so a weak bot never means weak advice.
Searches on the analyst run one at a time, in order.
(`src/engine/stockfish.ts`)

It is the "lite", single-threaded build, so it runs in any browser and on
phones. That's what limits how deep it can look in a split second.

## 2. How strong the bots are

Stockfish has a **Skill Level** from 0 (weakest) to 20 (full strength).

| Bot | Skill | Think time | Extra |
|---|---|---|---|
| Ant (Easy) | 1 | 0.08s, depth 2 | 1 move in 4 is a random legal move |
| Frog (Medium) | 8 | 0.3s | |
| Jaguar (Hard) | 16 | 0.8s | |

The Ant is weak **on purpose**, so beginners can win. It will hang pieces.
(`src/engine/bots.ts`)

## 3. Winning chances (the meter)

1. After every move, the analyst scores the position for **0.4 seconds**
   (up to depth 18). The score is in **centipawns**: 100 = one pawn ahead.
2. The score becomes a **win %** using the Lichess formula:

   `win% = 50 + 50 × (2 / (1 + e^(−0.00368208 × cp)) − 1)`

   | Score | Win % |
   |---|---|
   | Even (0) | 50% |
   | +1 pawn | ≈ 59% |
   | +3 pawns | ≈ 75% |
   | +5 pawns | ≈ 86% |
   | Forced mate | 100% (or 0%) |
3. **Draws.** Stockfish's own draw estimate is tuned for engines, and says
   most even games are draws. That's wrong for everyday players, so Pawnce
   uses its own split: about **10% draw** when the game is even, shrinking to
   0% as one side pulls ahead. The rest is split into win and loss.
4. The meter shows the latest judged position. When the game ends it snaps to
   the result (100 / 0 / draw).

(`src/engine/winChance.ts`, `src/components/useAnalysis.ts`)

## 4. Grading a move

For each move, Pawnce compares the position **before** and **after** it,
both from the mover's point of view.

- **Win drop** = win % before − win % after.
- **Score loss (cpLoss)** = how many centipawns worse than the engine's best.

Each measure gives a grade, and the **harsher** of the two counts:

| Grade | Win drop | or score loss |
|---|---|---|
| Inaccuracy ?! | 10+ points | 0.8+ pawns |
| Mistake ? | 20+ points | 1.5+ pawns |
| Blunder ?? | 30+ points | 3+ pawns |
| Good ✓ | less | less |

Why use both? Win % alone misses material giveaways when a game is still
level ("good move" for losing a knight). Score alone overreacts when a game is
already won. So there are special rules:

1. **Book move (B).** The move is a known opening position (Lichess openings
   list) and loses less than 0.8 pawns. A book move that drops more is graded
   normally.
2. **Best move ★.** Graded good, and it is exactly the engine's first choice.
3. **Game already decided.** If the mover is at 90%+ (or 10% or less) both
   before and after, only the win drop counts. Being +12 instead of +14 is
   not a "mistake" when you're winning 100%.
4. **Hint moves are never slips.** If you play one of the moves the engine
   suggested as a hint, it is graded at least **good**. The hint search is
   longer (1.2s), so it also becomes the verdict for that position, and hint
   #1 is "best".

(`classifyMove` in `src/chess/naming.ts`)

## 5. Teaching moments (the pause)

- After your move, the bot and clocks wait while your move is judged, for up
  to 2.5s.
- A **mistake or blunder** pauses the game. The card explains the slip in
  board terms and offers Take it back, Show better or Play on.
- The explanation comes from the engine's best reply to your move, in order
  of importance:
  1. a forced mate
  2. capturing a piece (3+ points), for free if it's undefended
  3. a tactic (fork, pin, skewer, discovered attack)
  4. capturing a pawn
  5. new attacks on your loose or valuable pieces
  6. a check
  7. otherwise "their strongest answer is…"

(`src/chess/refutation.ts`, `src/components/GameScreen.tsx`)

## 6. Tactics (fork, pin, skewer…)

- Tactics are found from **board geometry**, no engine needed: what a move
  newly attacks, what's lined up behind what. Pins against pawns are ignored
  as too noisy. (`src/chess/tactics.ts`)
- **Verified before praise:** a tactic is only celebrated ("Fork!", the board
  lines and chip) if the move was graded good, best or book. Otherwise the
  coach says "That looks like a fork, but…" and explains the refutation.

## 7. Hints

- **2 per game.** Each hint asks the analyst for the top **3** moves
  (MultiPV 3) with **1.2 seconds** of thinking.
- Arrows on the board: #1 boldest, #3 faintest.
- Each hint gets a one-line **idea**, chosen in this order:
  1. forced mate
  2. castling or promotion
  3. captures (see honesty below)
  4. a tactic
  5. check
  6. attacking a piece
  7. rescuing a piece or protecting a hanging one
  8. development or the center
  9. a general "better square"
- **Honest captures:** Pawnce plays out the engine's line (your move, then 3
  moves each) and counts material.
  - "Wins a free knight" appears only if you're still up that knight after
    those moves.
  - Otherwise it says "Takes the pawn, but they can win it back", "you come
    out a little ahead", or a plain trade.
- There are no per-hint percentages; the meter already shows winning chances.

(`src/chess/ideas.ts`, `requestHint` in `src/components/useAnalysis.ts`)

## 8. Threat alerts

After the bot moves, Pawnce asks: *what would the bot play if it could move
again right now?*

1. It hands the move back to the bot (a "null move"), unless you're in check.
2. The analyst finds the bot's best move there (0.4s).
3. It warns only when both of these hold:
   - That move is a mate threat, a tactic, or a capture of an unprotected
     or more valuable piece.
   - The engine agrees it would gain at least **1.2 pawns** compared with
     now.

Example: "Watch out: their knight threatens a fork on c2, hitting your king
and rook."

(`src/chess/threats.ts`)

## 9. Openings

- Positions are matched against the **Lichess chess-openings** list (about
  3,800 named positions, public domain).
- A new opening family is announced once ("You're in the Italian Game…"),
  and the header says who chose it. Deeper variations only update the header.

(`src/chess/openings.ts`, `src/chess/openingInfo.ts`)

## 10. Chess words (vocabulary)

- Every chess word you meet is counted in your browser: seen, played by you,
  or missed. A missed word is a tactic that was the better move when you
  slipped.
- A word shows a **NEW** tag until you tap its explainer or meet it 3 times.

(`src/components/useVocab.ts`, `src/storage/learned.ts`)

---

## Known limits

- The analyst thinks for well under a second per position on your device, so
  in very sharp positions two searches can disagree slightly. The rules in §4
  (hint moves are never slips, decided games use chances only) keep this from
  turning into contradictory advice.
- Tactic detection covers the classic patterns (fork, pin, skewer,
  discovered attack and check, double check). It doesn't name deeper ideas
  such as deflection or zwischenzug.
- Everything runs on your device. Nothing is sent to a server.
