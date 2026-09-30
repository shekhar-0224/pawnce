import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BASIC_WORDS, PATTERN_WORDS, WORDS_BY_ID, WORD_CATEGORIES, isBasic } from '../chess/glossary'
import { BOTS } from '../engine/bots'
import { type Learned, type WordStats, isKnown, isLearnedPattern, useLearned } from '../storage/learned'
import { loadGame } from '../storage/recentGames'
import { Button } from './Button'
import { moveNo } from './cardContext'
import { type DeckItem, FlashDeck } from './FlashDeck'
import { FlashCard } from './FlashCard'
import { Sheet } from './Sheet'
import { TopBar } from './TopBar'

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

/** /words: every chess word by group (one tab at a time), with its meaning and where you learned it. */
export function WordsPage() {
  const learned = useLearned()
  const [deck, setDeck] = useState<DeckItem[] | null>(null)
  const [openWord, setOpenWord] = useState<string | null>(null)
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const known = PATTERN_WORDS.filter((w) => statusOf(learned, w.id) === 'known').length
  const met = PATTERN_WORDS.filter((w) => statusOf(learned, w.id) !== 'unmet')

  // Tactics and checkmates first: they're what the game teaches most.
  const first = ['Tactics', 'Checkmate patterns']
  const groups = WORD_CATEGORIES.filter((c) => PATTERN_WORDS.some((w) => w.category === c))
  const tabs = [...first.filter((c) => groups.includes(c as never)), ...groups.filter((c) => !first.includes(c)), 'Basics'] as string[]
  const tab = tabs.includes(search.get('tab') ?? '') ? search.get('tab')! : tabs[0]
  const words = tab === 'Basics' ? BASIC_WORDS : PATTERN_WORDS.filter((w) => w.category === tab)
  const countIn = (t: string) => {
    const ws = t === 'Basics' ? BASIC_WORDS : PATTERN_WORDS.filter((w) => w.category === t)
    return `${ws.filter((w) => statusOf(learned, w.id) === 'known').length}/${ws.length}`
  }

  // One screen: the list scrolls inside its card, the page itself doesn't.
  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4 pb-3">
      <TopBar title="Chess words" />

      <section className="card flex shrink-0 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-black">
            Patterns learned:{' '}
            <span className="text-learn">
              {known} of {PATTERN_WORDS.length}
            </span>
          </p>
          <p className="hidden text-xs font-bold text-muted min-[480px]:block">Counts once you’ve played it yourself.</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-learn" style={{ width: `${(known / PATTERN_WORDS.length) * 100}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="learn" className="whitespace-nowrap" onClick={() => setDeck(words.map((w) => ({ card: { kind: 'word', id: w.id } })))}>
            Study {tab === 'Basics' ? 'the basics' : tab.toLowerCase()}
          </Button>
          <Button className="whitespace-nowrap" disabled={met.length === 0} onClick={() => setDeck(met.map((w) => ({ card: { kind: 'word', id: w.id } })))}>
            The {met.length} I’ve met
          </Button>
        </div>
      </section>

      <div role="tablist" aria-label="Word groups" className="pawnce-scroll -mx-4 my-3 flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            onClick={() => setSearch({ tab: t }, { replace: true })}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold ${
              t === tab ? 'border-learn bg-learn text-white' : 'border-border bg-surface text-muted hover:bg-surface-2'
            }`}
          >
            {t} <span className={t === tab ? 'text-white/80' : 'text-muted/80'}>{countIn(t)}</span>
          </button>
        ))}
      </div>

      <ul role="tabpanel" aria-label={tab} className="pawnce-scroll card min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {words.map((w) => {
          const st = statusOf(learned, w.id)
          const where = firstMet(learned.words[w.id])
          return (
            <li key={w.id} className="flex flex-col gap-0.5 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpenWord(w.id)}
                  className={`cursor-pointer text-left font-extrabold hover:text-accent ${st === 'unmet' ? 'text-muted' : ''}`}
                >
                  {w.name} <span aria-hidden className="text-muted">›</span>
                </button>
                <span className="shrink-0 text-xs font-bold">
                  {st === 'known' && <span className="text-accent">✓ {tab === 'Basics' ? 'Known' : 'Learned'}</span>}
                  {st === 'waiting' && <span className="rounded bg-learn px-1.5 py-px text-[10px] font-black uppercase text-white">Seen</span>}
                  {st === 'unmet' && <span className="text-muted">Not met yet</span>}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{w.meaning}</p>
              {where && (
                <Link to={where.href} className="self-start text-xs font-semibold text-accent hover:underline">
                  First met: {where.label} ›
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      <AnimatePresence>
        {deck && (
          <Sheet key="deck" title="Flash cards" wide fill onClose={() => setDeck(null)}>
            <FlashDeck items={deck} onClose={() => setDeck(null)} />
          </Sheet>
        )}
        {openWord && WORDS_BY_ID[openWord] && (
          <Sheet key={`word-${openWord}`} title={WORDS_BY_ID[openWord].name} wide onClose={() => setOpenWord(null)}>
            <WordDetail id={openWord} onJump={(href) => navigate(href)} />
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
  const word = WORDS_BY_ID[wordId]
  if (!word) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <TopBar title="Word not found" />
        <Link to="/words" className="text-accent underline">
          See all chess words
        </Link>
      </div>
    )
  }
  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4">
      <TopBar title={word.name} />
      <div className="pawnce-scroll -mx-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <WordDetail id={word.id} onJump={(href) => navigate(href)} />
      </div>
    </div>
  )
}

/** One word: its flash card, your history with it, and where you first met it. Used as a page and in a bottom sheet. */
export function WordDetail({ id, onJump }: { id: string; onJump: (href: string) => void }) {
  const learned = useLearned()
  const word = WORDS_BY_ID[id]
  if (!word) return null
  const s = learned.words[word.id]
  const where = firstMet(s)
  return (
    <div>
      <FlashCard
        card={{ kind: 'word', id: word.id }}
        context={where ? { text: `you first met it ${where.label}.`, onJump: () => onJump(where.href) } : undefined}
      />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ['Seen', s?.seen ?? 0],
          ['Played', s?.played ?? 0],
          ['Missed', s?.missed ?? 0],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-border bg-surface px-2 py-1">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="font-mono text-lg font-semibold">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-center text-xs text-muted">
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
