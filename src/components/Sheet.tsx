import { motion, useDragControls } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons pinned below the scrolling content, always in reach. */
  footer?: ReactNode
  /** Wider on big screens (flash cards lay out side by side). */
  wide?: boolean
  /** Phones: take a fixed tall height and let the content fill it (flash card decks). */
  fill?: boolean
}

/**
 * A bottom sheet on phones (slides up; drag its top bar down, tap outside or ✕
 * to close) and a centered panel on big screens.
 */
export function Sheet({ title, onClose, children, footer, wide = false, fill = false }: Props) {
  const drag = useDragControls()
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c2a21]/45 backdrop-blur-[2px] wide:items-center"
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
        className={`flex max-h-[92dvh] w-full flex-col ${fill ? 'h-[min(92dvh,780px)]' : ''} ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-t-3xl border border-border bg-surface pb-[max(12px,env(safe-area-inset-bottom))] wide:rounded-card`}
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 500) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The grab bar: drag down to close (phones). */}
        <div className="shrink-0 cursor-grab touch-none active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
          <span aria-hidden className="mx-auto mt-2 block h-1.5 w-10 rounded-full bg-border wide:hidden" />
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2 wide:py-3">
            <h2 className="font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={`pawnce-scroll min-h-0 overflow-y-auto p-4 min-[480px]:p-5 ${fill ? 'flex flex-1 flex-col narrow:p-3' : ''}`}>{children}</div>
        {footer && <div className="border-t border-border px-5 pt-3">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}
