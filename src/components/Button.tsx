import { motion, type HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-soft hover:brightness-105',
  secondary: 'bg-surface-2 text-text border border-border hover:border-muted/40',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-text shadow-soft hover:brightness-105',
}

type Props = HTMLMotionProps<'button'> & { variant?: Variant; size?: 'md' | 'lg' }

/** Pill button. Always at least 44px tall; scales gently when pressed. */
export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-14 px-8 text-lg' : 'min-h-11 px-5 text-[15px]'
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-full font-bold transition-[filter,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
