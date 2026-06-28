'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/client-utils'
import type { DealWithRelations, DealStage, DealType, SalesManager } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function grossProfit(d: DealWithRelations): number | null {
  if (d.sale_price == null) return null
  return (
    d.sale_price
    - (d.watches?.purchase_cost ?? 0)
    - (d.other_costs ? (d.other_costs_amount ?? 0) : 0)
    - (d.commission_payable ? (d.commission_amount ?? 0) : 0)
  )
}

function dealTypeLabel(t: DealType) {
  return t === 'Trade' ? 'Trade-In' : t
}

const STAGE_COLORS: Record<DealStage, string> = {
  Idle:        'bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200',
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

const STAGES: DealStage[] = ['Inquiry', 'Offer', 'Delivered']

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

function ListIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }
function RestoreIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function EditIcon()      { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()      { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()     { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function InvoiceIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg> }
function FilterIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 8h6M7 12h2" strokeLinecap="round"/></svg> }
function SelectIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M9 11.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg> }

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
type SortKey     = 'recent' | 'price_desc' | 'price_asc' | 'name_asc' | 'name_desc'

export default function DealList({
  initialDeals,
  salesManagers = [],
  brands = [],
}: {
  initialDeals: DealWithRelations[]
  salesManagers?: SalesManager[]
  brands?: { id: string; name: string; color: string | null }[]
}) {
  const router = useRouter()
  const [deals,        setDeals]        = useState(initialDeals)
  const [search,       setSearch]       = useState('')
  const [stage,        setStage]        = useState<StageFilter>('All')
  const [brandFilter,  setBrandFilter]  = useState<string | null>(null)
  const [vipFilter,    setVipFilter]    = useState(false)
  const [clubFilter,   setClubFilter]   = useState(false)
  const [sort,         setSort]         = useState<SortKey>('recent')
  const [view,         setView]         = useState<'list' | 'tile'>('list')
  const [gridCols,     setGridCols]     = useState<3 | 4 | 5>(3)
  const [managerFilter, setManagerFilter] = useState<string | null>(null)
  const [showFilters,  setShowFilters]  = useState(false)
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState, setUndoState] = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Inline confirm for permanent delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Deleted deals (lazy-loaded)
  const [deletedDeals,   setDeletedDeals]   = useState<DealWithRelations[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  useEffect(() => {
    if (stage === 'Deleted' && deletedDeals === null && !loadingDeleted) {
      void loadDeletedDeals()
    }
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = deals.filter(d => {
    if (stage !== 'All' && stage !== 'Deleted' && d.stage !== stage) return false
    if (brandFilter   && d.watches?.brands?.id !== brandFilter)          return false
    if (vipFilter     && !d.clients?.is_vip)                              return false
    if (clubFilter    && !d.clients?.club_twb)                            return false
    if (managerFilter && d.sales_manager !== managerFilter)               return false
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
      case 'price_desc': return (b.sale_price ?? 0) - (a.sale_price ?? 0)
      case 'price_asc':  return (a.sale_price ?? 0) - (b.sale_price ?? 0)
      case 'name_asc':   return (a.watches?.watch_name ?? '').localeCompare(b.watches?.watch_name ?? '')
      case 'name_desc':  return (b.watches?.watch_name ?? '').localeCompare(a.watches?.watch_name ?? '')
      default:           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // ── Undo ───────────────────────────────────────────────────

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

  // ── Deleted ────────────────────────────────────────────────

  async function loadDeletedDeals() {
    setLoadingDeleted(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos, purchase_cost, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb)')
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
    if (confirmDeleteId !== id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmDeleteId(id)
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 5000)
      return
    }
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
    setConfirmDeleteId(null)
    const supabase = createClient()
    await supabase.from('deals').delete().eq('id', id)
    setDeletedDeals(v => v?.filter(d => d.id !== id) ?? null)
  }

  // ── Row actions ────────────────────────────────────────────

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    const supabase = createClient()
    await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setDeals(ds => ds.filter(d => d.id !== id))
    showUndo('Sale deleted', async () => {
      await createClient().from('deals').update({ deleted_at: null }).eq('id', id)
      setDeals(ds => [deal, ...ds])
    })
  }

  async function handleDuplicate(e: React.MouseEvent, deal: DealWithRelations) {
    e.stopPropagation()
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
  }

  // ── Select mode ────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map(d => d.id)))
    }
  }

  // ── Bulk actions ────────────────────────────────────────────

  function handleBulkInvoice() {
    for (const id of Array.from(selectedIds)) {
      window.open(`/dashboard/deals/${id}/invoice`, '_blank')
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    const affected = deals.filter(d => ids.includes(d.id))
    const supabase = createClient()
    await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    setDeals(ds => ds.filter(d => !selectedIds.has(d.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    showUndo(`${ids.length} sale${ids.length !== 1 ? 's' : ''} deleted`, async () => {
      await createClient().from('deals').update({ deleted_at: null }).in('id', ids)
      setDeals(ds => [...affected, ...ds])
    })
  }

  const filtersActive   = brandFilter !== null || vipFilter || clubFilter || managerFilter !== null
  const showingDeleted  = stage === 'Deleted'

  const gridColsClass = gridCols === 4
    ? 'grid-cols-2 lg:grid-cols-4'
    : gridCols === 5
    ? 'grid-cols-2 lg:grid-cols-5'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Sales</h1>
          <span className="text-[13px] text-text-secondary tabular-nums">{deals.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!showingDeleted && (
            <>
              {/* Filter — desktop only */}
              <button
                onClick={() => setShowFilters(v => !v)}
                title="Filters"
                className={`relative hidden md:block p-2 rounded-xl border transition-colors ${showFilters ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
              >
                <FilterIcon />
                {filtersActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>

              {/* Select — desktop only */}
              <button
                onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
                title="Select"
                className={`hidden md:block p-2 rounded-xl border transition-colors ${selectMode ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
              >
                <SelectIcon />
              </button>

              {/* List/Grid toggle */}
              <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="List view"><ListIcon /></button>
                <button onClick={() => setView('tile')} className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="Tile view"><GridIcon /></button>
              </div>

              {/* Grid size (tile view only) — desktop only */}
              {view === 'tile' && (
                <div className="hidden md:flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  {([3, 4, 5] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => setGridCols(n)}
                      className={`w-7 h-8 rounded-lg text-xs font-semibold transition-colors ${gridCols === n ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <Link
                href="/dashboard/deals/new"
                className="inline-flex items-center gap-1.5 bg-sidebar text-white text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-[#333] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                New Sale
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      {!showingDeleted && (
        <div className="px-4 md:px-8 mb-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input
              type="text"
              placeholder="Search watch or client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>
        </div>
      )}

      {/* ── Filter panel ───────────────────────────────────── */}
      {!showingDeleted && showFilters && (
        <div className="px-4 md:px-8 mb-3 space-y-2">
          {/* Brand pills */}
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => setBrandFilter(brandFilter === brand.id ? null : brand.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    brandFilter === brand.id
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {brand.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: brand.color }} />
                  )}
                  {brand.name}
                </button>
              ))}
            </div>
          )}
          {/* Client tier + sort */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setVipFilter(v => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${vipFilter ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              ★ VIP
            </button>
            <button
              onClick={() => setClubFilter(v => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${clubFilter ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              ★ Club TWB
            </button>
            {/* Sales manager filter */}
            {salesManagers.length > 0 && (
              <select
                value={managerFilter ?? ''}
                onChange={e => setManagerFilter(e.target.value || null)}
                className="bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              >
                <option value="">All Managers</option>
                {salesManagers.map(sm => <option key={sm.id} value={sm.name}>{sm.name}</option>)}
              </select>
            )}
            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            >
              <option value="recent">Recently Added</option>
              <option value="price_desc">Price High → Low</option>
              <option value="price_asc">Price Low → High</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
            </select>
            {filtersActive && (
              <button
                onClick={() => { setBrandFilter(null); setVipFilter(false); setClubFilter(false); setManagerFilter(null) }}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Stage tabs ─────────────────────────────────────── */}
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

      {/* ── Deleted view ───────────────────────────────────── */}
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
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 opacity-50 text-white" style={{ backgroundColor: '#C9A84C' }}>{getInitials(deal.clients.name)}</div>
                            <span className="text-sm text-gray-400 truncate max-w-[120px]">{deal.clients.name}</span>
                          </div>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                        {deal.deleted_at ? new Date(deal.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="px-3 py-3.5 pr-4 md:pr-8">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleRestoreDeal(deal.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <RestoreIcon /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteDeal(deal.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              confirmDeleteId === deal.id
                                ? 'text-white bg-red-500 border border-red-500'
                                : 'text-red-400 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200'
                            }`}
                          >
                            {confirmDeleteId === deal.id ? 'Confirm delete?' : 'Delete forever'}
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

      {/* ── Normal content ─────────────────────────────────── */}
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

          {/* ── Tile View ──────────────────────────────────── */}
          {sorted.length > 0 && view === 'tile' && (
            <div className={`px-4 md:px-8 py-5 grid gap-4 ${gridColsClass}`}>
              {sorted.map(deal => {
                const gp       = grossProfit(deal)
                const selected = selectedIds.has(deal.id)
                return (
                  <div
                    key={deal.id}
                    onClick={() => selectMode ? toggleSelect(deal.id) : router.push(`/dashboard/deals/${deal.id}`)}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all group cursor-pointer relative ${
                      selected ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Select checkbox overlay */}
                    {selectMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected ? 'bg-gray-900 border-gray-900' : 'bg-white/80 border-gray-300'}`}>
                          {selected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                      </div>
                    )}

                    <div className="relative h-40 bg-gray-50 overflow-hidden">
                      {deal.watches?.photos && deal.watches.photos.length > 0 ? (
                        <Image src={deal.watches.photos[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/></svg>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <StageBadge stage={deal.stage} />
                      </div>
                      {/* Hover actions */}
                      {!selectMode && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2 gap-1" onClick={e => e.stopPropagation()}>
                          <ActionBtn title="Invoice" onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/invoice`) }}><InvoiceIcon /></ActionBtn>
                          <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/edit`) }}><EditIcon /></ActionBtn>
                          <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, deal)}><CopyIcon /></ActionBtn>
                          <ActionBtn title="Delete"    onClick={e => handleDelete(e, deal.id)} danger><TrashIcon /></ActionBtn>
                        </div>
                      )}
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
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 text-white" style={{ backgroundColor: '#C9A84C' }}>{getInitials(deal.clients.name)}</div>
                          <span className="text-xs text-gray-600 truncate">{deal.clients.name}</span>
                          {deal.clients.club_twb && <span className="text-[10px] font-semibold text-gray-400">★</span>}
                          {deal.clients.is_vip   && !deal.clients.club_twb && <span className="text-[10px] font-semibold text-amber-500">★</span>}
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

          {/* ── List View ──────────────────────────────────── */}
          {sorted.length > 0 && view === 'list' && (
            <>
            {/* Mobile card stack */}
            <div className="md:hidden space-y-2 mb-2 px-4 md:px-8">
              {sorted.map(deal => {
                const saleDate = deal.sale_date
                  ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                  : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                const photo = deal.watches?.photos?.[0] ?? null
                return (
                  <div
                    key={deal.id}
                    className="flex items-start gap-3 p-4 bg-white border border-[#E8E6E1] cursor-pointer"
                    style={{ borderRadius: '12px' }}
                    onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                  >
                    {/* Watch photo */}
                    {photo ? (
                      <Image src={photo} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* LINE 1: Watch name */}
                      <p className="font-semibold truncate leading-snug" style={{ fontSize: '15px', color: '#111111' }}>
                        {deal.watches?.watch_name ?? '—'}
                      </p>
                      {/* LINE 2: Ref */}
                      {deal.watches?.reference && (
                        <p className="mt-0.5 truncate" style={{ fontSize: '12px', color: '#6B6B6B' }}>Ref: {deal.watches.reference}</p>
                      )}
                      {/* LINE 3: Client */}
                      {deal.clients && (
                        <p className="mt-0.5 truncate" style={{ fontSize: '13px', color: '#6B6B6B' }}>{deal.clients.name}</p>
                      )}
                      {/* LINE 4: Badge + Date */}
                      <div className="flex items-center justify-between mt-2">
                        <StageBadge stage={deal.stage} />
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{saleDate}</span>
                      </div>
                    </div>
                    {/* PRICE: top right */}
                    <div className="shrink-0 text-right pt-0.5">
                      <p className="font-bold tabular-nums" style={{ fontSize: '15px', color: '#C9A84C' }}>
                        {formatLKR(deal.sale_price ?? deal.offered_price)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {selectMode && (
                      <th className="px-4 md:px-8 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === sorted.length && sorted.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 accent-gray-900"
                        />
                      </th>
                    )}
                    <th className="px-4 md:px-8 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</span>
                    </th>
                    <th className="px-3 py-3 w-14" />
                    <th className="px-3 py-3 text-left whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Watch</span>
                    </th>
                    <th className="px-3 py-3 text-left whitespace-nowrap hidden sm:table-cell">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</span>
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stage</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap hidden md:table-cell">
                      <SortHeader label="Price" currentSort={sort} ascKey="price_asc" descKey="price_desc" onSort={setSort} />
                    </th>
                    <th className="w-24 px-3 py-3 pr-4 md:pr-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(deal => {
                    const gp       = grossProfit(deal)
                    const saleDate = deal.sale_date
                      ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                      : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                    const selected = selectedIds.has(deal.id)
                    const photo    = deal.watches?.photos?.[0] ?? null
                    return (
                      <tr
                        key={deal.id}
                        className={`group hover:bg-gray-50 transition-colors cursor-pointer ${selected ? 'bg-gray-50' : ''}`}
                        onClick={() => selectMode ? toggleSelect(deal.id) : router.push(`/dashboard/deals/${deal.id}`)}
                      >
                        {selectMode && (
                          <td className="px-4 md:px-8 py-3.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(deal.id)}
                              className="w-4 h-4 rounded border-gray-300 accent-gray-900"
                            />
                          </td>
                        )}
                        <td className="px-4 md:px-8 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{saleDate}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          {photo ? (
                            <Image src={photo} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
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
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 text-white" style={{ backgroundColor: '#C9A84C' }}>{getInitials(deal.clients.name)}</div>
                              <span className="text-sm text-gray-700 truncate max-w-[120px]">{deal.clients.name}</span>
                              {deal.clients.club_twb && <span className="text-xs text-gray-400">★</span>}
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
                          {gp != null && <p className={`text-xs tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{gp >= 0 ? '+' : ''}{formatLKR(gp)}</p>}
                        </td>
                        <td className="px-3 py-3.5 pr-4 md:pr-8" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 justify-end opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                            <ActionBtn title="Invoice"   onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/invoice`) }}><InvoiceIcon /></ActionBtn>
                            <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/edit`) }}><EditIcon /></ActionBtn>
                            <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, deal)}><CopyIcon /></ActionBtn>
                            <ActionBtn title="Delete"    onClick={e => handleDelete(e, deal.id)} danger><TrashIcon /></ActionBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}

          <p className="px-4 md:px-8 py-4 text-xs text-gray-300 border-t border-gray-50">
            {sorted.length} sale{sorted.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* ── Bulk action bar ────────────────────────────────── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
          <span className="text-sm font-medium pr-1">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={handleBulkInvoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
          >
            <InvoiceIcon /> Invoice
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <TrashIcon /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-white/40 hover:text-white/80 transition-colors ml-1">
            <XSmallIcon />
          </button>
        </div>
      )}

      {/* ── Undo toast ─────────────────────────────────────── */}
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
