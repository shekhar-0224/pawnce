import { motion } from 'framer-motion'
import { Button } from './Button'

type Props = {
  onKeepPlaying: () => void
  onResignAndLeave: () => void
}

/** Asked when you head home mid-game: keep playing, or resign and leave. */
export function LeaveDialog({ onKeepPlaying, onResignAndLeave }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onKeepPlaying}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        className="w-full max-w-sm rounded-card border border-border bg-surface p-5"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="leave-title" className="text-lg font-semibold">
          Leave this game?
        </h2>
        <p className="mt-1 text-sm text-muted">
          The game is still going. Leaving now counts as resigning.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onKeepPlaying} autoFocus>
            Keep playing
          </Button>
          <Button variant="danger" onClick={onResignAndLeave}>
            Resign and leave
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
