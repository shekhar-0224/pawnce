import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { type TimeControl, timeControlName } from '../chess/clock'
import { type Color, capturedPieces, colorToSide, otherColor } from '../chess/game'
import { openingMoments, openingOf } from '../chess/openings'
import type { Bot } from '../engine/bots'
import { readToken, withAlpha } from '../theme'
import { BotAvatar, YouAvatar } from './BotAvatar'
import { ChessBoard } from './ChessBoard'
import { Clock } from './Clock'
import { Coach } from './Coach'
import { HintCard } from './HintCard'
import { HintOrbs } from './HintOrbs'
import { LeafBurst } from './LeafBurst'
import { LeaveDialog } from './LeaveDialog'
import { MomentCard } from './MomentCard'
import { MoveTicker } from './MoveTicker'
import { Logo } from './Logo'
import { PlayerBar } from './PlayerBar'
import { GameSummary } from './GameSummary'
import { SidePanel } from './SidePanel'
import { ThinkingDots } from './ThinkingDots'
import { HINT_ALPHAS, useAnalysis } from './useAnalysis'
import { useGame } from './useGame'
import { WinMeter } from './WinMeter'

type Props = {
  bot: Bot
  myColor: Color
  timeControl: TimeControl
  onNewGame: () => void
  onChangeOpponent: () => void
}

