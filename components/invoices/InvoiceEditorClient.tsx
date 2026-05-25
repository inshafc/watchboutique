'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import InvoicePrintLayout from './InvoicePrintLayout'
import type { InvoiceWithItems, InvoiceType, InvoiceStatus, SavedBank, SalesManager } from '@/types'

const inp      = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl      = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card     = 'bg-white border border-gray-100 rounded-2xl p-5'
const cardHead = 'text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4'

const CURRENCIES  = ['LKR', 'USD', 'AED', 'AUD'] as const
const PAY_METHODS = ['Cash', 'Bank Transfer', 'Cash + Bank', 'Installment']
const CONDITIONS  = ['Brand New', 'Excellent', 'Good', 'Fair', 'Poor']

interface LineItem {
  _key:          string
  watch_name:    string
  reference:     string
  serial_number: string
  year:          string
  condition:     string
  photo_url:     string
  amount:        string
}

function emptyItem(): LineItem {
  return { _key: Math.random().toString(36).slice(2), watch_name: '', reference: '', serial_number: '', year: '', condition: '', photo_url: '', amount: '' }
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${checked ? 'bg-gray-900 border-gray-900' : 'bg-gray-200 border-gray-200'}`}>
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform mt-px ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-sm text-gray-700 select-none">{label}</span>
    </button>
  )
}

export default function InvoiceEditorClient({
  invoice,
  salesManagers = [],
  banks = [],
}: {
  invoice:       InvoiceWithItems
  salesManagers?: SalesManager[]
  banks?:         SavedBank[]
}) {
  const [form, setForm] = useState({
    date:              invoice.date                   ?? new Date().toISOString().split('T')[0],
    currency:          (invoice.currency ?? 'LKR') as typeof CURRENCIES[number],
    exchange_rate:     invoice.exchange_rate?.toString() ?? '',
    type:              invoice.type                   as InvoiceType,
    client_name:       invoice.client_name            ?? '',
    client_address:    invoice.client_address         ?? '',
    client_phone:      invoice.client_phone           ?? '',
    sales_manager:     invoice.sales_manager          ?? '',
    payment_method:    invoice.payment_method         ?? '',
    bank_id:           invoice.bank_id                ?? '',
    show_bank_details: invoice.show_bank_details      ?? false,
    show_signatures:   invoice.show_signatures        ?? false,
    status:            invoice.status                 as InvoiceStatus,
    advance_paid:      invoice.advance_paid?.toString() ?? '',
    notes:             invoice.notes                  ?? '',
  })

  const [items, setItems] = useState<LineItem[]>(() =>
    invoice.invoice_items.length > 0
      ? invoice.invoice_items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(it => ({
            _key:          it.id,
            watch_name:    it.watch_name    ?? '',
            reference:     it.reference     ?? '',
            serial_number: it.serial_number ?? '',
            year:          it.year          ?? '',
            condition:     it.condition     ?? '',
            photo_url:     it.photo_url     ?? '',
            amount:        it.amount?.toString() ?? '',
          }))
      : [emptyItem()]
  )

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function updateItem(idx: number, key: keyof Omit<LineItem, '_key'>, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it))
  }

  const selectedBank = banks.find(b => b.id === form.bank_id) ?? null
  const showBankPicker = form.payment_method === 'Bank Transfer' || form.payment_method === 'Cash + Bank'

  const num = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return isNaN(v) ? null : v }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        date:              form.date,
        currency:          form.currency,
        exchange_rate:     num(form.exchange_rate),
        type:              form.type,
        client_name:       form.client_name.trim()    || null,
        client_address:    form.client_address.trim() || null,
        client_phone:      form.client_phone.trim()   || null,
        sales_manager:     form.sales_manager.trim()  || null,
        payment_method:    form.payment_method        || null,
        bank_id:           showBankPicker && form.bank_id ? form.bank_id : null,
        show_bank_details: form.show_bank_details,
        show_signatures:   form.show_signatures,
        status:            form.status,
        advance_paid:      form.type === 'sourcing' ? num(form.advance_paid) : null,
        notes:             form.notes.trim() || null,
      })
      .eq('id', invoice.id)

    if (invErr) { setError(invErr.message); setSaving(false); return }

    // Replace all items
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

    const validItems = items.filter(it => it.watch_name.trim())
    if (validItems.length > 0) {
      await supabase.from('invoice_items').insert(
        validItems.map((it, i) => ({
          invoice_id:    invoice.id,
          watch_name:    it.watch_name.trim(),
          reference:     it.reference.trim()     || null,
          serial_number: it.serial_number.trim() || null,
          year:          it.year.trim()           || null,
          condition:     it.condition             || null,
          photo_url:     it.photo_url.trim()      || null,
          amount:        num(it.amount),
          sort_order:    i,
        }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [form, items, invoice.id, showBankPicker])

  // Build preview props from current form state
  const previewItems = items.map(it => ({
    watch_name:    it.watch_name,
    reference:     it.reference     || null,
    serial_number: it.serial_number || null,
    year:          it.year          || null,
    condition:     it.condition     || null,
    photo_url:     it.photo_url     || null,
    amount:        num(it.amount),
  }))

  const previewBank = showBankPicker && form.show_bank_details && selectedBank
    ? { bank_name: selectedBank.bank_name, account_name: selectedBank.account_name, account_number: selectedBank.account_number, branch: selectedBank.branch, swift_code: selectedBank.swift_code }
    : null

  return (
    <div className="flex min-h-full">

      {/* ── Left panel: form ────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/invoices" className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Invoices
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/invoices/${invoice.id}/print`}
              target="_blank"
              className="text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg>
              Print
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="p-6 space-y-4">

          {/* ── Invoice Info ──────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Invoice</p>
            <div className="space-y-4">
              <div>
                <label className={lbl}>Invoice Number</label>
                <div className="w-full bg-gray-50 border border-gray-100 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-mono select-all">
                  {invoice.invoice_number}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Date</label>
                  <input type="date" value={form.date} onChange={f('date')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Type</label>
                  <select value={form.type} onChange={f('type')} className={inp}>
                    <option value="sale">Sale</option>
                    <option value="general">General</option>
                    <option value="sourcing">Sourcing</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Currency</label>
                  <select value={form.currency} onChange={f('currency')} className={inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.currency !== 'LKR' && (
                  <div>
                    <label className={lbl}>Exchange Rate (1 {form.currency} = LKR)</label>
                    <input type="number" value={form.exchange_rate} onChange={f('exchange_rate')} placeholder="e.g. 320" className={inp} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Billing Details ───────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Billing Details</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Client Name</label>
                <input type="text" value={form.client_name} onChange={f('client_name')} placeholder="Client name" className={inp} />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input type="text" value={form.client_phone} onChange={f('client_phone')} placeholder="+94 77 xxx xxxx" className={inp} />
              </div>
              <div>
                <label className={lbl}>Address</label>
                <input type="text" value={form.client_address} onChange={f('client_address')} placeholder="Address" className={inp} />
              </div>
            </div>
          </div>

          {/* ── Sale Details ──────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Sale Details</p>
            <div>
              <label className={lbl}>Sales Manager</label>
              <select value={form.sales_manager} onChange={f('sales_manager')} className={inp}>
                <option value="">— Select —</option>
                {salesManagers.map(sm => <option key={sm.id} value={sm.name}>{sm.name}</option>)}
                {form.sales_manager && !salesManagers.some(sm => sm.name === form.sales_manager) && (
                  <option value={form.sales_manager}>{form.sales_manager}</option>
                )}
              </select>
            </div>
          </div>

          {/* ── Line Items ────────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Line Items</p>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={item._key} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">Item {idx + 1}</p>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>Photo URL</label>
                    <input type="url" value={item.photo_url} onChange={e => updateItem(idx, 'photo_url', e.target.value)} placeholder="https://…" className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Watch Name *</label>
                      <input type="text" value={item.watch_name} onChange={e => updateItem(idx, 'watch_name', e.target.value)} placeholder="Rolex Submariner" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Reference</label>
                      <input type="text" value={item.reference} onChange={e => updateItem(idx, 'reference', e.target.value)} placeholder="126610LN" className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Serial No.</label>
                      <input type="text" value={item.serial_number} onChange={e => updateItem(idx, 'serial_number', e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Year</label>
                      <input type="text" value={item.year} onChange={e => updateItem(idx, 'year', e.target.value)} maxLength={4} placeholder="2023" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Condition</label>
                      <select value={item.condition} onChange={e => updateItem(idx, 'condition', e.target.value)} className={inp}>
                        <option value="">—</option>
                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Amount</label>
                    <input type="text" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} placeholder="0" className={inp} />
                  </div>
                </div>
              ))}

              {items.length < 2 && (
                <button
                  type="button"
                  onClick={() => setItems(prev => [...prev, emptyItem()])}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                  Add Line Item
                </button>
              )}
            </div>
          </div>

          {/* ── Sourcing Totals ───────────────────────────── */}
          {form.type === 'sourcing' && (
            <div className={card}>
              <p className={cardHead}>Advance Payment</p>
              <div>
                <label className={lbl}>Advance Paid</label>
                <input type="text" value={form.advance_paid} onChange={f('advance_paid')} placeholder="0" className={inp} />
              </div>
            </div>
          )}

          {/* ── Payment ───────────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Payment</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Method</label>
                  <select value={form.payment_method} onChange={f('payment_method')} className={inp}>
                    <option value="">— Select —</option>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select value={form.status} onChange={f('status')} className={inp}>
                    <option value="draft">Draft</option>
                    <option value="advance_paid">Advance Paid</option>
                    <option value="paid_in_full">Paid in Full</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {showBankPicker && banks.length > 0 && (
                <div>
                  <label className={lbl}>Bank</label>
                  <select value={form.bank_id} onChange={f('bank_id')} className={inp}>
                    <option value="">— Select bank —</option>
                    {banks.filter(b => b.is_active).map(b => (
                      <option key={b.id} value={b.id}>{b.bank_name}{b.account_number ? ` · ${b.account_number}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {showBankPicker && (
                <Toggle
                  label="Show bank details on invoice"
                  checked={form.show_bank_details}
                  onChange={v => setForm(p => ({ ...p, show_bank_details: v }))}
                />
              )}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Notes</p>
            <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Optional notes…" className={inp} />
          </div>

          {/* ── Options ──────────────────────────────────── */}
          <div className={card}>
            <p className={cardHead}>Options</p>
            <Toggle
              label="Show signature lines (Authorized By / Accepted By)"
              checked={form.show_signatures}
              onChange={v => setForm(p => ({ ...p, show_signatures: v }))}
            />
          </div>

          <div className="pb-8" />
        </div>
      </div>

      {/* ── Right panel: live preview ───────────────────────── */}
      <div className="w-[42%] shrink-0 bg-gray-100 border-l border-gray-100 sticky top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Live Preview</p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <InvoicePrintLayout
              invoiceNumber={invoice.invoice_number}
              date={form.date}
              currency={form.currency}
              exchangeRate={num(form.exchange_rate)}
              type={form.type}
              status={form.status}
              clientName={form.client_name     || null}
              clientAddress={form.client_address || null}
              clientPhone={form.client_phone   || null}
              salesManager={form.sales_manager || null}
              paymentMethod={form.payment_method || null}
              showBankDetails={form.show_bank_details}
              showSignatures={form.show_signatures}
              advancePaid={num(form.advance_paid)}
              notes={form.notes || null}
              items={previewItems}
              bank={previewBank}
            />
          </div>
        </div>
      </div>

    </div>
  )
}
