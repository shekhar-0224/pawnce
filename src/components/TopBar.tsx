import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

type Props = {
  title: ReactNode
  /** Defaults to the previous page (or home if there isn't one). */
  onBack?: () => void
  backLabel?: string
  /** Defaults to going to the home page. */
  onHome?: () => void
  /** Hide Home where Back already goes home. */
  showHome?: boolean
}

/**
 * The same bar at the top of every page: Back on the left, the page title,
 * Home on the right. It stays pinned while the page scrolls.
 */
export function TopBar({ title, onBack, backLabel = 'Back', onHome, showHome = true }: Props) {
  const navigate = useNavigate()
  const back = () => {
    if (onBack) return onBack()
    // React Router counts pages within the app; leave the app never, go home instead.
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1)
    else navigate('/')
  }
  const btn =
    'flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-sm font-extrabold text-muted hover:bg-surface-2 hover:text-text'
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b-2 border-border bg-bg/95 px-2 py-1.5 backdrop-blur sm:px-4">
      <div>
        <button type="button" onClick={back} className={btn}>
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          {backLabel}
        </button>
      </div>
      <h1 className="min-w-0 truncate text-center text-lg font-black">{title}</h1>
      <div className="flex justify-end">
        {showHome && (
          <button type="button" onClick={onHome ?? (() => navigate('/'))} className={btn} aria-label="Home">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="currentColor" d="M12 3 2.5 11h2.5v9h5.5v-6h3v6H19v-9h2.5L12 3z" />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>
    </header>
  )
}