export function GameScreen({ bot, myColor, timeControl, onNewGame, onChangeOpponent }: Props) {
  // Teaching moments: after your move the bot waits (and the clocks pause)
  // until your move is judged; a mistake or blunder pauses the game.
  const [hold, setHold] = useState(false)
  const g = useGame(bot, myColor, timeControl, hold)
  const analysis = useAnalysis(g.moves, g.fen, myColor, g.myTurn, g.summary?.result ?? null)
  const botColor = otherColor(myColor)

  const lastPly = g.moves.length - 1
  const lastMove = g.moves[lastPly]
  const lastIsMine = !!lastMove && lastMove.color === myColor && !g.isOver
  const lastVerdict = analysis.verdicts[lastPly] ?? null
  const [judgeTimeoutPly, setJudgeTimeoutPly] = useState(-1)
  const [dismissedPly, setDismissedPly] = useState(-1)
  const awaitingJudgement = lastIsMine && !lastVerdict && judgeTimeoutPly !== lastPly
  const moment =
    lastIsMine &&
    lastVerdict &&
    (lastVerdict.quality === 'mistake' || lastVerdict.quality === 'blunder') &&
    dismissedPly !== lastPly
      ? { move: lastMove, verdict: lastVerdict }
      : null
  const shouldHold = awaitingJudgement || moment !== null
  if (shouldHold !== hold) setHold(shouldHold) // settle before effects run

  // Never keep the bot waiting long if the judgement is slow.
  useEffect(() => {
    if (!awaitingJudgement) return
    const t = setTimeout(() => setJudgeTimeoutPly(lastPly), 2500)
    return () => clearTimeout(t)
  }, [awaitingJudgement, lastPly])

  const opening = useMemo(
    () => (analysis.openingsReady ? openingOf(g.moves.map((m) => m.after)) : null),
    [analysis.openingsReady, g.moves],
  )
  const openings = useMemo(
    () =>
      analysis.openingsReady
        ? openingMoments(g.moves.map((m) => m.after))
        : { reached: [], current: [] },
    [analysis.openingsReady, g.moves],
  )

  const [orientation, setOrientation] = useState(colorToSide(myColor))

  // Going home mid-game asks first: keep playing, or resign and leave.
  const [leaving, setLeaving] = useState(false)
  const requestLeave = () => {
    if (g.moves.length > 0 && !g.isOver) setLeaving(true)
    else onChangeOpponent()
  }
  const [showResult, setShowResult] = useState(false)

  // "Show better move" draws the engine's choice for your last move.
  const [showBetterFor, setShowBetterFor] = useState<number | null>(null)
  const myLastIndex = g.moves.findLastIndex((m) => m.color === myColor)
  const betterMove =
    showBetterFor === myLastIndex ? (analysis.verdicts[myLastIndex]?.betterMove ?? null) : null

  const momentRefutation = moment?.verdict.refutation ?? null
  const arrows = useMemo<Arrow[]>(() => {
    const lagoon = readToken('--accent-2', '#3fb8af')
    if (analysis.hints) {
      return analysis.hints.map((h) => ({
        startSquare: h.from,
        endSquare: h.to,
        color: withAlpha(lagoon, HINT_ALPHAS[h.rank]),
      }))
    }
    if (betterMove) {
      const leaf = readToken('--success', '#7bc67e')
      return [{ startSquare: betterMove.from, endSquare: betterMove.to, color: withAlpha(leaf, 0.9) }]
    }
    // During a teaching moment: show what the opponent can now do, in red.
    if (momentRefutation) {
      const danger = readToken('--danger', '#f2555a')
      return momentRefutation.arrows.map((a, i) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: withAlpha(danger, i === 0 ? 0.9 : 0.55),
      }))
    }
    // After the bot moves: what it threatens next, in amber.
    if (analysis.threat) {
      const warn = readToken('--warn', '#f2b84b')
      return analysis.threat.arrows.map((a, i) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: withAlpha(warn, i === 0 ? 0.85 : 0.5),
      }))
    }
    return []
  }, [analysis.hints, betterMove, momentRefutation, analysis.threat])

  // Give the final move a beat to land before the result card pops up.
  useEffect(() => {
    if (!g.isOver) return
    const t = setTimeout(() => setShowResult(true), 900)
    return () => clearTimeout(t)
  }, [g.isOver])

  const captures = capturedPieces(g.moves)
  const myLead = myColor === 'w' ? captures.whiteLead : -captures.whiteLead
  const inCheck = g.game.inCheck() && !g.isOver

  const botBar = (
    <PlayerBar
      avatar={<BotAvatar bot={bot} size={40} />}
      name={
        <>
          <span className="truncate font-display text-lg font-semibold">{bot.name}</span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted">
            {bot.level}
          </span>
          {g.thinking && <ThinkingDots />}
        </>
      }
      captured={botColor === 'w' ? captures.byWhite : captures.byBlack}
      capturedColor={myColor}
      lead={-myLead}
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
      name={
        <>
          <span className="font-display text-lg font-semibold">You</span>
          {g.myTurn && (
            <span
              className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                inCheck ? 'bg-danger text-text' : 'bg-accent text-on-accent'
              }`}
            >
              {inCheck ? 'Check! Save your king' : 'Your move'}
            </span>
          )}
        </>
      }
      captured={myColor === 'w' ? captures.byWhite : captures.byBlack}
      capturedColor={botColor}
      lead={myLead}
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

  const momentCard = (
    <AnimatePresence>
      {moment && (
        <MomentCard
    key={lastPly}
    move={moment.move}
    verdict={moment.verdict}
    showingBetter={betterMove !== null}
    onTakeBack={() => {
      setShowBetterFor(null)
      g.takeBack()
    }}
    onShowBetter={() =>
      setShowBetterFor((v) => (v === lastPly ? null : lastPly))
    }
    onPlayOn={() => {
      setShowBetterFor(null)
      setDismissedPly(lastPly)
    }}
  />
      )}
    </AnimatePresence>
  )

  // The bar nearest each side of the board belongs to the player sitting there.
  const flipped = orientation !== colorToSide(myColor)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 pb-6 pt-2 sm:px-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-center min-[900px]:gap-6 min-[900px]:pt-3">
      {/* Beside the panel, the board is sized to fit the window height (no scrolling). */}
      <div className="flex w-full flex-col gap-2 min-[900px]:w-[min(680px,calc(100dvh-230px),calc(100vw-400px))] min-[900px]:shrink-0">
        <nav className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={requestLeave}
            className="-ml-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Back to home"
          >
            <span aria-hidden className="text-lg leading-none">←</span>
            <Logo className="text-lg" />
          </button>
          {g.isOver && !showResult ? (
            <button
              type="button"
              onClick={() => setShowResult(true)}
              className="min-h-9 cursor-pointer rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent"
            >
              Game summary
            </button>
          ) : (
            <span className="rounded-md border border-border px-2 py-1 font-mono text-xs font-medium text-muted">
              {timeControlName(timeControl)}
            </span>
          )}
        </nav>

        {flipped ? youBar : botBar}

        {/* On phones the win chances sit right above the board. */}
        <div className="min-[900px]:hidden">
          <WinMeter
            compact
            myWinPct={analysis.myWinPct}
            botName={bot.name}
            final={g.summary?.result ?? null}
          />
        </div>

        <MoveTicker moves={g.moves} verdicts={analysis.verdicts} myColor={myColor} bot={bot} />

        <div className="relative">
          <ChessBoard
            game={g.game}
            orientation={orientation}
            myColor={myColor}
            canMove={g.myTurn}
            lastMove={g.lastMove}
            onMove={g.play}
            arrows={arrows}
          />
          {/* Phones: the teaching moment sits right under the board. */}
          <div className="mt-2 min-[900px]:hidden">{momentCard}</div>
        </div>

        {flipped ? botBar : youBar}
      </div>

      <div className="w-full min-[900px]:relative min-[900px]:w-[340px] min-[900px]:shrink-0 min-[900px]:self-stretch">
        <div className="min-[900px]:absolute min-[900px]:inset-0">
          <SidePanel
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            verdicts={analysis.verdicts}
            opening={opening}
            isOver={g.isOver}
            meter={
              <WinMeter
                myWinPct={analysis.myWinPct}
                botName={bot.name}
                final={g.summary?.result ?? null}
              />
            }
            hint={analysis.hints && <HintCard hints={analysis.hints} />}
            coach={
              moment ? (
                <div className="hidden min-[900px]:block">{momentCard}</div>
              ) : (
              <Coach
                moves={g.moves}
                verdicts={analysis.verdicts}
                myColor={myColor}
                bot={bot}
                openings={openings}
                threat={analysis.threat}
                showingBetter={betterMove !== null}
                onToggleBetter={() =>
                  setShowBetterFor((v) => (v === myLastIndex ? null : myLastIndex))
                }
              />
              )
            }
            onNewGame={onNewGame}
            onResign={g.resign}
            onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          />
        </div>
      </div>

      <AnimatePresence>
        {leaving && (
          <LeaveDialog
            key="leave"
            onKeepPlaying={() => setLeaving(false)}
            onResignAndLeave={() => {
              setLeaving(false)
              g.resign()
              // Let the resignation save before leaving the screen.
              setTimeout(onChangeOpponent, 60)
            }}
          />
        )}
        {showResult && g.summary && (
          <GameSummary
            key="summary"
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            verdicts={analysis.verdicts}
            opening={opening}
            result={g.summary.result}
            title={g.summary.title}
            detail={g.summary.detail}
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
