'use client'

/**
 * For LONG tasks only (>2s): Add Watch publish, Edit Watch save with photo
 * uploads, bulk duplicate, bulk mark-available, login handoff, dashboard first
 * load. Never put this on an instant save — BusyButton covers those.
 *
 * Determinate when `progress` (0-1) is passed, indeterminate otherwise. The bar
 * animates width and background-position only — never transform — so it is safe
 * to render anywhere in the tree, including above page content.
 */

import { useEffect, useState } from 'react'
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag'
import { INK, INK_45, INK_08, CARD_BG, RADII } from '@/lib/design-tokens'

export const WATCH_PHRASES = [
  'Winding the watch…',
  'Setting the time…',
  'Polishing the crystal…',
  'Checking the movement…',
  'Almost there…',
] as const

const PHRASE_MS = 1800

export function useRotatingPhrase(active: boolean, phrases: readonly string[] = WATCH_PHRASES) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!active) { setIdx(0); return }
    const t = setInterval(() => {
      // Stops on the last phrase rather than looping back to "Winding the
      // watch…", which would read as if the task had restarted.
      setIdx(i => Math.min(i + 1, phrases.length - 1))
    }, PHRASE_MS)
    return () => clearInterval(t)
  }, [active, phrases.length])

  return phrases[idx]
}

export default function LongTaskProgress({
  active,
  progress,
  label,
  fullScreen = false,
  delayMs = 300,
}: {
  active:      boolean
  /** 0-1 when known. Omit for an indeterminate bar. */
  progress?:   number
  /** Overrides the rotating copy. */
  label?:      string
  fullScreen?: boolean
  delayMs?:    number
}) {
  const show = useDelayedFlag(active, delayMs)
  const phrase = useRotatingPhrase(show)

  if (!show) return null

  const determinate = typeof progress === 'number'
  const pct = determinate ? Math.round(Math.min(Math.max(progress!, 0), 1) * 100) : null

  const bar = (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium" style={{ color: INK }}>{label ?? phrase}</span>
        {pct != null && (
          <span className="ml-auto text-[12px] tabular-nums" style={{ color: INK_45 }}>{pct}%</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-label={label ?? phrase}
        className="w-full overflow-hidden"
        style={{ height: 4, borderRadius: RADII.pill, background: INK_08 }}
      >
        {determinate ? (
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: INK,
              borderRadius: RADII.pill,
              transition: 'width 200ms ease-out',
            }}
          />
        ) : (
          <div className="bar-indeterminate" style={{ height: '100%', width: '100%', borderRadius: RADII.pill }} />
        )}
      </div>
    </div>
  )

  if (!fullScreen) return <div className="feedback-in w-full">{bar}</div>

  return (
    <div
      className="feedback-in fixed inset-0 z-[250] flex items-center justify-center p-6"
      style={{ background: CARD_BG }}
    >
      <div className="w-full" style={{ maxWidth: 340 }}>{bar}</div>
    </div>
  )
}
