export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PrintButton from '@/components/deals/PrintButton'
import type { DealWithRelations, TradeIn } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + Math.round(n).toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [dealRes, tradeInsRes, clientRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, serial_number, date_on_card, condition, set_details, purchase_cost), clients(name, phone, email, address)')
      .eq('id', params.id)
      .single(),
    supabase.from('trade_ins').select('*').eq('deal_id', params.id).order('created_at'),
    supabase.from('deals').select('client_id').eq('id', params.id).single(),
  ])

  if (!dealRes.data) notFound()

  const deal     = dealRes.data as DealWithRelations & { watches: any; clients: any }
  const tradeIns = (tradeInsRes.data ?? []) as TradeIn[]

  const watchCost      = deal.watches?.purchase_cost ?? 0
  const otherCostsAmt  = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
  const commissionAmt  = deal.commission_payable ? (deal.commission_amount ?? 0) : 0
  const tradeInTotal   = tradeIns.reduce((s, ti) => s + (ti.value ?? 0), 0)
  const netTotal       = (deal.sale_price ?? 0) - tradeInTotal

  const invoiceNo = 'INV-' + params.id.slice(0, 8).toUpperCase()
  const watchYear = deal.watches?.date_on_card
    ? new Date(deal.watches.date_on_card).getFullYear()
    : null

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">

      {/* Print controls — hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link
          href={`/dashboard/deals/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Sale
        </Link>
        <PrintButton />
      </div>

      {/* Invoice document */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 bg-white shadow-lg print:shadow-none px-12 py-10 print:px-8 print:py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-900">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">THE WATCH BOUTIQUE</h1>
            <p className="text-sm text-gray-400 mt-1">Premium Watch Trading</p>
          </div>
          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-[10px] text-gray-400 font-medium text-center leading-tight">
            LOGO
          </div>
        </div>

        {/* Invoice meta + bill to */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Invoice</p>
            <p className="text-xl font-bold text-gray-900 mb-3">{invoiceNo}</p>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex gap-2">
                <span className="text-gray-400 w-24 shrink-0">Invoice Date</span>
                <span>{formatDate(deal.sale_date ?? deal.created_at)}</span>
              </div>
              {deal.payment_method && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Payment</span>
                  <span>{deal.payment_method}</span>
                </div>
              )}
              {deal.sales_manager && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Sales</span>
                  <span>{deal.sales_manager}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
            <p className="text-base font-bold text-gray-900 mb-1">{deal.clients?.name ?? '—'}</p>
            <div className="space-y-0.5 text-sm text-gray-500">
              {deal.clients?.phone   && <p>{deal.clients.phone}</p>}
              {deal.clients?.email   && <p>{deal.clients.email}</p>}
              {deal.clients?.address && <p>{deal.clients.address}</p>}
            </div>
          </div>
        </div>

        {/* Watch Details */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Watch Details</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left font-semibold text-gray-700 pb-2 pr-3">Watch</th>
                <th className="text-left font-semibold text-gray-700 pb-2 px-3">Ref</th>
                <th className="text-left font-semibold text-gray-700 pb-2 px-3">Serial</th>
                <th className="text-left font-semibold text-gray-700 pb-2 px-3">Year</th>
                <th className="text-left font-semibold text-gray-700 pb-2 px-3">Condition</th>
                <th className="text-left font-semibold text-gray-700 pb-2 pl-3">Set</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 pr-3 font-medium text-gray-900">{deal.watches?.watch_name ?? '—'}</td>
                <td className="py-3 px-3 text-gray-600">{deal.watches?.reference ?? '—'}</td>
                <td className="py-3 px-3 text-gray-600">{deal.watches?.serial_number ?? '—'}</td>
                <td className="py-3 px-3 text-gray-600">{watchYear ?? '—'}</td>
                <td className="py-3 px-3 text-gray-600">{deal.watches?.condition ?? '—'}</td>
                <td className="py-3 pl-3 text-gray-600">{deal.watches?.set_details ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financials */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Financials</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">Sale Price</td>
                <td className="py-2.5 text-right font-medium text-gray-900 tabular-nums">{formatLKR(deal.sale_price)}</td>
              </tr>
              {tradeIns.map((ti, i) => (
                <tr key={ti.id} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-400 pl-4">
                    Trade-in: {[ti.brand, ti.reference].filter(Boolean).join(' · ') || `Trade-in #${i + 1}`}
                  </td>
                  <td className="py-2.5 text-right text-red-500 tabular-nums">− {formatLKR(ti.value)}</td>
                </tr>
              ))}
              {deal.other_costs && deal.other_costs_amount != null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-400 pl-4">Other Costs</td>
                  <td className="py-2.5 text-right text-red-500 tabular-nums">− {formatLKR(deal.other_costs_amount)}</td>
                </tr>
              )}
              {deal.commission_payable && deal.commission_amount != null && (
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-400 pl-4">Commission</td>
                  <td className="py-2.5 text-right text-red-500 tabular-nums">− {formatLKR(deal.commission_amount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-900">
                <td className="py-3 font-bold text-gray-900 text-base">NET TOTAL</td>
                <td className="py-3 text-right font-bold text-gray-900 text-base tabular-nums">{formatLKR(netTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details */}
        {deal.payment_method && (
          <div className="mb-8 bg-gray-50 rounded-xl p-4 print:bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Payment Details</p>
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Method</span>
                <span className="font-medium text-gray-800">{deal.payment_method}</span>
              </div>
              {deal.bank_name && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-32 shrink-0">Bank</span>
                  <span>{deal.bank_name}</span>
                </div>
              )}
              {deal.payment_method === 'Cash + Bank' && (
                <>
                  {(deal as any).cash_amount != null && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-32 shrink-0">Cash Amount</span>
                      <span className="tabular-nums">{formatLKR((deal as any).cash_amount)}</span>
                    </div>
                  )}
                  {(deal as any).bank_amount != null && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-32 shrink-0">Bank Amount</span>
                      <span className="tabular-nums">{formatLKR((deal as any).bank_amount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-900 pt-6 text-center">
          <p className="text-base font-semibold text-gray-700">Thank you for your purchase</p>
          <p className="text-sm text-gray-400 mt-1">The Watch Boutique</p>
        </div>

      </div>
    </div>
  )
}
