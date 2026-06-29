'use client'

import { useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { InvoiceWithItems, InvoiceStatus, InvoiceType } from '@/types'

type Tab      = 'all' | InvoiceStatus | 'deleted'
type SortKey  = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'number_asc' | 'number_desc'
type ViewMode = 'list' | 'tile'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; dot: string; text: string }> = {
  paid_in_full: { label: 'Paid in Full', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  advance_paid: { label: 'Advance Paid', dot: 'bg-amber-500',   text: 'text-amber-700'   },
  overdue:      { label: 'Overdue',      dot: 'bg-red-500',     text: 'text-red-700'      },
  draft:        { label: 'Draft',        dot: 'bg-gray-400',    text: 'text-gray-500'     },
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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc',   label: 'Date (newest first)' },
  { key: 'date_asc',    label: 'Date (oldest first)'  },
  { key: 'value_desc',  label: 'Value (high to low)'  },
  { key: 'value_asc',   label: 'Value (low to high)'  },
  { key: 'number_asc',  label: 'Name A → Z'           },
  { key: 'number_desc', label: 'Name Z → A'           },
]

function fmt(amount: number | null | undefined, currency: string) {
  if (amount == null) return '—'
  const n = Math.round(amount)
  if (currency === 'LKR') return 'LKR ' + n.toLocaleString('en-LK')
  if (currency === 'USD') return '$ '   + n.toLocaleString('en-US')
  if (currency === 'AED') return 'AED ' + n.toLocaleString('en-US')
  if (currency === 'AUD') return 'A$ '  + n.toLocaleString('en-US')
  return currency + ' ' + n.toLocaleString('en-US')
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' }) }
  catch { return d }
}

function getWatchName(inv: InvoiceWithItems): string | null {
  const lineItems = (inv as unknown as Record<string, unknown>).line_items as Array<{ watch_name?: string }> | null
  if (lineItems && lineItems.length > 0 && lineItems[0].watch_name) return lineItems[0].watch_name
  if (inv.invoice_items && inv.invoice_items.length > 0) return inv.invoice_items[0].watch_name
  return null
}

function getWatchPhoto(inv: InvoiceWithItems): string | null {
  const lineItems = (inv as unknown as Record<string, unknown>).line_items as Array<{ photo_url?: string | null }> | null
  if (lineItems && lineItems.length > 0 && lineItems[0].photo_url) return lineItems[0].photo_url
  if (inv.invoice_items && inv.invoice_items.length > 0) return inv.invoice_items[0].photo_url ?? null
  return null
}

function getSubtotal(inv: InvoiceWithItems): number {
  const lineItems = (inv as unknown as Record<string, unknown>).line_items as Array<{ amount?: number | null }> | null
  if (lineItems && lineItems.length > 0) return lineItems.reduce((s, it) => s + (it.amount ?? 0), 0)
  return (inv.invoice_items ?? []).reduce((s, it) => s + (it.amount ?? 0), 0)
}

// ── Icons ──────────────────────────────────────────────────────

function ListIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }
function PrintIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg> }
function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg> }

// ── Component ──────────────────────────────────────────────────

