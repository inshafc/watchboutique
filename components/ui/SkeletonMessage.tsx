'use client'

/**
 * A small muted line of rotating copy sitting above a page skeleton.
 *
 * Not an overlay, not full-screen, no progress bar — it sits in the normal
 * flow above the skeleton content and reserves its own height so nothing
 * shifts when it appears.
 *
 * Two separate gates, deliberately: the skeleton itself appears at 300ms (the
 * app-wide useDelayedFlag default), but this copy waits 1000ms. A load that
 * resolves in half a second shows a skeleton and no chatter; only a genuinely
 * slow one gets told a story.
 */

import { useEffect, useState } from 'react'
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { INK_45 } from '@/lib/design-tokens'
import { WATCH_PHRASES, PHRASE_MS } from '@/lib/watch-phrases'

const MESSAGE_MS = 1000

export default function SkeletonMessage({
  phrases = WATCH_PHRASES,
  className = '',
}: {
  phrases?: readonly string[]
  className?: string
}) {
  const show = useDelayedFlag(true, MESSAGE_MS)
  const reduced = usePrefersReducedMotion()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    // Static under reduced motion — the first phrase, never swapped.
    if (!show || reduced) return
    const t = setInterval(() => {
      // Settles on the last phrase rather than looping back to "Winding the
      // watch…", which would read as though the load had restarted.
      setIdx(i => Math.min(i + 1, phrases.length - 1))
    }, PHRASE_MS)
    return () => clearInterval(t)
  }, [show, reduced, phrases.length])

  // Height is reserved whether or not the text is showing, so the skeleton
  // below never jumps when the copy fades in.
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight: 18 }}
      aria-live="polite"
    >
      {show && (
        <span
          className="feedback-in text-[12.5px]"
          style={{ color: INK_45 }}
        >
          {phrases[idx]}
        </span>
      )}
    </div>
  )
}
