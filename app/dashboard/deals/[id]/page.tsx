export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { avatarColor, getInitials } from '@/lib/client-utils'
import StageSelector from '@/components/deals/StageSelector'
import InstallmentTracker from '@/components/deals/InstallmentTracker'
import DealDetailActions from '@/components/deals/DealDetailActions'
import GenerateInvoiceButton from '@/components/invoices/GenerateInvoiceButton'
import type { DealWithRelations, Installment, DealStage, TradeIn, DealExpense } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

const TYPE_COLORS: Record<string, string> = {
  Sale:     'bg-sky-50 text-sky-600 ring-sky-200',
  Purchase: 'bg-violet-50 text-violet-600 ring-violet-200',
  Trade:    'bg-amber-50 text-amber-600 ring-amber-200',
}

function FinancialRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${sub ? 'pl-3' : ''}`}>
      <span className={`text-sm ${sub ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <span className="text-sm font-medium text-gray-900 tabular-nums">{value}</span>
    </div>
  )
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [dealRes, installRes, tradeInsRes, expensesRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, serial_number, status, photos, purchase_cost, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb, phone, address)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('installments')
      .select('*')
      .eq('deal_id', params.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('trade_ins')
      .select('*')
      .eq('deal_id', params.id)
      .order('created_at'),
    supabase
      .from('deal_expenses')
      .select('*')
      .eq('deal_id', params.id)
      .order('created_at'),
  ])

  if (!dealRes.data) notFound()
  const deal         = dealRes.data as DealWithRelations

  // Fetch investors only if stage is Delivered and there is a linked watch
  type WatchInvestorRow = { id: string; investor_name: string; percentage: number }
  let investors: WatchInvestorRow[] = []
  if (deal.stage === 'Delivered' && deal.watch_id) {
    const { data: invData } = await supabase
      .from('watch_investors')
      .select('id, investor_name, percentage')
      .eq('watch_id', deal.watch_id)
      .order('percentage', { ascending: false })
    investors = (invData ?? []) as WatchInvestorRow[]
  }

  const installments = (installRes.data   ?? []) as Installment[]
  const tradeIns     = (tradeInsRes.data  ?? []) as TradeIn[]
  const expenses     = (expensesRes.data  ?? []) as DealExpense[]

  const watchCost     = deal.watches?.purchase_cost ?? 0
  const otherCostsAmt = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
  const commissionAmt = deal.commission_payable ? (deal.commission_amount ?? 0) : 0

  const grossProfit = deal.sale_price != null
    ? deal.sale_price - watchCost - otherCostsAmt - commissionAmt
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Back */}
      <Link
        href="/dashboard/deals"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Sales
      </Link>

      {/* Header */}
      <div className="mb-6">
        {/* Action row: Invoice left, icon actions right */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <GenerateInvoiceButton dealId={deal.id} />
          <DealDetailActions deal={deal} />
        </div>
        {/* Watch name + meta */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_COLORS[deal.deal_type] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
              {deal.deal_type}
            </span>
            {deal.new_client && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200">
                New Client
              </span>
            )}
            {deal.sale_date && (
              <span className="text-xs text-gray-400">{formatDate(deal.sale_date)}</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
            {deal.watches?.watch_name ?? 'Unnamed Watch'}
          </h1>
          {deal.watches?.reference && (
            <p className="text-sm text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>
          )}
        </div>
      </div>

      {/* Client + Watch cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {deal.clients && (
          <Link
            href={`/dashboard/clients/${deal.client_id}`}
            className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
          >
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Client</p>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                {getInitials(deal.clients.name)}
              </div>
              <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 truncate">{deal.clients.name}</span>
            </div>
          </Link>
        )}
        {deal.watches && (
          <Link
            href={`/dashboard/watches/${deal.watch_id}`}
            className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
          >
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Watch</p>
            <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700 truncate">{deal.watches.watch_name}</p>
            {deal.watches.status && <p className="text-xs text-gray-400 mt-0.5">{deal.watches.status}</p>}
          </Link>
        )}
      </div>

      {/* Stage selector */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <StageSelector dealId={deal.id} initialStage={deal.stage as DealStage} watchId={deal.watch_id} />
        {deal.closed_at && (
          <p className="text-xs text-gray-400 mt-3">
            Closed {formatDate(deal.closed_at)}
          </p>
        )}
      </div>

      {/* Financials */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Financials</p>
        {deal.offered_price != null && <FinancialRow label="Offered Price" value={formatLKR(deal.offered_price)} />}
        <FinancialRow label="Sale Price" value={formatLKR(deal.sale_price)} />
        {watchCost > 0 && <FinancialRow label="Watch Cost" value={`− ${formatLKR(watchCost)}`} sub />}
        {deal.other_costs && expenses.length > 0 && expenses.map(exp => (
          <FinancialRow
            key={exp.id}
            label={exp.category === 'Other' && exp.custom_label ? `${exp.category} — ${exp.custom_label}` : exp.category}
            value={`− ${formatLKR(exp.amount)}`}
            sub
          />
        ))}
        {deal.other_costs && expenses.length === 0 && deal.other_costs_amount != null && (
          <FinancialRow label="Other Costs" value={`− ${formatLKR(deal.other_costs_amount)}`} sub />
        )}
        {deal.other_costs && expenses.length > 1 && otherCostsAmt > 0 && (
          <FinancialRow label="Total Other Costs" value={`− ${formatLKR(otherCostsAmt)}`} />
        )}
        {deal.commission_payable && deal.commission_amount != null && (
          <FinancialRow label="Commission" value={`− ${formatLKR(deal.commission_amount)}`} sub />
        )}
        {grossProfit != null && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Gross Profit</span>
            <span className={`text-base font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {grossProfit >= 0 ? '+' : ''}{formatLKR(grossProfit)}
            </span>
          </div>
        )}
      </div>

      {/* Investor Returns — only when Delivered and investors exist */}
      {investors.length > 0 && grossProfit != null && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Investor Returns</p>
          {investors.map(inv => {
            const share = Math.round(grossProfit * (inv.percentage / 100))
            return (
              <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{inv.investor_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 tabular-nums">{inv.percentage}%</span>
                  <span className={`text-sm font-medium tabular-nums ${share >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {share >= 0 ? '+' : '−'}{formatLKR(Math.abs(share))}
                  </span>
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Total Distributed</span>
            <span className={`text-base font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {grossProfit >= 0 ? '+' : '−'}{formatLKR(Math.abs(Math.round(grossProfit)))}
            </span>
          </div>
          {Math.abs(investors.reduce((s, i) => s + i.percentage, 0) - 100) > 0.01 && (
            <p className="text-xs text-amber-600 mt-2">⚠ Investor percentages do not total 100%</p>
          )}
        </div>
      )}

      {/* Deal details */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
        <div className="space-y-3">
          {deal.payment_method && (
            <div><p className="text-xs text-gray-400 mb-0.5">Payment Method</p><p className="text-sm text-gray-900">{deal.payment_method}</p></div>
          )}
          {deal.sales_manager && (
            <div><p className="text-xs text-gray-400 mb-0.5">Sales Manager</p><p className="text-sm text-gray-900">{deal.sales_manager}</p></div>
          )}
          {deal.sale_date && (
            <div><p className="text-xs text-gray-400 mb-0.5">Sale Date</p><p className="text-sm text-gray-900">{formatDate(deal.sale_date)}</p></div>
          )}
          {deal.notes && (
            <div><p className="text-xs text-gray-400 mb-0.5">Notes</p><p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{deal.notes}</p></div>
          )}
        </div>
      </div>

      {/* Trade-ins */}
      {tradeIns.length > 0 && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trade-In Watches</p>
          <div className="space-y-3">
            {tradeIns.map(ti => (
              <div key={ti.id} className="border border-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[ti.brand, ti.reference].filter(Boolean).join(' · ') || 'Unnamed'}
                    </p>
                    <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                      {ti.serial_number && <p>SN: {ti.serial_number}</p>}
                      <p>{[ti.year, ti.condition, ti.set_details].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ti.value != null && (
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatLKR(ti.value)}</p>
                    )}
                    {ti.add_to_inventory && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {ti.watch_id ? (
                          <Link href={`/dashboard/watches/${ti.watch_id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                            → Inventory
                          </Link>
                        ) : 'Added to inventory'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installment tracker */}
      {deal.payment_method === 'Installment' && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-8">
          <InstallmentTracker dealId={deal.id} initialInstallments={installments} />
        </div>
      )}
    </div>
  )
}
