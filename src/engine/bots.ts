/*
 * The three opponents and how strong each one plays.
 *
 * Stockfish "Skill Level" goes from 0 (weakest) to 20 (full strength).
 * Short think times and a depth cap keep the easy bots gentle. The Ant also
 * plays a random legal move now and then, so a beginner can really beat it.
 */
export type BotId = 'ant' | 'frog' | 'jaguar'

export type Bot = {
  id: BotId
  name: string
  level: 'Easy' | 'Medium' | 'Hard'
  emoji: string
  blurb: string
  skillLevel: number
  movetimeMs: number
  depth?: number
  /** Chance (0 to 1) of a random legal move instead of the engine's pick. */
  randomMoveChance: number
}

export const BOTS: Record<BotId, Bot> = {
  ant: {
    id: 'ant',
    name: 'Ant',
    level: 'Easy',
    emoji: '🐜',
    blurb: 'Small, busy, makes mistakes. Great for your first wins.',
    skillLevel: 1,
    movetimeMs: 80,
    depth: 2,
    randomMoveChance: 0.25,
  },
  frog: {
    id: 'frog',
    name: 'Frog',
    level: 'Medium',
    emoji: '🐸',
    blurb: 'Jumps on loose pieces. Keep yours protected.',
    skillLevel: 8,
    movetimeMs: 300,
    randomMoveChance: 0,
  },
  jaguar: {
    id: 'jaguar',
    name: 'Jaguar',
    level: 'Hard',
    emoji: '🐆',
    blurb: 'Patient and sharp. Punishes every slip.',
    skillLevel: 16,
    movetimeMs: 800,
    randomMoveChance: 0,
  },
}

export const BOT_LIST: Bot[] = [BOTS.ant, BOTS.frog, BOTS.jaguar]
