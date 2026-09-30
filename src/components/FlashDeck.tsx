import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { EXAMPLES, exampleBoard } from '../chess/examples'
import { WORDS, WORDS_BY_ID } from '../chess/glossary'
import { learnWord } from '../storage/learned'
import { Button } from './Button'
import { ExampleBoard } from './ExampleBoard'
import { FlashCard, type FlashCardData } from './FlashCard'

export type DeckItem = { card: FlashCardData; context?: { text: string; onJump?: () => void } }

type Props = {
  items: DeckItem[]
  onClose: () => void
}

/** How far (px) a swipe must travel to change card. */
const SWIPE = 70

/**
 * A deck of flash cards. Swipe left for the next card, right to go back
 * (or use the arrows). Seeing a word's card counts as learning it. At the
 * end, a short quiz checks which words stuck.
 */
export function FlashDeck({ items, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [mode, setMode] = useState<'cards' | 'quiz'>('cards')
  const wordIds = items.flatMap((i) => (i.card.kind === 'word' ? [i.card.id] : []))

  const go = (step: number) => {
    const cur = items[index]?.card
    if (step > 0 && cur?.kind === 'word') learnWord(cur.id)
    setDir(step)
    setIndex((i) => Math.min(items.length - 1, Math.max(0, i + step)))
  }

  if (mode === 'quiz') return <Quiz wordIds={wordIds} onDone={onClose} />

  const item = items[index]
  const last = index === items.length - 1
  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE && !last) go(1)
              else if (info.offset.x > SWIPE && index > 0) go(-1)
            }}
            className="touch-pan-y"
          >
            <FlashCard card={item.card} context={item.context} progress={`${index + 1} / ${items.length}`} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5" aria-hidden>
        {items.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-accent' : 'w-1.5 bg-border'}`} />
        ))}
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] gap-2">
        <Button aria-label="Previous card" onClick={() => go(-1)} disabled={index === 0} className="px-4">
          ‹
        </Button>
        {last ? (
          wordIds.length >= 2 ? (
            <Button
              variant="primary"
              onClick={() => {
                go(1)
                setMode('quiz')
              }}
            >
              Quiz me
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                go(1)
                onClose()
              }}
            >
              Done
            </Button>
          )
        ) : (
          <Button variant="primary" onClick={() => go(1)}>
            Got it · next
          </Button>
        )}
        <Button aria-label="Next card" onClick={() => go(1)} disabled={last} className="px-4">
          ›
        </Button>
      </div>
      {index === 0 && <p className="text-center text-xs text-muted [@media(hover:hover)]:hidden">Swipe left or right to flip through the cards.</p>}
    </div>
  )
}

// Words whose example board doesn't show the word by itself: ask by meaning.
const ASK_BY_MEANING = new Set([
  'best', 'book', 'inaccuracy', 'mistake', 'blunder', 'resign', 'flag', 'fifty-moves', 'threefold',
  'insufficient', 'opening', 'piece-values', 'material', 'minor-piece', 'major-piece', 'middlegame', 'endgame',
  'sacrifice', 'brilliant', 'miss', 'perpetual-check', 'the-exchange',
])

type Question = { id: string; byBoard: boolean; options: string[] }

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeQuiz(wordIds: string[]): Question[] {
  return shuffle(wordIds)
    .slice(0, 5)
    .map((id) => {
      const word = WORDS_BY_ID[id]
      // Wrong answers: prefer words from the same group, so it's a real choice.
      const same = shuffle(WORDS.filter((w) => w.id !== id && w.category === word.category))
      const other = shuffle(WORDS.filter((w) => w.id !== id && w.category !== word.category))
      const wrong = [...same, ...other].slice(0, 3).map((w) => w.id)
      return { id, byBoard: !ASK_BY_MEANING.has(id), options: shuffle([id, ...wrong]) }
    })
}

/** A few questions: which word does this board (or this meaning) show? */
function Quiz({ wordIds, onDone }: { wordIds: string[]; onDone: () => void }) {
  const [questions, setQuestions] = useState(() => makeQuiz(wordIds))
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  if (at >= questions.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Quiz done</p>
        <p className="font-display text-5xl font-bold text-accent">
          {score} / {questions.length}
        </p>
        <p className="text-muted">
          {score === questions.length ? 'Perfect! These words are yours.' : 'Nice work. Missed ones will come back in your games.'}
        </p>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            onClick={() => {
              setQuestions(makeQuiz(wordIds))
              setAt(0)
              setScore(0)
              setPicked(null)
            }}
          >
            Try again
          </Button>
          <Button variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  const q = questions[at]
  const word = WORDS_BY_ID[q.id]
  const ex = EXAMPLES[q.id]
  const board = ex ? exampleBoard(ex) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Quiz</p>
        <p className="font-mono text-[11px] text-muted">
          {at + 1} / {questions.length}
        </p>
      </div>
      {q.byBoard && board && ex ? (
        <>
          <h2 className="text-lg font-semibold">Which word does this board show?</h2>
          <div className="mx-auto w-full max-w-[260px]">
            <ExampleBoard
              id={`quiz-${q.id}`}
              fen={board.fen}
              last={board.last}
              next={board.next}
              better={board.better}
              lines={(ex.arrows ?? []).map(([from, to]) => ({ from, to }))}
            />
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Which word means this?</h2>
          <p className="rounded-xl border-2 border-border bg-surface-2 px-3 py-2">{word.meaning}</p>
        </>
      )}
      <div role="radiogroup" aria-label="Answers" className="grid grid-cols-2 gap-2">
        {q.options.map((id) => {
          const right = id === q.id
          const tone = !picked
            ? 'border-border bg-surface hover:bg-surface-2'
            : right
              ? 'border-accent bg-accent/15 text-accent [--edge:var(--accent)]'
              : id === picked
                ? 'border-danger bg-danger/15 text-danger [--edge:var(--danger)]'
                : 'border-border opacity-60'
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={picked === id}
              disabled={!!picked}
              onClick={() => {
                setPicked(id)
                if (right) setScore((s) => s + 1)
              }}
              className={`press min-h-14 cursor-pointer rounded-2xl border-2 px-3 text-sm font-extrabold disabled:cursor-default ${tone}`}
            >
              {WORDS_BY_ID[id].name}
            </button>
          )
        })}
      </div>
      {picked && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
          <span className={`font-semibold ${picked === q.id ? 'text-accent' : 'text-danger'}`}>
            {picked === q.id ? 'Right! ' : `It's ${word.name}. `}
          </span>
          <span className="text-muted">{q.byBoard && ex ? ex.caption : word.tip}</span>
        </motion.p>
      )}
      <Button
        variant="primary"
        disabled={!picked}
        onClick={() => {
          setPicked(null)
          setAt((a) => a + 1)
        }}
      >
        {at === questions.length - 1 ? 'See my score' : 'Next question'}
      </Button>
    </div>
  )
}
