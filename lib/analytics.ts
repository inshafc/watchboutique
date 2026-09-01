// Shared analytics utilities for Dashboard and Analytics pages

import { dealSalePriceLKR } from '@/lib/deal-currency'
import { isTwbInvestor } from '@/lib/investor-stats'

export type DateRange = 'this_month' | 'last_month' | 'last_3' | 'last_6' | 'this_year'

// Clients bulk-imported on 2026-06-30 must never count as "new" — this is the
// single shared cutoff for that rule (dashboard New Customers card, and the
// New vs Existing client split wherever it's later made to key off client
// creation date rather than the deal-level new_client flag).
export const NEW_CLIENT_CUTOFF = '2026-07-01'

export interface DealRow {
  id: string
  deal_type: string
  stage: string
  sale_price: number | null
  currency?: string | null
  exchange_rate?: number | null
  sale_date: string | null
  closed_at?: string | null
  created_at: string
  other_costs: boolean
  other_costs_amount: number | null
  commission_payable: boolean
  commission_amount: number | null
  new_client: boolean
  source?: string | null
  sales_manager: string | null
  client_id: string | null
  watch_id?: string | null
  hasInvestors?: boolean
  watches: {
    watch_name: string
    reference: string | null
    purchase_cost: number | null
    sold_price?: number | null
    photos?: string[] | null
    brands: { name: string } | null
    watch_investors?: { investor_name: string; percentage: number }[]
  } | null
  clients: {
    name: string
    client_type: string | null
    is_vip: boolean
    club_twb: boolean
    lead_referral: string | null
    labels: string[] | null
  } | null
  trade_ins: { value: number | null }[]
  deal_expenses?: { amount: number | null }[]
}

export interface AgeingWatch {
  id: string
  watch_name: string
  condition: string | null
  created_at: string
  date_acquired: string | null
  selling_price: number | null
  brands: { name: string } | null
  hasInvestors: boolean
}

export interface Target {
  id: string
  metric: string
  target_value: number
  year: number
  month: number | null
}

// The single, central Gross Profit definition — every page that shows
// "Gross Profit" should derive it from this function (or from computeStats(),
// which calls it), not recompute its own formula.
//
// GP = Revenue − watch cost − commission (gated by commission_payable) −
//      deal_expenses − investor payout.
//
// Investor payout = pre-payout profit × (sum of non-TWB watch_investors
// percentages for the deal's watch ÷ 100) — the same percentage-split +
// TWB-exclusion mechanism the Investor Relations panel uses
// (isTwbInvestor, shared from lib/investor-stats.ts). TWB is the business
// itself, not an external investor, so its share is never subtracted.
//
// Note: this replaces the older formula (other_costs_amount + trade_ins,
// no deal_expenses, no investor payout) that computeGP() used previously.
export function computeGP(d: DealRow): number {
  // sold_price (captured on the watch at the point of sale) is the source of truth;
  // fall back to the deal's own sale_price, converted to LKR, for sales recorded
  // before that column existed.
  const sp = d.watches?.sold_price ?? dealSalePriceLKR(d) ?? 0
  const wc = d.watches?.purchase_cost ?? 0
  const ca = d.commission_payable ? (d.commission_amount ?? 0) : 0
  const de = (d.deal_expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)
  const preGP = sp - wc - ca - de

  const investorPct = (d.watches?.watch_investors ?? [])
    .filter(wi => !isTwbInvestor(wi.investor_name))
    .reduce((s, wi) => s + wi.percentage, 0)
  const investorPayout = preGP * (investorPct / 100)

  return preGP - investorPayout
}

// Single source of truth for "is this deal inside the selected period?".
// The date field is sale_date, NOT closed_at — see the note above the Overview
// cards in DashboardOverview.tsx: closed_at is a data-entry timestamp, so it
// drops deals out of the month they were actually sold in. The Sales list's
// period filter calls this so its window matches the dashboard's exactly.
export function inDateBounds(saleDate: string | null | undefined, start: Date, end: Date): boolean {
  const endOfDay = new Date(end)
  endOfDay.setHours(23, 59, 59, 999)
  const dt = saleDate ? new Date(saleDate) : null
  return !!dt && dt >= start && dt <= endOfDay
}

