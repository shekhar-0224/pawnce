import { motion } from 'framer-motion'
import { Chessboard } from 'react-chessboard'
import { color, readToken, withAlpha } from '../theme'
import { pieceSet } from '../theme/pieces'

// A knight has just jumped to c7, forking the king and the rook.
const FORK_POSITION = 'r1bqkbnr/ppNp1ppp/2n5/4p3/4P3/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4'

/** A still board on the start screen that shows what Pawnce teaches. */
export function BoardPreview() {
  const lagoon = withAlpha(readToken('--accent-2', '#3fb8af'), 1)
  return (
    <div className="relative w-full max-w-[360px]" aria-hidden>
      <div className="pointer-events-none rotate-[-3deg] rounded-[18px] p-2 shadow-raised ring-1 ring-border">
        <Chessboard
          options={{
            id: 'preview',
            position: FORK_POSITION,
            pieces: pieceSet,
            allowDragging: false,
            showNotation: false,
            showAnimations: false,
            arrows: [
              { startSquare: 'c7', endSquare: 'e8', color: lagoon },
              { startSquare: 'c7', endSquare: 'a8', color: lagoon },
            ],
            boardStyle: { borderRadius: 12, overflow: 'hidden' },
            lightSquareStyle: { backgroundColor: color.boardLight },
            darkSquareStyle: { backgroundColor: color.boardDark },
          }}
        />
      </div>
      <motion.div
        className="absolute -right-4 -top-4 rotate-[4deg] rounded-2xl bg-accent-2 px-4 py-2 font-display text-2xl font-bold text-bg shadow-raised"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.35 }}
      >
        Fork!
      </motion.div>
      <motion.p
        className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold shadow-soft"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.55 }}
      >
        Your knight attacks the <span className="text-accent-2">king</span> and{' '}
        <span className="text-accent-2">rook</span> at once
      </motion.p>
    </div>
  )
}
