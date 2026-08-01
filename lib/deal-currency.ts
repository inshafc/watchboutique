// watches.sold_price is always LKR. deal.sale_price is entered in the deal's
// own currency, so any reader falling back to it (sold_price not yet set —
// e.g. a non-Delivered deal) must convert it the same way the sale form does
// before persisting, or a foreign-currency deal's raw amount leaks through
// as if it were LKR.
export interface DealSalePriceSource {
  sale_price: number | null
  currency?: string | null
  exchange_rate?: number | null
}

export function dealSalePriceLKR(deal: DealSalePriceSource | null | undefined): number | null {
  if (!deal || deal.sale_price == null) return null
  if (!deal.currency || deal.currency === 'LKR') return deal.sale_price
  if (deal.exchange_rate == null) return deal.sale_price
  return deal.sale_price * deal.exchange_rate
}
