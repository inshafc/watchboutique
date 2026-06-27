'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateInvoiceHTML } from '@/lib/generateInvoiceHTML'
// invoice-photos bucket must exist in Supabase storage with public access
import InvoicePrintLayout from './InvoicePrintLayout'
import type { InvoiceWithItems, InvoiceType, InvoiceStatus, SavedBank, SalesManager } from '@/types'

const inp      = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl      = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card     = 'bg-white border border-gray-100 rounded-2xl p-5'
const cardHead = 'text-xs font-semibold text-gray-400 uppercase tracking-wider'

const CURRENCIES  = ['LKR', 'USD', 'AED', 'AUD'] as const
const PAY_METHODS = ['Cash', 'Bank Transfer', 'Cash + Bank', 'Installment']
const CONDITIONS  = ['Brand New', 'Excellent', 'Good', 'Fair', 'Poor']

interface LineItemJson {
  watch_id?:     string | null
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  year:          string | null
  condition:     string | null
  set_details?:  string | null
  photo_url:     string | null
  amount:        number | null
  amount_paid?:  number | null
  sort_order:    number
}

interface WatchForInvoice {
  id:            string
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  date_on_card:  string | null
  condition:     string | null
  set_details:   string | null
  photos:        string[] | null
  selling_price: number | null
}

interface LineItem {
  _key:          string
  watch_id:      string
  watch_name:    string
  reference:     string
  serial_number: string
  year:          string
  condition:     string
  set_details:   string
  photo_url:     string
  amount_paid:   string
  amount:        string
}

function emptyItem(): LineItem {
  return {
    _key:          Math.random().toString(36).slice(2),
    watch_id:      '',
    watch_name:    '',
    reference:     '',
    serial_number: '',
    year:          '',
    condition:     '',
    set_details:   '',
    photo_url:     '',
    amount_paid:   '',
    amount:        '',
  }
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    </svg>
  )
}

