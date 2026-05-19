'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEAL_TYPES, DEAL_STAGES, PAYMENT_METHODS, WATCH_CONDITIONS, WATCH_SET_DETAILS } from '@/types'
import type { DealType, DealStage, PaymentMethod } from '@/types'

const inp  = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl  = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

const BANKS = ['NTB', 'Amana', 'LUX Amana']

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

// ── Subtle toggle ─────────────────────────────────────────────

function SubtleToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        checked
          ? 'bg-gray-100 text-gray-700 border-gray-300'
          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${checked ? 'border-gray-600 bg-gray-600' : 'border-gray-300'}`}>
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  )
}

// ── Watch picker with thumbnail ───────────────────────────────

export type WatchOption  = { id: string; watch_name: string; reference: string | null; status: string; purchase_cost: number | null; photos?: string[] }
export type ClientOption = { id: string; name: string }

function WatchPicker({
  watches,
  value,
  onChange,
}: {
  watches: WatchOption[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = watches.find(w => w.id === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? watches.filter(w =>
        w.watch_name.toLowerCase().includes(query.toLowerCase()) ||
        (w.reference ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : watches

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQuery('') }}
        className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-left hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        {selected ? (
          <>
            {selected.photos && selected.photos.length > 0 ? (
              <img src={selected.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-gray-900 font-medium truncate block">{selected.watch_name}</span>
              {selected.reference && <span className="text-xs text-gray-400">{selected.reference}</span>}
            </div>
            <span className="text-xs text-gray-400 shrink-0">{selected.status}</span>
          </>
        ) : (
          <span className="text-gray-400">— Select a watch —</span>
        )}
        <svg className="w-4 h-4 text-gray-400 ml-auto shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search watches…"
              autoFocus
              className="w-full bg-gray-50 border-0 rounded-lg px-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No watches found</p>
            ) : (
              filtered.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => { onChange(w.id); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-left ${value === w.id ? 'bg-gray-50' : ''}`}
                >
                  {w.photos && w.photos.length > 0 ? (
                    <img src={w.photos[0]} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{w.watch_name}</p>
                    {w.reference && <p className="text-xs text-gray-400">Ref: {w.reference}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{w.status}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Trade-in rows ─────────────────────────────────────────────

interface TradeInRow {
  brand:            string
  reference:        string
  serial_number:    string
  year:             string
  condition:        string
  set_details:      string
  value:            string
  add_to_inventory: boolean
}

interface InstallmentRow {
  amount:   string
  due_date: string
  notes:    string
}

const DEFAULT_TRADE_IN: TradeInRow = {
  brand: '', reference: '', serial_number: '', year: '',
  condition: 'Good', set_details: 'Watch Only', value: '',
  add_to_inventory: false,
}

// ── Main component ────────────────────────────────────────────

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

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    watch_id:          '',
    client_id:         '',
    deal_type:         'Sale' as DealType,
    stage:             'Inquiry' as DealStage,
    sale_date:         today,
    sale_price:        '',
    payment_method:    '' as PaymentMethod | '',
    bank_name:         '',
    sales_manager:     '',
    notes:             '',
    commission_amount: '50000',
  })
  const [otherCosts,        setOtherCosts]        = useState(false)
  const [otherCostsAmount,  setOtherCostsAmount]  = useState('')
  const [commissionPayable, setCommissionPayable] = useState(false)
  const [newClient,         setNewClient]         = useState(false)

  const [tradeInRows,     setTradeInRows]     = useState<TradeInRow[]>([{ ...DEFAULT_TRADE_IN }])
  const [installmentRows, setInstallmentRows] = useState<InstallmentRow[]>([{ amount: '', due_date: '', notes: '' }])

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
  const grossProfitVal = salePrice != null ? salePrice - watchCost - otherCostsAmt - commissionAmt : null

  const installmentTotal = installmentRows.reduce((s, r) => s + (num(r.amount) ?? 0), 0)

  const showBankDropdown = form.payment_method === 'Bank Transfer' || form.payment_method === 'Cash + Bank'

  function updateTradeIn(i: number, key: keyof TradeInRow, value: string | boolean) {
    setTradeInRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r))
  }

  function updateInstallment(i: number, key: keyof InstallmentRow, value: string) {
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
        watch_id:           form.watch_id,
        client_id:          form.client_id,
        deal_type:          form.deal_type,
        stage:              form.stage,
        sale_price:         num(form.sale_price),
        payment_method:     form.payment_method || null,
        bank_name:          showBankDropdown && form.bank_name ? form.bank_name : null,
        sales_manager:      form.sales_manager.trim() || null,
        notes:              form.notes.trim() || null,
        sale_date:          form.sale_date || null,
        other_costs:        otherCosts,
        other_costs_amount: otherCosts ? num(otherCostsAmount) : null,
        commission_payable: commissionPayable,
        commission_amount:  commissionPayable ? num(form.commission_amount) : null,
        new_client:         newClient,
        closed_at:          form.stage === 'Closed' || form.stage === 'Delivered' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (dealErr || !deal) {
      setError(dealErr?.message ?? 'Failed to create sale.')
      setLoading(false)
      return
    }

    // Installments
    if (form.payment_method === 'Installment' && installmentRows.length > 0) {
      await supabase.from('installments').insert(
        installmentRows.map(r => ({
          deal_id:  deal.id,
          amount:   parseFloat(r.amount),
          due_date: r.due_date || null,
          notes:    r.notes.trim() || null,
          status:   'Pending',
        }))
      )
    }

    // Trade-ins
    if (form.deal_type === 'Trade') {
      for (const row of tradeInRows) {
        if (!row.brand && !row.value) continue

        let watchId: string | null = null

        if (row.add_to_inventory) {
          const watchName = [row.brand, row.reference].filter(Boolean).join(' ') || 'Unnamed'
          const { data: newWatch } = await supabase
            .from('watches')
            .insert({
              watch_name:    watchName,
              reference:     row.reference || null,
              serial_number: row.serial_number || null,
              date_on_card:  row.year ? `${row.year}-01-01` : null,
              condition:     row.condition || 'Good',
              set_details:   row.set_details || 'Watch Only',
              purchase_cost: num(row.value),
              currency:      'LKR',
              status:        'Available',
              photos:        [],
            })
            .select('id')
            .single()
          watchId = newWatch?.id ?? null
        }

        await supabase.from('trade_ins').insert({
          deal_id:          deal.id,
          brand:            row.brand || null,
          reference:        row.reference || null,
          serial_number:    row.serial_number || null,
          year:             row.year || null,
          condition:        row.condition || null,
          set_details:      row.set_details || null,
          value:            num(row.value),
          add_to_inventory: row.add_to_inventory,
          watch_id:         watchId,
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
            <WatchPicker
              watches={watches}
              value={form.watch_id}
              onChange={id => setForm(f => ({ ...f, watch_id: id }))}
            />
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
              <input type="text" value={form.sales_manager} onChange={field('sales_manager')} placeholder="Name" className={inp} />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newClient}
                onChange={e => setNewClient(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-gray-900"
              />
              <span className="text-sm text-gray-700">New Client</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Financials ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Financials</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Sale Price</label>
            <input type="number" min="0" step="0.01" value={form.sale_price} onChange={field('sale_price')} placeholder="0" className={inp} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <SubtleToggle label="Other Costs" checked={otherCosts} onChange={setOtherCosts} />
            <SubtleToggle label="Commission Payable" checked={commissionPayable} onChange={setCommissionPayable} />
          </div>

          {otherCosts && (
            <div>
              <label className={lbl}>Other Costs Amount</label>
              <input type="number" min="0" step="0.01" value={otherCostsAmount} onChange={e => setOtherCostsAmount(e.target.value)} placeholder="0" className={inp} />
            </div>
          )}

          {commissionPayable && (
            <div>
              <label className={lbl}>Commission Amount</label>
              <input type="number" min="0" step="0.01" value={form.commission_amount} onChange={field('commission_amount')} placeholder="50000" className={inp} />
            </div>
          )}

          {/* Gross profit preview */}
          {grossProfitVal != null && (
            <div className={`rounded-xl px-4 py-3 ${grossProfitVal >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gross Profit</span>
                <span className={`text-base font-bold tabular-nums ${grossProfitVal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {grossProfitVal >= 0 ? '+' : ''}{formatLKR(grossProfitVal)}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Sale price</span><span className="tabular-nums">{formatLKR(salePrice!)}</span>
                </div>
                {watchCost > 0 && (
                  <div className="flex justify-between">
                    <span>Watch cost</span><span className="tabular-nums">− {formatLKR(watchCost)}</span>
                  </div>
                )}
                {otherCostsAmt > 0 && (
                  <div className="flex justify-between">
                    <span>Other costs</span><span className="tabular-nums">− {formatLKR(otherCostsAmt)}</span>
                  </div>
                )}
                {commissionAmt > 0 && (
                  <div className="flex justify-between">
                    <span>Commission</span><span className="tabular-nums">− {formatLKR(commissionAmt)}</span>
                  </div>
                )}
              </div>
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

          {showBankDropdown && (
            <div>
              <label className={lbl}>Bank</label>
              <select value={form.bank_name} onChange={field('bank_name')} className={inp}>
                <option value="">— Select bank —</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {form.payment_method === 'Installment' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Installments</p>
              {installmentRows.map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Amount {i + 1}</label>
                      <input type="number" min="0" step="0.01" value={row.amount} onChange={e => updateInstallment(i, 'amount', e.target.value)} placeholder="0" className={inp} required />
                    </div>
                    <div>
                      <label className={lbl}>Due Date</label>
                      <input type="date" value={row.due_date} onChange={e => updateInstallment(i, 'due_date', e.target.value)} className={inp} />
                    </div>
                  </div>
                  {installmentRows.length > 1 && (
                    <button type="button" onClick={() => setInstallmentRows(r => r.filter((_, idx) => idx !== i))} className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setInstallmentRows(r => [...r, { amount: '', due_date: '', notes: '' }])} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
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

      {/* ── Trade-In Watches ─────────────────────────────────── */}
      {form.deal_type === 'Trade' && (
        <div className={card}>
          <p className={cardTitle}>Trade-In Watches</p>
          <div className="space-y-4">
            {tradeInRows.map((row, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                {tradeInRows.length > 1 && (
                  <button type="button" onClick={() => setTradeInRows(r => r.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                )}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trade-in #{i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Brand</label><input type="text" value={row.brand} onChange={e => updateTradeIn(i, 'brand', e.target.value)} placeholder="Rolex" className={inp} /></div>
                  <div><label className={lbl}>Reference</label><input type="text" value={row.reference} onChange={e => updateTradeIn(i, 'reference', e.target.value)} placeholder="126610LN" className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Serial Number</label><input type="text" value={row.serial_number} onChange={e => updateTradeIn(i, 'serial_number', e.target.value)} className={inp} /></div>
                  <div><label className={lbl}>Year</label><input type="text" value={row.year} onChange={e => updateTradeIn(i, 'year', e.target.value)} maxLength={4} className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Condition</label>
                    <select value={row.condition} onChange={e => updateTradeIn(i, 'condition', e.target.value)} className={inp}>
                      {WATCH_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Set Details</label>
                    <select value={row.set_details} onChange={e => updateTradeIn(i, 'set_details', e.target.value)} className={inp}>
                      {WATCH_SET_DETAILS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div><label className={lbl}>Value (LKR)</label><input type="number" min="0" step="0.01" value={row.value} onChange={e => updateTradeIn(i, 'value', e.target.value)} placeholder="0" className={inp} /></div>
                  <div className="pb-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={row.add_to_inventory} onChange={e => updateTradeIn(i, 'add_to_inventory', e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-gray-900" />
                      <span className="text-sm text-gray-700">Add to Inventory</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setTradeInRows(r => [...r, { ...DEFAULT_TRADE_IN }])} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
              Add another trade-in
            </button>
          </div>
        </div>
      )}

      {/* ── Notes ────────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.notes} onChange={field('notes')} rows={3} placeholder="Any notes about this sale…" className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <button type="submit" disabled={loading} className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Saving…' : 'Create Sale'}
        </button>
        <Link href="/dashboard/deals" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
