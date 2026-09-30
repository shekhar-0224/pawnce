import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { TIME_CONTROLS, type TimeControlId } from '../chess/clock'
import type { Color } from '../chess/game'
import { BOTS, type BotId } from '../engine/bots'
import { analyst, engine } from '../engine/stockfish'
import { GameScreen } from './GameScreen'
import { RecentGamesScreen } from './RecentGamesScreen'
import { SavedGameSummary } from './SavedGameSummary'
import { ReportPage } from './ReportPage'
import { WordPage, WordsPage } from './WordsPage'
import { newGameId } from '../storage/recentGames'
import { type SidePref, StartScreen } from './StartScreen'

type Settings = { botId: BotId; side: SidePref; timeControl: TimeControlId }

const SETTINGS_KEY = 'pawnce.settings.v1'

function loadSettings(): Settings {
  const fallback: Settings = { botId: 'ant', side: 'white', timeControl: 'none' }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const s = JSON.parse(raw) as Partial<Settings>
    return {
      botId: s.botId && s.botId in BOTS ? s.botId : fallback.botId,
      side: s.side === 'white' || s.side === 'black' || s.side === 'random' ? s.side : fallback.side,
      timeControl:
        s.timeControl && s.timeControl in TIME_CONTROLS ? s.timeControl : fallback.timeControl,
    }
  } catch {
    return fallback
  }
}

function pickColor(side: SidePref): Color {
  if (side === 'random') return Math.random() < 0.5 ? 'w' : 'b'
  return side === 'white' ? 'w' : 'b'
}

type Match = { gameId: string; myColor: Color }

/*
 * Pages (each has its own link):
 *   /                     home
 *   /play                 the game you're playing now
 *   /game/<id>/summary    a game's summary (?ply=12 opens the replay at a move)
 *   /games                recent games
 *   /words, /words/<id>   your chess vocabulary, and one word
 *   /report               your report card
 */
export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [settings, setSettings] = useState(loadSettings)
  const [match, setMatch] = useState<Match | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Not remembered; that's fine.
    }
  }, [settings])

  // Start loading Stockfish right away so the first bot move is quick.
  useEffect(() => {
    engine.init().catch(() => undefined)
    analyst.init().catch(() => undefined)
  }, [])

  // Scroll to the top on every new page.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const startGame = (next: Settings = settings) => {
    setSettings(next)
    setMatch({ gameId: newGameId(), myColor: pickColor(next.side) })
    navigate('/play')
  }

  // The live game and its summary share one page, so closing the summary
  // returns to the same board.
  const summaryId = location.pathname.match(/^\/game\/([^/]+)\/summary/)?.[1]
  const onGamePage = location.pathname === '/play' || (!!match && summaryId === match.gameId)
  const pageKey = onGamePage ? `game-${match?.gameId ?? 'new'}` : location.pathname

  // Leaving the game page ends the live match (leaving mid-game resigns it
  // first). From then on, its link opens the saved summary and replay, not
  // a fresh board.
  if (match && !onGamePage) setMatch(null)

  const gameHost = (
    <GameHost
      match={match}
      settings={settings}
      onStart={startGame}
      onHome={() => navigate('/')}
      onBack={() => (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'))}
    />
  )

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh overflow-x-clip">
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<StartScreen setup={settings} onPlay={startGame} onRecent={() => navigate('/games')} onOpenGame={(id) => navigate(`/game/${id}/summary`)} />} />
              <Route path="/play" element={gameHost} />
              <Route path="/game/:id/summary" element={gameHost} />
              <Route
                path="/games"
                element={
                  <RecentGamesScreen
                    onOpen={(id) => navigate(`/game/${id}/summary`)}
                  />
                }
              />
              <Route path="/words" element={<WordsPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/words/:wordId" element={<WordPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  )
}

/**
 * /play and /game/<id>/summary. While you're playing (or just finished),
 * this shows the live game, with its summary on top when the URL says so.
 * Any other game's summary is rebuilt from what was saved.
 */
function GameHost({
  match,
  settings,
  onStart,
  onHome,
  onBack,
}: {
  match: Match | null
  settings: Settings
  onStart: (next?: Settings) => void
  onHome: () => void
  onBack: () => void
}) {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const live = !!match && (!id || id === match.gameId)

  // Opening /play directly (or refreshing it) starts a fresh game.
  useEffect(() => {
    if (!id && !match) onStart()
  }, [id, match, onStart])

  if (live && match) {
    return (
      <GameScreen
        key={match.gameId}
        bot={BOTS[settings.botId]}
        myColor={match.myColor}
        timeControl={TIME_CONTROLS[settings.timeControl]}
        gameId={match.gameId}
        summaryOpen={!!id}
        onOpenSummary={() => navigate(`/game/${match.gameId}/summary`)}
        onCloseSummary={() => navigate('/play')}
        onNewGame={() => onStart()}
        onChangeOpponent={onHome}
      />
    )
  }
  if (id) {
    const ply = Number(search.get('ply'))
    return (
      <SavedGameSummary
        key={id}
        id={id}
        initialPly={Number.isInteger(ply) && search.has('ply') ? ply : undefined}
        onPlayAgain={(s) =>
          onStart({
            botId: (s.botId in BOTS ? s.botId : settings.botId) as BotId,
            side: s.side,
            timeControl: (s.timeControl && s.timeControl in TIME_CONTROLS ? s.timeControl : 'none') as TimeControlId,
          })
        }
        onHome={onHome}
        onBack={onBack}
      />
    )
  }
  return null
}