export default function InvoiceEditorClient({
  invoice,
  salesManagers = [],
  banks = [],
  watches = [],
  lineItemsJson = null,
}: {
  invoice:         InvoiceWithItems
  salesManagers?:  SalesManager[]
  banks?:          SavedBank[]
  watches?:        WatchForInvoice[]
  lineItemsJson?:  LineItemJson[] | null
}) {
  const [savedOnce, setSavedOnce] = useState(
    invoice.invoice_items.length > 0 || invoice.status !== 'draft'
  )

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(() => {
    const fv = (invoice as unknown as Record<string, unknown>).field_visibility as Record<string, boolean> | null ?? {}
    return {
      phone:         fv.phone         ?? true,
      address:       fv.address       ?? true,
      sales_manager: fv.sales_manager ?? true,
      notes:         fv.notes         ?? true,
      terms:         fv.terms         ?? true,
      signatures:    fv.signatures    ?? (invoice.show_signatures ?? false),
    }
  })

  const [form, setForm] = useState({
    date:                 invoice.date                   ?? new Date().toISOString().split('T')[0],
    currency:             (invoice.currency ?? 'LKR') as typeof CURRENCIES[number],
    exchange_rate:        invoice.exchange_rate?.toString() ?? '',
    type:                 invoice.type                   as InvoiceType,
    client_name:          invoice.client_name            ?? '',
    client_address:       invoice.client_address         ?? '',
    client_phone:         invoice.client_phone           ?? '',
    sales_manager:        invoice.sales_manager          ?? '',
    payment_method:       invoice.payment_method         ?? '',
    bank_id:              invoice.bank_id                ?? '',
    show_bank_details:    invoice.show_bank_details      ?? false,
    status:               invoice.status                 as InvoiceStatus,
    advance_paid:         invoice.advance_paid?.toString() ?? '',
    notes:                invoice.notes                  ?? '',
    terms_and_conditions: ((invoice as unknown as Record<string, unknown>).terms_and_conditions as string) ?? '',
  })

  const [items, setItems] = useState<LineItem[]>(() => {
    if (invoice.invoice_items.length > 0) {
      return invoice.invoice_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(it => ({
          _key:          it.id,
          watch_id:      '',
          watch_name:    it.watch_name    ?? '',
          reference:     it.reference     ?? '',
          serial_number: it.serial_number ?? '',
          year:          it.year          ?? '',
          condition:     it.condition     ?? '',
          set_details:   '',
          photo_url:     it.photo_url     ?? '',
          amount_paid:   it.amount?.toString() ?? '',
          amount:        it.amount?.toString() ?? '',
        }))
    }
    if (lineItemsJson && lineItemsJson.length > 0) {
      return [...lineItemsJson]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(it => ({
          _key:          Math.random().toString(36).slice(2),
          watch_id:      it.watch_id      ?? '',
          watch_name:    it.watch_name    ?? '',
          reference:     it.reference     ?? '',
          serial_number: it.serial_number ?? '',
          year:          it.year          ?? '',
          condition:     it.condition     ?? '',
          set_details:   it.set_details   ?? '',
          photo_url:     it.photo_url     ?? '',
          amount_paid:   (it.amount_paid ?? it.amount)?.toString() ?? '',
          amount:        it.amount?.toString() ?? '',
        }))
    }
    return [emptyItem()]
  })

  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [saved,        setSaved]        = useState(false)
  const [uploadingIdx,      setUploadingIdx]      = useState<number | null>(null)
  const [photoDialogIdx,    setPhotoDialogIdx]    = useState<number | null>(null)
  const [dialogWatchPhotos, setDialogWatchPhotos] = useState<string[]>([])
  const [loadingPhotos,     setLoadingPhotos]     = useState(false)

  useEffect(() => {
    if (photoDialogIdx === null) { setDialogWatchPhotos([]); return }
    const watchId = items[photoDialogIdx]?.watch_id
    if (!watchId) { setDialogWatchPhotos([]); return }
    setLoadingPhotos(true)
    const supabase = createClient()
    supabase
      .from('watches')
      .select('photos')
      .eq('id', watchId)
      .single()
      .then(({ data }) => {
        setDialogWatchPhotos((data?.photos as string[] | null) ?? [])
        setLoadingPhotos(false)
      })
  }, [photoDialogIdx, items])

  async function handlePhotoReplace(itemKey: string, idx: number, file: File) {
    setUploadingIdx(idx)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${invoice.id}/${itemKey}.${ext}`
    const { data, error: upErr } = await supabase.storage
      .from('invoice-photos')
      .upload(path, file, { upsert: true })
    if (!upErr && data) {
      const { data: urlData } = supabase.storage.from('invoice-photos').getPublicUrl(data.path)
      updateItem(idx, 'photo_url', urlData.publicUrl)
    }
    setUploadingIdx(null)
  }

  function toggleVisibility(key: string) {
    setFieldVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function updateItem(idx: number, key: keyof Omit<LineItem, '_key'>, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it))
  }

  function selectWatch(idx: number, watchId: string) {
    const w = watches.find(w => w.id === watchId)
    if (!w) {
      updateItem(idx, 'watch_id', '')
      return
    }
    const year = w.date_on_card ? new Date(w.date_on_card + 'T00:00:00').getFullYear().toString() : ''
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      watch_id:      w.id,
      watch_name:    w.watch_name,
      reference:     w.reference     ?? '',
      serial_number: w.serial_number ?? '',
      year,
      condition:     w.condition     ?? '',
      set_details:   w.set_details   ?? '',
      photo_url:     w.photos?.[0]   ?? '',
      amount:        w.selling_price != null ? String(w.selling_price) : it.amount,
    } : it))
  }

  const selectedBank   = banks.find(b => b.id === form.bank_id) ?? null
  const showBankPicker = form.payment_method === 'Bank Transfer' || form.payment_method === 'Cash + Bank'

  const num = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return isNaN(v) ? null : v }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const validItems = items.filter(it => it.watch_name.trim())
    const lineItemsPayload: LineItemJson[] = validItems.map((it, i) => ({
      watch_id:      it.watch_id.trim()     || null,
      watch_name:    it.watch_name.trim(),
      reference:     it.reference.trim()     || null,
      serial_number: it.serial_number.trim() || null,
      year:          it.year.trim()           || null,
      condition:     it.condition             || null,
      set_details:   it.set_details.trim()   || null,
      photo_url:     it.photo_url.trim()      || null,
      amount:        num(it.amount),
      amount_paid:   it.amount_paid.trim() ? num(it.amount_paid) : null,
      sort_order:    i,
    }))

    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        date:                 form.date,
        currency:             form.currency,
        exchange_rate:        num(form.exchange_rate),
        type:                 form.type,
        client_name:          form.client_name.trim()    || null,
        client_address:       form.client_address.trim() || null,
        client_phone:         form.client_phone.trim()   || null,
        sales_manager:        form.sales_manager.trim()  || null,
        payment_method:       form.payment_method        || null,
        bank_id:              showBankPicker && form.bank_id ? form.bank_id : null,
        show_bank_details:    form.show_bank_details,
        show_signatures:      fieldVisibility.signatures,
        status:               form.status,
        advance_paid:         form.type === 'sourcing' ? num(form.advance_paid) : null,
        notes:                form.notes.trim()                 || null,
        terms_and_conditions: form.terms_and_conditions.trim() || null,
        field_visibility:     fieldVisibility,
        line_items:           lineItemsPayload,
      })
      .eq('id', invoice.id)

    if (invErr) { setError(invErr.message); setSaving(false); return }

    // Also keep invoice_items table in sync for backward compatibility
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)
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
    setSavedOnce(true)
    setTimeout(() => setSaved(false), 2000)
  }, [form, items, invoice.id, showBankPicker, fieldVisibility])

  const previewItems = items.map(it => ({
    watch_name:    it.watch_name,
    reference:     it.reference     || null,
    serial_number: it.serial_number || null,
    year:          it.year          || null,
    condition:     it.condition     || null,
    photo_url:     it.photo_url     || null,
    amount:        num(it.amount),
    amount_paid:   it.amount_paid.trim() ? num(it.amount_paid) : (num(it.amount) ?? null),
  }))

  const previewBank = showBankPicker && form.show_bank_details && selectedBank
    ? { bank_name: selectedBank.bank_name, account_name: selectedBank.account_name, account_number: selectedBank.account_number, branch: selectedBank.branch, swift_code: selectedBank.swift_code }
    : null

  const saveBtn = (
    <button
      onClick={handleSave}
      disabled={saving}
      className="w-full bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Invoice'}
    </button>
  )

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
            {savedOnce && (
              <>
                <Link
                  href={`/dashboard/invoices/${invoice.id}/print`}
                  target="_blank"
                  className="text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg>
                  Print
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const _inv = invoice as unknown as Record<string, unknown>
                    const derivedStatus: string =
                      form.status === 'paid_in_full' ||
                      _inv.stage === 'Delivered' ||
                      _inv.payment_status === 'paid'
                        ? 'paid_in_full'
                        : form.status === 'advance_paid'
                        ? 'advance_paid'
                        : form.status
                    const html = generateInvoiceHTML({
                      invoiceNumber:      invoice.invoice_number,
                      date:               form.date,
                      currency:           form.currency,
                      type:               form.type,
                      status:             derivedStatus,
                      clientName:         form.client_name    || null,
                      clientPhone:        form.client_phone   || null,
                      clientAddress:      form.client_address || null,
                      salesManager:       form.sales_manager  || null,
                      paymentMethod:      form.payment_method || null,
                      showBankDetails:    form.show_bank_details,
                      bank:               previewBank,
                      advancePaid:        form.type === 'sourcing' ? num(form.advance_paid) : null,
                      notes:              form.notes              || null,
                      termsAndConditions: form.terms_and_conditions || null,
                      fieldVisibility: {
                        phone:         fieldVisibility.phone         ?? true,
                        address:       fieldVisibility.address       ?? true,
                        sales_manager: fieldVisibility.sales_manager ?? true,
                        notes:         fieldVisibility.notes         ?? true,
                        terms:         fieldVisibility.terms         ?? true,
                        signatures:    fieldVisibility.signatures    ?? false,
                      },
                      items:              previewItems,
                    })
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                    const url  = URL.createObjectURL(blob)
                    window.open(url, '_blank')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                  Download
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-semibold text-white bg-gray-900 hover:bg-black px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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
            <p className={cardHead + ' mb-4'}>Invoice</p>
            <div className="space-y-4">
              <div>
                <label className={lbl}>Invoice Number</label>
                <div className="w-full bg-gray-50 border border-gray-100 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-mono select-all">
                  {invoice.invoice_number}
                </div>
              </div>
              <div>
                <label className={lbl}>Type</label>
                <select value={form.type} onChange={f('type')} className={inp}>
                  <option value="sale">Sale</option>
                  <option value="general">General</option>
                  <option value="sourcing">Sourcing</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Date</label>
                  <input type="date" value={form.date} onChange={f('date')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Currency</label>
                  <select value={form.currency} onChange={f('currency')} className={inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {form.currency !== 'LKR' && (
                <div>
                  <label className={lbl}>Exchange Rate (1 {form.currency} = LKR)</label>
                  <input type="number" value={form.exchange_rate} onChange={f('exchange_rate')} placeholder="e.g. 320" className={inp} />
                </div>
              )}
            </div>
          </div>

          {/* ── Billing Details ──────────────────────────── */}
          <div className={card}>
            <p className={cardHead + ' mb-4'}>Billing Details</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Client Name</label>
                {form.type === 'sale' ? (
                  <div className="flex items-center gap-2 w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 text-sm">
                    <span className="flex-1 text-gray-700 truncate">{form.client_name || <span className="text-gray-300">—</span>}</span>
                    <LockIcon />
                  </div>
                ) : (
                  <input type="text" value={form.client_name} onChange={f('client_name')} placeholder="Client name" className={inp} />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={lbl} style={{ marginBottom: 0 }}>Phone</span>
                  <button type="button" onClick={() => toggleVisibility('phone')} aria-label={fieldVisibility.phone ? 'Hide phone from invoice' : 'Show phone on invoice'} title={fieldVisibility.phone ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.phone ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                    {fieldVisibility.phone ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                {form.type === 'sale' ? (
                  <div className={`flex items-center gap-2 w-full border rounded-xl px-3.5 py-2.5 text-sm transition-opacity ${fieldVisibility.phone ? 'bg-gray-50 border-gray-100 text-gray-700' : 'bg-gray-50 border-gray-100 text-gray-300 opacity-50'}`}>
                    <span className="flex-1 truncate">{form.client_phone || '—'}</span>
                    <LockIcon />
                  </div>
                ) : (
                  <input type="text" value={form.client_phone} onChange={f('client_phone')} placeholder="Phone number" className={`${inp} ${!fieldVisibility.phone ? 'opacity-50' : ''}`} />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={lbl} style={{ marginBottom: 0 }}>Address</span>
                  <button type="button" onClick={() => toggleVisibility('address')} aria-label={fieldVisibility.address ? 'Hide address from invoice' : 'Show address on invoice'} title={fieldVisibility.address ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.address ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                    {fieldVisibility.address ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                {form.type === 'sale' ? (
                  <div className={`flex items-center gap-2 w-full border rounded-xl px-3.5 py-2.5 text-sm transition-opacity ${fieldVisibility.address ? 'bg-gray-50 border-gray-100 text-gray-700' : 'bg-gray-50 border-gray-100 text-gray-300 opacity-50'}`}>
                    <span className="flex-1 truncate">{form.client_address || '—'}</span>
                    <LockIcon />
                  </div>
                ) : (
                  <input type="text" value={form.client_address} onChange={f('client_address')} placeholder="Address" className={`${inp} ${!fieldVisibility.address ? 'opacity-50' : ''}`} />
                )}
              </div>
            </div>
          </div>

          {/* ── Sale Details ──────────────────────────────── */}
          <div className={card}>
            <p className={cardHead + ' mb-4'}>Sale Details</p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={lbl} style={{ marginBottom: 0 }}>Sales Manager</span>
                <button type="button" onClick={() => toggleVisibility('sales_manager')} aria-label={fieldVisibility.sales_manager ? 'Hide sales manager from invoice' : 'Show sales manager on invoice'} title={fieldVisibility.sales_manager ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.sales_manager ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                  {fieldVisibility.sales_manager ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
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
            <p className={cardHead + ' mb-4'}>Line Items</p>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={item._key} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">Item {idx + 1}</p>
                    {items.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                      </button>
                    )}
                  </div>

                  {/* Watch selector — Sale invoices only */}
                  {form.type === 'sale' && watches.length > 0 && (
                    <div>
                      <label className={lbl}>Select Watch</label>
                      <select
                        value={item.watch_id}
                        onChange={e => selectWatch(idx, e.target.value)}
                        className={inp}
                      >
                        <option value="">Select watch…</option>
                        {watches.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.watch_name}{w.reference ? ` · ${w.reference}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Photo thumbnail */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0">
                      {item.photo_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() => updateItem(idx, 'photo_url', '')}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none transition-colors"
                            title="Remove photo"
                          >×</button>
                        </>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoDialogIdx(idx)}
                      className="text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      {item.photo_url ? 'Replace' : 'Add Photo'}
                    </button>
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
                    <label className={lbl}>Set Details</label>
                    <input type="text" value={item.set_details} onChange={e => updateItem(idx, 'set_details', e.target.value)} placeholder="Box, papers, etc." className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Amount</label>
                    <input type="text" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} placeholder="0" className={inp} />
                  </div>
                </div>
              ))}

              {items.length < 3 && (
                <button
                  type="button"
                  onClick={() => setItems(prev => [...prev, emptyItem()])}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                  Add Line Item
                </button>
              )}
              {items.length >= 3 && (
                <p className="text-xs text-gray-300">Maximum 3 line items</p>
              )}
            </div>
          </div>

          {/* ── Amount Paid ───────────────────────────────── */}
          {items.some(it => it.watch_name.trim()) && (
            <div className={card}>
              <p className={cardHead + ' mb-4'}>Amount Paid</p>
              <div className="space-y-3">
                {items.filter(it => it.watch_name.trim()).map((item) => {
                  const realIdx = items.indexOf(item)
                  return (
                    <div key={item._key} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 truncate flex-1 min-w-0">{item.watch_name}</span>
                      <input
                        type="text"
                        value={item.amount_paid}
                        onChange={e => updateItem(realIdx, 'amount_paid', e.target.value)}
                        placeholder={item.amount || '0'}
                        className="w-36 shrink-0 bg-white border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Sourcing Advance Payment ──────────────────── */}
          {form.type === 'sourcing' && (
            <div className={card}>
              <p className={cardHead + ' mb-4'}>Advance Payment</p>
              <div>
                <label className={lbl}>Advance Paid</label>
                <input type="text" value={form.advance_paid} onChange={f('advance_paid')} placeholder="0" className={inp} />
              </div>
            </div>
          )}

          {/* ── Payment ───────────────────────────────────── */}
          <div className={card}>
            <p className={cardHead + ' mb-4'}>Payment</p>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Show bank details on invoice</span>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, show_bank_details: !p.show_bank_details }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${form.show_bank_details ? 'bg-gray-900 border-gray-900' : 'bg-gray-200 border-gray-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform mt-px ${form.show_bank_details ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────── */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <p className={cardHead}>Notes</p>
              <button type="button" onClick={() => toggleVisibility('notes')} aria-label={fieldVisibility.notes ? 'Hide notes from invoice' : 'Show notes on invoice'} title={fieldVisibility.notes ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.notes ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                {fieldVisibility.notes ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
            <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Optional notes…" className={inp} />
          </div>

          {/* ── Terms & Conditions ───────────────────────── */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <p className={cardHead}>Terms &amp; Conditions</p>
              <button type="button" onClick={() => toggleVisibility('terms')} aria-label={fieldVisibility.terms ? 'Hide terms from invoice' : 'Show terms on invoice'} title={fieldVisibility.terms ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.terms ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                {fieldVisibility.terms ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
            <textarea value={form.terms_and_conditions} onChange={f('terms_and_conditions')} rows={4} placeholder="e.g. All sales are final. No returns accepted…" className={inp} />
          </div>

          {/* ── Signatures ───────────────────────────────── */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className={cardHead}>Signatures</p>
              <button type="button" onClick={() => toggleVisibility('signatures')} aria-label={fieldVisibility.signatures ? 'Hide signatures from invoice' : 'Show signatures on invoice'} title={fieldVisibility.signatures ? 'Hide from invoice' : 'Show on invoice'} className={`transition-colors ${fieldVisibility.signatures ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 hover:text-gray-500'}`}>
                {fieldVisibility.signatures ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
            {fieldVisibility.signatures && (
              <p className="text-xs text-gray-400 mt-2">Authorised By / Customer Signature lines will appear on the invoice.</p>
            )}
          </div>

          {/* ── Save ──────────────────────────────────────── */}
          <div className="pt-2 pb-8">
            {saveBtn}
          </div>

        </div>
      </div>

      {/* ── Right panel: live preview ───────────────────────── */}
      <div className="w-[42%] shrink-0 border-l border-gray-100 sticky top-0 h-screen overflow-y-auto" style={{ background: '#f0f0f0' }}>
        <div className="p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Live Preview</p>
          <div className="shadow-2xl" style={{ zoom: 0.55, borderRadius: '2px', overflow: 'hidden' }}>
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
              showSignatures={fieldVisibility.signatures}
              advancePaid={num(form.advance_paid)}
              notes={form.notes || null}
              termsAndConditions={form.terms_and_conditions || null}
              items={previewItems}
              bank={previewBank}
              logoUrl={null}
              fieldVisibility={fieldVisibility}
            />
          </div>
        </div>
      </div>

      {/* ── PHOTO DIALOG ─────────────────────────────────── */}
      {photoDialogIdx !== null && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoDialogIdx(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choose Photo"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900">Choose Photo</h3>
              <button type="button" aria-label="Close dialog" onClick={() => setPhotoDialogIdx(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
              </button>
            </div>

            {/* Section 1: Watch Photos — Sale invoices only */}
            {form.type === 'sale' && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Watch Photos</p>
                  {loadingPhotos ? (
                    <div className="flex items-center justify-center h-16">
                      <svg className="w-5 h-5 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    </div>
                  ) : dialogWatchPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {dialogWatchPhotos.map((url, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => { updateItem(photoDialogIdx, 'photo_url', url); setPhotoDialogIdx(null) }}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-900 transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{items[photoDialogIdx]?.watch_id ? 'No photos found for this watch' : 'No watch selected'}</p>
                  )}
                </div>
                <div className="h-px bg-gray-100 mb-4" />
              </>
            )}

            {/* Section 2: Upload New */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upload New</p>
              <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition-colors">
                <span className="text-xs text-gray-400 pointer-events-none">
                  {uploadingIdx === photoDialogIdx ? 'Uploading…' : 'Click or drag to upload'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    const capturedIdx = photoDialogIdx
                    if (file && capturedIdx !== null) {
                      await handlePhotoReplace(items[capturedIdx]._key, capturedIdx, file)
                      setPhotoDialogIdx(null)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setPhotoDialogIdx(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-900 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
