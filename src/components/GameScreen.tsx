import { Chess } from 'chess.js'
import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import { type TimeControl, timeControlName } from '../chess/clock'
import { type Color, capturedPieces, colorToSide, otherColor } from '../chess/game'
import { openingMoments, openingOf } from '../chess/openings'
import { detectTactics, mainTactic, tacticHolds } from '../chess/tactics'
import type { Bot } from '../engine/bots'
import { readToken, withAlpha } from '../theme'
import { BotAvatar, YouAvatar } from './BotAvatar'
import { ChessBoard } from './ChessBoard'
import { Clock } from './Clock'
import { Coach } from './Coach'
import { Button } from './Button'
import { gameContext } from './cardContext'
import { FlashCard } from './FlashCard'
import { learnWord } from '../storage/learned'
import { usePauseForWords } from '../storage/prefs'
import { HintCard } from './HintCard'
import { HintOrbs } from './HintOrbs'
import { LeafBurst } from './LeafBurst'
import { LeaveDialog } from './LeaveDialog'
import { MomentCard } from './MomentCard'
import { useFitSquare } from './useFitSquare'
import { yourMoveWhy } from './coachText'
import { MoveTicker } from './MoveTicker'
import { updateGame } from '../storage/recentGames'
import { Logo } from './Logo'
import { PatternChip } from './PatternChip'
import { PlayerBar } from './PlayerBar'
import { GameSummary } from './GameSummary'
import { MenuSheetBody, MovesSheetBody } from './GameSheets'
import { PhoneBar } from './PhoneBar'
import { Sheet } from './Sheet'
import { VerdictStrip } from './VerdictStrip'
import { SidePanel } from './SidePanel'
import { ThinkingDots } from './ThinkingDots'
import { HINT_ALPHAS, useAnalysis } from './useAnalysis'
import { useGame } from './useGame'
import { useVocab } from './useVocab'
import { WinMeter } from './WinMeter'

type Props = {
  bot: Bot
  myColor: Color
  timeControl: TimeControl
  /** This game's id: its saved record and its summary link. */
  gameId: string
  /** The game-over summary is showing (its own URL: /game/<id>/summary). */
  summaryOpen: boolean
  onOpenSummary: () => void
  onCloseSummary: () => void
  onNewGame: () => void
  onChangeOpponent: () => void
}