export function filterDeals(deals: DealRow[], start: Date, end: Date): DealRow[] {
  return deals.filter(d => inDateBounds(d.sale_date, start, end))
}

export function getDateBounds(range: DateRange): [Date, Date] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (range) {
    case 'this_month': return [new Date(y, m, 1),     new Date(y, m + 1, 0)]
    case 'last_month': return [new Date(y, m - 1, 1), new Date(y, m, 0)]
    case 'last_3':     return [new Date(y, m - 2, 1), new Date(y, m + 1, 0)]
    case 'last_6':     return [new Date(y, m - 5, 1), new Date(y, m + 1, 0)]
    case 'this_year':  return [new Date(y, 0, 1),      new Date(y, 11, 31)]
  }
}

export function getPrevBounds(range: DateRange): [Date, Date] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (range) {
    case 'this_month': return [new Date(y, m - 1, 1),  new Date(y, m, 0)]
    case 'last_month': return [new Date(y, m - 2, 1),  new Date(y, m - 1, 0)]
    case 'last_3':     return [new Date(y, m - 5, 1),  new Date(y, m - 2, 0)]
    case 'last_6':     return [new Date(y, m - 11, 1), new Date(y, m - 5, 0)]
    case 'this_year':  return [new Date(y - 1, 0, 1),  new Date(y - 1, 11, 31)]
  }
}

export function computeStats(deals: DealRow[]) {
  const watchesSold = deals.length
  const totalSales  = deals.reduce((s, d) => s + (dealSalePriceLKR(d) ?? 0), 0)
  const grossProfit = deals.reduce((s, d) => s + computeGP(d), 0)
  const gpMargin    = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
  const resellerPct = watchesSold > 0
    ? (deals.filter(d => d.clients?.client_type === 'Reseller').length / watchesSold) * 100
    : 0
  return { watchesSold, totalSales, grossProfit, gpMargin, resellerPct }
}

// ── Dashboard Overview cards ─────────────────────────────────────────────

// Revenue = sum of dealSalePriceLKR(deal) for every deal in the sale_date-
// filtered, Closed/Delivered set passed in. Deliberately does NOT fall back
// to watches.sold_price like computeGP()/grossProfitFor() do elsewhere —
// the spec names dealSalePriceLKR(deal) literally. Gross profit for this
// same card set now comes directly from computeGP() (see above) — there is
// no separate Overview-only GP formula anymore.
export function overviewRevenue(deals: DealRow[]): number {
  return deals.reduce((s, d) => s + (dealSalePriceLKR(d) ?? 0), 0)
}

// New customers = clients created inside the toggled period AND on/after
// NEW_CLIENT_CUTOFF — the bulk-import cohort (created 2026-06-30) never
// counts, regardless of what period is selected.
export function newCustomersInPeriod<T extends { created_at: string }>(
  clients: T[], start: Date, end: Date
): T[] {
  const endOfDay = new Date(end)
  endOfDay.setHours(23, 59, 59, 999)
  const cutoff = new Date(NEW_CLIENT_CUTOFF)
  return clients.filter(c => {
    const dt = new Date(c.created_at)
    return dt >= start && dt <= endOfDay && dt >= cutoff
  })
}

export function monthlyTrend(allDeals: DealRow[], count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const slice = filterDeals(allDeals, start, end)
    return {
      month: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      sales: slice.reduce((s, x) => s + (dealSalePriceLKR(x) ?? 0), 0),
      gp:    slice.reduce((s, x) => s + computeGP(x), 0),
      count: slice.length,
    }
  })
}

