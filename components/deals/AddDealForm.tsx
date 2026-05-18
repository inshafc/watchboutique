'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEAL_TYPES, DEAL_STAGES, PAYMENT_METHODS } from '@/types'
import type { DealType, DealStage, PaymentMethod } from '@/types'

const inp  = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl  = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

type WatchOption  = { id: string; watch_name: string; reference: string | null; status: string }
type ClientOption = { id: string; name: string }

interface InstallmentRow {
  amount:   string
  due_date: string
  notes:    string
}

export default function AddDealForm({
  watches,
  clients,
}: {
  watches: WatchOption[]
  clients: ClientOption[]
}) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    watch_id:       '',
    client_id:      '',
    deal_type:      'Sale' as DealType,
    stage:          'Inquiry' as DealStage,
    offered_price:  '',
    sale_price:     '',
    trade_value:    '',
    adjustment:     '',
    commission:     '',
    payment_method: '' as PaymentMethod | '',
    sales_manager:  '',
    notes:          '',
  })

  const [installmentRows, setInstallmentRows] = useState<InstallmentRow[]>([
    { amount: '', due_date: '', notes: '' },
  ])

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function num(s: string): number | null {
    const v = parseFloat(s)
    return isNaN(v) ? null : v
  }

  const salePrice    = num(form.sale_price)
  const tradeValue   = num(form.trade_value)
  const adjustment   = num(form.adjustment)
  const commission   = num(form.commission)

  const grossProfit = salePrice != null
    ? salePrice - (tradeValue ?? 0) - (adjustment ?? 0) - (commission ?? 0)
    : null

  const installmentTotal = installmentRows.reduce((sum, r) => sum + (num(r.amount) ?? 0), 0)

  function addInstallmentRow() {
    setInstallmentRows(rows => [...rows, { amount: '', due_date: '', notes: '' }])
  }

  function removeInstallmentRow(i: number) {
    setInstallmentRows(rows => rows.filter((_, idx) => idx !== i))
  }

  function updateInstallmentRow(i: number, key: keyof InstallmentRow, value: string) {
    setInstallmentRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.watch_id)  { setError('Please select a watch.');  return }
    if (!form.client_id) { setError('Please select a client.'); return }

    if (form.payment_method === 'Installment') {
      const invalid = installmentRows.some(r => !r.amount || isNaN(parseFloat(r.amount)))
      if (invalid || installmentRows.length === 0) {
        setError('All installments must have a valid amount.')
        return
      }
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .insert({
        watch_id:       form.watch_id,
        client_id:      form.client_id,
        deal_type:      form.deal_type,
        stage:          form.stage,
        offered_price:  num(form.offered_price),
        sale_price:     num(form.sale_price),
        trade_value:    num(form.trade_value),
        adjustment:     num(form.adjustment),
        commission:     num(form.commission),
        payment_method: form.payment_method || null,
        sales_manager:  form.sales_manager.trim() || null,
        notes:          form.notes.trim() || null,
        closed_at:      form.stage === 'Closed' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (dealErr || !deal) {
      setError(dealErr?.message ?? 'Failed to create deal.')
      setLoading(false)
      return
    }

    if (form.payment_method === 'Installment' && installmentRows.length > 0) {
      const rows = installmentRows.map(r => ({
        deal_id:  deal.id,
        amount:   parseFloat(r.amount),
        due_date: r.due_date || null,
        notes:    r.notes.trim() || null,
        status:   'Pending' as const,
      }))
      const { error: instErr } = await supabase.from('installments').insert(rows)
      if (instErr) {
        setError('Deal saved but installments failed: ' + instErr.message)
        setLoading(false)
        return
      }
    }

    router.push(`/dashboard/deals/${deal.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Watch + Client ───────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Parties</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Watch *</label>
            <select value={form.watch_id} onChange={field('watch_id')} className={inp} required>
              <option value="">— Select a watch —</option>
              {watches.map(w => (
                <option key={w.id} value={w.id}>
                  {w.watch_name}{w.reference ? ` · ${w.reference}` : ''} ({w.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Client *</label>
            <select value={form.client_id} onChange={field('client_id')} className={inp} required>
              <option value="">— Select a client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Deal Info ────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Deal Info</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Deal Type</label>
              <select value={form.deal_type} onChange={field('deal_type')} className={inp}>
                {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Stage</label>
              <select value={form.stage} onChange={field('stage')} className={inp}>
                {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Sales Manager</label>
            <input type="text" value={form.sales_manager} onChange={field('sales_manager')} placeholder="Name" className={inp} />
          </div>
        </div>
      </div>

      {/* ── Financials ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Financials</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Offered Price</label>
              <input type="number" min="0" step="0.01" value={form.offered_price} onChange={field('offered_price')} placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Sale Price</label>
              <input type="number" min="0" step="0.01" value={form.sale_price} onChange={field('sale_price')} placeholder="0" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Trade Value</label>
              <input type="number" min="0" step="0.01" value={form.trade_value} onChange={field('trade_value')} placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Adjustment</label>
              <input type="number" step="0.01" value={form.adjustment} onChange={field('adjustment')} placeholder="0" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Commission</label>
            <input type="number" min="0" step="0.01" value={form.commission} onChange={field('commission')} placeholder="0" className={inp} />
          </div>

          {/* Live gross profit preview */}
          {grossProfit != null && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Profit</span>
              <span className={`text-base font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {grossProfit >= 0 ? '+' : ''}{formatLKR(grossProfit)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment ──────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Payment</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Payment Method</label>
            <select value={form.payment_method} onChange={field('payment_method')} className={inp}>
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Installment rows */}
          {form.payment_method === 'Installment' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Installments</p>
              {installmentRows.map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Amount {i + 1}</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={row.amount}
                        onChange={e => updateInstallmentRow(i, 'amount', e.target.value)}
                        placeholder="0"
                        className={inp}
                        required
                      />
                    </div>
                    <div>
                      <label className={lbl}>Due Date</label>
                      <input
                        type="date"
                        value={row.due_date}
                        onChange={e => updateInstallmentRow(i, 'due_date', e.target.value)}
                        className={inp}
                      />
                    </div>
                  </div>
                  {installmentRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstallmentRow(i)}
                      className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addInstallmentRow}
                  className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
                  </svg>
                  Add installment
                </button>
                {salePrice != null && installmentTotal > 0 && (
                  <span className={`text-xs font-medium ${Math.abs(installmentTotal - salePrice) < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Total: {formatLKR(installmentTotal)} / {formatLKR(salePrice)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.notes} onChange={field('notes')} rows={3} placeholder="Any notes about this deal…" className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <button
          type="submit" disabled={loading}
          className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Create Deal'}
        </button>
        <Link href="/dashboard/deals" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
