import type { ReactNode } from 'react'
import { EXAMPLES, exampleBoard } from '../chess/examples'
import type { Square } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import { explainOpening } from '../chess/openingInfo'
import { isNew, useLearned } from '../storage/learned'
import { ExampleBoard } from './ExampleBoard'

/** What a flash card teaches: a chess word, or an opening reached in a game. */
export type FlashCardData =
  | { kind: 'word'; id: string }
  | { kind: 'opening'; name: string; fen: string; last: { from: Square; to: Square } | null }

type Props = {
  card: FlashCardData
  /** "In your game: …", and a way to jump to that move. */
  context?: { text: string; onJump?: () => void }
  /** Top-right, e.g. "3 / 8". */
  progress?: string
  /** The card's buttons. */
  children?: ReactNode
}

/**
 * A flash card, like a vocabulary card: the word, what it means, an example
 * on a small board, and a tip. Used during games, in the summary deck and on
 * the words page.
 */
export function FlashCard({ card, context, progress, children }: Props) {
  const learned = useLearned()
  const word = card.kind === 'word' ? WORDS_BY_ID[card.id] : null
  const ex = word ? EXAMPLES[word.id] : null
  const board = ex ? exampleBoard(ex) : null
  const fresh = word ? isNew(learned.words[word.id]) : false

  return (
    <article
      aria-label={`Flash card: ${word ? word.name : card.kind === 'opening' ? card.name : ''}`}
      className="flex flex-col gap-3 card p-4 min-[480px]:p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {word ? word.category : 'Opening'}
          {fresh && <span className="rounded bg-accent px-1.5 py-px font-mono text-[10px] text-on-accent">New</span>}
        </p>
        {progress && <p className="font-mono text-[11px] text-muted">{progress}</p>}
      </header>

      <div>
        <h2 className="font-display text-3xl font-bold leading-tight">{word ? word.name : card.kind === 'opening' ? card.name : ''}</h2>
        <p className="mt-1 text-[15px] leading-snug">{word ? word.meaning : card.kind === 'opening' ? explainOpening(card.name) : ''}</p>
      </div>

      <figure className="flex flex-col gap-2">
        <div className="mx-auto w-full max-w-[230px] min-[480px]:max-w-[280px]">
          {board && ex ? (
            <ExampleBoard
              id={`ex-${word!.id}`}
              fen={board.fen}
              last={board.last}
              next={board.next}
              better={board.better}
              lines={(ex.arrows ?? []).map(([from, to]) => ({ from, to }))}
            />
          ) : card.kind === 'opening' ? (
            <ExampleBoard id={`op-${card.name}`} fen={card.fen} last={card.last} />
          ) : null}
        </div>
        {ex && <figcaption className="text-sm text-muted">{ex.caption}</figcaption>}
      </figure>

      {context && (
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface-2 px-3 py-2 text-sm">
          <p className="min-w-0">
            <span className="text-muted">In your game: </span>
            {context.text}
          </p>
          {context.onJump && (
            <button
              type="button"
              onClick={context.onJump}
              className="min-h-9 shrink-0 cursor-pointer rounded-md px-2 text-xs font-semibold text-accent hover:bg-accent/10"
            >
              See the move ›
            </button>
          )}
        </div>
      )}

      {word && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-text">Tip: </span>
          {word.tip}
        </p>
      )}

      {children}
    </article>
  )
}
