import { HINTS_PER_GAME } from './useAnalysis'

type Props = {
  hintsLeft: number
  hintLoading: boolean
  canHint: boolean
  onHint: () => void
  canTakeBack: boolean
  onTakeBack: () => void
  onMoves: () => void
  onMenu: () => void
}

const ITEM =
  'flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold text-muted enabled:hover:text-text disabled:cursor-not-allowed disabled:opacity-40'

/** Phones: the main actions, always in reach at the bottom of the screen. */
export function PhoneBar({ hintsLeft, hintLoading, canHint, onHint, canTakeBack, onTakeBack, onMoves, onMenu }: Props) {
  return (
    <nav
      aria-label="Game actions"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur min-[900px]:hidden"
    >
      <div className="mx-auto flex max-w-lg gap-1">
        <button
          type="button"
          className={ITEM}
          onClick={onHint}
          disabled={!canHint}
          aria-label={hintsLeft === 0 ? 'No hints left' : `Use a hint: ${hintsLeft} of ${HINTS_PER_GAME} left`}
        >
          <span className="flex h-4 items-center gap-1" aria-hidden>
            {Array.from({ length: HINTS_PER_GAME }, (_, i) => (
              <span
                key={i}
                className={`block size-2.5 rounded-full ${i < hintsLeft ? 'bg-accent' : 'border border-muted/50'} ${
                  hintLoading && i === hintsLeft - 1 ? 'animate-pulse' : ''
                }`}
              />
            ))}
          </span>
          {hintLoading ? 'Thinking…' : 'Hint'}
        </button>
        <button type="button" className={ITEM} onClick={onTakeBack} disabled={!canTakeBack}>
          <span aria-hidden className="h-4 text-base leading-4">↶</span>
          Take back
        </button>
        <button type="button" className={ITEM} onClick={onMoves}>
          <span aria-hidden className="h-4 font-mono text-[13px] leading-4">1.e4</span>
          Moves
        </button>
        <button type="button" className={ITEM} onClick={onMenu}>
          <span aria-hidden className="h-4 text-base leading-4">≡</span>
          Menu
        </button>
      </div>
    </nav>
  )
}
