'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import LazyImage from '@/components/ui/LazyImage'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLog'
import { avatarColor, getInitials } from '@/lib/client-utils'
import { dealSalePriceLKR } from '@/lib/deal-currency'
import { INK, INK_45, INK_60, INK_08, CARD_BG, GREEN, RED, GOLD, AMBER, AMBER_BG, BLUE, RADII } from '@/lib/design-tokens'
import type { DealWithRelations, DealStage, DealType, SalesManager } from '@/types'

// Design values from Sales.dc.html that have no equivalent in
// lib/design-tokens.ts. Flagged here rather than rounded to a near-match
// token — promote any of them if a second page needs the same number.
const LABEL_INK         = 'rgba(20,20,15,.42)'          // column headers / eyebrow labels
const FIELD_BORDER      = 'rgba(20,20,15,.1)'           // toolbar control border (default)
const CARD_BORDER       = 'rgba(20,20,15,.06)'          // list row / tile border (rest)
const HAIRLINE          = 'rgba(20,20,15,.07)'          // search + view toggle border, card dividers
const MUTED_INK         = 'rgba(20,20,15,.35)'          // inactive tab counts, faint meta
const DATE_INK          = 'rgba(20,20,15,.55)'          // list row date column
const ROW_RADIUS        = 20                            // list row card (between RADII.md 18 and RADII.lg 24)
const CARD_SHADOW       = '0 1px 2px rgba(20,20,15,.05)'
const TILE_SHADOW       = '0 2px 6px rgba(20,20,15,.07)'
const MENU_SHADOW       = '0 14px 36px rgba(20,20,15,.16)'
const PILL_SHADOW       = '0 1px 3px rgba(20,20,15,.09)' // sliding tab pill
const BADGE_SHADOW      = '0 2px 8px rgba(20,20,15,.12)' // tile brand / stage badges

// List-row grid, straight from the mockup's column track list.
const ROW_COLS = '118px minmax(300px,3.2fr) minmax(200px,1.5fr) 124px 176px'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function grossProfit(d: DealWithRelations): number | null {
  // sold_price (captured on the watch at the point of sale) is the source of truth;
  // fall back to the deal's own sale_price, converted to LKR, for sales recorded
  // before that column existed.
  const salePrice = d.watches?.sold_price ?? dealSalePriceLKR(d)
  if (salePrice == null) return null
  return (
    salePrice
    - (d.watches?.purchase_cost ?? 0)
    - (d.other_costs ? (d.other_costs_amount ?? 0) : 0)
    - (d.commission_payable ? (d.commission_amount ?? 0) : 0)
  )
}

function dealTypeLabel(t: DealType) {
  return t === 'Trade' ? 'Trade-In' : t
}

// Stage tones mirror components/deals/StageSelector.tsx so a stage pill reads
// the same on the list, the detail page and the stage picker. The mockup only
// specifies Delivered / Offer / Inquiry; the legacy stages that can still sit
// on older records (Negotiation / Closed / Lost / Idle) reuse the same tones
// StageSelector already assigns them.
const STAGE_TONE: Record<string, { bg: string; fg: string }> = {
  Idle:        { bg: 'rgba(20,20,15,.07)',  fg: INK_45 },
  Inquiry:     { bg: 'rgba(63,95,138,.14)', fg: BLUE },
  Offer:       { bg: AMBER_BG,              fg: AMBER },
  Negotiation: { bg: AMBER_BG,              fg: AMBER },
  Closed:      { bg: 'rgba(31,111,67,.14)', fg: GREEN },
  Delivered:   { bg: 'rgba(31,111,67,.14)', fg: GREEN },
  Lost:        { bg: 'rgba(178,58,44,.1)',  fg: RED },
}
const DEFAULT_STAGE_TONE = { bg: 'rgba(20,20,15,.07)', fg: INK_45 }

// Deal types are Sale / Purchase / Trade — the mockup's third type is
// "Consignment", which this table doesn't have. Tones match the already
// restyled Sale Detail page (app/dashboard/deals/[id]/page.tsx); Purchase's
// violet still has no token in lib/design-tokens.ts.
const TYPE_TONE: Record<string, { bg: string; fg: string }> = {
  Sale:     { bg: 'rgba(63,95,138,.12)',  fg: BLUE },
  Purchase: { bg: 'rgba(124,58,237,.12)', fg: '#7c3aed' },
  Trade:    { bg: AMBER_BG,               fg: AMBER },
}

const SORT_LABELS: Record<SortKey, string> = {
  recent:     'Recently added',
  price_desc: 'Price: high to low',
  price_asc:  'Price: low to high',
  name_asc:   'Name A → Z',
  name_desc:  'Name Z → A',
}

function pill(bg: string, fg: string, children: React.ReactNode, weight = 600) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      style={{ fontSize: 11, fontWeight: weight, padding: '4px 10px', borderRadius: RADII.pill, background: bg, color: fg }}
    >
      {children}
    </span>
  )
}

