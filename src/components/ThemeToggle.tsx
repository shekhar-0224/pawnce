import { effectiveTheme, setThemePref, useThemePref } from '../storage/theme'
import { track } from '../analytics/track'

/** One tap flips between light and dark. */
export function ThemeToggle() {
  const dark = effectiveTheme(useThemePref()) === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={() => {
        setThemePref(dark ? 'light' : 'dark')
        track('theme', { to: dark ? 'light' : 'dark' })
      }}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        {dark ? (
          // In dark mode, show the sun: tap for light.
          <g fill="currentColor">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          <path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  )
}
