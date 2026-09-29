import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import type { Move } from '../chess/game'
import { loadOpenings, openingMoments, openingOf } from '../chess/openings'
import { BOTS } from '../engine/bots'
import { loadGame } from '../storage/recentGames'
import { Button } from './Button'
import { GameSummary } from './GameSummary'
import type { MoveVerdict } from './useAnalysis'
import { gameCards, wordsPerMove } from './useVocab'

type Props = {
  id: string
  /** Start the replay at this move (from a word's "where you learned it" link). */
  initialPly?: number
  onPlayAgain: (setup: { botId: string; side: 'white' | 'black'; timeControl?: string }) => void
  onHome: () => void
  onBack: () => void
}

/** The summary of a finished game, rebuilt from what was saved in this browser. */
export function SavedGameSummary({ id, initialPly, onPlayAgain, onHome, onBack }: Props) {
  const [record] = useState(() => loadGame(id))
  const [openingsReady, setOpeningsReady] = useState(false)
  useEffect(() => {
    loadOpenings()
      .then(() => setOpeningsReady(true))
      .catch(() => undefined)
  }, [])

  const moves = useMemo<Move[]>(() => {
    if (!record?.sans) return []
    const g = new Chess()
    const out: Move[] = []
    for (const san of record.sans) {
      try {
        out.push(g.move(san))
      } catch {
        break
      }
    }
    return out
  }, [record])

  const verdicts = useMemo<(MoveVerdict | null)[]>(
    () => moves.map((_, i) => {
      const v = record?.verdicts?.[i]
      return v ? { ...v, betterMove: v.betterMove as MoveVerdict['betterMove'], refutation: null } : null
    }),
    [moves, record],
  )

  const myColor = record?.myColor === 'black' ? 'b' : 'w'
  const fens = useMemo(() => moves.map((m) => m.after), [moves])
  const reached = useMemo(() => (openingsReady ? openingMoments(fens).reached : []), [openingsReady, fens])
  const opening = openingsReady ? openingOf(fens) : null
  const cards = useMemo(
    () => gameCards(wordsPerMove(moves, verdicts, myColor, reached), reached, record?.reason ?? null, moves.length),
    [moves, verdicts, myColor, reached, record],
  )

  if (!record || !record.sans) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">{record ? 'No summary for this game' : 'Game not found'}</h1>
        <p className="text-muted">
          {record
            ? 'This game was played before Pawnce started saving full games. New games will have a summary.'
            : 'Games are saved in this browser only, so this link only works on the device you played on.'}
        </p>
        <Button variant="primary" onClick={onHome}>
          Home
        </Button>
      </div>
    )
  }

  return (
    <GameSummary
      bot={BOTS[record.bot] ?? BOTS.ant}
      myColor={myColor}
      moves={moves}
      verdicts={verdicts}
      opening={opening}
      cards={cards}
      newThisGame={record.newWords ?? []}
      result={record.result}
      title={record.title ?? (record.result === 'win' ? 'You win!' : record.result === 'loss' ? 'You lost' : 'Draw')}
      detail={record.detail ?? ''}
      initialPly={initialPly}
      closeLabel="Back"
      onPlayAgain={() => onPlayAgain({ botId: record.bot, side: record.myColor, timeControl: record.timeControl })}
      onChangeOpponent={onHome}
      onClose={onBack}
    />
  )
}
