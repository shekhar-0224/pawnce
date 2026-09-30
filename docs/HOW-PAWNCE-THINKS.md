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

## 5. Teaching moments (the mistake card)

- After your move, the bot and clocks wait while your move is judged, for up
  to 2.5s.
- A **mistake or blunder** shows a red card beside the board. It does not
  pause the game. It explains the slip in board terms and offers Take back,
  Show better or Got it.
- **The real loss, not the first reply.** Pawnce walks the engine's line
  (at least 4 moves, longer while captures continue) and adds up what each
  side loses. Trades cancel out. It names the piece you actually end up
  losing:
  - "Your bishop on g5 is still attacked by the pawn on f6, and you didn't
    move it." (it was already under attack, and your move ignored it)
  - "Your queen on a6 can be taken by the pawn on b7 for free." (the piece
    you just moved, and the cheapest thing that takes it)
  - "Your knight on e5 gets lost: their best line starts … and wins it a few
    moves later."
- If their first reply is a capture you can take back evenly, it is never
  presented as the problem.
- If nothing is really lost (a mate threat, or a slow positional slip), the
  explanation falls back to the engine's best reply, in order
  of importance:
(`src/chess/refutation.ts`, tested in `src/chess/refutation.test.ts`; `src/components/GameScreen.tsx`)

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

- **Basics vs Patterns.** 11 words are Basics: the six piece names, piece
  values, book move, opening, check, capture. The other 59 are Patterns.
  The home screen counts Patterns only: "Patterns learned: X of 59".
- **A pattern is learned once you've played it yourself** (seen doesn't
  count). A basic is known once you tap its tag or meet it 3 times.
  (`BASIC_IDS` in `src/chess/glossary.ts`, `isLearnedPattern` in
  `src/storage/learned.ts`)
- Every chess word you meet is counted in your browser: seen, played by you,
  or missed. A missed word is a tactic that was the better move when you
  slipped. Pawnce also remembers the game and move where you first met it.
- Tactic words count only when the tactic works (see §6). **Hanging piece**
  = taking a piece nobody defended (not a recapture). **Trade** = a capture
  answered by an equal recapture on the same square. Game-ending words
  (stalemate, repetition, 50-move rule, not enough pieces, flag, resign)
  are counted when a game ends that way.
- New in batch 1: each piece's first move (Pawn, Knight…), the first
  capture (Piece values; Minor/Major piece by what was taken), Material (one
  side 3+ points ahead), named checkmates (back-rank: rook/queen mates on
  the back row with 2+ of the king's own pawns in front; smothered: a knight
  mates a king boxed in by its own pieces; Scholar's: an early queen takes
  f7/f2 with mate; Fool's: mate by Black's 2nd move; ladder: two rooks or
  rook + queen, mate along the edge), and phases (middlegame from move 8
  with most minor pieces developed; endgame at 6 or fewer pieces besides
  kings and pawns; king-and-pawn and rook endgames).
- New in batches 2 and 3:
  - **Battery:** the moved queen/rook/bishop lines up with another of yours
    on a file or diagonal.
  - **Trapped piece:** your moved piece attacks an enemy piece that's in
    danger and has no safe square.
  - **Removing the defender:** you capture the only guard of another piece,
    which is now attacked and undefended.
  - **Mate threat:** if they ignored your move, you'd have mate in one.
  - **Perpetual check:** a check that repeats the position a third time,
    after three checks in a row by the same side.
  - **The exchange:** a rook traded for a knight or bishop on one square.
  - **Sacrifice:** you end up 2+ points down after their reply (and still
    after your next move, so it isn't just a trade in progress), yet the
    engine graded your move good or best. **Brilliant** = a sacrifice that
    was the best move. **Miss** = the opponent just made a mistake or
    blunder and your move didn't punish it.
  - **Pawns:** passed (no enemy pawn ahead on its file or the next ones),
    doubled, isolated (no friendly pawn on the next files), backward
    (behind its neighbours with the square in front guarded by an enemy
    pawn), pawn chain (three pawns on a diagonal).
  - **Strategy:** open file (a rook/queen moves to a file with no pawns),
    seventh rank (a rook reaches the opponent's second row), fianchetto (a
    bishop from c1/f1 to b2/g2, or the black equivalents), outpost (a
    knight in enemy territory, backed by a pawn, that no enemy pawn can
    ever attack), bishop pair (one side has both bishops, the other
    doesn't), kingside / queenside castling, connected rooks (both rooks
    see each other).
- A word is **New** until you tap its explainer (or "Got it" on its card) or
  meet it 3 times.
- **What can pause the game:** only a New word from this list, at most one
  per move, never on move 1 and never on a move that shows the
  mistake/blunder card: named checkmates (Scholar's, Fool's, smothered,
  back-rank, ladder), checkmate, double check, fork, skewer, pin,
  discovered attack, castling, en passant, promotion, underpromotion. The
  most important new word wins; the rest are NEW chips. Switch off with
  "Pause for new words".
- Every one of the 70 words has an example position on its flash card,
  checked with the chess rules library, so you can learn words you haven't
  met yet from the words page.

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
