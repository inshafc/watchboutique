export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import WatchStatusButtons from '@/components/watches/WatchStatusButtons'
import WatchDetailActions from '@/components/watches/WatchDetailActions'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { WatchWithInvestors } from '@/types'

function formatLKR(n: number | null) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function extractYear(d: string | null) {
  if (!d) return '—'
  return new Date(d).getFullYear().toString()
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  )
}

export default async function WatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [watchRes, dealsRes] = await Promise.all([
    supabase.from('watches').select('*, watch_investors(*)').eq('id', params.id).single(),
    supabase.from('deals').select('id, deal_type, stage, sale_price, offered_price, closed_at, other_costs, other_costs_amount, commission_payable, commission_amount, clients(name, avatar_color)').eq('watch_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!watchRes.data) notFound()

  const watch = watchRes.data as WatchWithInvestors
  type WatchDeal = {
    id: string
    deal_type: string
    stage: string
    sale_price: number | null
    offered_price: number | null
    closed_at: string | null
    other_costs: boolean
    other_costs_amount: number | null
    commission_payable: boolean
    commission_amount: number | null
    clients: { name: string; avatar_color: string | null } | null
  }
  const deals = (dealsRes.data ?? []) as unknown as WatchDeal[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Back */}
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Inventory
      </Link>

      {/* Action buttons */}
      <WatchDetailActions watchId={watch.id} isDraft={watch.is_draft ?? false} watchStatus={watch.watch_status} />

      {/* Photos */}
      {watch.photos && watch.photos.length > 0 ? (
        <div className="mb-6 space-y-3">
          <div className="relative w-full h-64 md:h-80 rounded-2xl border border-gray-100 overflow-hidden">
            <Image
              src={watch.photos[0]}
              alt={watch.watch_name}
              fill
              className="object-cover"
            />
          </div>
          {watch.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {watch.photos.slice(1).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl border border-gray-100 shrink-0 overflow-hidden">
                  <Image
                    src={url}
                    alt={`Photo ${i + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          {watch.watch_id && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-1">{watch.watch_id}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{watch.watch_name}</h1>
            {watch.is_draft && (
              <span className="text-[10px] font-bold bg-amber-500 text-white rounded px-1.5 py-0.5 leading-none">DRAFT</span>
            )}
          </div>
          {watch.reference && (
            <p className="text-sm text-gray-400 mt-0.5">Ref: {watch.reference}</p>
          )}
          {watch.labels && watch.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {watch.labels.includes('new_arrival') &&
                (Date.now() - new Date(watch.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000 && (
                  <span className="text-xs font-bold bg-emerald-500 text-white rounded-full px-2 py-0.5">NEW</span>
              )}
              {watch.labels.includes('hot_sell')  && <span className="text-sm">🔥</span>}
              {watch.labels.includes('expensive') && <span className="text-sm">💰</span>}
            </div>
          )}
        </div>
        <StatusBadge status={watch.status} />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Year',      value: extractYear(watch.date_on_card) },
          { label: 'Serial',    value: watch.serial_number },
          { label: 'Condition', value: watch.condition },
          { label: 'Set',       value: watch.set_details },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Watch Status inline buttons */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Watch Status</p>
        <WatchStatusButtons watchId={watch.id} initialStatus={watch.watch_status} />
      </div>

      {/* Record Sale */}
      {watch.watch_status !== 'Sold' && watch.watch_status !== 'sourced' && (
        <Link
          href={`/dashboard/deals/new?watch_id=${watch.id}`}
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-black transition-colors mb-4"
        >
          Record Sale →
        </Link>
      )}

      {/* Details */}
      <div className="space-y-4">
        {/* Purchase */}
        <div className="border border-gray-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Purchase</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Purchased From" value={watch.purchased_from} />
            <Field label="Purchase Cost"  value={formatLKR(watch.purchase_cost)} />
            <Field label="Serial Number"  value={watch.serial_number} />
          </div>
        </div>

        {/* Sale */}
        <div className="border border-gray-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sale</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Status"        value={<StatusBadge status={watch.status} />} />
            <Field label="Selling Price" value={formatLKR(watch.selling_price)} />
          </div>
        </div>

        {/* Investors */}
        {watch.watch_investors && watch.watch_investors.length > 0 && (
          <div className="border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Investors</p>
            <div className="space-y-2">
              {watch.watch_investors.map(inv => (
                <div key={inv.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">{inv.investor_name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full" style={{ width: `${inv.percentage}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 tabular-nums w-10 text-right">{inv.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investor Returns — only when watch has a Delivered deal */}
        {(() => {
          const deliveredDeal = deals.find(d => d.stage === 'Delivered' && d.sale_price != null)
          if (!deliveredDeal || !watch.watch_investors || watch.watch_investors.length === 0) return null
          const salePrice   = deliveredDeal.sale_price!
          const cost        = watch.purchase_cost ?? 0
          const otherCosts  = deliveredDeal.other_costs ? (deliveredDeal.other_costs_amount ?? 0) : 0
          const commission  = deliveredDeal.commission_payable ? (deliveredDeal.commission_amount ?? 0) : 0
          const netProfit   = salePrice - cost - otherCosts - commission
          return (
            <div className="border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Investor Returns</p>
              <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                <div className="flex justify-between"><span>Sale price</span><span className="tabular-nums">{formatLKR(salePrice)}</span></div>
                {cost > 0 && <div className="flex justify-between"><span>− Watch cost</span><span className="tabular-nums">{formatLKR(cost)}</span></div>}
                {otherCosts > 0 && <div className="flex justify-between"><span>− Other costs</span><span className="tabular-nums">{formatLKR(otherCosts)}</span></div>}
                {commission > 0 && <div className="flex justify-between"><span>− Commission</span><span className="tabular-nums">{formatLKR(commission)}</span></div>}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left pb-2">Investor</th>
                    <th className="text-right pb-2">%</th>
                    <th className="text-right pb-2">Profit Share</th>
                  </tr>
                </thead>
                <tbody>
                  {watch.watch_investors.map(inv => {
                    const share = netProfit * (inv.percentage / 100)
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium text-gray-700">{inv.investor_name}</td>
                        <td className="py-2 text-right text-gray-500 tabular-nums">{inv.percentage}%</td>
                        <td className={`py-2 text-right font-semibold tabular-nums ${share >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {share >= 0 ? '' : '−'}{formatLKR(Math.abs(share))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="pt-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Profit</td>
                    <td className="pt-2.5 text-right text-xs text-gray-400">100%</td>
                    <td className={`pt-2.5 text-right font-bold tabular-nums ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {netProfit >= 0 ? '+' : ''}{formatLKR(netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })()}

        {/* Notes */}
        {watch.comments && (
          <div className="border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-600 leading-relaxed">{watch.comments}</p>
          </div>
        )}

        {/* Deals */}
        {deals.length > 0 && (
          <div className="border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Deals</p>
            <div className="space-y-2">
              {deals.map(deal => {
                const stageColors: Record<string, string> = {
                  Inquiry:     'bg-gray-100 text-gray-600',
                  Offer:       'bg-sky-50 text-sky-700',
                  Negotiation: 'bg-amber-50 text-amber-700',
                  Closed:      'bg-emerald-50 text-emerald-700',
                  Lost:        'bg-red-50 text-red-600',
                }
                return (
                  <Link
                    key={deal.id}
                    href={`/dashboard/deals/${deal.id}`}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {deal.clients && (
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                          {getInitials(deal.clients.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {deal.clients?.name ?? 'Unknown Client'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stageColors[deal.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {deal.stage}
                          </span>
                          <span className="text-xs text-gray-400">{deal.deal_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {(deal.sale_price ?? deal.offered_price) != null && (
                        <p className="text-sm font-medium text-gray-900 tabular-nums">
                          {formatLKR(deal.sale_price ?? deal.offered_price)}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-6 pt-6 border-t border-gray-100">
        Added {new Date(watch.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
      </p>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <WatchDetailActions watchId={watch.id} isDraft={watch.is_draft ?? false} watchStatus={watch.watch_status} />
      </div>
    </div>
  )
}
