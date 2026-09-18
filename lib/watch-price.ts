// Single source of truth for what price the inventory section shows.
//
// discount_price ("Sale Price" in the UI) is DISPLAY ONLY. It never feeds
// sold_price, gross profit, margin, investor payouts, deals, invoices or
// exports — those all read selling_price / sold_price directly.

export type DisplayPrice = {
  /** What the user reads first — the Sale Price when one is set, else the listed price. */
  current:  number | null
  /** The listed price, struck through, only when a Sale Price is in effect. */
  original: number | null
}

/** The shape getDisplayPrice needs — anything watch-like satisfies it. */
export type PricedWatch = {
  selling_price?:  number | null
  discount_price?: number | null
}

export function getDisplayPrice(watch: PricedWatch): DisplayPrice {
  const listed   = watch.selling_price  ?? null
  const discount = watch.discount_price ?? null

  // The DB constraint already guarantees 0 < discount < selling_price, but the
  // same guard is applied here so a stale client-side row can never render a
  // nonsensical "on sale" state.
  if (discount != null && listed != null && discount > 0 && discount < listed) {
    return { current: discount, original: listed }
  }
  return { current: listed, original: null }
}

/** Whole-percent discount, e.g. 12 for "12% off". */
export function discountPercent(original: number, current: number): number {
  if (!(original > 0)) return 0
  return Math.round(((original - current) / original) * 100)
}

/**
 * Mirrors the watches_discount_price_check constraint and the set_discount_price
 * RPC. Returns an error message, or null when the pair is valid.
 */
export function validateDiscountPrice(
  discount: number | null,
  selling:  number | null,
): string | null {
  if (discount == null) return null
  if (Number.isNaN(discount)) return 'Sale Price must be a number.'
  if (discount <= 0) return 'Sale Price must be greater than 0.'
  if (selling == null) return 'Enter a selling price before setting a Sale Price.'
  if (discount >= selling) return 'Sale Price must be lower than the selling price.'
  return null
}
