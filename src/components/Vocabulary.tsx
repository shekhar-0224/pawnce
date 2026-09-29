import { Link } from 'react-router'
import { WORDS } from '../chess/glossary'
import { type Learned, isKnown, useLearned } from '../storage/learned'

type Status = 'known' | 'waiting' | 'unmet'

const statusOf = (learned: Learned, id: string): Status =>
  isKnown(learned.words[id]) ? 'known' : learned.words[id] ? 'waiting' : 'unmet'

/** Home tile body: how many chess words you know, and the ones waiting. */
export function VocabularyTile() {
  const learned = useLearned()
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
              <Link
                key={w.id}
                to={`/words/${w.id}`}
                className={`rounded-md border px-2 py-1 text-xs hover:border-accent/60 ${
                  statusOf(learned, w.id) === 'known' ? 'border-accent/40 text-text' : 'border-border text-muted'
                }`}
              >
                {w.name}
                {statusOf(learned, w.id) === 'waiting' && <span className="ml-1 font-mono text-[10px] uppercase text-accent">new</span>}
              </Link>
            ))}
          </div>
        )}
        {openings.length > 0 && (
          <p className="text-xs text-muted">
            {openings.length} {openings.length === 1 ? 'opening' : 'openings'} met: {openings.slice(0, 4).join(', ')}
            {openings.length > 4 ? '…' : ''}
          </p>
        )}
        <Link
          to="/words"
          className="inline-flex min-h-11 items-center self-start rounded-lg border border-border px-3 text-sm font-semibold text-muted hover:border-muted/40 hover:text-text"
        >
          See all words
        </Link>
      </div>
    </>
  )
}
