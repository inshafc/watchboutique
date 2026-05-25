import Image from 'next/image'
import type { InvoiceType, InvoiceStatus } from '@/types'

export interface PrintItem {
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  year:          string | null
  condition:     string | null
  photo_url:     string | null
  amount:        number | null
}

export interface PrintBank {
  bank_name:      string
  account_name:   string | null
  account_number: string | null
  branch:         string | null
  swift_code:     string | null
}

export interface InvoicePrintLayoutProps {
  invoiceNumber:   string
  date:            string
  currency:        string
  exchangeRate:    number | null
  type:            InvoiceType
  status:          InvoiceStatus
  clientName:      string | null
  clientAddress:   string | null
  clientPhone:     string | null
  salesManager:    string | null
  paymentMethod:   string | null
  showBankDetails: boolean
  showSignatures:  boolean
  advancePaid:     number | null
  notes:           string | null
  items:           PrintItem[]
  bank?:           PrintBank | null
  logoUrl?:        string | null
}

function fmt(amount: number | null | undefined, currency: string): string {
  if (amount == null) return '—'
  const n = Math.round(amount)
  if (currency === 'LKR') return 'LKR ' + n.toLocaleString('en-LK')
  if (currency === 'USD') return '$ ' + n.toLocaleString('en-US')
  if (currency === 'AED') return 'AED ' + n.toLocaleString('en-US')
  if (currency === 'AUD') return 'A$ ' + n.toLocaleString('en-US')
  return currency + ' ' + n.toLocaleString('en-US')
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return d
  }
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; dot: string; text: string }> = {
  paid_in_full:  { label: 'Paid in Full',  dot: 'bg-emerald-500', text: 'text-emerald-700' },
  advance_paid:  { label: 'Advance Paid',  dot: 'bg-amber-500',   text: 'text-amber-700'   },
  overdue:       { label: 'Overdue',       dot: 'bg-red-500',     text: 'text-red-700'      },
  draft:         { label: 'Draft',         dot: 'bg-gray-400',    text: 'text-gray-500'     },
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  sale:     'Sale',
  general:  'General',
  sourcing: 'Sourcing',
}