function StageBadge({ stage }: { stage: DealStage }) {
  const t = STAGE_TONE[stage] ?? DEFAULT_STAGE_TONE
  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', padding: '6px 12px', borderRadius: RADII.pill, background: t.bg, color: t.fg }}
    >
      {stage}
    </span>
  )
}

function TypeBadge({ type }: { type: DealType }) {
  const t = TYPE_TONE[type] ?? { bg: 'rgba(20,20,15,.07)', fg: INK_60 }
  return pill(t.bg, t.fg, dealTypeLabel(type))
}

// ── Icons ────────────────────────────────────────────────────

function ListViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h12M4 10h12M4 14h12"/></svg> }
function TileViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.6" y="3.6" width="5.4" height="5.4" rx="1.6"/><rect x="11" y="3.6" width="5.4" height="5.4" rx="1.6"/><rect x="3.6" y="11" width="5.4" height="5.4" rx="1.6"/><rect x="11" y="11" width="5.4" height="5.4" rx="1.6"/></svg> }
function SearchIcon()  { return <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="rgba(20,20,15,.4)" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg> }
function FilterIcon({ color }: { color: string }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="M3.4 5.2h13.2L11.4 11v4.6l-2.8 1.4V11z"/></svg> }
function PlusIcon()    { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M10 4.2v11.6M4.2 10h11.6"/></svg> }
function ChevronIcon({ color }: { color: string }) { return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function InvoiceIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg> }
function WatchPlaceholder({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(20,20,15,.22)" strokeWidth="1.5">
      <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
    </svg>
  )
}
function EmptyIcon() {
  return <svg width="28" height="28" viewBox="0 0 16 16" fill="rgba(20,20,15,.3)"><path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
}

function ActionBtn({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center transition-colors"
      style={{ width: 30, height: 30, borderRadius: 10, border: 0, background: 'transparent', color: danger ? RED : INK_60 }}
    >
      {children}
    </button>
  )
}

// The mockup's Price column header is a static label; ours doubles as the
// price sort control, so the sort arrows stay on it.
function SortHeader({ label, currentSort, ascKey, descKey, onSort }: { label: string; currentSort: SortKey; ascKey: SortKey; descKey: SortKey; onSort: (k: SortKey) => void }) {
  const isAsc  = currentSort === ascKey
  const isDesc = currentSort === descKey
  const active = isAsc || isDesc
  return (
    <button
      onClick={() => onSort(isAsc ? descKey : ascKey)}
      className="flex items-center gap-1 uppercase transition-colors ml-auto"
      style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.09em', color: active ? INK_60 : LABEL_INK }}
    >
      {label}
      <span className="flex flex-col gap-px leading-none">
        <svg width="8" height="5" viewBox="0 0 8 5" fill={isAsc ? INK : MUTED_INK}><path d="M4 0 8 5H0z"/></svg>
        <svg width="8" height="5" viewBox="0 0 8 5" fill={isDesc ? INK : MUTED_INK}><path d="M4 5 0 0h8z"/></svg>
      </span>
    </button>
  )
}

const STAGES: DealStage[] = ['Delivered', 'Inquiry', 'Offer']

type StageFilter = DealStage | 'All' | 'Deleted'
type SortKey     = 'recent' | 'price_desc' | 'price_asc' | 'name_asc' | 'name_desc'
type MenuKey     = 'brand' | 'manager' | 'sort' | null

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
  const [stage,        setStage]        = useState<StageFilter>('Delivered')
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

  // Which filter dropdown is open (display state only)
  const [openMenu, setOpenMenu] = useState<MenuKey>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-filter-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

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
      case 'price_desc': return (dealSalePriceLKR(b) ?? 0) - (dealSalePriceLKR(a) ?? 0)
      case 'price_asc':  return (dealSalePriceLKR(a) ?? 0) - (dealSalePriceLKR(b) ?? 0)
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
      .select('*, watches(watch_name, reference, status, photos, purchase_cost, sold_price, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb)')
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
    void logActivity({ actionType: 'sale_deleted', entityType: 'deal', entityId: id, entityLabel: deal.watches?.watch_name })
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
        payment_method: deal.payment_method, currency: deal.currency, exchange_rate: deal.exchange_rate, notes: deal.notes,
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

  // Tile image height per density — the mockup specifies 270px at 3-up and
  // 210px at 4-up; the 5-up density is ours, so its height is extrapolated.
  const tileImgH = gridCols === 3 ? 270 : gridCols === 4 ? 210 : 170

  // ── Display-only derivations for the mockup's chrome ───────

  const filterCount = (brandFilter ? 1 : 0) + (vipFilter ? 1 : 0) + (clubFilter ? 1 : 0) + (managerFilter ? 1 : 0)

  const brandLabel = brandFilter ? (brands.find(b => b.id === brandFilter)?.name ?? 'All brands') : 'All brands'
  const brandCounts = deals.reduce<Record<string, number>>((acc, d) => {
    const id = d.watches?.brands?.id
    if (id) acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  // Totals over the rows currently on screen. Both route through the same
  // currency-safe helpers the rows themselves use — never deal.sale_price.
  const revenueTotal = sorted.reduce((sum, d) => sum + (dealSalePriceLKR(d) ?? 0), 0)
  const profitTotal  = sorted.reduce((sum, d) => sum + (grossProfit(d) ?? 0), 0)

  const tabCounts: Record<StageFilter, number | null> = {
    All:         deals.length,
    Delivered:   deals.filter(d => d.stage === 'Delivered').length,
    Inquiry:     deals.filter(d => d.stage === 'Inquiry').length,
    Offer:       deals.filter(d => d.stage === 'Offer').length,
    Deleted:     deletedDeals?.length ?? null,
    Idle:        null,
    Negotiation: null,
    Closed:      null,
    Lost:        null,
  }

  // Sliding pill under the active tab
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pillRect, setPillRect] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = tabRefs.current[stage]
    if (!el) return
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    setPillRect(p => (p && p.left === next.left && p.width === next.width) ? p : next)
  }, [stage, deletedDeals])

  const countLine = showingDeleted
    ? `${deletedDeals?.length ?? 0} deleted ${(deletedDeals?.length ?? 0) === 1 ? 'sale' : 'sales'}`
    : `${sorted.length} of ${deals.length} ${deals.length === 1 ? 'sale' : 'sales'} shown`

  function menuButtonStyle(active: boolean) {
    return {
      height: 44, padding: '0 16px', borderRadius: RADII.pill,
      border: `1px solid ${active ? INK : FIELD_BORDER}`,
      background: active ? INK : '#fff',
      color: active ? '#fff' : INK,
      fontSize: 13.5, fontWeight: 600,
    } as React.CSSProperties
  }

  function DealActions({ deal }: { deal: DealWithRelations }) {
    return (
      <>
        <ActionBtn title="Invoice"   onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/invoice`) }}><InvoiceIcon /></ActionBtn>
        <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${deal.id}/edit`) }}><EditIcon /></ActionBtn>
        <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, deal)}><CopyIcon /></ActionBtn>
        <ActionBtn title="Delete"    onClick={e => handleDelete(e, deal.id)} danger><TrashIcon /></ActionBtn>
      </>
    )
  }

  function SelectBox({ selected }: { selected: boolean }) {
    return (
      <span
        className="flex items-center justify-center transition-colors"
        style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${selected ? INK : 'rgba(20,20,15,.2)'}`, background: selected ? INK : '#fff' }}
      >
        {selected && <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M1 5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
    )
  }

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 }}>Sales</h1>
          <span className="text-[13px] tabular-nums" style={{ color: INK_45 }}>{countLine}</span>
        </div>
        {!showingDeleted && (
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${HAIRLINE}` }}>
              <button onClick={() => setView('list')} title="List view" className="flex items-center justify-center transition-colors" style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: view === 'list' ? CARD_BG : 'transparent' }}><ListViewIcon active={view === 'list'} /></button>
              <button onClick={() => setView('tile')} title="Tile view" className="flex items-center justify-center transition-colors" style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: view === 'tile' ? CARD_BG : 'transparent' }}><TileViewIcon active={view === 'tile'} /></button>
            </div>

            {/* Grid density (tile view only) — desktop only */}
            {view === 'tile' && (
              <div className="hidden md:flex gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${HAIRLINE}` }}>
                {([3, 4, 5] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setGridCols(n)}
                    title={`Tiles — ${n} per row`}
                    className="flex items-center justify-center transition-colors"
                    style={{ width: 38, height: 38, border: 0, borderRadius: 11, fontSize: 13, fontWeight: 600, background: gridCols === n ? CARD_BG : 'transparent', color: gridCols === n ? INK : INK_45 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {/* Select */}
            <button
              onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
              className="flex items-center font-semibold transition-colors"
              style={{ height: 46, padding: '0 22px', borderRadius: RADII.pill, border: `1px solid ${selectMode ? INK : FIELD_BORDER}`, background: selectMode ? INK : '#fff', color: selectMode ? '#fff' : INK, fontSize: 13.5 }}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(v => !v)}
              title="Filters"
              className="hidden md:flex items-center justify-center transition-colors relative"
              style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${showFilters ? INK : FIELD_BORDER}`, background: showFilters ? INK : '#fff' }}
            >
              <FilterIcon color={showFilters ? CARD_BG : INK} />
              {filtersActive && (
                <span className="absolute flex items-center justify-center text-[9px] font-bold text-white rounded-full" style={{ top: 2, right: 2, width: 14, height: 14, background: GREEN }}>{filterCount}</span>
              )}
            </button>

            {/* New sale */}
            <Link
              href="/dashboard/deals/new"
              title="New Sale"
              className="flex items-center justify-center shrink-0 transition-colors btn-press"
              style={{ width: 46, height: 46, border: 0, borderRadius: '50%', background: INK }}
            >
              <PlusIcon />
            </Link>
          </div>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      {!showingDeleted && (
        <div className="flex items-center gap-3 mb-4" style={{ height: 60, padding: '0 22px', borderRadius: RADII.md, background: '#fff', border: `1px solid ${HAIRLINE}` }}>
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search watch, client or reference…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: INK }}
          />
        </div>
      )}

      {/* ── Filter row ─────────────────────────────────────────
             Brand / Salesman / Sort take the mockup's dropdown slots. The
             mockup's fourth dropdown filters by deal *type*, which this page
             has never had — its slot carries our existing VIP and Club TWB
             client filters instead rather than inventing a new filter. ── */}
      {showFilters && !showingDeleted && (
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          {/* Brand */}
          {brands.length > 0 && (
            <div className="relative" data-filter-menu>
              <button
                onClick={() => setOpenMenu(v => v === 'brand' ? null : 'brand')}
                className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
                style={menuButtonStyle(openMenu === 'brand' || brandFilter !== null)}
              >
                <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: openMenu === 'brand' || brandFilter !== null ? 'rgba(255,255,255,.5)' : LABEL_INK }}>Brand</span>
                <span>{brandLabel}</span>
                <ChevronIcon color={openMenu === 'brand' || brandFilter !== null ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)'} />
              </button>
              {openMenu === 'brand' && (
                <div className="absolute z-40 bg-white flex flex-col gap-0.5 overflow-auto" style={{ top: 52, left: 0, width: 290, maxHeight: 340, border: `1px solid ${INK_08}`, borderRadius: RADII.md, boxShadow: MENU_SHADOW, padding: 8 }}>
                  {brands.map(brand => {
                    const on = brandFilter === brand.id
                    return (
                      <button
                        key={brand.id}
                        onClick={() => setBrandFilter(on ? null : brand.id)}
                        className="flex items-center gap-3 text-left border-0 cursor-pointer"
                        style={{ fontSize: 13, fontWeight: on ? 600 : 500, padding: '8px 10px', borderRadius: 12, background: on ? CARD_BG : 'transparent', color: INK }}
                      >
                        <span className="flex-none rounded-full" style={{ width: 8, height: 8, background: brand.color ?? MUTED_INK }} />
                        <span className="flex-1 min-w-0 truncate">{brand.name}</span>
                        <span className="text-[11.5px] tabular-nums" style={{ color: MUTED_INK }}>{brandCounts[brand.id] ?? 0}</span>
                        <SelectBox selected={on} />
                      </button>
                    )
                  })}
                  <button
                    onClick={() => { setBrandFilter(null); setOpenMenu(null) }}
                    className="text-left border-0 cursor-pointer"
                    style={{ marginTop: 4, borderTop: `1px solid ${HAIRLINE}`, fontSize: 12.5, fontWeight: 600, color: GREEN, padding: '11px 10px 6px', background: 'transparent' }}
                  >
                    Clear all brands
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Salesman */}
          {salesManagers.length > 0 && (
            <div className="relative" data-filter-menu>
              <button
                onClick={() => setOpenMenu(v => v === 'manager' ? null : 'manager')}
                className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
                style={menuButtonStyle(openMenu === 'manager' || managerFilter !== null)}
              >
                <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: openMenu === 'manager' || managerFilter !== null ? 'rgba(255,255,255,.5)' : LABEL_INK }}>Salesman</span>
                <span>{managerFilter ?? 'All managers'}</span>
                <ChevronIcon color={openMenu === 'manager' || managerFilter !== null ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)'} />
              </button>
              {openMenu === 'manager' && (
                <div className="absolute z-40 bg-white flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 210, border: `1px solid ${INK_08}`, borderRadius: RADII.md, boxShadow: MENU_SHADOW, padding: 6 }}>
                  {[null, ...salesManagers.map(sm => sm.name)].map(name => (
                    <button
                      key={name ?? 'all'}
                      onClick={() => { setManagerFilter(name); setOpenMenu(null) }}
                      className="text-left border-0 cursor-pointer whitespace-nowrap"
                      style={{ fontSize: 13, fontWeight: managerFilter === name ? 600 : 500, padding: '10px 12px', borderRadius: 11, background: managerFilter === name ? CARD_BG : 'transparent', color: INK }}
                    >
                      {name ?? 'All managers'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sort */}
          <div className="relative" data-filter-menu>
            <button
              onClick={() => setOpenMenu(v => v === 'sort' ? null : 'sort')}
              className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
              style={menuButtonStyle(openMenu === 'sort' || sort !== 'recent')}
            >
              <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: openMenu === 'sort' || sort !== 'recent' ? 'rgba(255,255,255,.5)' : LABEL_INK }}>Sort by</span>
              <span>{SORT_LABELS[sort]}</span>
              <ChevronIcon color={openMenu === 'sort' || sort !== 'recent' ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)'} />
            </button>
            {openMenu === 'sort' && (
              <div className="absolute z-40 bg-white flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 236, border: `1px solid ${INK_08}`, borderRadius: RADII.md, boxShadow: MENU_SHADOW, padding: 6 }}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setOpenMenu(null) }}
                    className="text-left border-0 cursor-pointer whitespace-nowrap"
                    style={{ fontSize: 13, fontWeight: sort === key ? 600 : 500, padding: '10px 12px', borderRadius: 11, background: sort === key ? CARD_BG : 'transparent', color: INK }}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client tier toggles */}
          <button
            onClick={() => setVipFilter(v => !v)}
            className="whitespace-nowrap transition-colors"
            style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${vipFilter ? AMBER : FIELD_BORDER}`, background: vipFilter ? AMBER_BG : '#fff', color: vipFilter ? AMBER : INK, fontSize: 13.5, fontWeight: 600 }}
          >
            ★ VIP
          </button>
          <button
            onClick={() => setClubFilter(v => !v)}
            className="whitespace-nowrap transition-colors"
            style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${clubFilter ? INK : FIELD_BORDER}`, background: clubFilter ? INK : '#fff', color: clubFilter ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
          >
            ★ Club TWB
          </button>

          {filtersActive && (
            <button
              onClick={() => { setBrandFilter(null); setVipFilter(false); setClubFilter(false); setManagerFilter(null) }}
              className="whitespace-nowrap transition-colors"
              style={{ height: 44, padding: '0 16px', border: 0, borderRadius: RADII.pill, background: 'transparent', fontSize: 13, fontWeight: 600, color: GREEN }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* ── Stage tabs + totals ────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex items-center gap-0.5 overflow-x-auto pb-px">
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: pillRect?.left ?? 0, width: pillRect?.width ?? 0, height: 42,
              background: '#fff', boxShadow: PILL_SHADOW,
              transitionProperty: 'left,width', transitionDuration: '.34s', transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
              opacity: pillRect ? 1 : 0,
            }}
          />
          {(['All', ...STAGES, 'Deleted'] as StageFilter[]).map(s => {
            const isActive = stage === s
            const count = tabCounts[s]
            return (
              <button
                key={s}
                ref={el => { tabRefs.current[s] = el }}
                onClick={() => setStage(s)}
                className="relative z-[1] flex items-center gap-1.5 whitespace-nowrap transition-colors"
                style={{ height: 42, padding: '0 15px', borderRadius: RADII.pill, background: 'transparent', fontSize: 14, fontWeight: isActive ? 600 : 500, color: s === 'Deleted' ? RED : s === 'Delivered' ? GREEN : s === 'Offer' ? AMBER : s === 'Inquiry' ? BLUE : INK }}
              >
                {s}
                {count !== null && (
                  <span className="text-[12.5px] tabular-nums" style={{ color: isActive ? INK_45 : MUTED_INK }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
        {!showingDeleted && (
          <div className="hidden md:flex items-center gap-6 ml-auto shrink-0 whitespace-nowrap pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px]" style={{ color: INK_45 }}>Revenue</span>
              <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em' }}>{formatLKR(revenueTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px]" style={{ color: INK_45 }}>Profit</span>
              <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em', color: profitTotal >= 0 ? GREEN : RED }}>
                {profitTotal >= 0 ? '+ ' : '- '}{formatLKR(Math.abs(profitTotal))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Deleted view ───────────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && (
            <div className="flex items-center justify-center py-20 text-sm" style={{ color: INK_45 }}>Loading deleted sales…</div>
          )}
          {!loadingDeleted && (!deletedDeals || deletedDeals.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: CARD_BG, borderRadius: RADII.md }}><EmptyIcon /></div>
              <p className="text-sm font-medium" style={{ color: INK_60 }}>No deleted sales</p>
            </div>
          )}
          {!loadingDeleted && deletedDeals && deletedDeals.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {deletedDeals.map(deal => (
                <div
                  key={deal.id}
                  className="flex items-center gap-4 flex-wrap"
                  style={{ padding: '14px 22px', background: '#fff', border: `1px solid ${CARD_BORDER}`, borderRadius: ROW_RADIUS, boxShadow: CARD_SHADOW }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontSize: 15, fontWeight: 600, color: INK_45 }}>{deal.watches?.watch_name ?? '—'}</p>
                    {deal.watches?.reference && <p className="truncate" style={{ fontSize: 12, color: MUTED_INK }}>Ref: {deal.watches.reference}</p>}
                  </div>
                  {deal.clients && (
                    <div className="hidden sm:flex items-center gap-2.5 min-w-0">
                      <div className={`flex items-center justify-center shrink-0 rounded-full text-[11px] font-semibold opacity-60 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`} style={{ width: 32, height: 32 }}>
                        {getInitials(deal.clients.name)}
                      </div>
                      <span className="truncate" style={{ fontSize: 13.5, color: INK_45, maxWidth: 150 }}>{deal.clients.name}</span>
                    </div>
                  )}
                  <span className="hidden sm:block tabular-nums" style={{ fontSize: 12, color: MUTED_INK }}>
                    {deal.deleted_at ? new Date(deal.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleRestoreDeal(deal.id)}
                      className="flex items-center gap-1.5 transition-colors"
                      style={{ fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: RADII.pill, border: `1px solid ${FIELD_BORDER}`, background: '#fff', color: INK }}
                    >
                      <RestoreIcon /> Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteDeal(deal.id)}
                      className="transition-colors"
                      style={
                        confirmDeleteId === deal.id
                          ? { fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: RADII.pill, color: '#fff', background: RED, border: `1px solid ${RED}` }
                          : { fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: RADII.pill, color: 'rgba(178,58,44,.7)', background: '#fff', border: `1px solid ${FIELD_BORDER}` }
                      }
                    >
                      {confirmDeleteId === deal.id ? 'Confirm delete?' : 'Delete forever'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Normal content ─────────────────────────────────── */}
      {!showingDeleted && (
        <>
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: CARD_BG, borderRadius: RADII.md }}><EmptyIcon /></div>
              <p className="text-sm font-medium" style={{ color: INK_60 }}>No sales found</p>
            </div>
          )}

          {/* ── Tile View ──────────────────────────────────── */}
          {sorted.length > 0 && view === 'tile' && (
            <div className={`grid gap-4 ${gridColsClass}`}>
              {sorted.map((deal, idx) => {
                const gp           = grossProfit(deal)
                const salePriceLKR = dealSalePriceLKR(deal)
                const selected     = selectedIds.has(deal.id)
                const brand        = deal.watches?.brands ?? null
                const saleDate     = deal.sale_date
                  ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                  : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                return (
                  <div
                    key={deal.id}
                    onClick={() => selectMode ? toggleSelect(deal.id) : router.push(`/dashboard/deals/${deal.id}`)}
                    className="group relative bg-white overflow-hidden flex flex-col cursor-pointer card-hover"
                    style={{
                      borderRadius: RADII.lg,
                      border: `1px solid ${selected ? INK : CARD_BORDER}`,
                      boxShadow: TILE_SHADOW,
                      animation: 'fadeIn 0.3s ease-out forwards',
                      animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`,
                      opacity: 0,
                    }}
                  >
                    {/* Photo */}
                    <div className="relative overflow-hidden" style={{ height: tileImgH, background: CARD_BG }}>
                      {deal.watches?.photos && deal.watches.photos.length > 0 ? (
                        <LazyImage src={deal.watches.photos[0]} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><WatchPlaceholder size={40} /></div>
                      )}

                      {brand && (
                        <span className="absolute flex items-center pointer-events-none" style={{ top: 12, left: 12, height: gridCols === 3 ? 34 : 28, padding: '0 12px', background: 'rgba(255,255,255,.94)', borderRadius: RADII.pill, boxShadow: BADGE_SHADOW }}>
                          <span className="font-bold uppercase" style={{ fontSize: 10.5, letterSpacing: '.12em', color: brand.color ?? INK }}>{brand.name}</span>
                        </span>
                      )}
                      <span className="absolute pointer-events-none" style={{ top: 12, right: 12, boxShadow: BADGE_SHADOW, borderRadius: RADII.pill }}>
                        <StageBadge stage={deal.stage} />
                      </span>

                      {/* Select checkbox overlay */}
                      {selectMode && (
                        <div className="absolute z-10" style={{ bottom: 12, left: 12 }} onClick={e => { e.stopPropagation(); toggleSelect(deal.id) }}>
                          <SelectBox selected={selected} />
                        </div>
                      )}

                      {/* Hover actions */}
                      {!selectMode && (
                        <div
                          className="absolute flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ bottom: 12, right: 12, padding: 3, background: 'rgba(255,255,255,.94)', borderRadius: RADII.sm, boxShadow: BADGE_SHADOW }}
                          onClick={e => e.stopPropagation()}
                        >
                          <DealActions deal={deal} />
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex flex-col gap-1.5" style={{ padding: '18px 20px 20px' }}>
                      <div className="flex items-start gap-3">
                        <span className="min-w-0" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.025em', lineHeight: 1.25 }}>{deal.watches?.watch_name ?? '—'}</span>
                        <span className="ml-auto flex-none"><TypeBadge type={deal.deal_type} /></span>
                      </div>
                      <span className="text-[12px] truncate" style={{ color: LABEL_INK }}>
                        {[deal.watches?.reference ? `Ref: ${deal.watches.reference}` : null, saleDate].filter(Boolean).join(' · ')}
                      </span>
                      <div className="flex flex-col gap-3" style={{ marginTop: 10, paddingTop: 13, borderTop: `1px solid ${HAIRLINE}` }}>
                        {deal.clients && (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex items-center justify-center flex-none rounded-full text-[10.5px] font-semibold ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`} style={{ width: 30, height: 30 }}>
                              {getInitials(deal.clients.name)}
                            </div>
                            <span className="truncate" style={{ fontSize: 13.5 }}>{deal.clients.name}</span>
                            {deal.clients.club_twb && <span className="text-[11px]" style={{ color: GOLD }}>★</span>}
                            {deal.clients.is_vip && !deal.clients.club_twb && <span className="text-[11px]" style={{ color: AMBER }}>★</span>}
                          </div>
                        )}
                        <div className="flex items-baseline gap-2.5">
                          {salePriceLKR != null && (
                            <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.025em' }}>{formatLKR(salePriceLKR)}</span>
                          )}
                          {gp != null && (
                            <span className="ml-auto tabular-nums whitespace-nowrap" style={{ fontSize: 12.5, fontWeight: 600, color: gp >= 0 ? GREEN : RED }}>
                              {gp >= 0 ? '+' : ''}{formatLKR(gp)}
                            </span>
                          )}
                        </div>
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
              <div className="md:hidden flex flex-col gap-2">
                {sorted.map((deal, idx) => {
                  const saleDate = deal.sale_date
                    ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                    : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                  const photo = deal.watches?.photos?.[0] ?? null
                  const salePriceLKR = dealSalePriceLKR(deal)
                  return (
                    <div
                      key={deal.id}
                      className="flex items-start gap-3 cursor-pointer card-hover"
                      style={{
                        padding: 14, background: '#fff', border: `1px solid ${CARD_BORDER}`, borderRadius: RADII.md,
                        animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`, opacity: 0,
                      }}
                      onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                    >
                      <div className="shrink-0">
                        {photo ? (
                          <LazyImage src={photo} alt="" width={64} height={64} sizes="64px" className="w-16 h-16 object-cover" style={{ borderRadius: RADII.sm }} />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center" style={{ background: CARD_BG, borderRadius: RADII.sm }}><WatchPlaceholder /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate leading-snug" style={{ fontSize: 15, fontWeight: 600, color: INK }}>{deal.watches?.watch_name ?? '—'}</p>
                        {deal.watches?.reference && (
                          <p className="mt-0.5 truncate" style={{ fontSize: 12, color: INK_45 }}>Ref: {deal.watches.reference}</p>
                        )}
                        {deal.clients && (
                          <p className="mt-0.5 truncate" style={{ fontSize: 13, color: INK_60 }}>{deal.clients.name}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <StageBadge stage={deal.stage} />
                          <span className="tabular-nums" style={{ fontSize: 11, color: MUTED_INK }}>{saleDate}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right pt-0.5">
                        <p className="tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: GOLD }}>
                          {formatLKR(salePriceLKR ?? deal.offered_price)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop rows */}
              <div className="hidden md:flex flex-col gap-2.5">
                {/* Column headers */}
                <div
                  className="grid items-center uppercase"
                  style={{
                    gridTemplateColumns: `${selectMode ? '28px ' : ''}${ROW_COLS}`,
                    padding: '2px 22px', fontSize: 11, fontWeight: 600, letterSpacing: '.09em', color: LABEL_INK,
                  }}
                >
                  {selectMode && (
                    <div onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === sorted.length && sorted.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: INK }}
                      />
                    </div>
                  )}
                  <div>Date</div>
                  <div>Watch</div>
                  <div>Client</div>
                  <div>Stage</div>
                  <div className="flex justify-end">
                    <SortHeader label="Price" currentSort={sort} ascKey="price_asc" descKey="price_desc" onSort={setSort} />
                  </div>
                </div>

                {sorted.map((deal, idx) => {
                  const gp           = grossProfit(deal)
                  const salePriceLKR = dealSalePriceLKR(deal)
                  const saleDate     = deal.sale_date
                    ? new Date(deal.sale_date).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                    : new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                  const selected     = selectedIds.has(deal.id)
                  const photo        = deal.watches?.photos?.[0] ?? null
                  const brand        = deal.watches?.brands ?? null
                  return (
                    <div
                      key={deal.id}
                      className="group relative grid items-center cursor-pointer card-hover"
                      style={{
                        gridTemplateColumns: `${selectMode ? '28px ' : ''}${ROW_COLS}`,
                        padding: '16px 22px', background: '#fff',
                        border: `1px solid ${selected ? INK : CARD_BORDER}`,
                        borderRadius: ROW_RADIUS, boxShadow: CARD_SHADOW,
                        animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`, opacity: 0,
                      }}
                      onClick={() => selectMode ? toggleSelect(deal.id) : router.push(`/dashboard/deals/${deal.id}`)}
                    >
                      {selectMode && (
                        <div onClick={e => { e.stopPropagation(); toggleSelect(deal.id) }}>
                          <SelectBox selected={selected} />
                        </div>
                      )}

                      {/* Date */}
                      <div className="tabular-nums whitespace-nowrap" style={{ fontSize: 13, color: DATE_INK }}>{saleDate}</div>

                      {/* Watch */}
                      <div className="flex items-center gap-4 min-w-0" style={{ paddingRight: 24 }}>
                        <div className="flex-none overflow-hidden relative flex items-center justify-center" style={{ width: 74, height: 74, borderRadius: RADII.sm, background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                          {photo ? (
                            <LazyImage src={photo} alt="" fill sizes="74px" className="object-cover" />
                          ) : <WatchPlaceholder />}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          {brand && (
                            <span className="font-bold uppercase truncate" style={{ fontSize: 11, letterSpacing: '.1em', color: brand.color ?? INK_60 }}>{brand.name}</span>
                          )}
                          <span className="truncate" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.3 }}>{deal.watches?.watch_name ?? '—'}</span>
                          <span className="text-[11.5px] truncate" style={{ color: LABEL_INK }}>
                            {[deal.watches?.reference ? `Ref: ${deal.watches.reference}` : null, deal.sales_manager].filter(Boolean).join(' · ') || '—'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <TypeBadge type={deal.deal_type} />
                          </div>
                        </div>
                      </div>

                      {/* Client */}
                      <div className="flex items-center gap-2.5 min-w-0" style={{ paddingRight: 16 }}>
                        {deal.clients ? (
                          <>
                            <div className={`flex items-center justify-center flex-none rounded-full text-[11.5px] font-semibold ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`} style={{ width: 36, height: 36 }}>
                              {getInitials(deal.clients.name)}
                            </div>
                            <span className="truncate" style={{ fontSize: 14.5, fontWeight: 500 }}>{deal.clients.name}</span>
                            {deal.clients.club_twb && <span className="text-[11px] flex-none" style={{ color: GOLD }}>★</span>}
                          </>
                        ) : <span style={{ fontSize: 14, color: MUTED_INK }}>—</span>}
                      </div>

                      {/* Stage */}
                      <div><StageBadge stage={deal.stage} /></div>

                      {/* Price */}
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em' }}>
                          {formatLKR(salePriceLKR ?? deal.offered_price)}
                        </span>
                        {gp != null && (
                          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, color: gp >= 0 ? GREEN : RED }}>
                            {gp >= 0 ? '+' : ''}{formatLKR(gp)}
                          </span>
                        )}
                      </div>

                      {/* Row hover actions — overlaid so the 5-column grid above
                          stays 1:1 with the mockup's track list */}
                      {!selectMode && (
                        <div
                          className="absolute flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ right: 16, top: '50%', transform: 'translateY(-50%)', padding: 3, background: '#fff', borderRadius: RADII.sm, border: `1px solid ${HAIRLINE}`, boxShadow: MENU_SHADOW }}
                          onClick={e => e.stopPropagation()}
                        >
                          <DealActions deal={deal} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Bulk action bar ────────────────────────────────── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 select-none" style={{ background: INK, color: '#fff', padding: '10px 16px', borderRadius: RADII.md, boxShadow: '0 18px 40px rgba(20,20,15,.28)' }}>
          <span className="text-sm font-medium pr-1">{selectedIds.size} selected</span>
          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,.2)' }} />
          <button
            onClick={handleBulkInvoice}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ padding: '7px 13px', borderRadius: RADII.pill, background: 'rgba(255,255,255,.1)', color: '#fff' }}
          >
            <InvoiceIcon /> Invoice
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ padding: '7px 13px', borderRadius: RADII.pill, background: 'rgba(178,58,44,.25)', color: '#fff' }}
          >
            <TrashIcon /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-1 transition-colors" style={{ color: 'rgba(255,255,255,.5)' }}>
            <XSmallIcon />
          </button>
        </div>
      )}

      {/* ── Undo toast ─────────────────────────────────────── */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 select-none" style={{ background: INK, color: '#fff', padding: '10px 16px', borderRadius: RADII.md, boxShadow: '0 18px 40px rgba(20,20,15,.28)' }}>
          <span className="text-sm">{undoState.message}</span>
          <button onClick={handleUndo} className="text-sm font-semibold transition-colors" style={{ color: CARD_BG }}>Undo</button>
          <button
            onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = null; setUndoState(null) }}
            className="ml-1 transition-colors"
            style={{ color: 'rgba(255,255,255,.5)' }}
          >
            <XSmallIcon />
          </button>
        </div>
      )}
    </div>
  )
}
