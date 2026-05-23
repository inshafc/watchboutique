// Shared analytics utilities for Dashboard and Analytics pages

export type DateRange = 'this_month' | 'last_month' | 'last_3' | 'last_6' | 'this_year'

export interface DealRow {
  id: string
  deal_type: string
  stage: string
  sale_price: number | null
  sale_date: string | null
  created_at: string
  other_costs: boolean
  other_costs_amount: number | null
  commission_payable: boolean
  commission_amount: number | null
  new_client: boolean
  sales_manager: string | null
  client_id: string | null
  watches: {
    watch_name: string
    reference: string | null
    purchase_cost: number | null
    brands: { name: string } | null
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
}

export interface Target {
  id: string
  metric: string
  target_value: number
  year: number
  month: number | null
}

export function computeGP(d: DealRow): number {
  const sp = d.sale_price ?? 0
  const wc = d.watches?.purchase_cost ?? 0
  const oc = d.other_costs ? (d.other_costs_amount ?? 0) : 0
  const ca = d.commission_payable ? (d.commission_amount ?? 0) : 0
  const ti = d.trade_ins.reduce((s, t) => s + (t.value ?? 0), 0)
  return sp - wc - oc - ca - ti
}

export function filterDeals(deals: DealRow[], start: Date, end: Date): DealRow[] {
  const endOfDay = new Date(end)
  endOfDay.setHours(23, 59, 59, 999)
  return deals.filter(d => {
    const dt = d.sale_date ? new Date(d.sale_date) : null
    return dt && dt >= start && dt <= endOfDay
  })
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
  const totalSales  = deals.reduce((s, d) => s + (d.sale_price ?? 0), 0)
  const grossProfit = deals.reduce((s, d) => s + computeGP(d), 0)
  const gpMargin    = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
  const resellerPct = watchesSold > 0
    ? (deals.filter(d => d.clients?.client_type === 'Reseller').length / watchesSold) * 100
    : 0
  return { watchesSold, totalSales, grossProfit, gpMargin, resellerPct }
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
      sales: slice.reduce((s, x) => s + (x.sale_price ?? 0), 0),
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
      totalSales: e.totalSales + (d.sale_price ?? 0),
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
      totalSales: e.totalSales + (d.sale_price ?? 0),
      commission: e.commission + (d.commission_payable ? (d.commission_amount ?? 0) : 0),
    })
  }
  return Array.from(map.entries())
    .map(([manager, v]) => ({ manager, ...v }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export function salesByReferral(deals: DealRow[]) {
  const map = new Map<string, { count: number; totalSales: number }>()
  for (const d of deals) {
    const ref = d.clients?.lead_referral ?? 'Unknown'
    const e = map.get(ref) ?? { count: 0, totalSales: 0 }
    map.set(ref, { count: e.count + 1, totalSales: e.totalSales + (d.sale_price ?? 0) })
  }
  return Array.from(map.entries())
    .map(([source, v]) => ({ source, ...v, avgSale: v.count > 0 ? v.totalSales / v.count : 0 }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export function topClients(deals: DealRow[], limit = 5) {
  const map = new Map<string, { name: string; clientType: string | null; sold: number; totalSales: number; gp: number }>()
  for (const d of deals) {
    if (!d.client_id || !d.clients) continue
    const e = map.get(d.client_id) ?? { name: d.clients.name, clientType: d.clients.client_type, sold: 0, totalSales: 0, gp: 0 }
    map.set(d.client_id, { ...e, sold: e.sold + 1, totalSales: e.totalSales + (d.sale_price ?? 0), gp: e.gp + computeGP(d) })
  }
  return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, limit)
}

export function clubTwbDeals(deals: DealRow[]) {
  const map = new Map<string, { name: string; clientType: string | null; sold: number; totalSales: number }>()
  for (const d of deals) {
    if (!d.client_id || !d.clients?.club_twb) continue
    const e = map.get(d.client_id) ?? { name: d.clients.name, clientType: d.clients.client_type, sold: 0, totalSales: 0 }
    map.set(d.client_id, { ...e, sold: e.sold + 1, totalSales: e.totalSales + (d.sale_price ?? 0) })
  }
  return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales)
}

export function newVsExisting(deals: DealRow[]) {
  const newDeals  = deals.filter(d => d.new_client)
  const existDeals = deals.filter(d => !d.new_client)
  return [
    { type: 'New',      sold: newDeals.length,   totalSales: newDeals.reduce((s, d) => s + (d.sale_price ?? 0), 0),   gp: newDeals.reduce((s, d) => s + computeGP(d), 0) },
    { type: 'Existing', sold: existDeals.length, totalSales: existDeals.reduce((s, d) => s + (d.sale_price ?? 0), 0), gp: existDeals.reduce((s, d) => s + computeGP(d), 0) },
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
