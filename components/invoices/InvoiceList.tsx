'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { InvoiceWithItems, InvoiceStatus, InvoiceType } from '@/types'

type Tab = 'all' | InvoiceStatus | 'deleted'

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

const TYPE_COLORS: Record<InvoiceType, string> = {
  sale:     'bg-sky-50 text-sky-600 ring-sky-200',
  general:  'bg-gray-50 text-gray-600 ring-gray-200',
  sourcing: 'bg-violet-50 text-violet-600 ring-violet-200',
}

function fmt(amount: number | null | undefined, currency: string) {
  if (amount == null) return '—'
  const n = Math.round(amount)
  if (currency === 'LKR') return 'LKR ' + n.toLocaleString('en-LK')
  if (currency === 'USD') return '$ ' + n.toLocaleString('en-US')
  if (currency === 'AED') return 'AED ' + n.toLocaleString('en-US')
  if (currency === 'AUD') return 'A$ ' + n.toLocaleString('en-US')
  return currency + ' ' + n.toLocaleString('en-US')
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' }) }
  catch { return d }
}

export default function InvoiceList({ initialInvoices }: { initialInvoices: InvoiceWithItems[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [tab, setTab]           = useState<Tab>('all')
  const [typeFilter, setTypeFilter] = useState<InvoiceType | ''>('')
  const [search, setSearch]     = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const counts = useMemo(() => {
    const all     = invoices.filter(i => !i.deleted_at).length
    const deleted = invoices.filter(i => !!i.deleted_at).length
    const draft        = invoices.filter(i => !i.deleted_at && i.status === 'draft').length
    const advance_paid = invoices.filter(i => !i.deleted_at && i.status === 'advance_paid').length
    const paid_in_full = invoices.filter(i => !i.deleted_at && i.status === 'paid_in_full').length
    const overdue      = invoices.filter(i => !i.deleted_at && i.status === 'overdue').length
    return { all, deleted, draft, advance_paid, paid_in_full, overdue }
  }, [invoices])

  const filtered = useMemo(() => {
    let list = [...invoices]

    if (tab === 'deleted') {
      list = list.filter(i => !!i.deleted_at)
    } else if (tab === 'all') {
      list = list.filter(i => !i.deleted_at)
    } else {
      list = list.filter(i => !i.deleted_at && i.status === tab)
    }

    if (typeFilter) list = list.filter(i => i.type === typeFilter)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        (i.client_name ?? '').toLowerCase().includes(q)
      )
    }

    return list
  }, [invoices, tab, typeFilter, search])

  async function handleDelete(inv: InvoiceWithItems) {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return
    setDeleting(inv.id)
    const supabase = createClient()
    await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: new Date().toISOString() } : i))
    setDeleting(null)
  }

  async function handleRestore(inv: InvoiceWithItems) {
    const supabase = createClient()
    await supabase.from('invoices').update({ deleted_at: null }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: null } : i))
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',          label: `All (${counts.all})` },
    { key: 'draft',        label: `Draft (${counts.draft})` },
    { key: 'advance_paid', label: `Advance Paid (${counts.advance_paid})` },
    { key: 'paid_in_full', label: `Paid (${counts.paid_in_full})` },
    { key: 'overdue',      label: `Overdue (${counts.overdue})` },
    { key: 'deleted',      label: `Deleted (${counts.deleted})` },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
          </svg>
          New Invoice
        </Link>
      </div>

      {/* ── Filter tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search + type filter ─────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="m10.5 10.5 3 3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
          />
        </div>

        {/* Type pills */}
        <div className="flex gap-1.5">
          {(['', 'sale', 'general', 'sourcing'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t as InvoiceType | '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {t === '' ? 'All Types' : TYPE_LABELS[t as InvoiceType]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">No invoices found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Invoice #</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Client</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Type</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => {
                const subtotal = (inv.invoice_items ?? []).reduce((s, it) => s + (it.amount ?? 0), 0)
                const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
                return (
                  <tr key={inv.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/dashboard/invoices/${inv.id}/edit`}
                        className="text-sm font-mono font-semibold text-gray-900 hover:text-gray-600 transition-colors"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm text-gray-700">{inv.client_name ?? <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm text-gray-500">{fmtDate(inv.date)}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TYPE_COLORS[inv.type] ?? TYPE_COLORS.general}`}>
                        {TYPE_LABELS[inv.type] ?? inv.type}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(subtotal || null, inv.currency)}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Link
                          href={`/dashboard/invoices/${inv.id}/print`}
                          target="_blank"
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Print"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
                            <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                          </svg>
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${inv.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                          </svg>
                        </Link>
                        {inv.deleted_at ? (
                          <button
                            onClick={() => handleRestore(inv)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                              <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                              <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={deleting === inv.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
