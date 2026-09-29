import type { Color, Move } from '../chess/game'
import { WORDS_BY_ID } from '../chess/glossary'
import type { Threat } from '../chess/threats'
import type { Bot } from '../engine/bots'
import { BADGE, NOTE_TONES, botReplyNote, yourMoveWhy } from './coachText'
import { ThinkingDots } from './ThinkingDots'
import { HINT_ALPHAS, type Hint, type MoveVerdict } from './useAnalysis'

type Props = {
  moves: Move[]
  verdicts: (MoveVerdict | null)[]
  myColor: Color
  bot: Bot
  openings: { reached: (string | null)[]; current: (string | null)[] }
  threat: Threat | null
  hints: Hint[] | null
  newWordAt: (ply: number) => string | null
  onOpen: () => void
}

/**
 * Phones: the coach in two lines, right under the board. Your move's grade,
 * the bot's reply, and the one sentence that matters most now. Tap for more.
 */
export function VerdictStrip({ moves, verdicts, myColor, bot, openings, threat, hints, newWordAt, onOpen }: Props) {
  if (hints) {
    return (
      <section aria-label="Hint" className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
        <ol className="flex flex-col gap-1">
          {hints.map((h) => (
            <li key={h.rank} className="flex min-w-0 items-start gap-2 text-sm leading-snug">
              <span
                className="mt-px grid size-5 shrink-0 place-items-center rounded font-mono text-[11px] font-bold text-on-accent"
                style={{ background: `color-mix(in srgb, var(--accent-2) ${HINT_ALPHAS[h.rank] * 100}%, var(--surface))` }}
              >
                {h.rank + 1}
              </span>
              <span className="shrink-0 font-mono font-semibold">{h.san}</span>
              <span className="line-clamp-2 min-w-0 text-muted">{h.idea}</span>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  const mine = moves.findLastIndex((m) => m.color === myColor)
  const reply = mine >= 0 ? moves[mine + 1] : moves[0]
  const verdict = mine >= 0 ? (verdicts[mine] ?? null) : null
  const badge = verdict ? BADGE[verdict.quality] : null
  // A new chess word on the latest move: tap the strip to learn it.
  const latest = moves.length - 1
  const newWord = latest >= 0 ? (newWordAt(latest) ?? (latest > 0 ? newWordAt(latest - 1) : null)) : null

  let line: { text: string; tone: string } | null = null
  if (mine < 0) {
    line = {
      text: reply
        ? `The ${bot.name} opened with ${reply.san}${openings.reached[0] ? `: the ${openings.reached[0]}` : ''}. Your move!`
        : 'Your move! Every move gets named here.',
      tone: '',
    }
  } else {
    const note = reply ? botReplyNote(reply, verdicts[mine + 1] ?? null, bot, openings.reached[mine + 1] ?? null, threat) : null
    const why = yourMoveWhy(moves[mine], verdict, openings.reached[mine] ?? null, openings.current[mine] ?? null, bot.name)
    // Something happening now (a threat, a check, a chance) beats talk about your move.
    if (note && note.tone !== 'plain') line = { text: note.text, tone: NOTE_TONES[note.tone] }
    else if (why) line = { text: why, tone: '' }
    else if (note) line = { text: note.text, tone: '' }
    else if (!verdict) line = { text: 'Checking your move…', tone: '' }
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Coach: tap for more"
      className="flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-left"
    >
      {mine >= 0 && (
        <span className="flex w-full min-w-0 items-center gap-2 text-sm">
          <span className={`grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs font-bold ${badge ? badge.tone : 'bg-surface-2'}`}>
            {badge ? badge.mark : <ThinkingDots />}
          </span>
          <span className="min-w-0 shrink-0 truncate">
            <span className="font-mono font-semibold">{moves[mine].san}</span>
            {badge && <span className="text-muted"> was {badge.word}</span>}
          </span>
          {newWord && WORDS_BY_ID[newWord] ? (
            // A new chess word takes the reply's spot (tap the strip to learn it).
            <span className="ml-auto flex min-w-0 shrink items-center gap-1 text-xs">
              <span className="rounded bg-accent px-1 py-px font-mono text-[10px] font-bold uppercase text-on-accent">New</span>
              <span className="truncate font-semibold text-accent">{WORDS_BY_ID[newWord].name}</span>
            </span>
          ) : reply && (
            <span className="ml-auto shrink-0 text-xs text-muted">
              {bot.name}: <span className="font-mono font-semibold text-text">{reply.san}</span>
            </span>
          )}
          <span aria-hidden className="shrink-0 text-muted">›</span>
        </span>
      )}
      {line && (
        <span className={`line-clamp-2 text-[13px] leading-snug ${line.tone ? `rounded-md px-2 py-1 ${line.tone}` : ''}`}>
          {line.text}
        </span>
      )}
    </button>
  )
}
