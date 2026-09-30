import { type RefObject, useLayoutEffect, useState } from 'react'

/**
 * The largest square that fits inside the element (its width and height),
 * updated as the screen changes. Used to size the board to the space left.
 */
export function useFitSquare(ref: RefObject<HTMLElement | null>, min = 160): number | null {
  const [size, setSize] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize(Math.max(min, Math.floor(Math.min(width, height))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, min])
  return size
}
