/*
 * "Chess words": every term the app can teach, with a one-sentence meaning.
 * The first time a term shows up in one of your games, a Learn card
 * introduces it; after that it lives in your collection.
 */

export type WordCategory =
  | 'Pieces'
  | 'Rules'
  | 'Tactics'
  | 'Checkmate patterns'
  | 'Move quality'
  | 'Game phases'
  | 'Game endings'
  | 'Pawns'
  | 'Strategy'
  | 'Ideas'

export type ChessWord = {
  id: string
  name: string
  category: WordCategory
  /** One plain sentence: what it means. */
  meaning: string
  /** A short tip: how to spot it or use it. */
  tip: string
  /** The question on the "New" tag, when "What's a …?" reads oddly. */
  ask?: string
}

export const WORDS: ChessWord[] = [
  // Pieces
  { id: 'pawn', name: 'Pawn', category: 'Pieces', meaning: 'The smallest piece: moves one square forward (two on its first move) and captures one square diagonally. Worth 1.', tip: 'Pawns can’t move backwards, so think before you push.' },
  { id: 'knight', name: 'Knight', category: 'Pieces', meaning: 'Moves in an L: two squares one way, then one to the side. The only piece that jumps over others. Worth 3.', tip: 'Knights love the center: “a knight on the rim is dim.”' },
  { id: 'bishop', name: 'Bishop', category: 'Pieces', meaning: 'Moves any distance diagonally and stays on one color all game. Worth 3.', tip: 'Open the diagonals in front of your bishops so they can breathe.' },
  { id: 'rook', name: 'Rook', category: 'Pieces', meaning: 'Moves any distance straight along rows and columns. Worth 5.', tip: 'Rooks are strongest on open files and on the 7th rank.' },
  { id: 'queen', name: 'Queen', category: 'Pieces', meaning: 'Moves any distance straight or diagonally: the strongest piece. Worth 9.', tip: 'Don’t bring her out too early, or she gets chased around.' },
  { id: 'king', name: 'King', category: 'Pieces', meaning: 'Moves one square in any direction. If it’s checkmated, the game is over.', tip: 'Keep it safe early (castle); use it actively in the endgame.' },
  { id: 'piece-values', name: 'Piece values', category: 'Pieces', ask: 'What are piece values?', meaning: 'A rough score for each piece: pawn 1, knight 3, bishop 3, rook 5, queen 9.', tip: 'Before a trade, add up what you give and what you get.' },
  { id: 'material', name: 'Material', category: 'Pieces', ask: 'What does “material” mean?', meaning: 'All the pieces a side has, counted in piece values. Being “up material” means you have more.', tip: 'When you’re ahead in material, trading pieces makes winning easier.' },
  { id: 'minor-piece', name: 'Minor piece', category: 'Pieces', meaning: 'A knight or a bishop, each worth about 3.', tip: 'Two minor pieces are usually worth more than a rook.' },
  { id: 'major-piece', name: 'Major piece', category: 'Pieces', meaning: 'A rook or a queen: the heavy pieces.', tip: 'Major pieces need open lines; bring them out after the minor pieces.' },

  // Rules
  { id: 'check', name: 'Check', category: 'Rules', meaning: 'The king is under attack.', tip: 'You must answer right away: move the king, block, or capture the attacker.' },
  { id: 'castling', name: 'Castling', category: 'Rules', meaning: 'The king steps two squares toward a rook, and the rook hops over it.', tip: 'Castle early: it tucks your king away and brings a rook into the game.' },
  { id: 'en-passant', name: 'En passant', category: 'Rules', meaning: 'A pawn that just jumped two squares can be captured as if it had moved only one.', tip: 'You only get one chance: right after the jump.' },
  { id: 'promotion', name: 'Promotion', category: 'Rules', meaning: 'A pawn that reaches the last row turns into a queen, rook, bishop or knight.', tip: 'Almost always pick a queen, the strongest piece.' },
  { id: 'underpromotion', name: 'Underpromotion', category: 'Rules', meaning: 'Promoting a pawn to something other than a queen.', tip: 'Used to dodge a stalemate, or to give a check only a knight can.' },
  { id: 'capture', name: 'Capture', category: 'Rules', meaning: 'Taking an enemy piece by moving onto its square.', tip: 'Before capturing, check whether your piece can be taken back.' },
  { id: 'opening', name: 'Opening', category: 'Rules', meaning: 'The first moves of a game. Common sequences have names, like the Italian Game.', tip: 'Good openings grab the center, develop pieces, and castle.' },

  // Tactics
  { id: 'fork', name: 'Fork', category: 'Tactics', meaning: 'One piece attacks two (or more) enemy pieces at once.', tip: 'Knights are the best forkers. Look for squares that hit the king and another piece.' },
  { id: 'pin', name: 'Pin', category: 'Tactics', meaning: 'A piece can’t move without exposing a more valuable piece behind it.', tip: 'Bishops, rooks and queens pin along lines. Pile up on the pinned piece.' },
  { id: 'skewer', name: 'Skewer', category: 'Tactics', meaning: 'A valuable piece is attacked; when it moves away, the piece behind it falls.', tip: 'Like a pin, but the more valuable piece is in front.' },
  { id: 'discovered-attack', name: 'Discovered attack', category: 'Tactics', meaning: 'Moving one piece uncovers an attack by another piece behind it.', tip: 'Two threats in one move: the piece that moves can make its own threat too.' },
  { id: 'discovered-check', name: 'Discovered check', category: 'Tactics', meaning: 'Moving a piece uncovers a check from the piece behind it.', tip: 'The moving piece is free to grab anything while the king deals with check.' },
  { id: 'double-check', name: 'Double check', category: 'Tactics', meaning: 'Two pieces give check at the same time.', tip: 'Blocking or capturing can’t stop both: the king has to move.' },
  { id: 'hanging-piece', name: 'Hanging piece', category: 'Tactics', meaning: 'A piece that is attacked and not defended, so it can be taken for free.', tip: 'Before every move, ask: is anything of mine or theirs hanging?' },
  { id: 'battery', name: 'Battery', category: 'Tactics', meaning: 'Two pieces lined up on the same line, like a queen behind a bishop, or two rooks on one file, so their power adds up.', tip: 'Put the stronger piece behind: the front one attacks, the back one backs it up.' },
  { id: 'trapped-piece', name: 'Trapped piece', category: 'Tactics', meaning: 'A piece that is attacked and has no safe square to run to.', tip: 'Pieces on the edge (a bishop on a7, a knight on h1) get trapped easily.' },
  { id: 'removing-the-defender', name: 'Removing the defender', category: 'Tactics', meaning: 'Capturing (or chasing away) the piece that guards another, so that one becomes free to take.', tip: 'Ask: which of their pieces is doing an important job? Take it.' },
  { id: 'mate-threat', name: 'Mate threat', category: 'Tactics', meaning: 'A move that threatens checkmate on the next move.', tip: 'After every enemy move, check: can they mate me now?' },
  { id: 'perpetual-check', name: 'Perpetual check', category: 'Tactics', meaning: 'Checking the king again and again with no escape, so the game ends in a draw by repetition.', tip: 'Losing? Look for endless checks with your queen: a draw beats a loss.' },
  { id: 'the-exchange', name: 'The exchange', category: 'Tactics', ask: 'What’s “the exchange”?', meaning: 'Trading a rook for a knight or bishop. The side that gets the rook “wins the exchange”.', tip: 'A rook is worth about 2 points more than a knight or bishop.' },

  // Checkmate patterns
  { id: 'back-rank-mate', name: 'Back-rank mate', category: 'Checkmate patterns', meaning: 'A rook or queen checkmates a king stuck on its back row behind its own pawns.', tip: 'Give your king an escape square (“luft”) with a pawn move like h3.' },
  { id: 'smothered-mate', name: 'Smothered mate', category: 'Checkmate patterns', meaning: 'A knight checkmates a king that is completely boxed in by its own pieces.', tip: 'When your king has no free squares, watch out for knight checks.' },
  { id: 'scholars-mate', name: 'Scholar’s mate', category: 'Checkmate patterns', ask: 'What’s Scholar’s mate?', meaning: 'A quick checkmate: the queen and bishop both attack f7 (or f2) and the queen takes there with mate.', tip: 'Defend f7 early: …Nf6, …g6 or …Qe7 all stop it.' },
  { id: 'fools-mate', name: 'Fool’s mate', category: 'Checkmate patterns', ask: 'What’s Fool’s mate?', meaning: 'The fastest checkmate: after weak moves like f3 and g4, the queen mates on h4 on move two.', tip: 'Don’t open the diagonal to your king with early f- and g-pawn moves.' },
  { id: 'ladder-mate', name: 'Ladder mate', category: 'Checkmate patterns', meaning: 'Two rooks (or a rook and queen) take turns checking, pushing the king to the edge and mating it there.', tip: 'Each heavy piece guards one row; step by step, the king runs out of room.' },

  // Move quality
  { id: 'best', ask: 'What does “best move” mean?', name: 'Best move', category: 'Move quality', meaning: 'The move the engine likes most in the position.', tip: 'You don’t need the best move every time. Avoiding blunders matters more.' },
  { id: 'book', name: 'Book move', category: 'Move quality', meaning: 'A well-known opening move from the "book" of theory players have studied.', tip: 'Book moves are safe, tried and tested ways to start.' },
  { id: 'inaccuracy', name: 'Inaccuracy', category: 'Move quality', meaning: 'A slightly weaker move that gives away a little of your advantage.', tip: 'Not a disaster, but there was something better.' },
  { id: 'mistake', name: 'Mistake', category: 'Move quality', meaning: 'A clearly weaker move that noticeably hurts your chances.', tip: 'Often a missed threat. Check what the opponent is attacking first.' },
  { id: 'blunder', name: 'Blunder', category: 'Move quality', meaning: 'A serious error, like giving away a piece or allowing checkmate.', tip: 'Before you move, check: can they capture something or give check?' },
  { id: 'sacrifice', name: 'Sacrifice', category: 'Move quality', meaning: 'Giving up material on purpose to get something bigger: an attack, a better position, or mate.', tip: 'A good sacrifice is calculated. Check what you get back before you give.' },
  { id: 'brilliant', name: 'Brilliant move', category: 'Move quality', ask: 'What’s a brilliant move?', meaning: 'A sacrifice that is also the very best move on the board.', tip: 'Brilliant moves often look wrong at first: that’s why they’re brilliant.' },
  { id: 'miss', name: 'Miss', category: 'Move quality', ask: 'What’s a miss?', meaning: 'Your opponent made a big mistake, and you didn’t take advantage of it.', tip: 'When they slip, stop and look for captures and checks before you move.' },

  // Game phases
  { id: 'middlegame', name: 'Middlegame', category: 'Game phases', ask: 'What’s the middlegame?', meaning: 'The phase after the opening: the pieces are out and the real fight begins.', tip: 'Make a plan: attack a weakness, or improve your worst piece.' },
  { id: 'endgame', name: 'Endgame', category: 'Game phases', ask: 'What’s the endgame?', meaning: 'The final phase, when only a few pieces are left.', tip: 'In the endgame your king becomes a strong piece: bring it forward.' },
  { id: 'pawn-endgame', name: 'King and pawn endgame', category: 'Game phases', meaning: 'An endgame where only kings and pawns are left.', tip: 'Count carefully: one move often decides who promotes first.' },
  { id: 'rook-endgame', name: 'Rook endgame', category: 'Game phases', meaning: 'An endgame with only kings, rooks and pawns: the most common kind.', tip: 'Put your rook behind passed pawns, yours or theirs.' },

  // Game endings
  { id: 'checkmate', name: 'Checkmate', category: 'Game endings', meaning: 'The king is in check and has no way out. The game is over.', tip: 'Usually takes two pieces working together, like a queen and a rook.' },
  { id: 'stalemate', name: 'Stalemate', category: 'Game endings', meaning: 'The player to move is not in check but has no legal move. It’s a draw.', tip: 'When winning, leave the enemy king a square to move to!' },
  { id: 'resign', ask: 'What does resign mean?', name: 'Resign', category: 'Game endings', meaning: 'Giving up the game before checkmate.', tip: 'Against a bot, playing on is great practice.' },
  { id: 'threefold', name: 'Threefold repetition', category: 'Game endings', meaning: 'The same position happens three times, so the game is a draw.', tip: 'Losing? Repeating moves can save a draw.' },
  { id: 'insufficient', name: 'Insufficient material', category: 'Game endings', meaning: 'Neither side has enough pieces left to checkmate, so it’s a draw.', tip: 'A lone king, or king and one knight or bishop, can’t mate.' },
  { id: 'fifty-moves', ask: 'What’s the 50-move rule?', name: '50-move rule', category: 'Game endings', meaning: 'Fifty moves each with no capture and no pawn move means a draw.', tip: 'Rare in practice, but good to know.' },
  { id: 'flag', ask: 'What does flagging mean?', name: 'Flag (time out)', category: 'Game endings', meaning: 'Running out of time on the clock loses the game.', tip: 'In fast games, a quick decent move beats a slow perfect one.' },

  // Pawns
  { id: 'passed-pawn', name: 'Passed pawn', category: 'Pawns', meaning: 'A pawn with no enemy pawns in front of it or on the files next to it: nothing can stop it but pieces.', tip: '“Passed pawns must be pushed.” Every step makes it more dangerous.' },
  { id: 'doubled-pawns', name: 'Doubled pawns', category: 'Pawns', ask: 'What are doubled pawns?', meaning: 'Two pawns of the same color on the same file, one in front of the other.', tip: 'Doubled pawns can’t protect each other; they’re often a weakness.' },
  { id: 'isolated-pawn', name: 'Isolated pawn', category: 'Pawns', meaning: 'A pawn with no friendly pawns on the files next to it, so no pawn can ever defend it.', tip: 'Block an isolated pawn with a piece, then attack it.' },
  { id: 'backward-pawn', name: 'Backward pawn', category: 'Pawns', meaning: 'A pawn left behind its neighbors that can’t safely move forward, because an enemy pawn guards the square in front.', tip: 'The square in front of a backward pawn is a great home for your knight.' },
  { id: 'pawn-chain', name: 'Pawn chain', category: 'Pawns', meaning: 'Pawns on a diagonal line, each one protecting the next.', tip: 'Attack a pawn chain at its base: the pawn at the back.' },

  // Strategy
  { id: 'open-file', name: 'Open file', category: 'Strategy', meaning: 'A column with no pawns on it, where rooks and queens can move freely.', tip: 'Put your rooks on open files first; they rule the board from there.' },
  { id: 'seventh-rank', name: 'Seventh rank', category: 'Strategy', ask: 'What’s the seventh rank?', meaning: 'Your opponent’s second row, where their pawns start. A rook there attacks them and traps their king.', tip: 'A rook on the seventh rank is often worth a pawn.' },
  { id: 'fianchetto', name: 'Fianchetto', category: 'Strategy', meaning: 'Developing a bishop to b2, g2, b7 or g7, behind a pawn moved one square, to aim down the long diagonal.', tip: 'Don’t trade your fianchettoed bishop lightly: it guards your king.' },
  { id: 'outpost', name: 'Outpost', category: 'Strategy', meaning: 'A square in enemy territory, protected by your pawn, where no enemy pawn can ever attack your piece.', tip: 'Knights love outposts: a knight on d5 or e6 can dominate the game.' },
  { id: 'bishop-pair', name: 'Bishop pair', category: 'Strategy', meaning: 'Having both bishops when your opponent doesn’t. Together they cover every square color.', tip: 'Open the position when you have the bishop pair.' },
  { id: 'kingside-castling', name: 'Kingside castling', category: 'Strategy', meaning: 'Castling on the king’s side (O-O): the king goes to g1 (or g8).', tip: 'The quickest and most common way to get your king safe.' },
  { id: 'queenside-castling', name: 'Queenside castling', category: 'Strategy', meaning: 'Castling on the queen’s side (O-O-O): the king goes to c1 (or c8) and the rook to d1 (or d8).', tip: 'It brings the rook to the center at once, but the king is a little less tucked away.' },
  { id: 'connected-rooks', name: 'Connected rooks', category: 'Strategy', ask: 'What are connected rooks?', meaning: 'Both rooks on the same row or file with nothing between them, so they protect each other.', tip: 'Develop and castle; once your rooks connect, the opening is done.' },

  // Ideas
  { id: 'development', name: 'Development', category: 'Ideas', meaning: 'Bringing knights and bishops off the back row into play.', tip: 'In the opening, move each piece once before moving one twice.' },
  { id: 'center', name: 'The center', category: 'Ideas', meaning: 'The four middle squares (d4, e4, d5, e5), where pieces are most powerful.', tip: 'Pawns on e4 or d4 are a classic first move for this reason.' },
  { id: 'trade', name: 'Trade', category: 'Ideas', meaning: 'Swapping pieces of equal value.', tip: 'Trade when you’re ahead; avoid trades when you’re behind.' },
]

