import { motion } from 'framer-motion'
import type { Color, PieceSymbol } from '../chess/game'
import { PIECE_NAMES } from '../chess/game'
import { pieceCode, pieceSet } from '../theme/pieces'

const CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n']

type Props = {
  color: Color
  onPick: (piece: PieceSymbol) => void
  onCancel: () => void
}

/** Small picker shown over the board when a pawn reaches the last rank. */
export function PromotionPicker({ color, onPick, onCancel }: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center rounded-lg bg-white/70 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onCancel}
    >
      <motion.div
        role="dialog"
        aria-label="Choose a piece for your pawn"
        className="card p-4"
        initial={{ scale: 0.9, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-base font-semibold">Promote your pawn</p>
        <div className="flex gap-2">
          {CHOICES.map((p) => {
            const Piece = pieceSet[pieceCode(color, p)]
            return (
              <motion.button
                key={p}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onPick(p)}
                className="flex w-16 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-border bg-surface-2 p-2 hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-2))] focus-visible:bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-2))] sm:w-20"
              >
                <span className="block size-12 sm:size-14">
                  <Piece />
                </span>
                <span className="text-xs font-bold capitalize text-muted">{PIECE_NAMES[p]}</span>
              </motion.button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mx-auto mt-3 block min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold text-muted hover:text-text"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}