export function GameScreen({
  bot,
  myColor,
  timeControl,
  gameId,
  summaryOpen,
  onOpenSummary,
  onCloseSummary,
  onNewGame,
  onChangeOpponent,
}: Props) {
  // Teaching moments: after your move the bot waits (and the clocks pause)
  // until your move is judged; a mistake or blunder pauses the game.
  const [hold, setHold] = useState(false)
  const g = useGame(bot, myColor, timeControl, gameId, hold)
  const analysis = useAnalysis(g.moves, g.fen, myColor, g.myTurn, g.summary?.result ?? null)
  const botColor = otherColor(myColor)

  const lastPly = g.moves.length - 1
  const lastMove = g.moves[lastPly]
  const lastIsMine = !!lastMove && lastMove.color === myColor && !g.isOver
  const lastVerdict = analysis.verdicts[lastPly] ?? null
  const [judgeTimeoutPly, setJudgeTimeoutPly] = useState(-1)
  const [dismissedPly, setDismissedPly] = useState(-1)
  const awaitingJudgement = lastIsMine && !lastVerdict && judgeTimeoutPly !== lastPly
  // Mistakes and blunders get an alert beside the board, never a pause:
  // the game goes on, and "Take it back" still works after the bot replies.
  const myLast = g.moves.findLastIndex((m) => m.color === myColor)
  const myLastVerdict = myLast >= 0 ? analysis.verdicts[myLast] : null
  const moment =
    myLast >= 0 &&
    !g.isOver &&
    myLastVerdict &&
    (myLastVerdict.quality === 'mistake' || myLastVerdict.quality === 'blunder') &&
    dismissedPly !== myLast
      ? { move: g.moves[myLast], verdict: myLastVerdict, ply: myLast }
      : null

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

  const vocab = useVocab(g.moves, analysis.verdicts, myColor, openings.reached, g.summary?.reason ?? null, gameId)

  // Pop-ups are rare: at most one per move, never on move 1, never on a
  // move that already shows the mistake card, and only for major moves
  // (tactics, checkmates, castling, en passant, promotion). Every other new
  // word, openings included, is a NEW chip in the coach and a summary card.
  const [pauseForWords, setPauseForWords] = usePauseForWords()
  const [wordDoneAt, setWordDoneAt] = useState(-1)
  const canPop = pauseForWords && lastVerdict && !g.isOver && lastPly >= 2 && !moment && wordDoneAt !== lastPly
  const newWord = canPop ? vocab.pauseWordAt(lastPly) : null
  const [wordCard, setWordCard] = useState<
    { ply: number; kind: 'word'; id: string } | { ply: number; kind: 'opening'; name: string } | null
  >(null)
  // Keep the card on screen until it's dismissed, even once the word is learned.
  if (!wordCard && newWord) setWordCard({ ply: lastPly, kind: 'word', id: newWord })
  if (wordCard && wordCard.ply !== lastPly && !newWord) setWordCard(null)
  const dismissWord = (learn: boolean) => {
    if (learn && wordCard?.kind === 'word') learnWord(wordCard.id)
    setWordDoneAt(wordCard?.ply ?? lastPly)
    setWordCard(null)
  }

  const shouldHold = awaitingJudgement || wordCard !== null
  if (shouldHold !== hold) setHold(shouldHold) // settle before effects run

  // Once the game is over, keep its saved record up to date as the last
  // grades come in, so its summary can be reopened later from Recent games.
  const summaryTitle = g.summary?.title
  const summaryDetail = g.summary?.detail
  const newWordsKey = vocab.newThisGame.join(',')
  useEffect(() => {
    if (!g.isOver) return
    updateGame(gameId, {
      verdicts: analysis.verdicts.map((v) =>
        v
          ? { quality: v.quality, winBefore: v.winBefore, winAfter: v.winAfter, cpLoss: v.cpLoss, better: v.better, betterMove: v.betterMove }
          : null,
      ),
      newWords: newWordsKey ? newWordsKey.split(',') : [],
      title: summaryTitle,
      detail: summaryDetail,
    })
  }, [g.isOver, gameId, analysis.verdicts, newWordsKey, summaryTitle, summaryDetail])

  const [orientation, setOrientation] = useState(colorToSide(myColor))
  const boardBoxRef = useRef<HTMLDivElement>(null)
  const fit = useFitSquare(boardBoxRef)

  // Going home mid-game asks first: keep playing, or resign and leave.
  const [leaving, setLeaving] = useState(false)
  const requestLeave = () => {
    if (g.moves.length > 0 && !g.isOver) setLeaving(true)
    else onChangeOpponent()
  }
  // Phones: the full coach, the move list and the menu open as sheets.
  const [sheet, setSheet] = useState<'coach' | 'moves' | 'menu' | null>(null)

  // "Show better move" draws the engine's choice for your last move.
  const [showBetterFor, setShowBetterFor] = useState<number | null>(null)
  const myLastIndex = g.moves.findLastIndex((m) => m.color === myColor)
  const betterMove =
    showBetterFor === myLastIndex ? (analysis.verdicts[myLastIndex]?.betterMove ?? null) : null

  // The better move belongs to the position BEFORE your move. Once the bot has
  // replied (maybe with check), show that earlier position, read-only, with
  // the arrow on it, never on today's board.
  const betterPreview = betterMove && !lastIsMine && myLastIndex >= 0 ? g.moves[myLastIndex] : null
  const previewFen = betterPreview?.before ?? null
  const previewGame = useMemo(() => (previewFen ? new Chess(previewFen) : null), [previewFen])

  // The red arrows for what punishes your slip, until the bot has replied.
  const momentRefutation = moment && lastIsMine ? (moment.verdict.refutation ?? null) : null

  // A tactic that really works (either side) flashes on the board: lines
  // from the attacker to its targets and a "FORK!" chip, for about 1.5s.
  const lastTactic = useMemo(() => {
    if (!lastMove || !tacticHolds(lastVerdict?.quality)) return null
    return mainTactic(detectTactics(lastMove.before, lastMove))
  }, [lastMove, lastVerdict?.quality])
  const [flashDonePly, setFlashDonePly] = useState(-1)
  const flash = lastTactic && flashDonePly !== lastPly ? lastTactic : null
  const flashMine = lastMove?.color === myColor
  useEffect(() => {
    if (!lastTactic) return
    const t = setTimeout(() => setFlashDonePly(lastPly), 1600)
    return () => clearTimeout(t)
  }, [lastTactic, lastPly])
  const arrows = useMemo<Arrow[]>(() => {
    const lagoon = readToken('--accent-2', '#3fb8af')
    if (analysis.hints && !previewGame) {
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
    if (flash) {
      const tone = flashMine ? readToken('--accent', '#c6f36b') : readToken('--danger', '#f2555a')
      const [origin, ...targets] = flash.squares
      return targets.map((t) => ({ startSquare: origin, endSquare: t, color: withAlpha(tone, 0.8) }))
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
  }, [analysis.hints, betterMove, momentRefutation, flash, flashMine, analysis.threat, previewGame])

  // Give the final move a beat to land before the result card pops up.
  // (Only once: closing the summary shouldn't reopen it.)
  const openSummaryRef = useRef(onOpenSummary)
  useEffect(() => {
    openSummaryRef.current = onOpenSummary
  })
  useEffect(() => {
    if (!g.isOver) return
    const t = setTimeout(() => openSummaryRef.current(), 900)
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
                inCheck ? 'bg-danger text-white' : 'bg-accent text-on-accent'
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
      <div className="hidden wide:block">
        <HintOrbs
          left={analysis.hintsLeft}
          loading={analysis.hintLoading}
          enabled={analysis.canHint}
          onUse={analysis.requestHint}
        />
      </div>
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
    key={moment.ply}
    move={moment.move}
    verdict={moment.verdict}
    why={yourMoveWhy(moment.move, moment.verdict, openings.reached[moment.ply] ?? null, openings.current[moment.ply] ?? null, bot.name)}
    showingBetter={betterMove !== null}
    onTakeBack={() => {
      setShowBetterFor(null)
      // Undo your move, and the bot's reply if it already answered.
      if (lastIsMine) g.takeBack()
      else g.takeBackRound()
    }}
    onShowBetter={() =>
      setShowBetterFor((v) => (v === moment.ply ? null : moment.ply))
    }
    onPlayOn={() => {
      setShowBetterFor(null)
      setDismissedPly(moment.ply)
    }}
  />
      )}
    </AnimatePresence>
  )

  const coach = (
    <Coach
      moves={g.moves}
      verdicts={analysis.verdicts}
      myColor={myColor}
      bot={bot}
      openings={openings}
      threat={analysis.threat}
      newWordsAt={vocab.newWordsAt}
      showingBetter={betterMove !== null}
      onToggleBetter={() => setShowBetterFor((v) => (v === myLastIndex ? null : myLastIndex))}
    />
  )

  // The bar nearest each side of the board belongs to the player sitting there.
  const flipped = orientation !== colorToSide(myColor)

  return (
    <div className="mx-auto flex w-full max-w-6xl narrow:h-dvh narrow:overflow-hidden narrow:px-2 narrow:pb-[calc(60px+env(safe-area-inset-bottom))] narrow:pt-1 sm:px-4 wide:flex-row wide:items-start wide:justify-center wide:gap-6 wide:pb-6 wide:pt-3">
      {/*
        Phones: one screen, never scrolls. Header, opponent, meter, the board in
        whatever height is left, feedback, you. Landscape phones: board on the left.
        Wide screens: the board is sized to the window height, beside the panel.
      */}
      <div className="grid w-full grid-cols-1 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto_auto] gap-1.5 narrow:h-full land:grid-cols-[auto_minmax(0,1fr)] land:grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] land:gap-x-4 wide:flex wide:w-[min(680px,calc(100dvh-246px),calc(100vw-400px))] wide:shrink-0 wide:flex-col wide:gap-2">
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
          {g.isOver && !summaryOpen ? (
            <button
              type="button"
              onClick={onOpenSummary}
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
        <div className="wide:hidden">
          <WinMeter
            compact
            myWinPct={analysis.myWinPct}
            botName={bot.name}
            final={g.summary?.result ?? null}
          />
        </div>

        <div className="hidden wide:block">
          <MoveTicker moves={g.moves} verdicts={analysis.verdicts} myColor={myColor} bot={bot} />
        </div>

        {/* Phones: the board takes the space left (measured), so nothing needs scrolling. */}
        <div
          ref={boardBoxRef}
          className="flex min-h-0 items-center justify-center land:col-start-1 land:row-span-5 land:row-start-1 land:h-full land:w-[calc(100dvh-72px-env(safe-area-inset-bottom))] wide:block"
        >
        <div className="relative w-[var(--fit)] wide:w-full" style={{ '--fit': fit ? `${fit}px` : '100%' } as CSSProperties}>
          <ChessBoard
            game={previewGame ?? g.game}
            orientation={orientation}
            myColor={myColor}
            canMove={!previewGame && g.myTurn}
            lastMove={previewGame ? (g.moves[myLastIndex - 1] ?? undefined) : g.lastMove}
            onMove={g.play}
            arrows={arrows}
          />
          {betterPreview && (
            <div className="absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-2 rounded-xl bg-[#1c2a21]/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
              <span className="min-w-0">
                Before your move {betterPreview.san}: <span className="text-accent">{analysis.verdicts[myLastIndex]?.better}</span> was better
              </span>
              <button
                type="button"
                onClick={() => setShowBetterFor(null)}
                className="min-h-8 shrink-0 cursor-pointer rounded-lg bg-white px-2.5 font-black text-[#1c2a21]"
              >
                Back to game
              </button>
            </div>
          )}
          <AnimatePresence>
            {flash && !analysis.hints && !momentRefutation && (
              <PatternChip
                key={lastPly}
                kind={flash.kind}
                mine={flashMine}
                atBottom={
                  // Most of the tactic on the top half of the screen? Chip goes low.
                  flash.squares.filter((sq) => (Number(sq[1]) >= 5) === (orientation === 'white')).length * 2 >
                  flash.squares.length
                }
              />
            )}
          </AnimatePresence>
        </div>
        </div>
        {/* Phones: the coach sits right under the board. A slip shows as a bottom sheet
            (portrait) or in this spot (landscape), so the board never shrinks for it. */}
        <div className="min-h-0 overflow-y-auto wide:hidden">
          {moment && <div className="hidden land:block">{momentCard}</div>}
          <div className={moment ? 'land:hidden' : ''}>
            <VerdictStrip
              moves={g.moves}
              verdicts={analysis.verdicts}
              myColor={myColor}
              bot={bot}
              openings={openings}
              threat={analysis.threat}
              hints={analysis.hints}
              newWordAt={vocab.newWordAt}
              onOpen={() => setSheet('coach')}
            />
          </div>
        </div>

        {flipped ? botBar : youBar}
      </div>

      <div className="hidden w-full wide:relative wide:block wide:w-[340px] wide:shrink-0 wide:self-stretch">
        <div className="wide:absolute wide:inset-0">
          <SidePanel
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            verdicts={analysis.verdicts}
            opening={opening}
            isOver={g.isOver}
            meter={
              <WinMeter
                compact
                myWinPct={analysis.myWinPct}
                botName={bot.name}
                final={g.summary?.result ?? null}
              />
            }
            hint={analysis.hints && <HintCard hints={analysis.hints} />}
            coach={
              moment ? <div className="hidden wide:block">{momentCard}</div> : coach
            }
            onNewGame={onNewGame}
            onResign={g.resign}
            onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            pauseForWords={pauseForWords}
            onTogglePause={() => setPauseForWords(!pauseForWords)}
          />
        </div>
      </div>

      {/* Portrait phones: a slip slides up as a bottom sheet over the action bar. Play goes on. */}
      <AnimatePresence>
        {moment && (
          <motion.div
            key={`sheet-${moment.ply}`}
            className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(8px,env(safe-area-inset-bottom))] land:hidden wide:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto max-w-lg rounded-t-3xl bg-bg px-1 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
              <span aria-hidden className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-border" />
              {momentCard}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PhoneBar
        hintsLeft={analysis.hintsLeft}
        hintLoading={analysis.hintLoading}
        canHint={analysis.canHint}
        onHint={analysis.requestHint}
        canTakeBack={g.canTakeBack && g.myTurn}
        onTakeBack={() => {
          setShowBetterFor(null)
          g.takeBackRound()
        }}
        onMoves={() => setSheet('moves')}
        onMenu={() => setSheet('menu')}
      />

      <AnimatePresence>
        {wordCard && lastMove && (
          <Sheet
            key={`word-${wordCard.ply}`}
            title={wordCard.kind === 'opening' ? 'New opening' : 'New chess word'}
            onClose={() => dismissWord(false)}
            footer={
              <div className="flex flex-col gap-2">
                <p className="text-center text-xs text-muted">
                  The game is paused while you read.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setPauseForWords(false)
                      dismissWord(false)
                    }}
                    className="cursor-pointer underline hover:text-text"
                  >
                    Turn off
                  </button>
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <Button variant="ghost" onClick={() => dismissWord(false)}>
                    Not now
                  </Button>
                  <Button variant="primary" onClick={() => dismissWord(true)}>
                    Got it · continue
                  </Button>
                </div>
              </div>
            }
          >
            {(() => {
              const at = g.moves[wordCard.ply] ?? lastMove
              const data =
                wordCard.kind === 'word'
                  ? ({ kind: 'word', id: wordCard.id, ply: wordCard.ply } as const)
                  : ({ kind: 'opening', name: wordCard.name, family: wordCard.name, ply: wordCard.ply } as const)
              return (
                <FlashCard
                  card={
                    wordCard.kind === 'word'
                      ? { kind: 'word', id: wordCard.id }
                      : { kind: 'opening', name: wordCard.name, fen: at.after, last: { from: at.from, to: at.to } }
                  }
                  context={{
                    text: gameContext(data, at, analysis.verdicts[wordCard.ply] ?? null, at.color === myColor, bot),
                  }}
                />
              )
            })()}
          </Sheet>
        )}
        {sheet === 'coach' && (
          <Sheet key="coach" title="Coach" onClose={() => setSheet(null)}>
            <div className="flex flex-col gap-4">
              {analysis.hints && <HintCard hints={analysis.hints} />}
              {coach}
            </div>
          </Sheet>
        )}
        {sheet === 'moves' && (
          <Sheet key="moves" title="Moves" onClose={() => setSheet(null)}>
            <MovesSheetBody bot={bot} myColor={myColor} moves={g.moves} verdicts={analysis.verdicts} opening={opening} />
          </Sheet>
        )}
        {sheet === 'menu' && (
          <Sheet key="menu" title="Menu" onClose={() => setSheet(null)}>
            <MenuSheetBody
              isOver={g.isOver}
              pauseForWords={pauseForWords}
              onTogglePause={() => setPauseForWords(!pauseForWords)}
              onNewGame={onNewGame}
              onResign={() => {
                setSheet(null)
                g.resign()
              }}
              onFlip={() => {
                setSheet(null)
                setOrientation((o) => (o === 'white' ? 'black' : 'white'))
              }}
              onHome={() => {
                setSheet(null)
                requestLeave()
              }}
            />
          </Sheet>
        )}
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
        {summaryOpen && g.summary && (
          <GameSummary
            key="summary"
            bot={bot}
            myColor={myColor}
            moves={g.moves}
            verdicts={analysis.verdicts}
            opening={opening}
            cards={vocab.cards}
            wordsAt={vocab.perPly}
            newThisGame={vocab.newThisGame}
            result={g.summary.result}
            title={g.summary.title}
            detail={g.summary.detail}
            onPlayAgain={onNewGame}
            onChangeOpponent={onChangeOpponent}
            onClose={onCloseSummary}
          />
        )}
      </AnimatePresence>
      {summaryOpen && g.summary?.result === 'win' && <LeafBurst />}
    </div>
  )
}
