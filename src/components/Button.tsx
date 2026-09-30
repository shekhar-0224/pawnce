import { motion, type HTMLMotionProps } from 'framer-motion'
import type { CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'learn'

const VARIANTS: Record<Variant, { className: string; edge?: string }> = {
  primary: { className: 'bg-accent text-on-accent hover:brightness-105', edge: 'var(--accent-edge)' },
  info: { className: 'bg-info text-white hover:brightness-105', edge: 'var(--info-edge)' },
  learn: { className: 'bg-learn text-white hover:brightness-105', edge: 'var(--learn-edge)' },
  danger: { className: 'bg-danger text-white hover:brightness-105', edge: 'var(--danger-edge)' },
  secondary: { className: 'border-2 border-border bg-surface text-text hover:bg-surface-2', edge: 'var(--border)' },
  ghost: { className: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text' },
}

type Props = HTMLMotionProps<'button'> & { variant?: Variant; size?: 'md' | 'lg' }

/**
 * A chunky, pressable button: bold uppercase-ish label, rounded corners and
 * a darker 3D edge underneath that squashes flat when pressed.
 */
export function Button({ variant = 'secondary', size = 'md', className = '', style, ...rest }: Props) {
  const v = VARIANTS[variant]
  const sizing = size === 'lg' ? 'min-h-14 px-6 text-base' : 'min-h-11 px-4 text-sm'
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-2xl font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-45 ${
        v.edge ? 'press' : ''
      } ${sizing} ${v.className} ${className}`}
      style={{ ...(v.edge ? ({ '--edge': v.edge } as CSSProperties) : {}), ...(style as CSSProperties) }}
      {...rest}
    />
  )
}
