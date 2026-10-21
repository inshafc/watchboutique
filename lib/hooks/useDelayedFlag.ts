'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only once `active` has been continuously true for `delayMs`.
 *
 * Every spinner and skeleton in the app goes through this, so an action that
 * finishes in 120ms never flashes a loading state at the user — the indicator
 * appears only when the wait is long enough to be worth explaining.
 */
export function useDelayedFlag(active: boolean, delayMs = 300): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) { setShown(false); return }
    const t = setTimeout(() => setShown(true), delayMs)
    return () => clearTimeout(t)
  }, [active, delayMs])

  return shown
}
