/** The Pawnce wordmark: a green pawn mark and "pawnce" in heavy rounded type. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-black tracking-tight text-accent ${className}`}>
      <svg viewBox="0 0 64 64" className="h-[1em] w-[1em]" aria-hidden>
        <rect width="64" height="64" rx="18" fill="var(--accent)" />
        <path
          d="M32 13a7.5 7.5 0 0 0-5 13.1c-3.4 1.9-5.4 5.2-5.4 9 0 2.4.8 4.6 2.3 6.2C20.3 44 18 47.8 18 51.5h28c0-3.7-2.3-7.5-5.9-10.2 1.5-1.6 2.3-3.8 2.3-6.2 0-3.8-2-7.1-5.4-9A7.5 7.5 0 0 0 32 13z"
          fill="var(--on-accent)"
        />
      </svg>
      pawnce
    </span>
  )
}
