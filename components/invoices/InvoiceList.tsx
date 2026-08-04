'use client'

import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLog'
import type { InvoiceWithItems, InvoiceStatus, InvoiceType } from '@/types'

// ── Palette (matches the League Home / Inventory / Invoicing design) ────────
const INK    = '#14140f'
const GREEN  = '#1f6f43'
const AMBER  = '#b5761a'
const BLUE   = '#3f5f8a'
const GOLD   = '#8a6f2e'
const RED    = '#b23a2c'
const INK_30 = 'rgba(20,20,15,.3)'
const INK_35 = 'rgba(20,20,15,.35)'
const INK_42 = 'rgba(20,20,15,.42)'
const INK_45 = 'rgba(20,20,15,.45)'
const INK_55 = 'rgba(20,20,15,.55)'
const INK_60 = 'rgba(20,20,15,.6)'
const INK_08 = 'rgba(20,20,15,.08)'
const CARD_BG = '#f2f1ed'

type Tab      = 'All' | 'General' | 'Sale' | 'Advance Paid' | 'Completed' | 'Overdue' | 'Deleted'
type SortKey  = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
type ViewMode = 'list' | 'grid3' | 'grid4'
type MenuKey  = 'type' | 'client' | 'sort' | null

const TYPE_STYLE: Record<InvoiceType, { bg: string; fg: string; label: string }> = {
  sale:     { bg: 'rgba(63,95,138,.12)',  fg: BLUE, label: 'Sale' },
  sourcing: { bg: 'rgba(138,111,46,.14)', fg: GOLD, label: 'Sourcing' },
  general:  { bg: 'rgba(20,20,15,.07)',   fg: INK_60, label: 'General' },
}

const STATUS_STYLE: Record<InvoiceStatus, { label: string; fg: string }> = {
  paid_in_full: { label: 'Paid in Full', fg: GREEN },
  advance_paid: { label: 'Advance Paid', fg: AMBER },
  draft:        { label: 'Draft',        fg: INK_42 },
  overdue:      { label: 'Overdue',      fg: RED },
}

const TABS: { key: Tab; tone: string }[] = [
  { key: 'All',           tone: INK },
  { key: 'General',       tone: INK_60 },
  { key: 'Sale',          tone: BLUE },
  { key: 'Advance Paid',  tone: AMBER },
  { key: 'Completed',     tone: GREEN },
  { key: 'Overdue',       tone: RED },
  { key: 'Deleted',       tone: INK_35 },
]

const TYPES: (InvoiceType | 'all')[] = ['all', 'sale', 'general', 'sourcing']
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date_desc',   label: 'Date (newest first)' },
  { key: 'date_asc',    label: 'Date (oldest first)' },
  { key: 'amount_desc', label: 'Amount: high to low' },
  { key: 'amount_asc',  label: 'Amount: low to high' },
]

const AVATARS = ['#e2ddd0', '#d8e3d9', '#e6ded6', '#dcdde6', '#e5e2d3']

