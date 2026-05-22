'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { DealWithRelations, DealStage, DealType, SalesManager } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function grossProfit(d: DealWithRelations): number | null {
  if (d.sale_price == null) return null
  return (
    d.sale_price
    - ((d.watches as any)?.purchase_cost ?? 0)
    - (d.other_costs ? (d.other_costs_amount ?? 0) : 0)
    - (d.commission_payable ? (d.commission_amount ?? 0) : 0)
  )
}

function dealTypeLabel(t: DealType) {
  return t === 'Trade' ? 'Trade-In' : t
}

const STAGE_COLORS: Record<DealStage, string> = {
  Inquiry:     'bg-gray-100 text-gray-600',
  Offer:       'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  Negotiation: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Closed:      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Delivered:   'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
  Lost:        'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
}

const TYPE_COLORS: Record<DealType, string> = {
  Sale:     'bg-sky-50 text-sky-600',
  Purchase: 'bg-violet-50 text-violet-600',
  Trade:    'bg-amber-50 text-amber-600',
}

function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'}`}>
      {stage}
    </span>
  )
}

function TypeBadge({ type }: { type: DealType }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {dealTypeLabel(type)}
    </span>
  )
}

function ListIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function ShareIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="13" cy="3" r="1.5"/><circle cx="13" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M4.5 7.25L11.5 3.75M4.5 8.75L11.5 12.25" strokeLinecap="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function DotsIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg> }

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

type StageFilter = DealStage | 'All' | 'Deleted'
type TypeFilter  = DealType | 'All'
type SortKey     = 'recent_sale' | 'sale_value_desc' | 'sale_value_asc' | 'profit_desc' | 'profit_asc' | 'date_asc' | 'watch_asc' | 'client_asc'

const STAGES: DealStage[] = ['Inquiry', 'Offer', 'Negotiation', 'Closed', 'Delivered', 'Lost']

