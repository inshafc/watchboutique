export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { avatarColor, getInitials } from '@/lib/client-utils'
import StageSelector from '@/components/deals/StageSelector'
import InstallmentTracker from '@/components/deals/InstallmentTracker'
import type { DealWithRelations, Installment, DealStage } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

const TYPE_COLORS: Record<string, string> = {
  Sale:     'bg-sky-50 text-sky-600 ring-sky-200',
  Purchase: 'bg-violet-50 text-violet-600 ring-violet-200',
  Trade:    'bg-amber-50 text-amber-600 ring-amber-200',
}

function FinancialRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: 'positive' | 'negative' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${
        highlight === 'positive' ? 'text-emerald-600' :
        highlight === 'negative' ? 'text-red-500' :
        'text-gray-900'
      }`}>
        {value}
      </span>
    </div>
  )
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [dealRes, installRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos), clients(name, avatar_color)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('installments')
      .select('*')
      .eq('deal_id', params.id)
      .order('due_date', { ascending: true }),
  ])

  if (!dealRes.data) notFound()

  const deal         = dealRes.data as DealWithRelations
  const installments = (installRes.data ?? []) as Installment[]

  const grossProfit = deal.sale_price != null
    ? deal.sale_price - (deal.trade_value ?? 0) - (deal.adjustment ?? 0) - (deal.commission ?? 0)
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
        Deals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_COLORS[deal.deal_type] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
              {deal.deal_type}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
            {deal.watches?.watch_name ?? 'Unnamed Watch'}
          </h1>
          {deal.watches?.reference && (
            <p className="text-sm text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>
          )}
        </div>
        <Link
          href={`/dashboard/deals/${deal.id}/edit`}
          className="shrink-0 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Client + Watch links */}
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
            {deal.watches.status && (
              <p className="text-xs text-gray-400 mt-0.5">{deal.watches.status}</p>
            )}
          </Link>
        )}
      </div>

      {/* Stage selector */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <StageSelector dealId={deal.id} initialStage={deal.stage as DealStage} />
        {deal.closed_at && (
          <p className="text-xs text-gray-400 mt-3">
            Closed {new Date(deal.closed_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
          </p>
        )}
      </div>

      {/* Financials */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Financials</p>
        <FinancialRow label="Offered Price"  value={formatLKR(deal.offered_price)} />
        <FinancialRow label="Sale Price"     value={formatLKR(deal.sale_price)} />
        {deal.trade_value != null && <FinancialRow label="Trade Value"   value={`− ${formatLKR(deal.trade_value)}`} />}
        {deal.adjustment  != null && <FinancialRow label="Adjustment"    value={`− ${formatLKR(deal.adjustment)}`} />}
        {deal.commission  != null && <FinancialRow label="Commission"    value={`− ${formatLKR(deal.commission)}`} />}
        {grossProfit != null && (
          <div className={`flex items-center justify-between mt-3 pt-3 border-t border-gray-100`}>
            <span className="text-sm font-semibold text-gray-700">Gross Profit</span>
            <span className={`text-base font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {grossProfit >= 0 ? '+' : ''}{formatLKR(grossProfit)}
            </span>
          </div>
        )}
      </div>

      {/* Deal details */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
        <div className="space-y-3">
          {deal.payment_method && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Payment Method</p>
              <p className="text-sm text-gray-900">{deal.payment_method}</p>
            </div>
          )}
          {deal.sales_manager && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Sales Manager</p>
              <p className="text-sm text-gray-900">{deal.sales_manager}</p>
            </div>
          )}
          {deal.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Installment tracker */}
      {deal.payment_method === 'Installment' && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-8">
          <InstallmentTracker dealId={deal.id} initialInstallments={installments} />
        </div>
      )}
    </div>
  )
}