export default function InvoicePrintLayout({
  invoiceNumber,
  date,
  currency,
  exchangeRate,
  type,
  status,
  clientName,
  clientAddress,
  clientPhone,
  salesManager,
  paymentMethod,
  showBankDetails,
  showSignatures,
  advancePaid,
  notes,
  items,
  bank,
  logoUrl,
}: InvoicePrintLayoutProps) {
  const subtotal   = items.reduce((s, it) => s + (it.amount ?? 0), 0)
  const balanceDue = type === 'sourcing' && advancePaid != null ? subtotal - advancePaid : null
  const sc         = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  return (
    <div id="invoice-document" className="bg-white font-sans text-gray-900">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-10 pt-10 pb-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-gray-900 leading-none">INVOICE</h1>
          <p className="text-sm text-gray-400 mt-2 font-medium tracking-widest">{invoiceNumber}</p>
        </div>
        <div className="text-right">
          {logoUrl ? (
            <div className="relative h-14 w-44 ml-auto">
              <Image src={logoUrl} alt="The Watch Boutique" fill className="object-contain object-right" />
            </div>
          ) : (
            <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">THE WATCH BOUTIQUE</p>
          )}
          {exchangeRate && (
            <p className="text-xs text-gray-400 mt-2">
              Exchange rate: 1 {currency} = LKR {exchangeRate.toLocaleString('en-LK')}
            </p>
          )}
        </div>
      </div>

      {/* Thin divider */}
      <div className="mx-10 border-t border-gray-200" />

      {/* ── Billing + Meta ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-8 px-10 py-6">
        {/* Left: billing details */}
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.18em] mb-3">Billing Details</p>
          {clientName ? (
            <p className="text-sm font-bold text-gray-900 mb-1">{clientName}</p>
          ) : (
            <p className="text-sm text-gray-300 mb-1">—</p>
          )}
          {clientPhone   && <p className="text-xs text-gray-500">{clientPhone}</p>}
          {clientAddress && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{clientAddress}</p>}
        </div>

        {/* Right: invoice metadata */}
        <div className="space-y-1.5 text-right">
          <div className="flex justify-end gap-6">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-28 text-right">Invoice #</span>
            <span className="text-xs font-semibold text-gray-700 w-32 text-right">{invoiceNumber}</span>
          </div>
          <div className="flex justify-end gap-6">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-28 text-right">Date</span>
            <span className="text-xs text-gray-700 w-32 text-right">{fmtDate(date)}</span>
          </div>
          <div className="flex justify-end gap-6">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-28 text-right">Type</span>
            <span className="text-xs text-gray-700 w-32 text-right">{TYPE_LABELS[type]}</span>
          </div>
          {salesManager && (
            <div className="flex justify-end gap-6">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-28 text-right">Sales Manager</span>
              <span className="text-xs text-gray-700 w-32 text-right">{salesManager}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Line Items ──────────────────────────────────────────── */}
      <div className="px-10 mb-0">
        {/* Table header */}
        <div className="bg-gray-900 text-white grid grid-cols-[1fr_auto_auto] px-4 py-2.5 rounded-t-xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">Item</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] w-12 text-center">Qty</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] w-28 text-right">Amount</span>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="border-x border-b border-gray-100 rounded-b-xl px-4 py-6 text-center text-sm text-gray-300">
            No items added
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className={`border-x border-b border-gray-100 ${i === items.length - 1 ? 'rounded-b-xl' : ''} px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-4 items-center`}>
              <div className="flex items-center gap-3 min-w-0">
                {item.photo_url ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-50">
                    <Image src={item.photo_url} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-50 shrink-0 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.watch_name || '—'}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {item.reference    && <span className="text-[11px] text-gray-400">Ref: {item.reference}</span>}
                    {item.serial_number && <span className="text-[11px] text-gray-400">SN: {item.serial_number}</span>}
                    {item.year         && <span className="text-[11px] text-gray-400">Year: {item.year}</span>}
                    {item.condition    && <span className="text-[11px] text-gray-400">{item.condition}</span>}
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500 w-12 text-center">1</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums w-28 text-right">
                {fmt(item.amount, currency)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Totals ──────────────────────────────────────────────── */}
      <div className="px-10 mt-4">
        <div className="bg-gray-900 text-white flex items-center justify-between px-5 py-3.5 rounded-xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">Total</span>
          <span className="text-lg font-black tabular-nums">{fmt(subtotal, currency)}</span>
        </div>

        {/* Advance paid + balance due (sourcing only) */}
        {type === 'sourcing' && advancePaid != null && (
          <div className="mt-1 space-y-0">
            <div className="flex items-center justify-between px-5 py-2 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">Advance Paid</span>
              <span className="text-sm font-semibold text-gray-700 tabular-nums">{fmt(advancePaid, currency)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-2 border border-gray-200 rounded-xl mt-1">
              <span className="text-xs font-semibold text-gray-700">Balance Due</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(balanceDue, currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment ─────────────────────────────────────────────── */}
      <div className="px-10 mt-5">
        <div className="flex items-start gap-8">
          {/* Payment method + status */}
          <div className="space-y-1.5">
            {paymentMethod && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-32">Payment Method</span>
                <span className="text-xs text-gray-700">{paymentMethod}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] w-32">Status</span>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${sc.text}`}>
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
          </div>

          {/* Bank details (if toggled) */}
          {showBankDetails && bank && (
            <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-2">Bank Details</p>
              <div className="space-y-0.5 text-xs text-gray-600">
                <p className="font-semibold text-gray-900">{bank.bank_name}</p>
                {bank.account_name   && <p>Account Name: {bank.account_name}</p>}
                {bank.account_number && <p>Account No: {bank.account_number}</p>}
                {bank.branch         && <p>Branch: {bank.branch}</p>}
                {bank.swift_code     && <p>SWIFT: {bank.swift_code}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────── */}
      {notes && (
        <div className="px-10 mt-5">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1.5">Notes</p>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* ── Signatures ──────────────────────────────────────────── */}
      {showSignatures && (
        <div className="px-10 mt-8 flex justify-end gap-16">
          {['Authorized By', 'Accepted By'].map(label => (
            <div key={label} className="text-center">
              <div className="w-40 border-b border-gray-300 mb-2" />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="mt-8 bg-gray-900 px-10 py-4">
        <p className="text-xs text-gray-300 text-center tracking-wide">
          The Watch Boutique &nbsp;·&nbsp; 66, Kynsey Road, Colombo, Sri Lanka
        </p>
      </div>

    </div>
  )
}