export default function InvoiceList({ initialInvoices }: { initialInvoices: InvoiceWithItems[] }) {
  const router = useRouter()
  const [invoices,   setInvoices]   = useState(initialInvoices)
  const [tab,        setTab]        = useState<Tab>('all')
  const [typeFilter, setTypeFilter] = useState<InvoiceType | ''>('')
  const [search,     setSearch]     = useState('')
  const [sort,       setSort]       = useState<SortKey>('date_desc')
  const [view,       setView]       = useState<ViewMode>('list')
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState, setUndoState]   = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  const counts = useMemo(() => ({
    all:          invoices.filter(i => !i.deleted_at).length,
    deleted:      invoices.filter(i => !!i.deleted_at).length,
    draft:        invoices.filter(i => !i.deleted_at && i.status === 'draft').length,
    advance_paid: invoices.filter(i => !i.deleted_at && i.status === 'advance_paid').length,
    paid_in_full: invoices.filter(i => !i.deleted_at && i.status === 'paid_in_full').length,
    overdue:      invoices.filter(i => !i.deleted_at && i.status === 'overdue').length,
  }), [invoices])

  const displayed = useMemo(() => {
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

    list.sort((a, b) => {
      switch (sort) {
        case 'date_asc':    return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'value_desc':  return getSubtotal(b) - getSubtotal(a)
        case 'value_asc':   return getSubtotal(a) - getSubtotal(b)
        case 'number_asc':  return a.invoice_number.localeCompare(b.invoice_number)
        case 'number_desc': return b.invoice_number.localeCompare(a.invoice_number)
        default:            return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })

    return list
  }, [invoices, tab, typeFilter, search, sort])

  // ── Undo ──────────────────────────────────────────────────────

  function showUndo(message: string, restore: () => Promise<void>) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState({ message, restore })
    undoTimerRef.current = setTimeout(() => { setUndoState(null); undoTimerRef.current = null }, 6000)
  }

  async function handleUndo() {
    if (!undoState) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    const restore = undoState.restore
    setUndoState(null)
    await restore()
  }

  // ── Actions ───────────────────────────────────────────────────

  async function handleDelete(inv: InvoiceWithItems) {
    const deletedAt = new Date().toISOString()
    await createClient().from('invoices').update({ deleted_at: deletedAt }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: deletedAt } : i))
    showUndo(`Invoice ${inv.invoice_number} deleted`, async () => {
      await createClient().from('invoices').update({ deleted_at: null }).eq('id', inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: null } : i))
    })
  }

  async function handleRestore(inv: InvoiceWithItems) {
    await createClient().from('invoices').update({ deleted_at: null }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: null } : i))
  }

  // ── Tabs config ───────────────────────────────────────────────

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

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Invoices</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setView('list')}
              title="List view"
              className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <ListIcon />
            </button>
            <button
              onClick={() => setView('tile')}
              title="Grid view"
              className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <GridIcon />
            </button>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="bg-sidebar text-white text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-[#333] transition-colors flex items-center gap-1.5 btn-press"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
            </svg>
            New Invoice
          </Link>
        </div>
      </div>

      {/* ── Status tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? t.key === 'deleted' ? 'bg-red-50 text-red-600' : 'bg-gray-900 text-white'
                : t.key === 'deleted' ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search + Type filter + Sort ───────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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

        <div className="flex gap-1.5 shrink-0">
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

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="shrink-0 bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
        >
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {displayed.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">No invoices found</p>
          </div>

        ) : view === 'tile' ? (

          /* ── Tile view ─────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {displayed.map((inv, idx) => {
              const sc    = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
              const amt   = getSubtotal(inv)
              const watch = getWatchName(inv)
              return (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/dashboard/invoices/${inv.id}/edit`)}
                  className="group relative bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-gray-200 transition-all flex flex-col gap-2.5 card-hover"
                  style={{ animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`, opacity: 0 }}
                >
                  {/* Type + status row */}
                  <div className="flex items-center justify-between gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TYPE_COLORS[inv.type] ?? TYPE_COLORS.general}`}>
                      {TYPE_LABELS[inv.type] ?? inv.type}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} title={sc.label} />
                  </div>

                  {/* Invoice # + client + watch */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 font-mono truncate">{inv.invoice_number}</p>
                    {inv.client_name && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{inv.client_name}</p>
                    )}
                    {watch && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{watch}</p>
                    )}
                  </div>

                  {/* Date + amount */}
                  <div className="flex items-end justify-between gap-2 pt-2 border-t border-gray-50">
                    <span className="text-[11px] text-gray-400 leading-none">{fmtDate(inv.date)}</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums leading-none">
                      {fmt(amt || null, inv.currency)}
                    </span>
                  </div>

                  {/* Hover actions */}
                  <div
                    className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <Link
                      href={`/dashboard/invoices/${inv.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg shadow-sm border border-gray-100 transition-colors"
                      title="Edit"
                    >
                      <EditIcon />
                    </Link>
                    {inv.deleted_at ? (
                      <button
                        onClick={() => handleRestore(inv)}
                        className="p-1.5 bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Restore"
                      >
                        <RestoreIcon />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        ) : (

          /* ── List view ─────────────────────────────────────── */
          <>
            {/* Mobile card list (FIX 6 + FIX 8) */}
            <div className="md:hidden -mx-6 px-0">
              {displayed.map((inv, idx) => {
                const sc    = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
                const amt   = getSubtotal(inv)
                const watch = getWatchName(inv)
                const photo = getWatchPhoto(inv)
                return (
                  <div
                    key={inv.id}
                    onClick={() => router.push(`/dashboard/invoices/${inv.id}/edit`)}
                    className="flex items-center gap-3 px-6 py-3 border-b border-[#E8E6E1] cursor-pointer active:bg-gray-50"
                    style={{ animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`, opacity: 0 }}
                  >
                    {/* Photo */}
                    {photo ? (
                      <Image src={photo} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                    )}
                    {/* Left: invoice # + date */}
                    <div className="w-24 shrink-0">
                      <p className="font-semibold truncate" style={{ fontSize: '13px', color: '#111' }}>{inv.invoice_number}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{fmtDate(inv.date)}</p>
                    </div>
                    {/* Middle: client + watch */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '13px', color: '#374151' }}>{inv.client_name ?? '—'}</p>
                      {watch && <p className="truncate" style={{ fontSize: '11px', color: '#6B6B6B' }}>{watch}</p>}
                    </div>
                    {/* Right: amount + status */}
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums" style={{ fontSize: '13px', color: '#C9A84C' }}>
                        {fmt(amt || null, inv.currency)}
                      </p>
                      <span className={`text-[10px] font-semibold ${sc.text}`}>{sc.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table (FIX 8: photo column) */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4 w-12" />
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Invoice #</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Client</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4 hidden md:table-cell">Watch</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4 hidden sm:table-cell">Type</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(inv => {
                  const sc    = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
                  const amt   = getSubtotal(inv)
                  const watch = getWatchName(inv)
                  const photo = getWatchPhoto(inv)
                  return (
                    <tr key={inv.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 pr-4">
                        {photo ? (
                          <Image src={photo} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Link
                          href={`/dashboard/invoices/${inv.id}/edit`}
                          className="text-sm font-mono font-semibold text-gray-900 hover:text-gray-600 transition-colors"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-gray-500">{fmtDate(inv.date)}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-gray-700">
                          {inv.client_name ?? <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 hidden md:table-cell max-w-[160px]">
                        <span className="text-sm text-gray-500 truncate block">
                          {watch ?? <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 hidden sm:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TYPE_COLORS[inv.type] ?? TYPE_COLORS.general}`}>
                          {TYPE_LABELS[inv.type] ?? inv.type}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {fmt(amt || null, inv.currency)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
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
                            <PrintIcon />
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${inv.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <EditIcon />
                          </Link>
                          {inv.deleted_at ? (
                            <button
                              onClick={() => handleRestore(inv)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RestoreIcon />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(inv)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>

        )}
      </div>

      {/* ── Undo toast ───────────────────────────────────────── */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
          <span className="text-sm">{undoState.message}</span>
          <button onClick={handleUndo} className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">Undo</button>
          <button
            onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = null; setUndoState(null) }}
            className="text-white/40 hover:text-white/80 transition-colors ml-1"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      )}

    </div>
  )
}
