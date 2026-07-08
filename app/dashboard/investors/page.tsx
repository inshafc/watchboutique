export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function formatLKR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return 'LKR 0'
  return 'LKR ' + Math.round(n).toLocaleString('en-LK')
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function InvestorsPage() {
  const supabase = createClient()

  const [investorNamesRes, investorRowsRes, dealsRes] = await Promise.all([
    supabase.from('investor_names').select('key, display_name').order('created_at', { ascending: true }),
    supabase
      .from('watch_investors')
      .select('investor_name, percentage, watches(id, purchase_cost, status)'),
    supabase
      .from('deals')
      .select('id, watch_id, sale_price, other_costs, other_costs_amount, commission_payable, commission_amount')
      .eq('stage', 'Delivered')
      .is('deleted_at', null),
  ])

  type InvestorName = { key: string; display_name: string }
  type WatchData = { id: string; purchase_cost: number | null; status: string }
  type InvestorRow = { investor_name: string; percentage: number; watches: WatchData | null }
  type Deal = {
    id: string; watch_id: string | null; sale_price: number | null
    other_costs: boolean; other_costs_amount: number | null
    commission_payable: boolean; commission_amount: number | null
  }

  const investorNames = (investorNamesRes.data ?? []) as InvestorName[]
  const rows = (investorRowsRes.data ?? []) as unknown as InvestorRow[]
  const deals = (dealsRes.data ?? []) as Deal[]

  const dealByWatch = new Map<string, Deal>()
  for (const d of deals) {
    if (d.watch_id) dealByWatch.set(d.watch_id, d)
  }

  function grossProfitFor(watch: WatchData): number | null {
    const deal = dealByWatch.get(watch.id)
    if (!deal || deal.sale_price == null) return null
    const cost = watch.purchase_cost ?? 0
    const otherCosts = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
    const commission = deal.commission_payable ? (deal.commission_amount ?? 0) : 0
    return deal.sale_price - cost - otherCosts - commission
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
  type InvestorStat = {
    key: string
    displayName: string
    activeWatches: number
    capitalTiedUp: number
    watchesSold: number
    netProfit: number
    totalInvested: number
  }

  const investorStats: InvestorStat[] = investorNames.map(inv => {
    const holdings = byKey.get(inv.key) ?? []
    let activeWatches = 0
    let capitalTiedUp = 0
    let watchesSold = 0
    let netProfit = 0
    let totalInvested = 0

    for (const { percentage, watch } of holdings) {
      const isSold = watch.status === 'Sold'
      const cost = watch.purchase_cost ?? 0
      const investedAmt = cost * (percentage / 100)
      totalInvested += investedAmt

      if (!isSold) {
        activeWatches++
        capitalTiedUp += investedAmt
      } else {
        watchesSold++
        const gp = grossProfitFor(watch)
        if (gp != null) netProfit += gp * (percentage / 100)
      }
    }

    return { key: inv.key, displayName: inv.display_name, activeWatches, capitalTiedUp, watchesSold, netProfit, totalInvested }
  })

  investorStats.sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Investors</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Capital Deployed" value={formatLKR(totalCapitalDeployed)} sub="tied in unsold watches" />
        <StatCard label="Profit Returned" value={formatLKR(totalProfitReturned)} sub="across all sold watches" />
        <StatCard label="Active Watches" value={activeWatchIds.size.toString()} sub="with investor backing" />
        <StatCard label="Total Investors" value={investorNames.length.toString()} />
      </div>

      {/* Investor table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">All Investors</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3">Investor</th>
                <th className="text-right px-5 py-3">Active Watches</th>
                <th className="text-right px-5 py-3">Capital Tied Up</th>
                <th className="text-right px-5 py-3">Sold</th>
                <th className="text-right px-5 py-3">Net Profit</th>
                <th className="text-right px-5 py-3">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {investorStats.map(inv => {
                const roi = inv.totalInvested > 0 ? (inv.netProfit / inv.totalInvested) * 100 : 0
                return (
                  <Link key={inv.key} href={`/dashboard/investors/${encodeURIComponent(inv.key)}`} legacyBehavior>
                    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.displayName}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.activeWatches}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{formatLKR(inv.capitalTiedUp)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.watchesSold}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${inv.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {inv.netProfit >= 0 ? '+' : ''}{formatLKR(inv.netProfit)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                      </td>
                    </tr>
                  </Link>
                )
              })}
              {investorStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No investors found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
