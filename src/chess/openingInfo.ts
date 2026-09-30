/*
 * Plain explanations for the opening families you'll meet most often.
 * Opening names come from the Lichess dataset (e.g. "Italian Game: Paris
 * Defense"); we explain the family (the part before the colon).
 */

type Info = { idea: string }

const FAMILIES: Record<string, Info> = {
  'Italian Game': { idea: 'White’s bishop goes to c4, aiming at Black’s weakest square, f7. A classic for fast development.' },
  'Ruy Lopez': { idea: 'White’s bishop goes to b5 to pressure the knight that defends e5. One of the oldest, deepest openings.' },
  'Scotch Game': { idea: 'White pushes d4 early to open the center and free the pieces.' },
  'Four Knights Game': { idea: 'Both sides bring out both knights first: solid, simple development.' },
  'Three Knights Opening': { idea: 'Three knights come out early; a quiet, flexible start.' },
  'Vienna Game': { idea: 'White plays Nc3 before Nf3, keeping the option of pushing f4 later.' },
  "Bishop's Opening": { idea: 'White develops the bishop to c4 right away, eyeing f7.' },
  "King's Gambit": { idea: 'White offers the f-pawn to rip open lines toward Black’s king. Sharp and romantic.' },
  "King's Pawn Game": { idea: 'White starts with 1.e4, the most popular first move, grabbing the center and freeing the queen and bishop. No big named line yet.' },
  "King's Knight Opening": { idea: 'White’s knight comes to f3 early, attacking e5: the most natural developing move.' },
  "Petrov's Defense": { idea: 'Black copies White and counter-attacks e4 instead of defending e5. Very solid.' },
  'Philidor Defense': { idea: 'Black defends e5 with the d-pawn: solid but a little passive.' },
  'Ponziani Opening': { idea: 'White plays c3 to prepare a big d4 push.' },
  'Center Game': { idea: 'White opens the center immediately with d4 and recaptures with the queen.' },
  'Latvian Gambit': { idea: 'Black offers a pawn with f5 for fast counter-play. Risky!' },
  'Sicilian Defense': { idea: 'Black answers 1.e4 with c5, fighting for the center from the side. The most popular reply to e4.' },
  'French Defense': { idea: 'Black plays e6 then d5: a solid pawn chain that challenges White’s center.' },
  'Caro-Kann Defense': { idea: 'Black plays c6 then d5: like the French, but the light bishop stays free.' },
  'Scandinavian Defense': { idea: 'Black strikes back at once with d5, challenging White’s e-pawn on move one.' },
  'Alekhine Defense': { idea: 'Black’s knight provokes White’s pawns forward, hoping to attack them later.' },
  'Pirc Defense': { idea: 'Black lets White build a center, then attacks it with pieces and pawns later.' },
  'Modern Defense': { idea: 'Black fianchettoes the bishop (g6, Bg7) and strikes at the center later.' },
  'Nimzowitsch Defense': { idea: 'Black answers 1.e4 with the knight (Nc6) instead of a pawn, planning to hit the center later.' },
  'Owen Defense': { idea: 'Black puts the bishop on b7 early (b6) to aim at White’s center from afar.' },
  'Horwitz Defense': { idea: 'Black answers 1.d4 with e6: a flexible move that can turn into the French or Dutch.' },
  "Queen's Gambit": { idea: 'White offers the c-pawn to pull Black’s d-pawn away from the center.' },
  'Slav Defense': { idea: 'Black defends d5 with the c-pawn, keeping a strong, solid center.' },
  'Semi-Slav Defense': { idea: 'Black combines c6 and e6: a very solid wall of pawns.' },
  "Queen's Pawn Game": { idea: 'White starts with 1.d4, a solid way to take the center. No big named line yet.' },
  'London System': { idea: 'White sets up d4, Bf4 and e3: an easy, reliable plan to learn.' },
  "King's Indian Defense": { idea: 'Black lets White take the center, fianchettoes the bishop, and counter-attacks later.' },
  'Nimzo-Indian Defense': { idea: 'Black pins White’s knight with Bb4 to control e4.' },
  "Queen's Indian Defense": { idea: 'Black places the bishop on b7 to control e4 from a distance.' },
  'Grünfeld Defense': { idea: 'Black lets White build a big center, then attacks it hard.' },
  'Indian Defense': { idea: 'Black answers 1.d4 with Nf6: a flexible move that leads to many "Indian" systems.' },
  'Dutch Defense': { idea: 'Black plays f5 to fight for e4 and sometimes attack on the kingside.' },
  'Benoni Defense': { idea: 'Black plays c5 to create an unbalanced, fighting pawn structure.' },
  'Catalan Opening': { idea: 'White combines d4 and c4 with a bishop on g2 pointing at the long diagonal.' },
  'English Opening': { idea: 'White starts with c4, controlling the center from the side.' },
  'Réti Opening': { idea: 'White starts with Nf3 and pressures the center with pieces rather than pawns.' },
  'Zukertort Opening': { idea: 'White starts with Nf3: flexible development before committing pawns.' },
  "King's Indian Attack": { idea: 'White sets up Nf3, g3, Bg2 and castles, then chooses a plan.' },
  'Bird Opening': { idea: 'White starts with f4, fighting for e5.' },
  "Van't Kruijs Opening": { idea: 'White starts with e3: modest, keeping options open.' },
  'Van Geet Opening': { idea: 'White starts with Nc3, bringing a knight out first.' },
  'Polish Opening': { idea: 'White starts with b4, an unusual flank push.' },
  'Grob Opening': { idea: 'White starts with g4: aggressive but weakening.' },
  'Englund Gambit': { idea: 'Black answers 1.d4 with e5, offering a pawn for quick activity. Tricky but risky.' },
  'Vienna Gambit': { idea: 'White plays Nc3 then f4, offering a pawn to open lines.' },
  'Danish Gambit': { idea: 'White gives up pawns for very fast development and a strong attack.' },
  'Tarrasch Defense': { idea: 'Black plays c5 against the Queen’s Gambit, accepting a lone d-pawn for active pieces.' },
  'Bogo-Indian Defense': { idea: 'Black gives check with Bb4 to trade off pieces and develop quickly.' },
  'Old Indian Defense': { idea: 'Black plays d6 and e5 behind a knight on f6: solid and simple.' },
  'Benko Gambit': { idea: 'Black gives up a queenside pawn to open lines for rooks and bishops.' },
  'Trompowsky Attack': { idea: 'White plays Bg5 early, pinning or trading Black’s knight.' },
  'Torre Attack': { idea: 'White sets up Nf3 and Bg5: a calm, easy system.' },
  'Hungarian Opening': { idea: 'White starts with g3, planning to put the bishop on g2.' },
  'Nimzo-Larsen Attack': { idea: 'White starts with b3 and Bb2, aiming the bishop at the long diagonal.' },
  'Pterodactyl Defense': { idea: 'Black fianchettoes with g6 and Bg7 and plays c5 early. Unusual and tricky.' },
  'Rat Defense': { idea: 'Black starts with a modest d6, keeping everything flexible.' },
  'Blackmar-Diemer Gambit': { idea: 'White gives up a pawn for fast development and attacking chances.' },
}

// Longest names first, so "Queen's Gambit Declined" matches "Queen's Gambit".
const KEYS = Object.keys(FAMILIES).sort((a, b) => b.length - a.length)

/** The family of an opening name, e.g. "Italian Game: Paris Defense" -> "Italian Game". */
export function openingFamily(name: string): string {
  return name.split(':')[0].split(',')[0].trim()
}

/** A plain sentence about what the opening is trying to do. */
export function explainOpening(name: string): string {
  const family = openingFamily(name)
  const key = KEYS.find((k) => family.startsWith(k))
  return key
    ? FAMILIES[key].idea
    : 'A named way of starting the game. Openings get names so players can study and share them.'
}
