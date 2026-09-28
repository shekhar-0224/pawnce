import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { TIME_CONTROLS, type TimeControlId } from '../chess/clock'
import type { Color } from '../chess/game'
import { BOTS, type BotId } from '../engine/bots'
import { analyst, engine } from '../engine/stockfish'
import { GameScreen } from './GameScreen'
import { RecentGamesScreen } from './RecentGamesScreen'
import { type SidePref, StartScreen } from './StartScreen'

type Screen = 'start' | 'game' | 'recent'

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

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [settings, setSettings] = useState(loadSettings)
  const [match, setMatch] = useState<{ id: number; myColor: Color }>({ id: 0, myColor: 'w' })

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

  const startGame = () => {
    setMatch((m) => ({ id: m.id + 1, myColor: pickColor(settings.side) }))
    setScreen('game')
    window.scrollTo({ top: 0 })
  }

  const goTo = (s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }

  const screenKey = screen === 'game' ? `game-${match.id}` : screen

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screenKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {screen === 'start' && (
              <StartScreen
                botId={settings.botId}
                side={settings.side}
                timeControl={settings.timeControl}
                onTimeControlChange={(timeControl) => setSettings((s) => ({ ...s, timeControl }))}
                onBotChange={(botId) => setSettings((s) => ({ ...s, botId }))}
                onSideChange={(side) => setSettings((s) => ({ ...s, side }))}
                onPlay={startGame}
                onRecent={() => goTo('recent')}
              />
            )}
            {screen === 'game' && (
              <GameScreen
                bot={BOTS[settings.botId]}
                myColor={match.myColor}
                timeControl={TIME_CONTROLS[settings.timeControl]}
                onNewGame={startGame}
                onChangeOpponent={() => goTo('start')}
              />
            )}
            {screen === 'recent' && <RecentGamesScreen onBack={() => goTo('start')} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  )
}
