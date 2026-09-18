// The ONE place the inventory section decides how a watch price is drawn.
// No component renders a strikethrough or a discount badge itself — they all
// render <PriceDisplay watch={w} variant="…" />.
//
// When no Sale Price is set the output is byte-for-byte what each call site
// rendered before this component existed; `variant` carries that site's
// original typography. When one is set, the listed price is struck through and
// muted, the Sale Price takes the emphasis, and an "On Sale" badge plus the
// percentage off sit alongside.

import { getDisplayPrice, discountPercent, type PricedWatch } from '@/lib/watch-price'
import { INK, INK_45, GOLD } from '@/lib/design-tokens'

export type PriceVariant = 'tile' | 'mobileList' | 'table' | 'detail'

function formatLKR(n: number | null) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

// Each variant reproduces the exact style its call site used before.
const VARIANTS: Record<PriceVariant, { current: React.CSSProperties; align: 'left' | 'right' }> = {
  tile:       { current: { fontSize: 18,   fontWeight: 600, letterSpacing: '-.02em', color: GOLD }, align: 'left'  },
  mobileList: { current: { fontSize: 15,   fontWeight: 700, color: GOLD },                          align: 'right' },
  table:      { current: { fontSize: 16,   fontWeight: 600, letterSpacing: '-.02em', color: INK },   align: 'right' },
  detail:     { current: { fontSize: 24,   fontWeight: 600, letterSpacing: '-.03em', color: GOLD },  align: 'left'  },
}

function OnSaleBadge() {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap uppercase"
      style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em',
        padding: '3px 7px', borderRadius: 999,
        background: 'rgba(138,111,46,.12)', color: GOLD, lineHeight: 1,
      }}
    >
      On Sale
    </span>
  )
}

export default function PriceDisplay({
  watch,
  variant,
}: {
  watch: PricedWatch
  variant: PriceVariant
}) {
  const { current, original } = getDisplayPrice(watch)
  const v = VARIANTS[variant]

  // Not on sale — identical to the pre-existing markup at every call site.
  if (original == null) {
    return (
      <span className="tabular-nums whitespace-nowrap" style={v.current}>
        {formatLKR(current)}
      </span>
    )
  }

  const pct = discountPercent(original, current!)

  return (
    <span
      className={`flex flex-col gap-0.5 ${v.align === 'right' ? 'items-end' : 'items-start'}`}
      style={{ lineHeight: 1.25 }}
    >
      <span className={`flex items-center gap-1.5 flex-wrap ${v.align === 'right' ? 'justify-end' : ''}`}>
        <span className="tabular-nums whitespace-nowrap" style={v.current}>{formatLKR(current)}</span>
        <OnSaleBadge />
      </span>
      <span className={`flex items-center gap-1.5 flex-wrap ${v.align === 'right' ? 'justify-end' : ''}`}>
        <span
          className="tabular-nums whitespace-nowrap line-through"
          style={{ fontSize: 12.5, fontWeight: 500, color: INK_45 }}
        >
          {formatLKR(original)}
        </span>
        <span className="whitespace-nowrap" style={{ fontSize: 11.5, fontWeight: 600, color: GOLD }}>
          {pct}% off
        </span>
      </span>
    </span>
  )
}
