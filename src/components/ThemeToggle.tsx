import { type ThemePref, setThemePref, useThemePref } from '../storage/theme'

const NEXT: Record<ThemePref, ThemePref> = { auto: 'dark', dark: 'light', light: 'auto' }
const LABEL: Record<ThemePref, string> = { auto: 'Auto (follows your device)', dark: 'Dark', light: 'Light' }

/** Cycles the look: Auto → Dark → Light. */
export function ThemeToggle() {
  const pref = useThemePref()
  return (
    <button
      type="button"
      onClick={() => setThemePref(NEXT[pref])}
      aria-label={`Theme: ${LABEL[pref]}. Tap to change.`}
      title={`Theme: ${LABEL[pref]}`}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        {pref === 'dark' ? (
          <path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        ) : pref === 'light' ? (
          <g fill="currentColor">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          <g fill="currentColor">
            <path d="M12 3a9 9 0 1 0 0 18V3z" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          </g>
        )}
      </svg>
    </button>
  )
}
