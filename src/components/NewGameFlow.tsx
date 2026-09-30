import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { TIME_CONTROL_GROUPS, TIME_CONTROLS, type TimeControlId, timeControlName } from '../chess/clock'
import { BOTS, BOT_LIST, type BotId } from '../engine/bots'
import { pieceSet } from '../theme/pieces'
import { BotAvatar } from './BotAvatar'
import type { SidePref } from './StartScreen'

export type GameSetup = { botId: BotId; side: SidePref; timeControl: TimeControlId }

type Props = {
  /** Last time's choices, shown as the current pick on each step. */
  initial: GameSetup
  onStart: (setup: GameSetup) => void
  onClose: () => void
}

const STEPS = ['Who do you want to play?', 'Which side?', 'How much time?'] as const

const SIDES: { id: SidePref; label: string; note: string }[] = [
  { id: 'white', label: 'White', note: 'You move first' },
  { id: 'black', label: 'Black', note: 'The bot moves first' },
  { id: 'random', label: 'Random', note: 'Let the coin decide' },
]

const SPEED_NOTES: Record<string, string> = {
  Bullet: 'Very fast: about 1 to 2 minutes each',
  Blitz: 'Fast: 3 to 5 minutes each',
  Rapid: 'Steady: 10 to 15 minutes each',
  Classical: 'Long: 30 minutes each',
}

const option = (active: boolean) =>
  `press w-full cursor-pointer rounded-2xl border-2 text-left transition-colors ${
    active ? 'border-accent bg-accent/10 [--edge:var(--accent)]' : 'border-border bg-surface hover:bg-surface-2'
  }`

/**
 * Starting a game, one question at a time: opponent, side, clock. Each tap
 * moves to the next question; the last one starts the game.
 */
export function NewGameFlow({ initial, onStart, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<GameSetup>(initial)

  const choose = (patch: Partial<GameSetup>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (step < STEPS.length - 1) setStep(step + 1)
    else onStart(next)
  }

  const bot = BOTS[draft.botId]
  const answers = [bot.name, SIDES.find((s) => s.id === draft.side)!.label, timeControlName(TIME_CONTROLS[draft.timeControl])]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c2a21]/45 backdrop-blur-[2px] min-[900px]:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="New game"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface pb-[max(16px,env(safe-area-inset-bottom))] min-[900px]:rounded-card"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            aria-label={step > 0 ? 'Back' : 'Close'}
            className="grid size-11 cursor-pointer place-items-center rounded-lg text-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            {step > 0 ? '←' : '✕'}
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] text-muted">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="truncate font-semibold">{STEPS[step]}</h2>
          </div>
        </header>

        {/* Earlier answers: tap one to change it. */}
        {step > 0 && (
          <nav aria-label="Your choices" className="flex flex-wrap gap-1.5 px-5 pt-3">
            {answers.slice(0, step).map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className="min-h-8 cursor-pointer rounded-md border border-border px-2 text-xs font-semibold text-muted hover:text-text"
              >
                {a} <span aria-hidden>✎</span>
              </button>
            ))}
          </nav>
        )}

        <div className="pawnce-scroll min-h-0 overflow-y-auto p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              role="radiogroup"
              aria-label={STEPS[step]}
              className="flex flex-col gap-2"
            >
              {step === 0 &&
                BOT_LIST.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={b.id === draft.botId}
                    aria-label={`${b.name}, ${b.level}`}
                    onClick={() => choose({ botId: b.id })}
                    className={`flex items-center gap-3 px-3 py-3 ${option(b.id === draft.botId)}`}
                  >
                    <BotAvatar bot={b} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{b.name}</span>
                        <span className="text-xs font-medium text-muted">{b.level}</span>
                      </span>
                      <span className="block text-sm text-muted">{b.blurb}</span>
                    </span>
                    <span aria-hidden className="text-muted">›</span>
                  </button>
                ))}

              {step === 1 &&
                SIDES.map((s) => {
                  const Piece = s.id === 'random' ? null : pieceSet[s.id === 'white' ? 'wK' : 'bK']
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={s.id === draft.side}
                      aria-label={s.label}
                      onClick={() => choose({ side: s.id })}
                      className={`flex items-center gap-3 px-3 py-3 ${option(s.id === draft.side)}`}
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-board-dark/60 p-1">
                        {Piece ? <Piece /> : <span className="font-mono text-lg font-bold">?</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.label}</span>
                        <span className="block text-sm text-muted">{s.note}</span>
                      </span>
                      <span aria-hidden className="text-muted">›</span>
                    </button>
                  )
                })}

              {step === 2 && (
                <>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={draft.timeControl === 'none'}
                    aria-label="No clock"
                    onClick={() => choose({ timeControl: 'none' })}
                    className={`flex items-center gap-3 px-3 py-3 ${option(draft.timeControl === 'none')}`}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-lg">∞</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">No clock</span>
                        <span className="rounded bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">Best for learning</span>
                      </span>
                      <span className="block text-sm text-muted">Take all the time you need.</span>
                    </span>
                    <span aria-hidden className="text-muted">›</span>
                  </button>
                  {TIME_CONTROL_GROUPS.filter((g) => g.speed).map((g) => (
                    <div key={g.label} className="mt-2">
                      <p className="mb-1.5 text-xs text-muted">
                        <span className="font-semibold text-text">{g.label}</span> · {SPEED_NOTES[g.label]}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.ids.map((id) => {
                          const t = TIME_CONTROLS[id]
                          const [min, inc] = t.label.split('+')
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={id === draft.timeControl}
                              aria-label={`${t.speed} ${t.label}`}
                              onClick={() => choose({ timeControl: id })}
                              className={`min-h-12 px-3 py-2 ${option(id === draft.timeControl)}`}
                            >
                              <span className="block font-mono font-semibold">{t.label}</span>
                              <span className="block text-[11px] text-muted">
                                {min} min{Number(inc) ? `, +${inc}s a move` : ''}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
