'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEAL_TYPES, DEAL_STAGES, PAYMENT_METHODS, WATCH_CONDITIONS, WATCH_SET_DETAILS } from '@/types'
import type { Deal, TradeIn, DealType, DealStage, PaymentMethod } from '@/types'

const inp  = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl  = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        checked
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'border-white' : 'border-gray-300'}`}>
        {checked && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
    </button>
  )
}

type WatchOption  = { id: string; watch_name: string; reference: string | null; status: string; purchase_cost: number | null }
type ClientOption = { id: string; name: string }

interface NewTradeInRow {
  brand: string; reference: string; serial_number: string; year: string
  condition: string; set_details: string; value: string; add_to_inventory: boolean
}

const DEFAULT_TRADE_IN: NewTradeInRow = {
  brand: '', reference: '', serial_number: '', year: '',
  condition: 'Good', set_details: 'Watch Only', value: '', add_to_inventory: false,
}

export default function EditDealForm({
  deal,
  initialTradeIns,
  watches,
  clients,
}: {
  deal: Deal
  initialTradeIns: TradeIn[]
  watches: WatchOption[]
  clients: ClientOption[]
}) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    watch_id:          deal.watch_id      ?? '',
    client_id:         deal.client_id     ?? '',
    deal_type:         deal.deal_type,
    stage:             deal.stage,
    sale_date:         deal.sale_date     ?? '',
    offered_price:     deal.offered_price?.toString() ?? '',
    sale_price:        deal.sale_price?.toString()    ?? '',
    payment_method:    (deal.payment_method ?? '') as PaymentMethod | '',
    sales_manager:     deal.sales_manager ?? '',
    notes:             deal.notes         ?? '',
    commission_amount: deal.commission_amount?.toString() ?? '50000',
  })
  const [otherCosts,        setOtherCosts]        = useState(deal.other_costs ?? false)
  const [otherCostsAmount,  setOtherCostsAmount]  = useState(deal.other_costs_amount?.toString() ?? '')
  const [commissionPayable, setCommissionPayable] = useState(deal.commission_payable ?? false)
  const [newClient,         setNewClient]         = useState(deal.new_client ?? false)

  const [existingTradeIns, setExistingTradeIns] = useState<TradeIn[]>(initialTradeIns)
  const [newTradeInRows,   setNewTradeInRows]   = useState<NewTradeInRow[]>([])
  const [deletingTi,       setDeletingTi]       = useState<string | null>(null)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function num(s: string): number | null {
    const v = parseFloat(s)
    return isNaN(v) ? null : v
  }

  const selectedWatch  = watches.find(w => w.id === form.watch_id)
  const watchCost      = selectedWatch?.purchase_cost ?? 0
  const salePrice      = num(form.sale_price)
  const otherCostsAmt  = otherCosts ? (num(otherCostsAmount) ?? 0) : 0
  const commissionAmt  = commissionPayable ? (num(form.commission_amount) ?? 0) : 0
  const grossProfit    = salePrice != null ? salePrice - watchCost - otherCostsAmt - commissionAmt : null

  function updateNewTradeIn(i: number, key: keyof NewTradeInRow, value: string | boolean) {
    setNewTradeInRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r))
  }

  async function deleteTradeIn(id: string) {
    if (!confirm('Remove this trade-in?')) return
    setDeletingTi(id)
    const supabase = createClient()
    await supabase.from('trade_ins').delete().eq('id', id)
    setExistingTradeIns(rows => rows.filter(r => r.id !== id))
    setDeletingTi(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.watch_id)  { setError('Please select a watch.');  return }
    if (!form.client_id) { setError('Please select a client.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: updateErr } = await supabase
      .from('deals')
      .update({
        watch_id:           form.watch_id,
        client_id:          form.client_id,
        deal_type:          form.deal_type,
        stage:              form.stage,
        offered_price:      num(form.offered_price),
        sale_price:         num(form.sale_price),
        payment_method:     form.payment_method || null,
        sales_manager:      form.sales_manager.trim() || null,
        notes:              form.notes.trim() || null,
        sale_date:          form.sale_date || null,
        other_costs:        otherCosts,
        other_costs_amount: otherCosts ? num(otherCostsAmount) : null,
        commission_payable: commissionPayable,
        commission_amount:  commissionPayable ? num(form.commission_amount) : null,
        new_client:         newClient,
        closed_at: (form.stage === 'Closed' || form.stage === 'Delivered') && !deal.closed_at
          ? new Date().toISOString()
          : deal.closed_at,
      })
      .eq('id', deal.id)

    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Insert new trade-ins
    if (form.deal_type === 'Trade' && newTradeInRows.length > 0) {
      for (const row of newTradeInRows) {
        if (!row.brand && !row.value) continue
        let watchId: string | null = null
        if (row.add_to_inventory) {
          const watchName = [row.brand, row.reference].filter(Boolean).join(' ') || 'Unnamed'
          const { data: newWatch } = await supabase
            .from('watches')
            .insert({
              watch_name: watchName, reference: row.reference || null,
              serial_number: row.serial_number || null,
              date_on_card: row.year ? `${row.year}-01-01` : null,
              condition: row.condition || 'Good', set_details: row.set_details || 'Watch Only',
              purchase_cost: num(row.value), currency: 'LKR', status: 'Available', photos: [],
            })
            .select('id').single()
          watchId = newWatch?.id ?? null
        }
        await supabase.from('trade_ins').insert({
          deal_id: deal.id, brand: row.brand || null, reference: row.reference || null,
          serial_number: row.serial_number || null, year: row.year || null,
          condition: row.condition || null, set_details: row.set_details || null,
          value: num(row.value), add_to_inventory: row.add_to_inventory, watch_id: watchId,
        })
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

      {/* ── Parties ──────────────────────────────────────────── */}
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
            {selectedWatch?.purchase_cost != null && (
              <p className="text-xs text-gray-400 mt-1.5">Cost price: {formatLKR(selectedWatch.purchase_cost)}</p>
            )}
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

      {/* ── Sale Info ────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Sale Info</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Sale Date</label>
              <input type="date" value={form.sale_date} onChange={field('sale_date')} className={inp} />
            </div>
            <div>
              <label className={lbl}>Sales Manager</label>
              <input type="text" value={form.sales_manager} onChange={field('sales_manager')} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Flags</label>
            <div className="flex gap-2 flex-wrap">
              <Toggle label="New Client" checked={newClient} onChange={setNewClient} />
            </div>
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
          <div>
            <Toggle label="Other Costs" checked={otherCosts} onChange={setOtherCosts} />
            {otherCosts && (
              <div className="mt-2">
                <label className={lbl}>Other Costs Amount</label>
                <input type="number" min="0" step="0.01" value={otherCostsAmount} onChange={e => setOtherCostsAmount(e.target.value)} placeholder="0" className={inp} />
              </div>
            )}
          </div>
          <div>
            <Toggle label="Commission Payable" checked={commissionPayable} onChange={setCommissionPayable} />
            {commissionPayable && (
              <div className="mt-2">
                <label className={lbl}>Commission Amount</label>
                <input type="number" min="0" step="0.01" value={form.commission_amount} onChange={field('commission_amount')} placeholder="50000" className={inp} />
              </div>
            )}
          </div>
          {grossProfit != null && (
            <div className={`rounded-xl px-4 py-3 ${grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Profit</span>
                <span className={`text-base font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {grossProfit >= 0 ? '+' : ''}{formatLKR(grossProfit)}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div className="flex justify-between"><span>Sale price</span><span className="tabular-nums">{formatLKR(salePrice!)}</span></div>
                {watchCost > 0 && <div className="flex justify-between"><span>Watch cost</span><span className="tabular-nums">− {formatLKR(watchCost)}</span></div>}
                {otherCostsAmt > 0 && <div className="flex justify-between"><span>Other costs</span><span className="tabular-nums">− {formatLKR(otherCostsAmt)}</span></div>}
                {commissionAmt > 0 && <div className="flex justify-between"><span>Commission</span><span className="tabular-nums">− {formatLKR(commissionAmt)}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment ──────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Payment</p>
        <div>
          <label className={lbl}>Payment Method</label>
          <select value={form.payment_method} onChange={field('payment_method')} className={inp}>
            <option value="">— Select —</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ── Trade-In Watches ─────────────────────────────────── */}
      {form.deal_type === 'Trade' && (
        <div className={card}>
          <p className={cardTitle}>Trade-In Watches</p>
          <div className="space-y-4">
            {/* Existing trade-ins */}
            {existingTradeIns.map(ti => (
              <div key={ti.id} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {[ti.brand, ti.reference].filter(Boolean).join(' · ') || 'Unnamed'}
                  </p>
                  <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                    {ti.serial_number && <p>SN: {ti.serial_number}</p>}
                    <p>{[ti.year, ti.condition, ti.set_details].filter(Boolean).join(' · ')}</p>
                    {ti.value != null && <p className="font-medium text-gray-600">{formatLKR(ti.value)}</p>}
                    {ti.add_to_inventory && <p className="text-emerald-600">Added to inventory</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTradeIn(ti.id)}
                  disabled={deletingTi === ti.id}
                  className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {deletingTi === ti.id ? '…' : 'Remove'}
                </button>
              </div>
            ))}

            {/* New trade-in rows */}
            {newTradeInRows.map((row, i) => (
              <div key={i} className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 relative">
                {newTradeInRows.length > 0 && (
                  <button type="button" onClick={() => setNewTradeInRows(r => r.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                )}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Trade-in</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Brand</label><input type="text" value={row.brand} onChange={e => updateNewTradeIn(i, 'brand', e.target.value)} placeholder="Rolex" className={inp} /></div>
                  <div><label className={lbl}>Reference</label><input type="text" value={row.reference} onChange={e => updateNewTradeIn(i, 'reference', e.target.value)} placeholder="126610LN" className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Serial Number</label><input type="text" value={row.serial_number} onChange={e => updateNewTradeIn(i, 'serial_number', e.target.value)} className={inp} /></div>
                  <div><label className={lbl}>Year</label><input type="text" value={row.year} onChange={e => updateNewTradeIn(i, 'year', e.target.value)} maxLength={4} className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Condition</label>
                    <select value={row.condition} onChange={e => updateNewTradeIn(i, 'condition', e.target.value)} className={inp}>
                      {WATCH_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Set Details</label>
                    <select value={row.set_details} onChange={e => updateNewTradeIn(i, 'set_details', e.target.value)} className={inp}>
                      {WATCH_SET_DETAILS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div><label className={lbl}>Value (LKR)</label><input type="number" min="0" step="0.01" value={row.value} onChange={e => updateNewTradeIn(i, 'value', e.target.value)} placeholder="0" className={inp} /></div>
                  <div className="pb-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={row.add_to_inventory} onChange={e => updateNewTradeIn(i, 'add_to_inventory', e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-gray-900" />
                      <span className="text-sm text-gray-700">Add to Inventory</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setNewTradeInRows(r => [...r, { ...DEFAULT_TRADE_IN }])}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
              Add another trade-in
            </button>
          </div>
        </div>
      )}

      {/* ── Notes ────────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.notes} onChange={field('notes')} rows={3} className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <button type="submit" disabled={loading} className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <Link href={`/dashboard/deals/${deal.id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
