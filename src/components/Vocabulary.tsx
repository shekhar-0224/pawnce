import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { WORDS, WORD_CATEGORIES } from '../chess/glossary'
import { type Learned, isKnown, useLearned } from '../storage/learned'
import { Sheet } from './Sheet'

type Status = 'known' | 'waiting' | 'unmet'

const statusOf = (learned: Learned, id: string): Status =>
  isKnown(learned.words[id]) ? 'known' : learned.words[id] ? 'waiting' : 'unmet'

/** Home tile body: how many chess words you know, and the ones waiting. */
export function VocabularyTile() {
  const learned = useLearned()
  const [open, setOpen] = useState(false)
  const known = WORDS.filter((w) => statusOf(learned, w.id) === 'known')
  const waiting = WORDS.filter((w) => statusOf(learned, w.id) === 'waiting')
  const openings = Object.keys(learned.openings)

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          <span className="font-mono text-2xl font-semibold text-accent">{known.length}</span>
          <span className="text-muted"> of {WORDS.length} words known</span>
          {waiting.length > 0 && (
            <span className="text-muted">
              {' · '}
              <span className="font-semibold text-text">{waiting.length}</span> waiting to learn
            </span>
          )}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${(known.length / WORDS.length) * 100}%` }} />
        </div>
        {known.length + waiting.length === 0 ? (
          <p className="text-sm text-muted">Play a game: every fork, pin and castle you meet lands here.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {[...known, ...waiting].slice(0, 12).map((w) => (
              <span
                key={w.id}
                className={`rounded-md border px-2 py-1 text-xs ${
                  statusOf(learned, w.id) === 'known' ? 'border-accent/40 text-text' : 'border-border text-muted'
                }`}
              >
                {w.name}
                {statusOf(learned, w.id) === 'waiting' && <span className="ml-1 font-mono text-[10px] uppercase text-accent">new</span>}
              </span>
            ))}
          </div>
        )}
        {openings.length > 0 && (
          <p className="text-xs text-muted">
            {openings.length} {openings.length === 1 ? 'opening' : 'openings'} met: {openings.slice(0, 4).join(', ')}
            {openings.length > 4 ? '…' : ''}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 cursor-pointer self-start rounded-lg border border-border px-3 text-sm font-semibold text-muted hover:border-muted/40 hover:text-text"
        >
          See all words
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <Sheet key="vocab" title="Your chess vocabulary" onClose={() => setOpen(false)}>
            <WordList learned={learned} />
          </Sheet>
        )}
      </AnimatePresence>
    </>
  )
}

/** Every chess word by category: known, waiting (met, still new) or not met yet. */
function WordList({ learned }: { learned: Learned }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-5">
      {WORD_CATEGORIES.map((cat) => (
        <section key={cat} aria-label={cat}>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{cat}</h3>
          <ul className="flex flex-col divide-y divide-border">
            {WORDS.filter((w) => w.category === cat).map((w) => {
              const st = statusOf(learned, w.id)
              const s = learned.words[w.id]
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    aria-expanded={openId === w.id}
                    onClick={() => setOpenId((o) => (o === w.id ? null : w.id))}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className={st === 'unmet' ? 'text-muted' : 'font-semibold'}>{w.name}</span>
                    <span className="shrink-0 text-xs">
                      {st === 'known' && <span className="text-accent">✓ Known</span>}
                      {st === 'waiting' && <span className="font-mono uppercase text-accent">New</span>}
                      {st === 'unmet' && <span className="text-muted">Not met yet</span>}
                    </span>
                  </button>
                  {openId === w.id && (
                    <div className="pb-3 text-sm">
                      <p>{w.meaning}</p>
                      <p className="mt-1 text-muted">
                        <span className="font-semibold text-text">Tip: </span>
                        {w.tip}
                      </p>
                      {s && (
                        <p className="mt-1 font-mono text-xs text-muted">
                          Seen {s.seen}× · played {s.played}× {s.missed ? `· missed ${s.missed}×` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
