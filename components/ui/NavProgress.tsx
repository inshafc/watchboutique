'use client'

/**
 * Thin top-of-screen bar shown during route transitions.
 *
 * Next.js App Router navigations to a server component hold the previous page
 * on screen with no feedback at all; this is the only signal the user gets that
 * a click registered. It is width + opacity only (see .nav-progress-bar in
 * globals.css) and is fixed-positioned as a sibling of the layout shell, never
 * an ancestor of {children}, so it cannot affect any fixed-position descendant.
 *
 * useDelayedFlag keeps it off for the first 300ms — a cached navigation that
 * lands instantly never flashes a bar.
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag'
import { INK } from '@/lib/design-tokens'

export default function NavProgress() {
  const pathname = usePathname()
  const [navigating, setNavigating] = useState(false)
  const firstRender = useRef(true)

  // A completed navigation is observable as a pathname change — that is the
  // point at which the new page has rendered, so the bar retires. Deliberately
  // not watching useSearchParams: reading it here would opt every page into a
  // client-side bailout, and same-path query changes are not navigations worth
  // a bar.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setNavigating(false)
  }, [pathname])

  // Any click on an internal link starts the bar. Capture phase, so it runs
  // before React's own handlers and before the router begins work.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/') || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (href === pathname) return
      setNavigating(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  const show = useDelayedFlag(navigating)
  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[400] pointer-events-none"
      style={{ height: 2 }}
    >
      <div
        className="nav-progress-bar feedback-in"
        style={{ height: '100%', background: INK, borderRadius: '0 2px 2px 0' }}
      />
    </div>
  )
}
