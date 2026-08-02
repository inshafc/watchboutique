'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const

// Per-form idle lock — after `timeoutMs` of no interaction, fires `onIdle`
// (used to force an immediate draft save) and locks the screen until the
// user explicitly clicks to resume. Does not sign out or clear anything.
export function useIdleLock(timeoutMs: number, onIdle: () => void) {
  const [locked, setLocked] = useState(false)
  const lockedRef = useRef(locked)
  lockedRef.current = locked
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  const reset = useCallback(() => {
    if (lockedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onIdleRef.current()
      setLocked(true)
    }, timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    reset()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset))
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [reset])

  // Restart the countdown once the user dismisses the lock.
  useEffect(() => {
    if (!locked) reset()
  }, [locked, reset])

  const resume = useCallback(() => setLocked(false), [])

  return { locked, resume }
}
