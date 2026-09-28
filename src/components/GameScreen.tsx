import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { type Color, colorToSide } from '../chess/game'
import type { Bot } from '../engine/bots'
import { BotAvatar } from './BotAvatar'
import { ChessBoard } from './ChessBoard'
import { LeafBurst } from './LeafBurst'
import { Logo } from './Logo'
import { ResultCard } from './ResultCard'
import { SidePanel } from './SidePanel'
import { ThinkingDots } from './ThinkingDots'
import { useGame } from './useGame'

type Props = {
  bot: Bot
  myColor: Color
  onNewGame: () => void
  onChangeOpponent: () => void
}

export function GameScreen({ bot, myColor, onNewGame, onChangeOpponent }: Props) {
  const g = useGame(bot, myColor)
  const [orientation, setOrientation] = useState(colorToSide(myColor))
  const [showResult, setShowResult] = useState(false)

  // Give the final move a beat to land before the result card pops up.
  useEffect(() => {
    if (!g.isOver) return
    const t = setTimeout(() => setShowResult(true), 450)
    return () => clearTimeout(t)
  }, [g.isOver])

  const status = g.isOver
    ? 'Game over'
    : g.myTurn
      ? g.game.inCheck()
        ? 'Check! Save your king'
        : 'Your move'
      : g.game.inCheck()
        ? 'Check!'
        : `${bot.name}'s move`

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 pb-6 pt-3 sm:px-4 lg:flex-row lg:items-start lg:justify-center lg:gap-6 lg:pt-6">
      <div className="flex w-full flex-col gap-3 lg:w-[min(680px,calc(100dvh-120px))] lg:shrink-0">
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <BotAvatar bot={bot} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-lg font-semibold">{bot.name}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">
                  {bot.level}
                </span>
                {g.thinking && <ThinkingDots />}
              </div>
              <span
                className={`text-sm font-semibold ${
                  g.game.inCheck() && !g.isOver ? 'text-danger' : g.myTurn ? 'text-accent' : 'text-muted'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeOpponent}
            className="min-h-11 shrink-0 cursor-pointer rounded-full px-3 hover:bg-surface-2"
            aria-label="Back to start"
          >
            <Logo className="text-xl" />
          </button>
        </header>

        <ChessBoard
          game={g.game}
          orientation={orientation}
          myColor={myColor}
          canMove={g.myTurn}
          lastMove={g.lastMove}
          onMove={g.play}
        />
      </div>

      <div className="w-full lg:relative lg:w-[340px] lg:shrink-0 lg:self-stretch">
        <div className="lg:absolute lg:inset-0">
          <SidePanel
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            isOver={g.isOver}
            onNewGame={onNewGame}
            onResign={g.resign}
            onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          />
        </div>
      </div>

      <AnimatePresence>
        {showResult && g.summary && (
          <ResultCard
            key="result"
            bot={bot}
            result={g.summary.result}
            title={g.summary.title}
            detail={g.summary.detail}
            moveCount={Math.ceil(g.moves.length / 2)}
            onPlayAgain={onNewGame}
            onChangeOpponent={onChangeOpponent}
            onClose={() => setShowResult(false)}
          />
        )}
      </AnimatePresence>
      {showResult && g.summary?.result === 'win' && <LeafBurst />}
    </div>
  )
}
