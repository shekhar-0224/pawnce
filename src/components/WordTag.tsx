import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { WORDS_BY_ID, askAbout } from '../chess/glossary'
import { learnWord } from '../storage/learned'
import { track } from '../analytics/track'

/**
 * The "New" tag on a chess word you haven't learned yet, with a tappable
 * "What's a fork?" that opens a short explanation. Opening it marks the
 * word as known, so the tag won't show again.
 */
export function WordTag({ id }: { id: string | null }) {
  // Hold on to the word for this move: once tapped it's no longer New, but
  // its explanation should stay open. (The parent remounts this per move.)
  const [held, setHeld] = useState(id)
  if (!held && id) setHeld(id)
  const [open, setOpen] = useState(false)
  const word = held ? WORDS_BY_ID[held] : null
  if (!word) return null
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) track('word_open', { id: word.id })
          setOpen((o) => !o)
          learnWord(word.id)
        }}
        className="flex min-h-9 cursor-pointer items-center gap-2 self-start rounded-lg border border-accent/40 px-2 text-sm hover:bg-accent/10"
      >
        <span className="rounded bg-accent px-1.5 py-px font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-on-accent">
          New
        </span>
        <span className="font-semibold text-accent">{askAbout(word)}</span>
        <span aria-hidden className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border-2 border-border bg-surface-2 px-3 py-2 text-sm">
              <p>
                <span className="font-semibold">{word.name}: </span>
                {word.meaning}
              </p>
              <p className="mt-1 text-muted">
                <span className="font-semibold text-text">Tip: </span>
                {word.tip}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * All the NEW chips for one move. Chips stay on screen for that move even
 * after you tap them (the parent remounts this per move).
 */
export function WordChips({ ids, skip }: { ids: string[]; skip?: string | null }) {
  const [held, setHeld] = useState<string[]>([])
  const fresh = ids.filter((id) => id !== skip && !held.includes(id))
  if (fresh.length) setHeld([...held, ...fresh])
  const shown = held.filter((id) => id !== skip).slice(0, 4)
  if (!shown.length) return null
  return (
    <div className="flex flex-col gap-2">
      {shown.map((id) => (
        <WordTag key={id} id={id} />
      ))}
    </div>
  )
}