export default function DealList({
  initialDeals,
  salesManagers = [],
}: {
  initialDeals: DealWithRelations[]
  salesManagers?: SalesManager[]
}) {
  const router = useRouter()
  const [deals,       setDeals]       = useState(initialDeals)
  const [search,      setSearch]      = useState('')
  const [stage,       setStage]       = useState<StageFilter>('All')
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('All')
  const [sort,        setSort]        = useState<SortKey>('recent_sale')
  const [smFilter,    setSmFilter]    = useState<string>('All')
  const [view,        setView]        = useState<'list' | 'tile'>('list')
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null)

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState, setUndoState] = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Deleted deals (lazy-loaded)
  const [deletedDeals,   setDeletedDeals]   = useState<DealWithRelations[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  useEffect(() => {
    if (stage === 'Deleted' && deletedDeals === null && !loadingDeleted) {
      void loadDeletedDeals()
    }
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openMenuId) return
    function close() { setOpenMenuId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const filtered = deals.filter(d => {
    if (stage !== 'All' && stage !== 'Deleted' && d.stage !== stage) return false
    if (typeFilter !== 'All' && d.deal_type !== typeFilter) return false
    if (smFilter !== 'All' && (d.sales_manager ?? '') !== smFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const watchMatch  = d.watches?.watch_name.toLowerCase().includes(q) || d.watches?.reference?.toLowerCase().includes(q)
      const clientMatch = d.clients?.name.toLowerCase().includes(q)
      if (!watchMatch && !clientMatch) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'date_asc':        return new Date(a.sale_date ?? a.created_at).getTime() - new Date(b.sale_date ?? b.created_at).getTime()
      case 'sale_value_desc': return (b.sale_price ?? 0) - (a.sale_price ?? 0)
      case 'sale_value_asc':  return (a.sale_price ?? 0) - (b.sale_price ?? 0)
      case 'profit_desc':     return (grossProfit(b) ?? -Infinity) - (grossProfit(a) ?? -Infinity)
      case 'profit_asc':      return (grossProfit(a) ?? Infinity)  - (grossProfit(b) ?? Infinity)
      case 'watch_asc':       return (a.watches?.watch_name ?? '').localeCompare(b.watches?.watch_name ?? '')
      case 'client_asc':      return (a.clients?.name ?? '').localeCompare(b.clients?.name ?? '')
      default:                return new Date(b.sale_date ?? b.created_at).getTime() - new Date(a.sale_date ?? a.created_at).getTime()
    }
  })

  // ── Undo ─────────────────────────────────────────────────

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

  // ── Deleted ───────────────────────────────────────────────

  async function loadDeletedDeals() {
    setLoadingDeleted(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos, purchase_cost), clients(name, avatar_color)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedDeals((data ?? []) as DealWithRelations[])
    setLoadingDeleted(false)
  }

  async function handleRestoreDeal(id: string) {
    const deal = deletedDeals?.find(d => d.id === id)
    if (!deal) return
    const supabase = createClient()
    await supabase.from('deals').update({ deleted_at: null }).eq('id', id)
    setDeletedDeals(v => v?.filter(d => d.id !== id) ?? null)
    setDeals(v => [{ ...deal, deleted_at: null } as DealWithRelations, ...v])
  }

  async function handlePermanentDeleteDeal(id: string) {
    if (!confirm('Permanently delete this sale? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('deals').delete().eq('id', id)
    setDeletedDeals(v => v?.filter(d => d.id !== id) ?? null)
  }

  // ── Actions ───────────────────────────────────────────────

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    const supabase = createClient()
    await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setDeals(ds => ds.filter(d => d.id !== id))
    showUndo('Sale deleted', async () => {
      const sb = createClient()
      await sb.from('deals').update({ deleted_at: null }).eq('id', id)
      setDeals(ds => [deal, ...ds])
    })
  }

  async function handleDuplicate(e: React.MouseEvent, deal: DealWithRelations) {
    e.stopPropagation()
    setDuplicating(deal.id)
    const supabase = createClient()
    const { data: newDeal, error } = await supabase
      .from('deals')
      .insert({
        watch_id: deal.watch_id, client_id: deal.client_id, deal_type: deal.deal_type,
        stage: 'Inquiry', offered_price: deal.offered_price, sale_price: deal.sale_price,
        payment_method: deal.payment_method, currency: deal.currency, notes: deal.notes,
        sales_manager: deal.sales_manager, other_costs: deal.other_costs ?? false,
        other_costs_amount: deal.other_costs_amount, commission_payable: deal.commission_payable ?? false,
        commission_amount: deal.commission_amount, new_client: deal.new_client ?? false,
      })
      .select('id')
      .single()
    if (!error && newDeal) router.push(`/dashboard/deals/${newDeal.id}`)
    setDuplicating(null)
  }

  function handleShare(e: React.MouseEvent, dealId: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/deals/${dealId}`)
  }

  const showingDeleted = stage === 'Deleted'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales</h1>
        <div className="flex items-center gap-2">
          {!showingDeleted && (
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="List view"><ListIcon /></button>
              <button onClick={() => setView('tile')} className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="Tile view"><GridIcon /></button>
            </div>
          )}
          {!showingDeleted && (
            <Link
              href="/dashboard/deals/new"
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
              New Sale
            </Link>
          )}
        </div>
      </div>

      {/* Search + filters + sort */}
      {!showingDeleted && (
        <div className="flex flex-wrap items-center gap-2 px-4 md:px-8 mb-3">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input
              type="text"
              placeholder="Search watch or client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>
          {/* Type pills */}
          <div className="flex gap-1.5">
            {([
              { value: 'All',   label: 'All' },
              { value: 'Sale',  label: 'Sale' },
              { value: 'Trade', label: 'Trade-In' },
            ] as const).map(t => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value as TypeFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Sales Manager filter */}
          {salesManagers.length > 0 && (
            <select
              value={smFilter}
              onChange={e => setSmFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            >
              <option value="All">All Managers</option>
              {salesManagers.map(sm => <option key={sm.id} value={sm.name}>{sm.name}</option>)}
            </select>
          )}
          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          >
            <option value="recent_sale">Recent Sale</option>
            <option value="sale_value_desc">Sale Value: High → Low</option>
            <option value="sale_value_asc">Sale Value: Low → High</option>
            <option value="profit_desc">Profit: High → Low</option>
            <option value="profit_asc">Profit: Low → High</option>
          </select>
        </div>
      )}

      {/* Stage tabs */}
      <div className="flex gap-0 border-b border-gray-100 px-4 md:px-8 overflow-x-auto">
        {(['All', ...STAGES, 'Deleted'] as StageFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              stage === s
                ? s === 'Deleted' ? 'border-red-400 text-red-600' : 'border-gray-900 text-gray-900'
                : s === 'Deleted' ? 'border-transparent text-gray-300 hover:text-red-500' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {s}
            {s !== 'All' && s !== 'Deleted' && (
              <span className="ml-1.5 text-xs text-gray-300 tabular-nums">
                {deals.filter(d => d.stage === s).length}
              </span>
            )}
            {s === 'Deleted' && deletedDeals !== null && (
              <span className="ml-1.5 text-xs text-red-300 tabular-nums">{deletedDeals.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Deleted ────────────────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading deleted sales…</div>
          )}
          {!loadingDeleted && (!deletedDeals || deletedDeals.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No deleted sales</p>
            </div>
          )}
          {!loadingDeleted && deletedDeals && deletedDeals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 md:px-8 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Watch</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Client</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Deleted</th>
                    <th className="px-3 py-3 pr-4 md:pr-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deletedDeals.map(deal => (
                    <tr key={deal.id} className="group">
                      <td className="px-4 md:px-8 py-3.5">
                        <p className="text-sm font-medium text-gray-400 truncate max-w-[180px]">{deal.watches?.watch_name ?? <span className="text-gray-300">—</span>}</p>
                        {deal.watches?.reference && <p className="text-xs text-gray-300 mt-0.5">Ref: {deal.watches.reference}</p>}
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        {deal.clients ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 opacity-50 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>{getInitials(deal.clients.name)}</div>
                            <span className="text-sm text-gray-400 truncate max-w-[120px]">{deal.clients.name}</span>
                          </div>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                        {(deal as any).deleted_at ? new Date((deal as any).deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="px-3 py-3.5 pr-4 md:pr-8">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleRestoreDeal(deal.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <RestoreIcon /> Restore
                          </button>
                          <button onClick={() => handlePermanentDeleteDeal(deal.id)} className="px-3 py-1.5 text-xs font-medium text-red-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
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

      {/* ── Normal content ───────────────────────────────── */}
      {!showingDeleted && (
        <>
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No sales found</p>
            </div>
          )}

          {/* Tile View */}
          {sorted.length > 0 && view === 'tile' && (
            <div className="px-4 md:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(deal => {
                const gp = grossProfit(deal)
                return (
                  <div
                    key={deal.id}
                    onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer relative"
                  >
                    {/* Three-dot menu */}
                    <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === deal.id ? null : deal.id) }}
                        className="p-1.5 rounded-lg bg-white/80 text-gray-400 hover:text-gray-700 hover:bg-white transition-colors shadow-sm"
                      >
                        <DotsIcon />
                      </button>
                      {openMenuId === deal.id && (
                        <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[130px]" onClick={e => e.stopPropagation()}>
                          <button onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/edit`) }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><EditIcon /> Edit</button>
                          <button onClick={e => { handleDuplicate(e, deal); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><CopyIcon /> Duplicate</button>
                          <button onClick={e => { handleShare(e, deal.id); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><ShareIcon /> Share</button>
                          <button onClick={e => { handleDelete(e, deal.id); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><TrashIcon /> Delete</button>
                        </div>
                      )}
                    </div>

                    <div className="relative h-40 bg-gray-50 overflow-hidden">
                      {deal.watches?.photos && deal.watches.photos.length > 0 ? (
                        <img src={deal.watches.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/></svg>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <StageBadge stage={deal.stage} />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{deal.watches?.watch_name ?? '—'}</p>
                          {deal.watches?.reference && <p className="text-xs text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>}
                        </div>
                        <TypeBadge type={deal.deal_type} />
                      </div>
                      {deal.clients && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>{getInitials(deal.clients.name)}</div>
                          <span className="text-xs text-gray-600 truncate">{deal.clients.name}</span>
                        </div>
                      )}
                      <div>
                        {deal.sale_price != null && <p className="text-sm font-bold text-gray-900 tabular-nums">{formatLKR(deal.sale_price)}</p>}
                        {gp != null && <p className={`text-xs font-medium tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{gp >= 0 ? '+' : ''}{formatLKR(gp)} profit</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* List View */}
          {sorted.length > 0 && view === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 md:px-8 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                      <SortHeader label="Date" currentSort={sort} ascKey="date_asc" descKey="recent_sale" onSort={setSort} />
                    </th>
                    <th className="px-3 py-3 text-left whitespace-nowrap">
                      <SortHeader label="Watch" currentSort={sort} ascKey="watch_asc" descKey="watch_asc" onSort={setSort} />
                    </th>
                    <th className="px-3 py-3 text-left whitespace-nowrap hidden sm:table-cell">
                      <SortHeader label="Client" currentSort={sort} ascKey="client_asc" descKey="client_asc" onSort={setSort} />
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stage</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap hidden md:table-cell">
                      <SortHeader label="Price" currentSort={sort} ascKey="sale_value_asc" descKey="sale_value_desc" onSort={setSort} />
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap hidden lg:table-cell">
                      <SortHeader label="Profit" currentSort={sort} ascKey="profit_asc" descKey="profit_desc" onSort={setSort} />
                    </th>
                    <th className="w-24 px-3 py-3 pr-4 md:pr-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(deal => {
                    const gp = grossProfit(deal)
                    const saleDate = deal.sale_date
                      ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                      : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                    return (
                      <tr
                        key={deal.id}
                        className="group hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                      >
                        <td className="px-4 md:px-8 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{saleDate}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                            {deal.watches?.watch_name ?? <span className="text-gray-300">—</span>}
                          </p>
                          {deal.watches?.reference && <p className="text-xs text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>}
                        </td>
                        <td className="px-3 py-3.5 hidden sm:table-cell">
                          {deal.clients ? (
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>{getInitials(deal.clients.name)}</div>
                              <span className="text-sm text-gray-700 truncate max-w-[120px]">{deal.clients.name}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          <StageBadge stage={deal.stage} />
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell">
                          <TypeBadge type={deal.deal_type} />
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell text-right">
                          <span className="text-sm text-gray-900 tabular-nums">{formatLKR(deal.sale_price ?? deal.offered_price)}</span>
                        </td>
                        <td className="px-3 py-3.5 hidden lg:table-cell text-right">
                          {gp != null ? (
                            <span className={`text-sm font-medium tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {gp >= 0 ? '+' : ''}{formatLKR(gp)}
                            </span>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3.5 pr-4 md:pr-8" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 justify-end opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                            <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/edit`) }}><EditIcon /></ActionBtn>
                            <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, deal)}><CopyIcon /></ActionBtn>
                            <ActionBtn title="Share"     onClick={e => handleShare(e, deal.id)}><ShareIcon /></ActionBtn>
                            <ActionBtn title="Delete"    onClick={e => handleDelete(e, deal.id)} danger><TrashIcon /></ActionBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="px-4 md:px-8 py-4 text-xs text-gray-300 border-t border-gray-50">
            {sorted.length} sale{sorted.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Undo toast */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
          <span className="text-sm">{undoState.message}</span>
          <button onClick={handleUndo} className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">Undo</button>
          <button onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = null; setUndoState(null) }} className="text-white/40 hover:text-white/80 transition-colors ml-1"><XSmallIcon /></button>
        </div>
      )}
    </div>
  )
}
