/*
 * Theme values that JavaScript needs (the board styling in particular).
 * They point at the CSS variables in tokens.css, so colors live in one place.
 */
export const color = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  boardLight: 'var(--board-light)',
  boardDark: 'var(--board-dark)',
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  danger: 'var(--danger)',
  success: 'var(--success)',
  lastMove: 'var(--last-move)',
} as const

export const font = {
  display: 'var(--font-display)',
  body: 'var(--font-body)',
} as const

/**
 * The actual value of a color token (e.g. "#3fb8af"), for the rare places
 * that can't take a CSS variable, like SVG arrows drawn by the board.
 */
export function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** "#3fb8af" + 0.5 -> "rgba(63, 184, 175, 0.5)" */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