// ── Helpers ───────────────────────────────────────────────────

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
  try { return new Date(d).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function getWatchName(inv: InvoiceWithItems): string | null {
  const lineItems = (inv as unknown as Record<string, unknown>).line_items as Array<{ watch_name?: string }> | null
  if (lineItems && lineItems.length > 0 && lineItems[0].watch_name) return lineItems[0].watch_name
  if (inv.invoice_items && inv.invoice_items.length > 0) return inv.invoice_items[0].watch_name
  return null
}

function getSubtotal(inv: InvoiceWithItems): number {
  const lineItems = (inv as unknown as Record<string, unknown>).line_items as Array<{ amount?: number | null }> | null
  if (lineItems && lineItems.length > 0) return lineItems.reduce((s, it) => s + (it.amount ?? 0), 0)
  return (inv.invoice_items ?? []).reduce((s, it) => s + (it.amount ?? 0), 0)
}

// LKR-equivalent, for mixing currencies in the aggregate totals row.
function toLKR(inv: InvoiceWithItems, amount: number): number {
  if (inv.currency === 'LKR' || !inv.currency) return amount
  return amount * (inv.exchange_rate ?? 1)
}

function initials(name: string): string {
  return name.replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Icons ─────────────────────────────────────────────────────

function SearchIcon()  { return <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke={INK_45} strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5 14 14" /></svg> }
function FunnelIcon({ color }: { color: string }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="M3.4 5.2h13.2L11.4 11v4.6l-2.8 1.4V11z" /></svg> }
function ChevronIcon({ color = INK_45 }: { color?: string }) { return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3" /></svg> }
function PlusIcon()    { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M10 4.2v11.6M4.2 10h11.6" /></svg> }
function InvoiceIcon({ color = 'rgba(20,20,15,.5)' }: { color?: string }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5.4 3.4h6.2l3.4 3.4v9.8H5.4z" /><path d="M8 10.2h4M8 12.8h4" /></svg> }
function ListViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h12M4 10h12M4 14h12" /></svg> }
function Grid3ViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.2" y="5" width="3.8" height="10" rx="1.4" /><rect x="8.1" y="5" width="3.8" height="10" rx="1.4" /><rect x="13" y="5" width="3.8" height="10" rx="1.4" /></svg> }
function Grid4ViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.6" y="3.6" width="5.4" height="5.4" rx="1.6" /><rect x="11" y="3.6" width="5.4" height="5.4" rx="1.6" /><rect x="3.6" y="11" width="5.4" height="5.4" rx="1.6" /><rect x="11" y="11" width="5.4" height="5.4" rx="1.6" /></svg> }

// ── Component ─────────────────────────────────────────────────

export default function InvoiceList({ initialInvoices }: { initialInvoices: InvoiceWithItems[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)

  const [view,        setView]        = useState<ViewMode>('list')
  const [filtersOpen, setFiltersOpen]  = useState(true)
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState('')
  const [type,   setType]   = useState<InvoiceType | 'all'>('all')
  const [client, setClient] = useState<string>('all')
  const [sort,   setSort]   = useState<SortKey>('date_desc')
  const [tab,    setTab]    = useState<Tab>('All')
  const [openMenu, setOpenMenu] = useState<MenuKey>(null)

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState, setUndoState] = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-filter-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  // ── Derived data ────────────────────────────────────────────

  const clientNames = useMemo(
    () => Array.from(new Set(invoices.map(i => i.client_name).filter((v): v is string => Boolean(v)))),
    [invoices]
  )

  function matchesTabAndFilters(inv: InvoiceWithItems, forTab: Tab) {
    if (forTab === 'Deleted') return !!inv.deleted_at
    if (!!inv.deleted_at) return false
    if (forTab === 'General' || forTab === 'Sale') {
      if (inv.type !== forTab.toLowerCase()) return false
    } else if (forTab === 'Advance Paid') {
      if (inv.status !== 'advance_paid') return false
    } else if (forTab === 'Completed') {
      if (inv.status !== 'paid_in_full') return false
    } else if (forTab === 'Overdue') {
      if (inv.status !== 'overdue') return false
    }
    if (type !== 'all' && inv.type !== type) return false
    if (client !== 'all' && inv.client_name !== client) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const watch = getWatchName(inv) ?? ''
      if (
        !inv.invoice_number.toLowerCase().includes(q) &&
        !(inv.client_name ?? '').toLowerCase().includes(q) &&
        !watch.toLowerCase().includes(q)
      ) return false
    }
    return true
  }

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { All: 0, General: 0, Sale: 0, 'Advance Paid': 0, Completed: 0, Overdue: 0, Deleted: 0 }
    for (const t of TABS) c[t.key] = invoices.filter(inv => matchesTabAndFilters(inv, t.key)).length
    return c
  }, [invoices, type, client, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    let list = invoices.filter(inv => matchesTabAndFilters(inv, tab))
    switch (sort) {
      case 'date_asc':    list = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break
      case 'amount_desc': list = [...list].sort((a, b) => getSubtotal(b) - getSubtotal(a)); break
      case 'amount_asc':  list = [...list].sort((a, b) => getSubtotal(a) - getSubtotal(b)); break
      default:             list = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return list
  }, [invoices, tab, type, client, search, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const filterCount = (type !== 'all' ? 1 : 0) + (client !== 'all' ? 1 : 0)

  const invoicedTotal = useMemo(() => rows.reduce((s, r) => s + toLKR(r, getSubtotal(r)), 0), [rows])
  const outstandingTotal = useMemo(
    () => rows.reduce((s, r) => s + toLKR(r, Math.max(0, getSubtotal(r) - (r.amount_paid ?? 0))), 0),
    [rows]
  )

  // ── Sliding tab pill ────────────────────────────────────────

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const el = tabRefs.current[tab]
    if (!el) return
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    setPill(p => (p && p.left === next.left && p.width === next.width) ? p : next)
  }, [tab, filtersOpen])

  // ── Menu helpers ────────────────────────────────────────────

  function menuStyle(key: Exclude<MenuKey, null>, active: boolean) {
    const open = openMenu === key
    const on = open || active
    return {
      bg:     on ? INK : '#fff',
      fg:     on ? '#fff' : INK,
      border: on ? INK : INK_08,
      capFg:  on ? 'rgba(255,255,255,.5)' : INK_45 as string,
      chev:   on ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)',
    }
  }

  // ── Bulk delete (soft) with undo ───────────────────────────

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

  async function handleRestore(inv: InvoiceWithItems) {
    await createClient().from('invoices').update({ deleted_at: null }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: null } : i))
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const deletedAt = new Date().toISOString()
    const snapshot = invoices.filter(i => ids.includes(i.id))
    await createClient().from('invoices').update({ deleted_at: deletedAt }).in('id', ids)
    for (const inv of snapshot) {
      void logActivity({ actionType: 'invoice_deleted', entityType: 'invoice', entityId: inv.id, entityLabel: inv.invoice_number })
    }
    setInvoices(prev => prev.map(i => ids.includes(i.id) ? { ...i, deleted_at: deletedAt } : i))
    exitSelectMode()
    showUndo(`${ids.length} ${ids.length === 1 ? 'invoice' : 'invoices'} deleted`, async () => {
      await createClient().from('invoices').update({ deleted_at: null }).in('id', ids)
      setInvoices(prev => prev.map(i => ids.includes(i.id) ? { ...i, deleted_at: null } : i))
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Render ──────────────────────────────────────────────────

  const gridCols = view === 'grid3' ? 'repeat(3,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))'

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>Invoicing</h1>
          <span className="text-[13px]" style={{ color: INK_45 }}>{rows.length} of {invoices.filter(i => !i.deleted_at).length} invoices shown</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          <div className="flex gap-0.5" style={{ padding: 4, borderRadius: 14, background: '#fff', border: `1px solid ${INK_08}` }}>
            <button onClick={() => setView('list')}  title="List view"            className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'list'  ? CARD_BG : 'transparent' }}><ListViewIcon active={view === 'list'} /></button>
            <button onClick={() => setView('grid3')} title="Cards — 3 per row"    className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'grid3' ? CARD_BG : 'transparent' }}><Grid3ViewIcon active={view === 'grid3'} /></button>
            <button onClick={() => setView('grid4')} title="Cards — 4 per row"    className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'grid4' ? CARD_BG : 'transparent' }}><Grid4ViewIcon active={view === 'grid4'} /></button>
          </div>

          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className="whitespace-nowrap transition-colors"
            style={{ height: 46, padding: '0 22px', borderRadius: 999, border: `1px solid ${selectMode ? INK : INK_08}`, background: selectMode ? INK : '#fff', color: selectMode ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>

          <button
            onClick={() => setFiltersOpen(v => !v)}
            title="Filters"
            className="relative flex items-center justify-center shrink-0 transition-colors"
            style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${filtersOpen ? INK : INK_08}`, background: filtersOpen ? INK : '#fff' }}
          >
            <FunnelIcon color={filtersOpen ? '#d8f24a' : INK} />
            {filterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white" style={{ width: 14, height: 14, background: GREEN, fontSize: 9, fontWeight: 700 }}>{filterCount}</span>
            )}
          </button>

          <Link
            href="/dashboard/invoices/new"
            title="New Invoice"
            className="flex items-center justify-center shrink-0 rounded-full transition-colors"
            style={{ width: 46, height: 46, background: INK }}
          >
            <PlusIcon />
          </Link>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4" style={{ height: 60, padding: '0 22px', borderRadius: 18, background: '#fff', border: `1px solid ${INK_08}` }}>
        <SearchIcon />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search invoice number, client or watch…"
          className="border-0 outline-none bg-transparent w-full"
          style={{ fontSize: 15, color: INK }}
        />
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      {filtersOpen && (
        <div className="flex items-center gap-2.5 mb-4 flex-wrap" ref={menuRef}>

          {/* Type */}
          <div className="relative" data-filter-menu>
            {(() => { const m = menuStyle('type', type !== 'all'); return (
              <button onClick={() => setOpenMenu(v => v === 'type' ? null : 'type')} className="flex items-center gap-2 whitespace-nowrap transition-colors" style={{ height: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${m.border}`, background: m.bg, color: m.fg, fontSize: 13.5, fontWeight: 600 }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: m.capFg }}>Type</span>
                <span>{type === 'all' ? 'All types' : TYPE_STYLE[type].label}</span>
                <ChevronIcon color={m.chev} />
              </button>
            )})()}
            {openMenu === 'type' && (
              <div className="absolute z-40 flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 200, background: '#fff', border: '1px solid rgba(20,20,15,.08)', borderRadius: 16, boxShadow: '0 14px 36px rgba(20,20,15,.16)', padding: 6 }}>
                {TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setOpenMenu(null) }}
                    className="flex items-center gap-2.5 text-left rounded-[11px] whitespace-nowrap transition-colors hover:bg-[#f2f1ed]"
                    style={{ padding: '10px 12px', fontSize: 13, fontWeight: type === t ? 600 : 500, background: type === t ? CARD_BG : 'transparent', color: INK }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t === 'all' ? 'rgba(20,20,15,.25)' : TYPE_STYLE[t].fg }} />
                    {t === 'all' ? 'All types' : TYPE_STYLE[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client */}
          <div className="relative" data-filter-menu>
            {(() => { const m = menuStyle('client', client !== 'all'); return (
              <button onClick={() => setOpenMenu(v => v === 'client' ? null : 'client')} className="flex items-center gap-2 whitespace-nowrap transition-colors" style={{ height: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${m.border}`, background: m.bg, color: m.fg, fontSize: 13.5, fontWeight: 600 }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: m.capFg }}>Client</span>
                <span>{client === 'all' ? 'All clients' : client}</span>
                <ChevronIcon color={m.chev} />
              </button>
            )})()}
            {openMenu === 'client' && (
              <div className="absolute z-40 flex flex-col gap-0.5 overflow-auto" style={{ top: 52, left: 0, minWidth: 230, maxHeight: 320, background: '#fff', border: '1px solid rgba(20,20,15,.08)', borderRadius: 16, boxShadow: '0 14px 36px rgba(20,20,15,.16)', padding: 6 }}>
                <button
                  onClick={() => { setClient('all'); setOpenMenu(null) }}
                  className="text-left rounded-[11px] whitespace-nowrap transition-colors hover:bg-[#f2f1ed]"
                  style={{ padding: '10px 12px', fontSize: 13, fontWeight: client === 'all' ? 600 : 500, background: client === 'all' ? CARD_BG : 'transparent', color: INK }}
                >All clients</button>
                {clientNames.map(c => (
                  <button
                    key={c}
                    onClick={() => { setClient(c); setOpenMenu(null) }}
                    className="text-left rounded-[11px] whitespace-nowrap transition-colors hover:bg-[#f2f1ed]"
                    style={{ padding: '10px 12px', fontSize: 13, fontWeight: client === c ? 600 : 500, background: client === c ? CARD_BG : 'transparent', color: INK }}
                  >{c}</button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative" data-filter-menu>
            {(() => { const m = menuStyle('sort', sort !== 'date_desc'); return (
              <button onClick={() => setOpenMenu(v => v === 'sort' ? null : 'sort')} className="flex items-center gap-2 whitespace-nowrap transition-colors" style={{ height: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${m.border}`, background: m.bg, color: m.fg, fontSize: 13.5, fontWeight: 600 }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: m.capFg }}>Sort by</span>
                <span>{SORTS.find(s => s.key === sort)?.label}</span>
                <ChevronIcon color={m.chev} />
              </button>
            )})()}
            {openMenu === 'sort' && (
              <div className="absolute z-40 flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 236, background: '#fff', border: '1px solid rgba(20,20,15,.08)', borderRadius: 16, boxShadow: '0 14px 36px rgba(20,20,15,.16)', padding: 6 }}>
                {SORTS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => { setSort(s.key); setOpenMenu(null) }}
                    className="text-left rounded-[11px] whitespace-nowrap transition-colors hover:bg-[#f2f1ed]"
                    style={{ padding: '10px 12px', fontSize: 13, fontWeight: sort === s.key ? 600 : 500, background: sort === s.key ? CARD_BG : 'transparent', color: INK }}
                  >{s.label}</button>
                ))}
              </div>
            )}
          </div>

          {filterCount > 0 && (
            <button onClick={() => { setType('all'); setClient('all'); setOpenMenu(null) }} className="transition-colors hover:bg-[rgba(31,111,67,.08)]" style={{ height: 44, padding: '0 16px', borderRadius: 999, border: 0, background: 'transparent', fontSize: 13, fontWeight: 600, color: GREEN }}>
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* ── Tabs + totals ──────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="relative flex items-center gap-0.5">
          <div
            className="absolute top-1/2 rounded-full"
            style={{
              height: 42, background: '#fff', boxShadow: '0 1px 3px rgba(20,20,15,.09)',
              left: pill ? pill.left : 0, width: pill ? pill.width : 0,
              transform: 'translateY(-50%)', opacity: pill ? 1 : 0,
              transition: 'left .34s cubic-bezier(.22,1,.36,1), width .34s cubic-bezier(.22,1,.36,1)',
            }}
          />
          {TABS.map(t => (
            <button
              key={t.key}
              ref={el => { tabRefs.current[t.key] = el }}
              onClick={() => setTab(t.key)}
              className="relative z-[1] flex items-center gap-1.5 whitespace-nowrap"
              style={{ height: 42, lineHeight: 1, padding: '0 15px', border: 0, borderRadius: 999, background: 'transparent', fontSize: 14, fontWeight: tab === t.key ? 600 : 500, color: t.tone }}
            >
              <span>{t.key}</span>
              <span style={{ fontSize: 12.5, color: tab === t.key ? INK_45 : INK_35 }}>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-5 pr-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px]" style={{ color: INK_45 }}>Invoiced</span>
            <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em' }}>{fmt(invoicedTotal, 'LKR')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px]" style={{ color: INK_45 }}>Outstanding</span>
            <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em', color: outstandingTotal > 0 ? AMBER : GREEN }}>{fmt(outstandingTotal, 'LKR')}</span>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24" style={{ color: INK_35 }}>
          <InvoiceIcon color={INK_35} />
          <p className="text-sm mt-3">No invoices found</p>
        </div>
      ) : view === 'list' ? (

        /* ── List view ─────────────────────────────────────── */
        <div className="flex flex-col gap-2.5">
          <div className="hidden md:grid items-center px-5 gap-2" style={{ gridTemplateColumns: `${selectMode ? '28px ' : ''}minmax(300px,2.4fr) 116px minmax(190px,1.2fr) 118px 160px 132px`, fontSize: 10.5, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: INK_42 }}>
            {selectMode && <div />}
            <div>Invoice</div>
            <div>Date</div>
            <div>Client</div>
            <div>Type</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Status</div>
          </div>

          {rows.map((inv, idx) => {
            const ty     = TYPE_STYLE[inv.type] ?? TYPE_STYLE.general
            const st     = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
            const watch  = getWatchName(inv)
            const amount = getSubtotal(inv)
            const has    = !!inv.client_name
            const checked = selectedIds.has(inv.id)

            const RowInner = (
              <div
                className="grid items-center gap-2 md:gap-0 group transition-shadow"
                style={{
                  gridTemplateColumns: `${selectMode ? '28px ' : ''}minmax(300px,2.4fr) 116px minmax(190px,1.2fr) 118px 160px 132px`,
                  padding: '15px 22px', background: '#fff', borderRadius: 20,
                  border: `1px solid ${INK_08}`, boxShadow: '0 1px 2px rgba(20,20,15,.05)',
                }}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSelect(inv.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-gray-900"
                  />
                )}
                <div className="flex items-center gap-3 min-w-0 pr-5">
                  <span className="flex items-center justify-center shrink-0 rounded-xl" style={{ width: 38, height: 38, background: CARD_BG }}>
                    <InvoiceIcon />
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>{inv.invoice_number}</span>
                    <span className="truncate" style={{ fontSize: 12.5, color: watch ? INK_60 : INK_30 }}>{watch ?? '—'}</span>
                  </span>
                </div>
                <div className="whitespace-nowrap" style={{ fontSize: 13, color: INK_55 }}>{fmtDate(inv.date)}</div>
                <div className="flex items-center gap-2.5 min-w-0 pr-3.5">
                  {has && (
                    <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 32, height: 32, background: AVATARS[idx % AVATARS.length], fontSize: 11, fontWeight: 600 }}>
                      {initials(inv.client_name!)}
                    </span>
                  )}
                  <span className="truncate" style={{ fontSize: 14.5, fontWeight: 500, color: has ? INK : INK_30 }}>{inv.client_name ?? '—'}</span>
                </div>
                <div>
                  <span className="rounded-full whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', background: ty.bg, color: ty.fg }}>{ty.label}</span>
                </div>
                <div className="text-right tabular-nums whitespace-nowrap" style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-.02em', color: amount > 0 ? INK : INK_30 }}>
                  {amount > 0 ? fmt(amount, inv.currency) : '—'}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: st.fg }} />
                  <span className="whitespace-nowrap" style={{ fontSize: 13, fontWeight: 600, color: st.fg }}>{st.label}</span>
                  {inv.deleted_at && (
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); void handleRestore(inv) }} className="ml-1 shrink-0" title="Restore" style={{ fontSize: 11, fontWeight: 600, color: GREEN }}>
                      Restore
                    </button>
                  )}
                </div>
              </div>
            )

            return selectMode ? (
              <div key={inv.id} onClick={() => toggleSelect(inv.id)} className="cursor-pointer">{RowInner}</div>
            ) : (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}/edit`} className="hover:shadow-[0_10px_26px_rgba(20,20,15,.12)]" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                {RowInner}
              </Link>
            )
          })}
        </div>

      ) : (

        /* ── Grid view ─────────────────────────────────────── */
        <div className="grid gap-4" style={{ gridTemplateColumns: gridCols }}>
          {rows.map(inv => {
            const ty     = TYPE_STYLE[inv.type] ?? TYPE_STYLE.general
            const st     = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
            const watch  = getWatchName(inv)
            const amount = getSubtotal(inv)
            const checked = selectedIds.has(inv.id)

            const CardInner = (
              <div className="flex flex-col gap-3.5 rounded-[24px] p-5 cursor-pointer transition-shadow hover:shadow-[0_14px_32px_rgba(20,20,15,.14)]" style={{ background: '#fff', boxShadow: '0 2px 6px rgba(20,20,15,.07)' }}>
                <div className="flex items-center gap-3">
                  {selectMode && (
                    <input type="checkbox" checked={checked} onClick={e => e.stopPropagation()} onChange={() => toggleSelect(inv.id)} className="w-4 h-4 rounded cursor-pointer accent-gray-900" />
                  )}
                  <span className="rounded-full" style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', background: ty.bg, color: ty.fg }}>{ty.label}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="rounded-full shrink-0" style={{ width: 9, height: 9, background: st.fg }} />
                    <span className="whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, color: st.fg }}>{st.label}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="tabular-nums" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.02em' }}>{inv.invoice_number}</span>
                  <span className="truncate" style={{ fontSize: 14.5, color: inv.client_name ? INK : INK_30 }}>{inv.client_name ?? '—'}</span>
                  <span className="truncate" style={{ fontSize: 13, color: watch ? INK_60 : INK_30 }}>{watch ?? '—'}</span>
                </div>
                <div className="flex items-baseline gap-3 mt-auto pt-3.5" style={{ borderTop: `1px solid ${INK_08}` }}>
                  <span className="whitespace-nowrap" style={{ fontSize: 12.5, color: INK_42 }}>{fmtDate(inv.date)}</span>
                  <span className="ml-auto tabular-nums whitespace-nowrap" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.025em', color: amount > 0 ? INK : INK_30 }}>
                    {amount > 0 ? fmt(amount, inv.currency) : '—'}
                  </span>
                </div>
              </div>
            )

            return selectMode ? (
              <div key={inv.id} onClick={() => toggleSelect(inv.id)}>{CardInner}</div>
            ) : (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}/edit`} style={{ color: 'inherit', textDecoration: 'none' }}>{CardInner}</Link>
            )
          })}
        </div>
      )}

      {/* ── Bulk action bar ────────────────────────────────── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 text-white rounded-full shadow-2xl" style={{ background: INK, padding: '10px 10px 10px 22px' }}>
          <span className="text-sm">{selectedIds.size} selected</span>
          <button onClick={bulkDelete} className="rounded-full text-sm font-semibold transition-colors hover:bg-[#b23a2c]" style={{ background: 'rgba(178,58,44,.85)', padding: '10px 18px' }}>Delete</button>
          <button onClick={exitSelectMode} className="rounded-full text-white/60 hover:text-white transition-colors" style={{ padding: 10 }} aria-label="Cancel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" /></svg>
          </button>
        </div>
      )}

      {/* ── Undo toast ─────────────────────────────────────── */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
          <span className="text-sm">{undoState.message}</span>
          <button onClick={handleUndo} className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">Undo</button>
          <button
            onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = null; setUndoState(null) }}
            className="text-white/40 hover:text-white/80 transition-colors ml-1"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
