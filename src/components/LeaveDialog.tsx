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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c2a21]/45 backdrop-blur-[2px] wide:items-center wide:p-4"
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
        className="w-full max-w-lg rounded-t-3xl border border-border bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] wide:max-w-sm wide:rounded-card"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
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
