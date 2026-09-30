import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons pinned below the scrolling content, always in reach. */
  footer?: ReactNode
  /** Wider on big screens (flash cards lay out side by side). */
  wide?: boolean
}

/** A panel that slides up from the bottom of the screen (phones first). */
export function Sheet({ title, onClose, children, footer, wide = false }: Props) {
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
        aria-label={title}
        className={`flex max-h-[92dvh] w-full flex-col ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-t-2xl border border-border bg-surface pb-[max(16px,env(safe-area-inset-bottom))] min-[900px]:rounded-card`}
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
        <div className="pawnce-scroll min-h-0 overflow-y-auto p-4 min-[480px]:p-5">{children}</div>
        {footer && <div className="border-t border-border px-5 pt-3">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}
