'use client'

import { useEffect, useState } from 'react'

/**
 * JS-side counterpart to the @media (prefers-reduced-motion: reduce) block in
 * globals.css, for behaviour CSS cannot express — e.g. stopping a setInterval
 * that swaps text, rather than just disabling an animation.
 *
 * Starts false so the server render and first client paint agree.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
