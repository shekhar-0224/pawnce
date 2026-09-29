/*
 * One small example for every chess word, shown on its flash card: a
 * position reached by a few moves (the last one is highlighted), an
 * optional follow-up move drawn as a second arrow, and one sentence.
 * Every example is checked in scripts (all moves legal, the pattern real).
 */
import { Chess, type Square } from 'chess.js'

export type WordExample = {
  /** Start here instead of the usual starting position. */
  fen?: string
  /** Moves played from the start (SAN); the last one is the highlighted move. */
  moves: string[]
  /** The opponent's reply, drawn as a second (red) arrow. */
  next?: string
  /** A better move instead of the highlighted one, drawn in lime. */
  better?: string
  /** Extra arrows (e.g. what a tactic hits), as [from, to]. */
  arrows?: [Square, Square][]
  /** One sentence about what the board shows. */
  caption: string
}

export const EXAMPLES: Record<string, WordExample> = {
  // Rules
  check: {
    moves: ['e4', 'e5', 'd4', 'd5', 'Bb5+'],
    caption: 'The bishop attacks the king along the diagonal: check. Black must answer it right away.',
  },
  castling: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
    caption: 'White castles: the king steps to g1 and the rook jumps over to f1.',
  },
  'en-passant': {
    moves: ['e4', 'Nf6', 'e5', 'd5', 'exd6'],
    caption: 'Black’s pawn jumped d7 to d5, right past White’s e5 pawn, which captures it as if it had stopped on d6.',
  },
  promotion: {
    fen: '8/4P3/8/8/8/2k5/8/4K3 w - - 0 1',
    moves: ['e8=Q'],
    caption: 'The pawn reaches the last row and becomes a queen.',
  },
  underpromotion: {
    fen: '8/4P3/3k4/8/8/8/8/4K3 w - - 0 1',
    moves: ['e8=N+'],
    caption: 'Promoting to a knight gives check from e8. A queen there would not.',
  },
  capture: {
    moves: ['e4', 'd5', 'exd5'],
    caption: 'White’s pawn moves diagonally onto d5 and takes Black’s pawn.',
  },
  opening: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    caption: 'These first moves have a name: the Italian Game.',
  },

  // Tactics
  fork: {
    fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    moves: ['Nc7+'],
    arrows: [['c7', 'e8'], ['c7', 'a8']],
    caption: 'The knight checks the king and attacks the rook at the same time. After the king moves, the rook falls.',
  },
  pin: {
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    arrows: [['b4', 'e1']],
    caption: 'The knight on c3 can’t move: the bishop would then attack the king behind it.',
  },
  skewer: {
    fen: 'q7/8/8/k7/8/8/4K3/7R w - - 0 1',
    moves: ['Ra1+'],
    arrows: [['a1', 'a8']],
    caption: 'The rook checks the king; when the king steps aside, the queen behind it is lost.',
  },
  'discovered-attack': {
    fen: '4k2r/8/8/8/3N4/8/1B6/4K3 w - - 0 1',
    moves: ['Nb5'],
    arrows: [['b2', 'h8']],
    caption: 'The knight steps away and uncovers the bishop’s attack on the rook in the corner.',
  },
  'discovered-check': {
    fen: '4k3/8/8/8/4N3/8/8/4RK2 w - - 0 1',
    moves: ['Nc5+'],
    arrows: [['e1', 'e8']],
    caption: 'The knight moves off the e-file and the rook behind it gives check.',
  },
  'double-check': {
    fen: '4k3/8/8/8/4N3/8/8/4RK2 w - - 0 1',
    moves: ['Nf6+'],
    arrows: [['e1', 'e8'], ['f6', 'e8']],
    caption: 'The knight gives check and uncovers the rook’s check too. Only a king move can escape both.',
  },
  'hanging-piece': {
    fen: '4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1',
    moves: ['Qxd5'],
    caption: 'Nothing defended the knight on d5, so the queen takes it for free.',
  },

  // Move quality
  best: {
    moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'g6'],
    caption: '3…g6! blocks the queen’s attack on f7 and kicks it away: the engine’s top choice.',
  },
  book: {
    moves: ['e4'],
    caption: '1.e4 is a book move: played in millions of games and studied for centuries.',
  },
  inaccuracy: {
    moves: ['e4', 'e5', 'a3'],
    better: 'Nf3',
    caption: '2.a3 isn’t a disaster, but it wastes a move. Developing with Nf3 was better.',
  },
  mistake: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5'],
    next: 'Qg5',
    caption: '4.Nxe5? grabs a pawn, but …Qg5 attacks the knight and the g2 pawn at once.',
  },
  blunder: {
    moves: ['e4', 'd5', 'Qg4'],
    next: 'Bxg4',
    caption: '2.Qg4?? puts the queen where Black’s bishop simply takes it.',
  },

  // Game endings
  checkmate: {
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    caption: 'The queen, backed up by the bishop, checks the king on f7 and it has no escape: checkmate.',
  },
  stalemate: {
    fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
    moves: ['Qc7'],
    caption: 'Black isn’t in check but has no legal move: stalemate, a draw. White should have left an escape square.',
  },
  resign: {
    fen: '4k3/8/8/8/8/8/3QPPP1/4K1R1 b - - 0 1',
    moves: [],
    caption: 'Down a queen and a rook with nothing in return, a player often resigns instead of playing on.',
  },
  threefold: {
    moves: ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'],
    caption: 'Both knights go out and back twice: the starting position has now happened three times, so it’s a draw.',
  },
  insufficient: {
    fen: '8/8/3k4/8/8/2NK4/8/8 w - - 0 1',
    moves: [],
    caption: 'A king and one knight can’t checkmate a lone king, so the game is a draw.',
  },
  'fifty-moves': {
    fen: '8/8/3k4/2r5/8/3K4/5R2/8 w - - 0 1',
    moves: [],
    caption: 'A rook each and no pawns: if 50 moves each pass with no capture or pawn move, it’s a draw.',
  },
  flag: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    caption: 'Even in a normal position, if your clock reaches 0:00 you lose on time (your “flag falls”).',
  },

  // Ideas
  development: {
    moves: ['e4', 'e5', 'Nf3'],
    caption: 'The knight leaves the back row for a good square: that’s development.',
  },
  center: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    caption: 'The d4 pawn joins e4 to control the center squares d5, e5, c5 and f5.',
  },
  trade: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nxd4'],
    next: 'Qxd4',
    caption: 'Knight takes knight and the queen takes back: an even trade.',
  },
}

/** The board for an example: the position, the highlighted move and its arrows. */
export function exampleBoard(ex: WordExample): {
  fen: string
  last: { from: Square; to: Square } | null
  next: { from: Square; to: Square } | null
  better: { from: Square; to: Square } | null
} {
  const g = new Chess(ex.fen)
  let last = null
  let before = g.fen()
  for (const san of ex.moves) {
    before = g.fen()
    const m = g.move(san)
    last = { from: m.from, to: m.to }
  }
  let better = null
  if (ex.better) {
    const m = new Chess(before).move(ex.better)
    better = { from: m.from, to: m.to }
  }
  let next = null
  if (ex.next) {
    const m = new Chess(g.fen()).move(ex.next)
    next = { from: m.from, to: m.to }
  }
  return { fen: g.fen(), last, next, better }
}
