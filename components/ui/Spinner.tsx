'use client'

import { INK_45 } from '@/lib/design-tokens'

/**
 * Small token-coloured spinner. Rotation is CSS-only (.spinner-rotate) and is
 * disabled under prefers-reduced-motion, which leaves a static ring — still a
 * visible "busy" mark, just not a moving one.
 */
export default function Spinner({
  size = 14,
  color = INK_45,
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={`spinner-rotate shrink-0 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle cx="8" cy="8" r="6.4" stroke={color} strokeWidth="2" strokeOpacity=".25" />
      <path d="M14.4 8A6.4 6.4 0 0 0 8 1.6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
