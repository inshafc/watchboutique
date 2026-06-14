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

  // Fetch all watch_investors with their watch data
  const { data: investorRows } = await supabase
    .from('watch_investors')
    .select('investor_name, percentage, watches(id, watch_name, reference, purchase_cost, status, selling_price, created_at)')

  // Fetch all delivered deals with financials
  const { data: deals } = await supabase
    .from('deals')
    .select('id, watch_id, stage, sale_price, other_costs, other_costs_amount, commission_payable, commission_amount')
    .eq('stage', 'Delivered')
    .is('deleted_at', null)

  type InvRow = typeof investorRows extends (infer T)[] | null ? T : never
  type WatchData = { id: string; watch_name: string; reference: string | null; purchase_cost: number | null; status: string; selling_price: number | null; created_at: string }
  type Deal = { id: string; watch_id: string | null; stage: string; sale_price: number | null; other_costs: boolean; other_costs_amount: number | null; commission_payable: boolean; commission_amount: number | null }

  const rows = (investorRows ?? []) as (InvRow & { watches: WatchData | null })[]
  const dealsList = (deals ?? []) as Deal[]

  // Build a map of watch_id → delivered deal
  const dealByWatch = new Map<string, Deal>()
  for (const d of dealsList) {
    if (d.watch_id) dealByWatch.set(d.watch_id, d)
  }

  // Group by investor
  const byInvestor = new Map<string, { percentage: number; watch: WatchData }[]>()
  for (const row of rows) {
    if (!row.watches) continue
    const list = byInvestor.get(row.investor_name) ?? []
    list.push({ percentage: row.percentage, watch: row.watches })
    byInvestor.set(row.investor_name, list)
  }

  // Compute stats per investor
  type InvestorStat = {
    name: string
    activeWatches: number
    capitalTiedUp: number
    watchesSold: number
    totalProfit: number
    totalInvested: number
  }

  const investorStats: InvestorStat[] = []
  for (const [name, holdings] of Array.from(byInvestor)) {
    let activeWatches = 0
    let capitalTiedUp = 0
    let watchesSold = 0
    let totalProfit = 0
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
        const deal = dealByWatch.get(watch.id)
        if (deal && deal.sale_price != null) {
          const otherCosts = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
          const commission = deal.commission_payable ? (deal.commission_amount ?? 0) : 0
          const netProfit = deal.sale_price - cost - otherCosts - commission
          totalProfit += netProfit * (percentage / 100)
        }
      }
    }

    investorStats.push({ name, activeWatches, capitalTiedUp, watchesSold, totalProfit, totalInvested })
  }

  investorStats.sort((a, b) => a.name.localeCompare(b.name))

  // Top-level stats
  const totalActiveCapital = investorStats.reduce((s, i) => s + i.capitalTiedUp, 0)
  const totalReturned      = investorStats.reduce((s, i) => s + i.totalProfit, 0)
  const totalNetProfit     = totalReturned
  const totalActiveWatches = new Set(
    rows.filter(r => r.watches && r.watches.status !== 'Sold').map(r => r.watches!.id)
  ).size

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Investors</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active Capital" value={formatLKR(totalActiveCapital)} sub="tied in unsold watches" />
        <StatCard label="Total Net Profit" value={formatLKR(totalNetProfit)} sub="across all sold watches" />
        <StatCard label="Active Watches" value={totalActiveWatches.toString()} sub="with investor backing" />
        <StatCard label="Total Investors" value={investorStats.length.toString()} />
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
                const roi = inv.totalInvested > 0 ? (inv.totalProfit / inv.totalInvested) * 100 : 0
                return (
                  <Link key={inv.name} href={`/dashboard/investors/${encodeURIComponent(inv.name)}`} legacyBehavior>
                    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.name}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.activeWatches}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{formatLKR(inv.capitalTiedUp)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.watchesSold}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${inv.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {inv.totalProfit >= 0 ? '+' : ''}{formatLKR(inv.totalProfit)}
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
