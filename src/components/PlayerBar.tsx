import type { ReactNode } from 'react'

type Props = {
  avatar: ReactNode
  name: ReactNode
  detail: ReactNode
  /** Right side: clock, hint orbs, etc. */
  children?: ReactNode
}

/** A row above or below the board: who's playing, plus their clock. */
export function PlayerBar({ avatar, name, detail, children }: Props) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <div className="flex items-center gap-2">{name}</div>
          <div className="truncate text-sm font-semibold">{detail}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
