import type { createClient } from '@/lib/supabase/server'
import { dealSalePriceLKR } from '@/lib/deal-currency'

type ServerSupabase = ReturnType<typeof createClient>

export type InvestorStat = {
  key:            string
  displayName:    string
  amountInvested: number
  activeWatches:  number
  capitalTiedUp:  number
  watchesSold:    number
  netProfit:      number
  roi:            number | null // null => amountInvested is 0, render "—"
}

export type InvestorStatsResult = {
  investorStats:        InvestorStat[]
  totalCapitalDeployed: number
  totalProfitReturned:  number
  activeWatchCount:     number
  totalInvestorsCount:  number
  totalAmountInvested:  number
}

// TWB / The Watch Boutique is the business itself, not an investor — never list it as one.
const TWB_KEYS = new Set(['twb', 'the-watch-boutique', 'the_watch_boutique'])
function isTwbInvestor(key: string, displayName?: string | null): boolean {
  if (TWB_KEYS.has(key.trim().toLowerCase())) return true
  if (displayName && displayName.toLowerCase().includes('watch boutique')) return true
  return false
}

export async function getInvestorStats(supabase: ServerSupabase): Promise<InvestorStatsResult> {
  const [investorNamesRes, investorRowsRes, dealsRes] = await Promise.all([
    supabase.from('investor_names').select('key, display_name, amount_invested').order('created_at', { ascending: true }),
    supabase.from('watch_investors').select('investor_name, percentage, watches(id, purchase_cost, status, sold_price)'),
    supabase
      .from('deals')
      .select('id, watch_id, sale_price, currency, exchange_rate, other_costs, other_costs_amount, commission_payable, commission_amount')
      .eq('stage', 'Delivered')
      .is('deleted_at', null),
  ])

  type InvestorName = { key: string; display_name: string; amount_invested: number | null }
  type WatchData = { id: string; purchase_cost: number | null; status: string; sold_price: number | null }
  type InvestorRow = { investor_name: string; percentage: number; watches: WatchData | null }
  type Deal = {
    id: string; watch_id: string | null; sale_price: number | null
    currency: string | null; exchange_rate: number | null
    other_costs: boolean; other_costs_amount: number | null
    commission_payable: boolean; commission_amount: number | null
  }

  const investorNames = ((investorNamesRes.data ?? []) as InvestorName[])
    .filter(inv => !isTwbInvestor(inv.key, inv.display_name))
  const rows = ((investorRowsRes.data ?? []) as unknown as InvestorRow[])
    .filter(row => !isTwbInvestor(row.investor_name))
  const deals = (dealsRes.data ?? []) as Deal[]

  const dealByWatch = new Map<string, Deal>()
  for (const d of deals) {
    if (d.watch_id) dealByWatch.set(d.watch_id, d)
  }

  function grossProfitFor(watch: WatchData): number | null {
    const deal = dealByWatch.get(watch.id)
    if (!deal) return null
    // sold_price (captured on the watch at the point of sale) is the source of truth;
    // fall back to the deal's own sale_price, converted to LKR, for sales recorded
    // before that column existed.
    const salePrice = watch.sold_price ?? dealSalePriceLKR(deal)
    if (salePrice == null) return null
    const cost = watch.purchase_cost ?? 0
    const otherCosts = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
    const commission = deal.commission_payable ? (deal.commission_amount ?? 0) : 0
    return salePrice - cost - otherCosts - commission
  }

  // Group raw holdings by investor key
  const byKey = new Map<string, { percentage: number; watch: WatchData }[]>()
  for (const row of rows) {
    if (!row.watches) continue
    const list = byKey.get(row.investor_name) ?? []
    list.push({ percentage: row.percentage, watch: row.watches })
    byKey.set(row.investor_name, list)
  }

  // Top-level stats — across ALL watches with investor splits
  let totalCapitalDeployed = 0
  let totalProfitReturned = 0
  const activeWatchIds = new Set<string>()

  for (const row of rows) {
    if (!row.watches) continue
    const cost = row.watches.purchase_cost ?? 0
    const isSold = row.watches.status === 'Sold'
    if (!isSold) {
      totalCapitalDeployed += cost * (row.percentage / 100)
      activeWatchIds.add(row.watches.id)
    } else {
      const gp = grossProfitFor(row.watches)
      if (gp != null) totalProfitReturned += gp * (row.percentage / 100)
    }
  }

  // Per-investor stats — driven by investor_names, so unfunded investors still show
  const investorStats: InvestorStat[] = investorNames.map(inv => {
    const holdings = byKey.get(inv.key) ?? []
    let activeWatches = 0
    let capitalTiedUp = 0
    let watchesSold = 0
    let netProfit = 0

    for (const { percentage, watch } of holdings) {
      const isSold = watch.status === 'Sold'
      const cost = watch.purchase_cost ?? 0

      if (!isSold) {
        activeWatches++
        capitalTiedUp += cost * (percentage / 100)
      } else {
        watchesSold++
        const gp = grossProfitFor(watch)
        if (gp != null) netProfit += gp * (percentage / 100)
      }
    }

    const amountInvested = inv.amount_invested ?? 0
    const roi = amountInvested > 0 ? (netProfit / amountInvested) * 100 : null

    return { key: inv.key, displayName: inv.display_name, amountInvested, activeWatches, capitalTiedUp, watchesSold, netProfit, roi }
  })

  investorStats.sort((a, b) => a.displayName.localeCompare(b.displayName))

  const totalAmountInvested = investorNames.reduce((s, i) => s + (i.amount_invested ?? 0), 0)

  return {
    investorStats,
    totalCapitalDeployed,
    totalProfitReturned,
    activeWatchCount: activeWatchIds.size,
    totalInvestorsCount: investorNames.length,
    totalAmountInvested,
  }
}
