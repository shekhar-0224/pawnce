import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BASIC_WORDS, PATTERN_WORDS, WORDS_BY_ID, WORD_CATEGORIES, isBasic } from '../chess/glossary'
import { BOTS } from '../engine/bots'
import { type Learned, type WordStats, isKnown, isLearnedPattern, useLearned } from '../storage/learned'
import { loadGame } from '../storage/recentGames'
import { Button } from './Button'
import { moveNo } from './cardContext'
import { type DeckItem, FlashDeck } from './FlashDeck'
import { FlashCard } from './FlashCard'
import { Sheet } from './Sheet'

type Status = 'known' | 'waiting' | 'unmet'

/** Patterns are known once you've played them; basics once you've tapped or met them a few times. */
const statusOf = (learned: Learned, id: string): Status => {
  const s = learned.words[id]
  if (!s) return 'unmet'
  return (isBasic(id) ? isKnown(s) : isLearnedPattern(s)) ? 'known' : 'waiting'
}

/** Where you first met a word, if that game is still saved: "vs Frog · 4. O-O". */
function firstMet(s: WordStats | undefined): { label: string; href: string } | null {
  if (!s?.game || s.ply === undefined) return null
  const game = loadGame(s.game)
  if (!game?.sans) return null
  const san = game.sans[s.ply]
  const bot = BOTS[game.bot]?.name ?? 'the bot'
  return {
    label: `vs ${bot}${san ? ` · ${moveNo(s.ply)} ${san}` : ''}`,
    href: `/game/${game.id}/summary?ply=${s.ply}`,
  }
}

function PageHeader({ title, back }: { title: string; back: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Button variant="ghost" onClick={back}>
        ← Back
      </Button>
    </div>
  )
}

/** /words: every chess word, with its meaning and where you learned it. */
export function WordsPage() {
  const navigate = useNavigate()
  const learned = useLearned()
  const [deck, setDeck] = useState<DeckItem[] | null>(null)
  const known = PATTERN_WORDS.filter((w) => statusOf(learned, w.id) === 'known').length
  const met = PATTERN_WORDS.filter((w) => statusOf(learned, w.id) !== 'unmet')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:pt-10">
      <PageHeader title="Your chess vocabulary" back={() => navigate('/')} />

      <section className="mb-6 flex flex-col gap-3 card p-5">
        <p>
          <span className="text-muted">Patterns learned: </span>
          <span className="font-mono text-3xl font-semibold text-accent">{known}</span>
          <span className="text-muted"> of {PATTERN_WORDS.length}</span>
        </p>
        <p className="text-sm text-muted">A pattern counts once you’ve played it yourself, not just seen it.</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${(known / PATTERN_WORDS.length) * 100}%` }} />
        </div>
        <div className="grid gap-2 min-[480px]:grid-cols-2">
          <Button variant="primary" onClick={() => setDeck(PATTERN_WORDS.map((w) => ({ card: { kind: 'word', id: w.id } })))}>
            Study all {PATTERN_WORDS.length} patterns
          </Button>
          <Button
            disabled={met.length === 0}
            onClick={() => setDeck(met.map((w) => ({ card: { kind: 'word', id: w.id } })))}
          >
            Study the {met.length} I’ve met
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {WORD_CATEGORIES.map((cat) => {
          const words = PATTERN_WORDS.filter((w) => w.category === cat)
          if (words.length === 0) return null
          return (
            <section key={cat} aria-label={cat}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{cat}</h2>
              <ul className="flex flex-col divide-y divide-border card">
                {words.map((w) => {
                  const st = statusOf(learned, w.id)
                  const where = firstMet(learned.words[w.id])
                  return (
                    <li key={w.id} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link to={`/words/${w.id}`} className={`font-semibold hover:text-accent ${st === 'unmet' ? 'text-muted' : ''}`}>
                          {w.name}
                        </Link>
                        <span className="shrink-0 text-xs">
                          {st === 'known' && <span className="text-accent">✓ Learned</span>}
                          {st === 'waiting' && <span className="rounded bg-learn px-1.5 py-px font-mono text-[10px] font-bold uppercase text-white">Seen</span>}
                          {st === 'unmet' && <span className="text-muted">Not met yet</span>}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{w.meaning}</p>
                      {where && (
                        <Link to={where.href} className="self-start text-xs font-semibold text-accent hover:underline">
                          First met: {where.label} ›
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        <section aria-label="Basics">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Basics</h2>
            <button
              type="button"
              className="text-xs font-semibold text-accent hover:underline"
              onClick={() => setDeck(BASIC_WORDS.map((w) => ({ card: { kind: 'word', id: w.id } })))}
            >
              Study the basics
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-px overflow-hidden card min-[480px]:grid-cols-3">
            {BASIC_WORDS.map((w) => {
              const st = statusOf(learned, w.id)
              return (
                <li key={w.id} className="bg-surface">
                  <Link to={`/words/${w.id}`} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-2 ${st === 'unmet' ? 'text-muted' : ''}`}>
                    <span className="truncate font-semibold">{w.name}</span>
                    {st === 'known' && <span className="text-xs text-accent">✓</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <AnimatePresence>
        {deck && (
          <Sheet key="deck" title="Flash cards" onClose={() => setDeck(null)}>
            <FlashDeck items={deck} onClose={() => setDeck(null)} />
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}

/** /words/<id>: one word's flash card, your history with it, and where you learned it. */
export function WordPage() {
  const { wordId = '' } = useParams()
  const navigate = useNavigate()
  const learned = useLearned()
  const word = WORDS_BY_ID[wordId]
  if (!word) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-10">
        <PageHeader title="Word not found" back={() => navigate('/words')} />
        <Link to="/words" className="text-accent underline">
          See all chess words
        </Link>
      </div>
    )
  }
  const s = learned.words[word.id]
  const where = firstMet(s)
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6 sm:pt-10">
      <PageHeader title={word.name} back={() => navigate('/words')} />
      <FlashCard
        card={{ kind: 'word', id: word.id }}
        context={where ? { text: `you first met it ${where.label}.`, onJump: () => navigate(where.href) } : undefined}
      />
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Seen', s?.seen ?? 0],
          ['Played', s?.played ?? 0],
          ['Missed', s?.missed ?? 0],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-2">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="font-mono text-xl font-semibold">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-center text-xs text-muted">
        {isBasic(word.id)
          ? s
            ? isKnown(s)
              ? 'A basic you know.'
              : 'A basic: tap its tag in a game, or meet it a few more times.'
            : 'A basic you haven’t met in a game yet.'
          : s
            ? isLearnedPattern(s)
              ? 'Learned: you’ve played this pattern yourself.'
              : 'Seen, not played yet: play it yourself to learn it.'
            : 'You haven’t met this pattern in a game yet.'}
      </p>
    </div>
  )
}
