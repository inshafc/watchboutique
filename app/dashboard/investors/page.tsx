export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getInvestorStats } from '@/lib/investor-stats'

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
  const {
    investorStats,
    totalCapitalDeployed,
    totalProfitReturned,
    activeWatchCount,
    totalInvestorsCount,
    totalAmountInvested,
  } = await getInvestorStats(supabase)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Investors</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Committed Capital" value={formatLKR(totalAmountInvested)} sub="entered in Settings" />
        <StatCard label="Capital Deployed" value={formatLKR(totalCapitalDeployed)} sub="tied in unsold watches" />
        <StatCard label="Profit Returned" value={formatLKR(totalProfitReturned)} sub="across all sold watches" />
        <StatCard label="Active Watches" value={activeWatchCount.toString()} sub="with investor backing" />
        <StatCard label="Total Investors" value={totalInvestorsCount.toString()} />
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
                <th className="text-right px-5 py-3">Committed Capital</th>
                <th className="text-right px-5 py-3">Active Watches</th>
                <th className="text-right px-5 py-3">Capital Tied Up</th>
                <th className="text-right px-5 py-3">Sold</th>
                <th className="text-right px-5 py-3">Net Profit</th>
                <th className="text-right px-5 py-3">ROI % (Closed)</th>
              </tr>
            </thead>
            <tbody>
              {investorStats.map(inv => (
                <Link key={inv.key} href={`/dashboard/investors/${encodeURIComponent(inv.key)}`} legacyBehavior>
                  <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.displayName}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{formatLKR(inv.amountInvested)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.activeWatches}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{formatLKR(inv.capitalTiedUp)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{inv.watchesSold}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${inv.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {inv.netProfit >= 0 ? '+' : ''}{formatLKR(inv.netProfit)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${inv.roi == null ? 'text-gray-300' : inv.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {inv.roi == null ? '—' : `${inv.roi >= 0 ? '+' : ''}${inv.roi.toFixed(1)}%`}
                    </td>
                  </tr>
                </Link>
              ))}
              {investorStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No investors found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
