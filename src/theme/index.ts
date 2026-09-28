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