export function salesByBrand(deals: DealRow[]) {
  const map = new Map<string, { sold: number; totalSales: number; gp: number; commission: number }>()
  for (const d of deals) {
    const brand = d.watches?.brands?.name ?? 'Other'
    const e = map.get(brand) ?? { sold: 0, totalSales: 0, gp: 0, commission: 0 }
    map.set(brand, {
      sold: e.sold + 1,
      totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0),
      gp: e.gp + computeGP(d),
      commission: e.commission + (d.commission_payable ? (d.commission_amount ?? 0) : 0),
    })
  }
  return Array.from(map.entries())
    .map(([brand, v]) => ({ brand, ...v }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export function salesByManager(deals: DealRow[]) {
  const map = new Map<string, { sold: number; totalSales: number; commission: number }>()
  for (const d of deals) {
    const mgr = d.sales_manager || 'Unassigned'
    const e = map.get(mgr) ?? { sold: 0, totalSales: 0, commission: 0 }
    map.set(mgr, {
      sold: e.sold + 1,
      totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0),
      commission: e.commission + (d.commission_payable ? (d.commission_amount ?? 0) : 0),
    })
  }
  return Array.from(map.entries())
    .map(([manager, v]) => ({ manager, ...v }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

// Grouped by deals.source — the source captured on THIS sale — not
// clients.lead_referral, which is a one-time field on the client record
// (often null, and can disagree with a specific deal's actual source when
// a repeat client is referred differently each visit).
export function salesByReferral(deals: DealRow[]) {
  const map = new Map<string, { count: number; totalSales: number }>()
  for (const d of deals) {
    const ref = d.source ?? 'Unknown'
    const e = map.get(ref) ?? { count: 0, totalSales: 0 }
    map.set(ref, { count: e.count + 1, totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0) })
  }
  return Array.from(map.entries())
    .map(([source, v]) => ({ source, ...v, avgSale: v.count > 0 ? v.totalSales / v.count : 0 }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export function topClients(deals: DealRow[], limit = 5) {
  const map = new Map<string, { name: string; clientType: string | null; sold: number; totalSales: number; gp: number; lastSaleAt: string | null }>()
  for (const d of deals) {
    if (!d.client_id || !d.clients) continue
    const e = map.get(d.client_id) ?? { name: d.clients.name, clientType: d.clients.client_type, sold: 0, totalSales: 0, gp: 0, lastSaleAt: null }
    const dealDate = d.sale_date ?? d.created_at
    const lastSaleAt = !e.lastSaleAt || dealDate > e.lastSaleAt ? dealDate : e.lastSaleAt
    map.set(d.client_id, { ...e, sold: e.sold + 1, totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0), gp: e.gp + computeGP(d), lastSaleAt })
  }
  return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, limit)
}

export function salesByChannel(deals: DealRow[]) {
  const map = new Map<string, { sold: number; totalSales: number }>()
  for (const d of deals) {
    const channel = d.clients?.client_type ?? 'Unknown'
    const e = map.get(channel) ?? { sold: 0, totalSales: 0 }
    map.set(channel, { sold: e.sold + 1, totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0) })
  }
  return Array.from(map.entries())
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export function clubTwbDeals(deals: DealRow[]) {
  const map = new Map<string, { name: string; clientType: string | null; sold: number; totalSales: number }>()
  for (const d of deals) {
    if (!d.client_id || !d.clients?.club_twb) continue
    const e = map.get(d.client_id) ?? { name: d.clients.name, clientType: d.clients.client_type, sold: 0, totalSales: 0 }
    map.set(d.client_id, { ...e, sold: e.sold + 1, totalSales: e.totalSales + (dealSalePriceLKR(d) ?? 0) })
  }
  return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales)
}

export function newVsExisting(deals: DealRow[]) {
  const newDeals  = deals.filter(d => d.new_client)
  const existDeals = deals.filter(d => !d.new_client)
  return [
    { type: 'New',      sold: newDeals.length,   totalSales: newDeals.reduce((s, d) => s + (dealSalePriceLKR(d) ?? 0), 0),   gp: newDeals.reduce((s, d) => s + computeGP(d), 0) },
    { type: 'Existing', sold: existDeals.length, totalSales: existDeals.reduce((s, d) => s + (dealSalePriceLKR(d) ?? 0), 0), gp: existDeals.reduce((s, d) => s + computeGP(d), 0) },
  ]
}

export function targetForPeriod(annualTarget: number, range: DateRange): number {
  switch (range) {
    case 'this_month':
    case 'last_month':  return annualTarget / 12
    case 'last_3':      return (annualTarget / 12) * 3
    case 'last_6':      return (annualTarget / 12) * 6
    case 'this_year':   return annualTarget
  }
}

export function fmtLKR(n: number): string {
  return 'LKR ' + Math.round(n).toLocaleString('en-LK')
}

export function fmtCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000)     return sign + (abs / 1_000).toFixed(0) + 'K'
  return sign + abs.toFixed(0)
}

export function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}
