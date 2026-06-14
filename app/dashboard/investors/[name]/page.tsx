export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function formatLKR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return 'LKR 0'
  return 'LKR ' + Math.round(n).toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

export default async function InvestorDetailPage({ params }: { params: { name: string } }) {
  const supabase = createClient()
  const investorName = decodeURIComponent(params.name)

  // Fetch all holdings for this investor
  const { data: holdingsRaw } = await supabase
    .from('watch_investors')
    .select('percentage, watches(id, watch_name, reference, purchase_cost, status, selling_price, created_at)')
    .eq('investor_name', investorName)

  if (!holdingsRaw || holdingsRaw.length === 0) notFound()

  type WatchData = {
    id: string; watch_name: string; reference: string | null
    purchase_cost: number | null; status: string
    selling_price: number | null; created_at: string
  }
  type Holding = { percentage: number; watches: WatchData | null }

  const holdings = holdingsRaw as unknown as Holding[]
  const watchIds = holdings.map(h => h.watches?.id).filter(Boolean) as string[]

  // Fetch delivered deals for these watches
  const { data: dealsRaw } = await supabase
    .from('deals')
    .select('id, watch_id, sale_price, sale_date, other_costs, other_costs_amount, commission_payable, commission_amount, stage, closed_at')
    .in('watch_id', watchIds)
    .eq('stage', 'Delivered')
    .is('deleted_at', null)

  type Deal = {
    id: string; watch_id: string | null; sale_price: number | null; sale_date: string | null
    other_costs: boolean; other_costs_amount: number | null
    commission_payable: boolean; commission_amount: number | null
    stage: string; closed_at: string | null
  }

  const deals = (dealsRaw ?? []) as Deal[]
  const dealByWatch = new Map<string, Deal>()
  for (const d of deals) {
    if (d.watch_id) dealByWatch.set(d.watch_id, d)
  }

  // Compute per-watch stats
  type WatchRow = {
    watch: WatchData
    percentage: number
    isSold: boolean
    capitalInvested: number
    deal: Deal | null
    netProfit: number | null
    share: number | null
    saleDate: string | null
  }

  const watchRows: WatchRow[] = holdings
    .filter(h => h.watches)
    .map(h => {
      const watch = h.watches!
      const isSold = watch.status === 'Sold'
      const cost = watch.purchase_cost ?? 0
      const capitalInvested = cost * (h.percentage / 100)
      const deal = dealByWatch.get(watch.id) ?? null
      let netProfit: number | null = null
      let share: number | null = null
      if (deal && deal.sale_price != null) {
        const otherCosts = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
        const commission = deal.commission_payable ? (deal.commission_amount ?? 0) : 0
        netProfit = deal.sale_price - cost - otherCosts - commission
        share = netProfit * (h.percentage / 100)
      }
      return { watch, percentage: h.percentage, isSold, capitalInvested, deal, netProfit, share, saleDate: deal?.sale_date ?? deal?.closed_at ?? null }
    })

  const activeWatches = watchRows.filter(r => !r.isSold)
  const soldWatches   = watchRows.filter(r => r.isSold).sort((a, b) =>
    (b.saleDate ?? '').localeCompare(a.saleDate ?? '')
  )

  // Aggregate stats
  const totalInvested  = watchRows.reduce((s, r) => s + r.capitalInvested, 0)
  const totalReturned  = soldWatches.reduce((s, r) => s + (r.share ?? 0), 0)
  const netProfit      = totalReturned
  const roi            = totalInvested > 0 ? (totalReturned / totalInvested) * 100 : 0

  // Active since
  const firstCreated = watchRows.map(r => r.watch.created_at).sort()[0] ?? null

  // Monthly profit for last 12 months (sold watches only)
  const now = new Date()
  const months: { label: string; profit: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' })
    const profit = soldWatches
      .filter(r => {
        const sd = r.saleDate ? r.saleDate.slice(0, 7) : null
        return sd === monthKey
      })
      .reduce((s, r) => s + (r.share ?? 0), 0)
    months.push({ label, profit })
  }

  const maxProfit = Math.max(...months.map(m => Math.abs(m.profit)), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Back */}
      <Link
        href="/dashboard/investors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Investors
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{investorName}</h1>
        {firstCreated && (
          <p className="text-sm text-gray-400 mt-0.5">Active since {formatDate(firstCreated)}</p>
        )}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Capital Invested" value={formatLKR(totalInvested)} />
        <StatCard label="Net Profit (Sold)" value={formatLKR(netProfit)} color={netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
        <StatCard label="Active Watches" value={activeWatches.length.toString()} />
        <StatCard label="ROI % (Closed)" value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`} color={roi >= 0 ? 'text-emerald-600' : 'text-red-500'} />
      </div>

      {/* Active Watches */}
      {activeWatches.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Active Watches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">Watch</th>
                  <th className="text-right px-5 py-3">Added</th>
                  <th className="text-right px-5 py-3">%</th>
                  <th className="text-right px-5 py-3">Capital Tied</th>
                  <th className="text-right px-5 py-3">Asking Price</th>
                  <th className="text-right px-5 py-3">Projected Share</th>
                </tr>
              </thead>
              <tbody>
                {activeWatches.map(r => {
                  const projectedProfit = r.watch.selling_price != null && r.watch.purchase_cost != null
                    ? (r.watch.selling_price - r.watch.purchase_cost) * (r.percentage / 100)
                    : null
                  return (
                    <tr key={r.watch.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3.5">
                        <Link href={`/dashboard/watches/${r.watch.id}`} className="font-medium text-gray-900 hover:text-gray-600 hover:underline">
                          {r.watch.watch_name}
                        </Link>
                        {r.watch.reference && <p className="text-xs text-gray-400">Ref: {r.watch.reference}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">{formatDate(r.watch.created_at)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">{r.percentage}%</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{formatLKR(r.capitalInvested)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">{r.watch.selling_price != null ? formatLKR(r.watch.selling_price) : '—'}</td>
                      <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${projectedProfit == null ? 'text-gray-300' : projectedProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {projectedProfit != null ? formatLKR(projectedProfit) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sold Watches */}
      {soldWatches.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Sold Watches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">Watch</th>
                  <th className="text-right px-5 py-3">Sale Date</th>
                  <th className="text-right px-5 py-3">%</th>
                  <th className="text-right px-5 py-3">Capital</th>
                  <th className="text-right px-5 py-3">Sale Price</th>
                  <th className="text-right px-5 py-3">Net Profit</th>
                  <th className="text-right px-5 py-3">Their Share</th>
                </tr>
              </thead>
              <tbody>
                {soldWatches.map(r => (
                  <tr key={r.watch.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/watches/${r.watch.id}`} className="font-medium text-gray-900 hover:text-gray-600 hover:underline">
                        {r.watch.watch_name}
                      </Link>
                      {r.watch.reference && <p className="text-xs text-gray-400">Ref: {r.watch.reference}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">{formatDate(r.saleDate)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">{r.percentage}%</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{formatLKR(r.capitalInvested)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">{r.deal?.sale_price != null ? formatLKR(r.deal.sale_price) : '—'}</td>
                    <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${r.netProfit == null ? 'text-gray-300' : r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.netProfit != null ? (r.netProfit >= 0 ? '+' : '') + formatLKR(r.netProfit) : '—'}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${r.share == null ? 'text-gray-300' : r.share >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.share != null ? (r.share >= 0 ? '+' : '') + formatLKR(r.share) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Profit Chart */}
      {soldWatches.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-gray-800 mb-4">Monthly Profit Share (Last 12 Months)</p>
          <div className="flex items-end gap-1.5 h-32">
            {months.map((m, i) => {
              const pct = (Math.abs(m.profit) / maxProfit) * 100
              const isLoss = m.profit < 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
                    {m.profit === 0 ? 'No sales' : (m.profit >= 0 ? '+' : '') + formatLKR(m.profit)}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${m.profit === 0 ? 'bg-gray-100' : isLoss ? 'bg-red-200' : 'bg-emerald-200'}`}
                      style={{ height: pct < 2 && m.profit !== 0 ? '2%' : `${pct}%`, minHeight: m.profit !== 0 ? '4px' : '2px' }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center">{m.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
