import { motion, type HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-105',
  secondary: 'border border-border bg-surface-2 text-text hover:border-muted/40',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-text hover:brightness-105',
}

type Props = HTMLMotionProps<'button'> & { variant?: Variant; size?: 'md' | 'lg' }

/** Button with 8px corners. Always at least 44px tall; presses in slightly. */
export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-13 px-6 text-base' : 'min-h-11 px-4 text-sm'
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg font-semibold transition-[filter,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-40 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
