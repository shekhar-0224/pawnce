import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import { EXAMPLES, exampleBoard } from '../chess/examples'
import type { Square } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import { explainOpening } from '../chess/openingInfo'
import { isNew, useLearned } from '../storage/learned'
import { ExampleBoard } from './ExampleBoard'
import { useFitSquare } from './useFitSquare'

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
  /** Fill the height it's given (a deck in a bottom sheet): the board takes the space left. */
  fill?: boolean
  /** The card's buttons. */
  children?: ReactNode
}

/**
 * A flash card, like a vocabulary card: the word, what it means, an example
 * on a small board, and a tip. Used during games, in the summary deck and on
 * the words page.
 */
export function FlashCard({ card, context, progress, fill = false, children }: Props) {
  const boardBox = useRef<HTMLDivElement>(null)
  const fit = useFitSquare(boardBox, 0)
  const learned = useLearned()
  const word = card.kind === 'word' ? WORDS_BY_ID[card.id] : null
  const ex = word ? EXAMPLES[word.id] : null
  const board = ex ? exampleBoard(ex) : null
  const fresh = word ? isNew(learned.words[word.id]) : false
  const [tipOpen, setTipOpen] = useState(false)
  const name = word ? word.name : card.kind === 'opening' ? card.name : ''
  const meaning = word ? word.meaning : card.kind === 'opening' ? explainOpening(card.name) : ''

  // In a deck: board first, like a play app. The word and one line on top, the
  // board as big as the screen allows, one short line below. The tip is a tap away.
  if (fill) {
    const boardEl =
      board && ex ? (
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
      ) : null
    return (
      <article
        aria-label={`Flash card: ${name}`}
        className="card flex h-full min-h-0 flex-col gap-2 p-3 min-[480px]:p-4 [@media(max-height:600px)_and_(orientation:landscape)]:flex-row [@media(max-height:600px)_and_(orientation:landscape)]:gap-4"
      >
        {/* Short screens (landscape phones, small laptops): board left at full height, words right. */}
        <div className="contents [@media(max-height:600px)_and_(orientation:landscape)]:order-2 [@media(max-height:600px)_and_(orientation:landscape)]:flex [@media(max-height:600px)_and_(orientation:landscape)]:w-[46%] [@media(max-height:600px)_and_(orientation:landscape)]:shrink-0 [@media(max-height:600px)_and_(orientation:landscape)]:flex-col [@media(max-height:600px)_and_(orientation:landscape)]:gap-2">
        <header className="order-1 flex shrink-0 items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-muted">
            <span className="truncate">{word ? word.category : 'Opening'}</span>
            {fresh && <span className="rounded bg-accent px-1 py-px text-[9px] text-on-accent">New</span>}
          </p>
          {progress && <p className="shrink-0 font-mono text-[11px] font-bold text-muted">{progress}</p>}
        </header>
        <div className="order-2 shrink-0">
          <h2 className="font-display text-2xl font-black leading-tight min-[480px]:text-3xl">{name}</h2>
          <p className="mt-0.5 line-clamp-3 text-sm font-bold leading-snug text-muted">{meaning}</p>
        </div>

        <footer className="order-4 flex shrink-0 items-center gap-2 [@media(max-height:600px)_and_(orientation:landscape)]:mt-auto [@media(max-height:600px)_and_(orientation:landscape)]:flex-wrap">
          {context ? (
            <button
              type="button"
              onClick={context.onJump}
              disabled={!context.onJump}
              className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-xl bg-surface-2 px-2.5 py-1.5 text-left text-xs font-bold leading-snug disabled:cursor-default"
            >
              <span className="line-clamp-2 min-w-0">
                <span className="text-muted">In your game: </span>
                {context.text}
              </span>
              {context.onJump && <span aria-hidden className="ml-auto shrink-0 text-accent">›</span>}
            </button>
          ) : (
            <p className="line-clamp-2 min-w-0 flex-1 text-xs font-bold leading-snug text-muted">{ex?.caption ?? ''}</p>
          )}
          {word && (
            <button
              type="button"
              aria-expanded={tipOpen}
              onClick={() => setTipOpen((o) => !o)}
              className={`min-h-10 shrink-0 cursor-pointer rounded-xl border-2 px-3 text-xs font-black ${tipOpen ? 'border-warn bg-warn/15 text-text' : 'border-border text-muted hover:bg-surface-2'}`}
            >
              💡 Tip
            </button>
          )}
        </footer>
        </div>

        <div ref={boardBox} className="relative order-3 flex min-h-0 min-w-0 flex-1 items-center justify-center [@media(max-height:600px)_and_(orientation:landscape)]:order-1">
          {boardEl && fit !== null && fit >= 100 && (
            <div className="w-[var(--fit)]" style={{ '--fit': `${Math.min(fit, 520)}px` } as CSSProperties}>
              {boardEl}
            </div>
          )}
          <AnimatePresence>
            {tipOpen && word && (
              <motion.p
                role="note"
                className="absolute inset-x-1 bottom-1 rounded-2xl border-2 border-warn/50 bg-surface p-3 text-sm font-bold leading-snug shadow-lg"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
              >
                <span className="text-warn">Tip · </span>
                {word.tip}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {children}
      </article>
    )
  }

  return (
    <article
      aria-label={`Flash card: ${word ? word.name : card.kind === 'opening' ? card.name : ''}`}
      className={`@container card p-4 min-[480px]:p-5 ${fill ? 'flex h-full min-h-0 flex-col narrow:p-3' : ''}`}
    >
      {/* Stacked on narrow screens; board left and words right when there's room, so the card fits without scrolling. */}
      <div className={`flex flex-col gap-3 @min-[34rem]:grid @min-[34rem]:grid-cols-[minmax(0,15rem)_1fr] @min-[34rem]:grid-rows-[auto_1fr] @min-[34rem]:gap-x-5 ${fill ? 'min-h-0 flex-1 narrow:gap-2' : ''}`}>
        <div className={`flex flex-col @min-[34rem]:col-start-2 @min-[34rem]:row-start-1 ${fill ? 'gap-1.5 @min-[34rem]:gap-3' : 'gap-3'}`}>
          <header className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {word ? word.category : 'Opening'}
              {fresh && <span className="rounded bg-accent px-1.5 py-px font-mono text-[10px] text-on-accent">New</span>}
            </p>
            {progress && <p className="font-mono text-[11px] text-muted">{progress}</p>}
          </header>
          <div>
            <h2 className={`font-display font-bold leading-tight ${fill ? 'text-2xl @min-[34rem]:text-3xl' : 'text-3xl'}`}>{word ? word.name : card.kind === 'opening' ? card.name : ''}</h2>
            <p className={`mt-1 leading-snug ${fill ? 'text-sm @min-[34rem]:text-[15px]' : 'text-[15px]'}`}>{word ? word.meaning : card.kind === 'opening' ? explainOpening(card.name) : ''}</p>
          </div>
        </div>

        <figure className={`flex flex-col gap-2 @min-[34rem]:col-start-1 @min-[34rem]:row-span-2 @min-[34rem]:row-start-1 ${fill ? 'min-h-0 flex-1 narrow:gap-1' : ''}`}>
          {/* Never taller than the screen allows: the board shrinks on short screens. */}
          <div ref={boardBox} className={fill ? 'flex min-h-0 flex-1 justify-center @min-[34rem]:block @min-[34rem]:flex-none' : ''}>
          {/* On very small screens there's no room for a readable board: the card is words only. */}
          {!(fill && fit !== null && fit < 100) && (
          <div
            className={`mx-auto w-full ${fill ? 'max-w-[var(--fit)] @min-[34rem]:max-w-[clamp(150px,calc(100dvh_-_380px),240px)]' : 'max-w-[clamp(140px,calc(100dvh_-_580px),280px)] @min-[34rem]:max-w-[clamp(150px,calc(100dvh_-_380px),240px)]'}`}
            style={{ '--fit': fit ? `${Math.min(fit, 300)}px` : '200px' } as CSSProperties}
          >
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
          )}
          </div>
          {ex && <figcaption className={`text-muted ${fill ? 'line-clamp-3 text-xs @min-[34rem]:text-sm' : 'text-sm'}`}>{ex.caption}</figcaption>}
        </figure>

        <div className={`flex flex-col @min-[34rem]:col-start-2 @min-[34rem]:row-start-2 ${fill ? 'gap-2 @min-[34rem]:gap-3' : 'gap-3'}`}>
          {context && (
            <div className={`flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-surface-2 ${fill ? 'px-2.5 py-1 text-xs @min-[34rem]:px-3 @min-[34rem]:py-2 @min-[34rem]:text-sm' : 'px-3 py-2 text-sm'}`}>
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
            <p className={`text-muted ${fill ? 'line-clamp-2 text-xs @min-[34rem]:text-sm' : 'text-sm'}`}>
              <span className="font-semibold text-text">Tip: </span>
              {word.tip}
            </p>
          )}
        </div>
      </div>

      {children}
    </article>
  )
}
