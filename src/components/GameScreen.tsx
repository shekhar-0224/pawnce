import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { type TimeControl, timeControlName } from '../chess/clock'
import { type Color, colorToSide } from '../chess/game'
import { openingOf } from '../chess/openings'
import type { Bot } from '../engine/bots'
import { readToken, withAlpha } from '../theme'
import { BotAvatar, YouAvatar } from './BotAvatar'
import { ChessBoard } from './ChessBoard'
import { Clock } from './Clock'
import { HintCard } from './HintCard'
import { HintOrbs } from './HintOrbs'
import { LeafBurst } from './LeafBurst'
import { Logo } from './Logo'
import { MoveCard } from './MoveCard'
import { PlayerBar } from './PlayerBar'
import { ResultCard } from './ResultCard'
import { SidePanel } from './SidePanel'
import { ThinkingDots } from './ThinkingDots'
import { HINT_ALPHAS, useAnalysis } from './useAnalysis'
import { useGame } from './useGame'
import { WinRope } from './WinRope'

const sideName = (c: Color) => (c === 'w' ? 'White' : 'Black')

type Props = {
  bot: Bot
  myColor: Color
  timeControl: TimeControl
  onNewGame: () => void
  onChangeOpponent: () => void
}

export function GameScreen({ bot, myColor, timeControl, onNewGame, onChangeOpponent }: Props) {
  const g = useGame(bot, myColor, timeControl)
  const analysis = useAnalysis(g.moves, g.fen, myColor, g.myTurn, g.summary?.result ?? null)
  const opening = useMemo(
    () => (analysis.openingsReady ? openingOf(g.moves.map((m) => m.after)) : null),
    [analysis.openingsReady, g.moves],
  )
  // The move card shows the last two moves: yours and the bot's reply.
  const recentStart = Math.max(0, g.moves.length - 2)

  // Hint arrows: lagoon, strongest to weakest.
  const hintArrows = useMemo<Arrow[]>(() => {
    if (!analysis.hints) return []
    const lagoon = readToken('--accent-2', '#3fb8af')
    return analysis.hints.map((h) => ({
      startSquare: h.from,
      endSquare: h.to,
      color: withAlpha(lagoon, HINT_ALPHAS[h.rank]),
    }))
  }, [analysis.hints])
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

  const botColor = myColor === 'w' ? 'b' : 'w'
  const statusTone =
    g.game.inCheck() && !g.isOver ? 'text-danger' : g.myTurn ? 'text-accent' : 'text-muted'

  const botBar = (
    <PlayerBar
      avatar={<BotAvatar bot={bot} size={40} />}
      name={
        <>
          <span className="truncate font-display text-lg font-semibold">{bot.name}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">
            {bot.level}
          </span>
          {g.thinking && <ThinkingDots />}
        </>
      }
      detail={
        <span className={g.myTurn ? 'text-muted' : statusTone}>
          {g.myTurn ? sideName(botColor) : status}
        </span>
      }
    >
      {g.clockOn && (
        <Clock
          label={`${bot.name}'s clock`}
          remainingMs={g.clock.remaining[botColor]}
          runningSince={g.turn === botColor ? g.clock.runningSince : null}
        />
      )}
    </PlayerBar>
  )

  const youBar = (
    <PlayerBar
      avatar={<YouAvatar color={myColor} />}
      name={<span className="font-display text-lg font-semibold">You</span>}
      detail={
        <span className={g.myTurn ? statusTone : 'text-muted'}>
          {g.myTurn ? status : sideName(myColor)}
        </span>
      }
    >
      <HintOrbs
        left={analysis.hintsLeft}
        loading={analysis.hintLoading}
        enabled={analysis.canHint}
        onUse={analysis.requestHint}
      />
      {g.clockOn && (
        <Clock
          label="Your clock"
          remainingMs={g.clock.remaining[myColor]}
          runningSince={g.turn === myColor ? g.clock.runningSince : null}
        />
      )}
    </PlayerBar>
  )

  // The bar nearest each side of the board belongs to the player sitting there.
  const flipped = orientation !== colorToSide(myColor)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 pb-6 pt-2 sm:px-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-center min-[900px]:gap-5 min-[900px]:pt-3 lg:gap-6">
      {/* Beside the panel, the board is sized to fit the window height (no scrolling). */}
      <div className="flex w-full flex-col gap-2 min-[900px]:w-[min(680px,calc(100dvh-204px),calc(100vw-380px))] min-[900px]:shrink-0">
        <nav className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onChangeOpponent}
            className="-ml-2 min-h-11 cursor-pointer rounded-full px-3 hover:bg-surface-2"
            aria-label="Back to start"
          >
            <Logo className="text-2xl" />
          </button>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-muted">
            {timeControlName(timeControl)}
          </span>
        </nav>

        {flipped ? youBar : botBar}

        <ChessBoard
          game={g.game}
          orientation={orientation}
          myColor={myColor}
          canMove={g.myTurn}
          lastMove={g.lastMove}
          onMove={g.play}
          arrows={hintArrows}
        />

        {flipped ? botBar : youBar}
      </div>

      <div className="w-full min-[900px]:relative min-[900px]:w-[320px] min-[900px]:shrink-0 min-[900px]:self-stretch lg:w-[340px]">
        <div className="min-[900px]:absolute min-[900px]:inset-0">
          <SidePanel
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            isOver={g.isOver}
            onNewGame={onNewGame}
            onResign={g.resign}
            onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            rope={<WinRope myWinPct={analysis.myWinPct} botName={bot.name} />}
            hint={analysis.hints && <HintCard hints={analysis.hints} />}
            verdicts={analysis.verdicts}
            moveCard={
              <MoveCard
                entries={g.moves.slice(recentStart).map((move, i) => ({
                  move,
                  verdict: analysis.verdicts[recentStart + i] ?? null,
                }))}
                myColor={myColor}
                bot={bot}
                opening={opening}
              />
            }
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