export const WORDS_BY_ID: Record<string, ChessWord> = Object.fromEntries(WORDS.map((w) => [w.id, w]))

// Words that read as "What's a fork?" (the rest: "What's castling?").
const COUNTABLE = new Set(['battery', 'trapped-piece', 'mate-threat', 'perpetual-check', 'sacrifice', 'passed-pawn', 'isolated-pawn', 'backward-pawn', 'pawn-chain', 'open-file', 'fianchetto', 'outpost', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'minor-piece', 'major-piece', 'back-rank-mate', 'smothered-mate', 'ladder-mate', 'pawn-endgame', 'rook-endgame', 'capture', 'opening', 'fork', 'pin', 'skewer', 'discovered-attack', 'discovered-check', 'double-check', 'hanging-piece', 'book', 'inaccuracy', 'mistake', 'blunder', 'trade'])

/** The question on a word's "New" tag, e.g. "What's a fork?". */
export function askAbout(word: ChessWord): string {
  if (word.ask) return word.ask
  const name = word.name.toLowerCase()
  if (!COUNTABLE.has(word.id)) return `What’s ${name}?`
  return `What’s ${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}?`
}

export const WORD_CATEGORIES: WordCategory[] = [
  'Pieces',
  'Rules',
  'Tactics',
  'Checkmate patterns',
  'Move quality',
  'Game phases',
  'Pawns',
  'Strategy',
  'Ideas',
  'Game endings',
]

/**
 * Basics: the first words every player needs (piece names and values, book
 * move, opening, check, capture). Everything else is a Pattern, and patterns
 * are what the home screen counts.
 */
export const BASIC_IDS = new Set(['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'piece-values', 'book', 'opening', 'check', 'capture'])
export const isBasic = (id: string) => BASIC_IDS.has(id)
export const BASIC_WORDS = WORDS.filter((w) => isBasic(w.id))
export const PATTERN_WORDS = WORDS.filter((w) => !isBasic(w.id))
