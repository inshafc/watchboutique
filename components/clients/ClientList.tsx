'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient as supabase } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { Client } from '@/types'

export { avatarColor, getInitials }

// ── Types ────────────────────────────────────────────────────

type Filter   = 'All' | 'Club TWB' | 'Retail' | 'Reseller' | 'Deleted'
type SortKey  = 'created_desc' | 'name_asc' | 'name_desc' | 'sales_desc' | 'sales_asc' | 'type_asc' | 'type_desc' | 'manager_asc' | 'manager_desc'
type ViewMode = 'list' | 'grid'

function clientRating(dealCount: number, isClubTwb: boolean): number {
  if (dealCount >= 10) return 10
  if (dealCount >= 5 || isClubTwb) return 9
  if (dealCount >= 3) return 7
  if (dealCount >= 2) return 5
  if (dealCount >= 1) return 3
  return 0
}

function PoliticalBadge() {
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 ring-1 ring-inset ring-red-200 whitespace-nowrap">
      Political
    </span>
  )
}

function AtRiskBadge() {
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200 whitespace-nowrap">
      At Risk
    </span>
  )
}

function HighPotentialBadge() {
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
      High Potential
    </span>
  )
}

function DotsIcon() { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg> }

function SortHeader({ label, currentSort, ascKey, descKey, onSort }: { label: string; currentSort: SortKey; ascKey: SortKey; descKey: SortKey; onSort: (k: SortKey) => void }) {
  const isAsc  = currentSort === ascKey
  const isDesc = currentSort === descKey
  const active = isAsc || isDesc
  return (
    <button
      onClick={() => onSort(isAsc ? descKey : ascKey)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${active ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      <span className="flex flex-col gap-px leading-none">
        <svg className={`w-2 h-2 ${isAsc ? 'text-gray-800' : 'text-gray-300'}`} viewBox="0 0 8 5" fill="currentColor"><path d="M4 0 8 5H0z"/></svg>
        <svg className={`w-2 h-2 ${isDesc ? 'text-gray-800' : 'text-gray-300'}`} viewBox="0 0 8 5" fill="currentColor"><path d="M4 5 0 0h8z"/></svg>
      </span>
    </button>
  )
}

// ── Badges ───────────────────────────────────────────────────

export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${
      type === 'Retail'
        ? 'bg-sky-50 text-sky-700 ring-sky-200'
        : 'bg-orange-50 text-orange-700 ring-orange-200'
    }`}>
      {type}
    </span>
  )
}

export function ClubTWBBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 whitespace-nowrap">
      ★ Club TWB
    </span>
  )
}

export function VIPBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200 whitespace-nowrap">
      ★ VIP
    </span>
  )
}

// ── Lead referral colour ──────────────────────────────────────

const LEAD_COLORS: Record<string, string> = {
  'Socials':  'bg-purple-50 text-purple-700 ring-purple-200',
  'Referral': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Website':  'bg-sky-50 text-sky-700 ring-sky-200',
  'Hotline':  'bg-rose-50 text-rose-700 ring-rose-200',
}

function LeadBadge({ lead }: { lead: string | null }) {
  if (!lead) return <span className="text-gray-300">—</span>
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${LEAD_COLORS[lead] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
      {lead}
    </span>
  )
}

// ── Icons ────────────────────────────────────────────────────

function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function SearchIcon()  { return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function ListIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }

function ActionBtn({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-gray-300 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

// ── Component ────────────────────────────────────────────────

export default function ClientList({
  clients: initial,
  clientSales = {},
  clientDealCounts = {},
}: {
  clients: Client[]
  clientSales?: Record<string, number>
  clientDealCounts?: Record<string, number>
}) {
  const router = useRouter()
  const [clients, setClients] = useState(initial)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<Filter>('All')
  const [sort,    setSort]    = useState<SortKey>('created_desc')
  const [view,    setView]    = useState<ViewMode>('list')
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(4)
  const [typeFilter,  setTypeFilter]  = useState<'Retail' | 'Reseller' | 'Club TWB' | null>(null)
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null)

  // Close grid menu on outside click
  useEffect(() => {
    if (!openMenuId) return
    function close() { setOpenMenuId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState,   setUndoState]   = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Deleted clients (lazy-loaded)
  const [deletedClients, setDeletedClients] = useState<Client[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  // Load deleted clients when switching to the Deleted tab
  useEffect(() => {
    if (filter === 'Deleted' && deletedClients === null && !loadingDeleted) {
      void loadDeletedClients()
    }
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    let list = clients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.whatsapp ?? '').includes(q)
      )
    }
    switch (filter) {
      case 'Club TWB': list = list.filter(c => c.club_twb); break
      case 'Retail':   list = list.filter(c => c.client_type === 'Retail'); break
      case 'Reseller': list = list.filter(c => c.client_type === 'Reseller'); break
    }
    if (typeFilter === 'Retail')   list = list.filter(c => c.client_type === 'Retail')
    if (typeFilter === 'Reseller') list = list.filter(c => c.client_type === 'Reseller')
    if (typeFilter === 'Club TWB') list = list.filter(c => c.club_twb)
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name_asc':     return a.name.localeCompare(b.name)
        case 'name_desc':    return b.name.localeCompare(a.name)
        case 'sales_desc':   return (clientSales[b.id] ?? 0) - (clientSales[a.id] ?? 0)
        case 'sales_asc':    return (clientSales[a.id] ?? 0) - (clientSales[b.id] ?? 0)
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'type_asc':     return (a.client_type ?? '').localeCompare(b.client_type ?? '')
        case 'type_desc':    return (b.client_type ?? '').localeCompare(a.client_type ?? '')
        case 'manager_asc':  return (a.sales_manager ?? '').localeCompare(b.sales_manager ?? '')
        case 'manager_desc': return (b.sales_manager ?? '').localeCompare(a.sales_manager ?? '')
      }
      return 0
    })
    return list
  }, [clients, search, filter, sort, clientSales, typeFilter])

  const counts: Record<Filter, number> = {
    'All':      clients.length,
    'Club TWB': clients.filter(c => c.club_twb).length,
    'Retail':   clients.filter(c => c.client_type === 'Retail').length,
    'Reseller': clients.filter(c => c.client_type === 'Reseller').length,
    'Deleted':  deletedClients?.length ?? 0,
  }

  // ── Undo ─────────────────────────────────────────────────

  function showUndo(message: string, restore: () => Promise<void>) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState({ message, restore })
    undoTimerRef.current = setTimeout(() => {
      setUndoState(null)
      undoTimerRef.current = null
    }, 6000)
  }

  async function handleUndo() {
    if (!undoState) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    const restore = undoState.restore
    setUndoState(null)
    await restore()
  }

  // ── Deleted clients ───────────────────────────────────────

  async function loadDeletedClients() {
    setLoadingDeleted(true)
    const db = supabase()
    const { data } = await db
      .from('clients')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedClients((data ?? []) as Client[])
    setLoadingDeleted(false)
  }

  async function handleRestoreClient(id: string) {
    const client = deletedClients?.find(c => c.id === id)
    if (!client) return
    const db = supabase()
    await db.from('clients').update({ deleted_at: null }).eq('id', id)
    setDeletedClients(v => v?.filter(c => c.id !== id) ?? null)
    setClients(v => [{ ...client, deleted_at: null } as Client, ...v])
  }

  async function handlePermanentDeleteClient(id: string) {
    if (!confirm('Permanently delete this client? This cannot be undone.')) return
    const db = supabase()
    await db.from('clients').delete().eq('id', id)
    setDeletedClients(v => v?.filter(c => c.id !== id) ?? null)
  }

  // ── Actions ───────────────────────────────────────────────

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const client = clients.find(c => c.id === id)
    if (!client) return
    const db = supabase()
    await db.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setClients(v => v.filter(c => c.id !== id))
    showUndo('Client deleted', async () => {
      const sb = supabase()
      await sb.from('clients').update({ deleted_at: null }).eq('id', id)
      setClients(v => [client, ...v])
    })
  }

  function handleCopy(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    const lines = [
      c.name,
      c.whatsapp  && `WhatsApp: ${c.whatsapp}`,
      c.phone     && `Phone: ${c.phone}`,
      c.email     && `Email: ${c.email}`,
      c.instagram && `Instagram: ${c.instagram}`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const showingDeleted = filter === 'Deleted'

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h2>
          <p className="text-sm text-gray-400 mt-0.5">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* List / Grid toggle */}
          {!showingDeleted && (
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="List view"><ListIcon /></button>
              <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="Grid view"><GridIcon /></button>
            </div>
          )}
          {/* Grid size selector */}
          {!showingDeleted && view === 'grid' && (
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              {([3, 4, 5] as const).map(n => (
                <button key={n} onClick={() => setGridCols(n)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${gridCols === n ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>{n}</button>
              ))}
            </div>
          )}
          {!showingDeleted && (
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-black transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              Add Client
            </Link>
          )}
        </div>
      </div>

      {/* Search + sort */}
      {!showingDeleted && (
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, email…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          >
            <option value="created_desc">Latest</option>
            <option value="name_asc">Name A → Z</option>
            <option value="name_desc">Name Z → A</option>
            <option value="sales_desc">Highest Sales</option>
            <option value="sales_asc">Lowest Sales</option>
          </select>
        </div>
      )}

      {/* Filter pills */}
      {!showingDeleted && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {(['Retail', 'Reseller', 'Club TWB'] as const).map(p => (
            <button
              key={p}
              onClick={() => setTypeFilter(v => v === p ? null : p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === p
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="px-3 py-1.5 rounded-full text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-px">
        {(['All', 'Club TWB', 'Retail', 'Reseller', 'Deleted'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === f
                ? f === 'Deleted'
                  ? 'bg-red-50 text-red-600 font-medium'
                  : 'bg-gray-900 text-white font-medium'
                : f === 'Deleted'
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {f}
            {(f !== 'Deleted' || deletedClients !== null) && (
              <span className={`text-xs tabular-nums ${
                filter === f
                  ? f === 'Deleted' ? 'text-red-400' : 'text-gray-300'
                  : 'text-gray-400'
              }`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Deleted tab content ─────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading deleted clients…
            </div>
          )}
          {!loadingDeleted && (deletedClients === null || deletedClients.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zM1 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H1zm7-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No deleted clients</p>
            </div>
          )}
          {!loadingDeleted && deletedClients && deletedClients.length > 0 && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-3 w-12" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Deleted</th>
                    <th className="w-52" />
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 pb-1"><div className="h-px bg-gray-100" /></td>
                  </tr>
                </thead>
                <tbody>
                  {deletedClients.map(c => (
                    <tr key={c.id} className="group">
                      <td className="px-4 py-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 opacity-50 ${avatarColor(c.name, c.avatar_color)}`}>
                          {getInitials(c.name)}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="font-semibold text-gray-400 truncate">{c.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs hidden sm:table-cell">
                        {c.phone ?? c.whatsapp ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                        {c.deleted_at
                          ? new Date(c.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRestoreClient(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <RestoreIcon /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteClient(c.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            Delete forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Normal content ───────────────────────────────────── */}
      {!showingDeleted && (
        <>
          {/* Empty state */}
          {visible.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zM1 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H1zm7-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">{clients.length === 0 ? 'No clients yet' : 'No results'}</p>
              {clients.length === 0 && (
                <Link href="/dashboard/clients/new" className="mt-3 text-sm text-gray-900 underline underline-offset-4">Add your first client</Link>
              )}
            </div>
          )}

          {/* Grid View */}
          {visible.length > 0 && view === 'grid' && (
            <div className={`grid gap-4 ${
              gridCols === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' :
              gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
                               'grid-cols-2 md:grid-cols-3'
            }`}>
              {visible.map(c => {
                const totalSales = clientSales[c.id] ?? 0
                const dealCount  = clientDealCounts[c.id] ?? 0
                const rating     = clientRating(dealCount, c.club_twb)
                const isPolitical = ((c as any).labels as string[] | undefined)?.includes('political')
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                    className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all relative"
                  >
                    {/* Three-dot menu */}
                    <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id) }}
                        className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <DotsIcon />
                      </button>
                      {openMenuId === c.id && (
                        <div className="absolute top-7 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]" onClick={e => e.stopPropagation()}>
                          <button onClick={() => router.push(`/dashboard/clients/${c.id}/edit`)} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><EditIcon /> Edit</button>
                          <button onClick={e => { handleCopy(e, c); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><CopyIcon /> Copy</button>
                          <button onClick={e => { handleDelete(e, c.id); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><TrashIcon /> Delete</button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 mb-3 pr-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`}>
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <span className="text-xs font-bold text-gray-700">{rating}<span className="text-gray-400 font-normal">/10</span></span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate mb-1.5">{c.name}</p>
                    <div className="flex items-center gap-1 flex-wrap mb-2">
                      <TypeBadge type={c.client_type} />
                      {c.club_twb && <ClubTWBBadge />}
                      {isPolitical && <PoliticalBadge />}
                      {((c as any).labels as string[] | undefined)?.includes('at_risk') && <AtRiskBadge />}
                      {((c as any).labels as string[] | undefined)?.includes('high_potential') && <HighPotentialBadge />}
                    </div>
                    {totalSales > 0 && (
                      <p className="text-xs font-medium text-gray-700 tabular-nums">{formatLKR(totalSales)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Table */}
          {visible.length > 0 && view === 'list' && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-3 w-12" />
                    <th className="px-4 py-3 text-left whitespace-nowrap"><SortHeader label="Name"       currentSort={sort} ascKey="name_asc"     descKey="name_desc"     onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap"><SortHeader label="Type"       currentSort={sort} ascKey="type_asc"     descKey="type_desc"     onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap hidden md:table-cell"><SortHeader label="Total Sales" currentSort={sort} ascKey="sales_asc"  descKey="sales_desc"    onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell"><SortHeader label="Sales Mgr"  currentSort={sort} ascKey="manager_asc" descKey="manager_desc"  onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">Lead</th>
                    <th className="w-10" />
                  </tr>
                  <tr>
                    <td colSpan={10} className="px-4 pb-1"><div className="h-px bg-gray-100" /></td>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(c => {
                    const totalSales = clientSales[c.id] ?? 0
                    return (
                      <tr
                        key={c.id}
                        className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                        onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`}>
                            {getInitials(c.name)}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {((c as any).labels as string[] | undefined)?.includes('political')      && <PoliticalBadge />}
                            {((c as any).labels as string[] | undefined)?.includes('at_risk')         && <AtRiskBadge />}
                            {((c as any).labels as string[] | undefined)?.includes('high_potential')  && <HighPotentialBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap hidden sm:table-cell">
                          {c.phone ?? c.whatsapp ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px] hidden md:table-cell">
                          {c.email ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={c.client_type} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {c.club_twb ? (
                            <ClubTWBBadge />
                          ) : (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Regular</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums font-medium hidden md:table-cell">
                          {totalSales > 0 ? (
                            <span className="text-gray-900">{formatLKR(totalSales)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap hidden lg:table-cell">
                          {c.sales_manager ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <LeadBadge lead={c.lead_referral} />
                        </td>
                        <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                            <ActionBtn title="Edit"   onClick={e => { e.stopPropagation(); router.push(`/dashboard/clients/${c.id}/edit`) }}><EditIcon /></ActionBtn>
                            <ActionBtn title="Copy"   onClick={e => handleCopy(e, c)}><CopyIcon /></ActionBtn>
                            <ActionBtn title="Delete" onClick={e => handleDelete(e, c.id)} danger><TrashIcon /></ActionBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Undo toast ──────────────────────────────────────── */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
          <span className="text-sm">{undoState.message}</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
              undoTimerRef.current = null
              setUndoState(null)
            }}
            className="text-white/40 hover:text-white/80 transition-colors ml-1"
          >
            <XSmallIcon />
          </button>
        </div>
      )}
    </div>
  )
}
