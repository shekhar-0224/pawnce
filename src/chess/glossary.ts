/*
 * "Chess words": every term the app can teach, with a one-sentence meaning.
 * The first time a term shows up in one of your games, a Learn card
 * introduces it; after that it lives in your collection.
 */

export type WordCategory = 'Rules' | 'Tactics' | 'Move quality' | 'Game endings' | 'Ideas'

export type ChessWord = {
  id: string
  name: string
  category: WordCategory
  /** One plain sentence: what it means. */
  meaning: string
  /** A short tip: how to spot it or use it. */
  tip: string
}

export const WORDS: ChessWord[] = [
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

  // Move quality
  { id: 'best', name: 'Best move', category: 'Move quality', meaning: 'The move the engine likes most in the position.', tip: 'You don’t need the best move every time. Avoiding blunders matters more.' },
  { id: 'book', name: 'Book move', category: 'Move quality', meaning: 'A well-known opening move from the "book" of theory players have studied.', tip: 'Book moves are safe, tried and tested ways to start.' },
  { id: 'inaccuracy', name: 'Inaccuracy', category: 'Move quality', meaning: 'A slightly weaker move that gives away a little of your advantage.', tip: 'Not a disaster, but there was something better.' },
  { id: 'mistake', name: 'Mistake', category: 'Move quality', meaning: 'A clearly weaker move that noticeably hurts your chances.', tip: 'Often a missed threat. Check what the opponent is attacking first.' },
  { id: 'blunder', name: 'Blunder', category: 'Move quality', meaning: 'A serious error, like giving away a piece or allowing checkmate.', tip: 'Before you move, check: can they capture something or give check?' },

  // Game endings
  { id: 'checkmate', name: 'Checkmate', category: 'Game endings', meaning: 'The king is in check and has no way out. The game is over.', tip: 'Usually takes two pieces working together, like a queen and a rook.' },
  { id: 'stalemate', name: 'Stalemate', category: 'Game endings', meaning: 'The player to move is not in check but has no legal move. It’s a draw.', tip: 'When winning, leave the enemy king a square to move to!' },
  { id: 'resign', name: 'Resign', category: 'Game endings', meaning: 'Giving up the game before checkmate.', tip: 'Against a bot, playing on is great practice.' },
  { id: 'threefold', name: 'Threefold repetition', category: 'Game endings', meaning: 'The same position happens three times, so the game is a draw.', tip: 'Losing? Repeating moves can save a draw.' },
  { id: 'insufficient', name: 'Insufficient material', category: 'Game endings', meaning: 'Neither side has enough pieces left to checkmate, so it’s a draw.', tip: 'A lone king, or king and one knight or bishop, can’t mate.' },
  { id: 'fifty-moves', name: '50-move rule', category: 'Game endings', meaning: 'Fifty moves each with no capture and no pawn move means a draw.', tip: 'Rare in practice, but good to know.' },
  { id: 'flag', name: 'Flag (time out)', category: 'Game endings', meaning: 'Running out of time on the clock loses the game.', tip: 'In fast games, a quick decent move beats a slow perfect one.' },

  // Ideas
  { id: 'development', name: 'Development', category: 'Ideas', meaning: 'Bringing knights and bishops off the back row into play.', tip: 'In the opening, move each piece once before moving one twice.' },
  { id: 'center', name: 'The center', category: 'Ideas', meaning: 'The four middle squares (d4, e4, d5, e5), where pieces are most powerful.', tip: 'Pawns on e4 or d4 are a classic first move for this reason.' },
  { id: 'trade', name: 'Trade', category: 'Ideas', meaning: 'Swapping pieces of equal value.', tip: 'Trade when you’re ahead; avoid trades when you’re behind.' },
]

export const WORDS_BY_ID: Record<string, ChessWord> = Object.fromEntries(WORDS.map((w) => [w.id, w]))

export const WORD_CATEGORIES: WordCategory[] = ['Rules', 'Tactics', 'Move quality', 'Game endings', 'Ideas']
