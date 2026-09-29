import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = { title: string; onClose: () => void; children: ReactNode }

/** A panel that slides up from the bottom of the screen (phones first). */
export function Sheet({ title, onClose, children }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/60 backdrop-blur-sm min-[900px]:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface pb-[max(16px,env(safe-area-inset-bottom))] min-[900px]:rounded-card"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="pawnce-scroll min-h-0 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}
