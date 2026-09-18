/**
 * Placeholder block driven by the .skeleton shimmer already defined in
 * globals.css (it had no callers before this). Under prefers-reduced-motion the
 * shimmer is replaced by a flat fill.
 *
 * Presentational only — no hooks — so server components can render it directly.
 */
export default function Skeleton({
  width,
  height = 14,
  radius = 8,
  className = '',
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={{ width: width ?? '100%', height, borderRadius: radius, ...style }}
    />
  )
}
