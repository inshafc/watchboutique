'use client'

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import LazyImage from '@/components/ui/LazyImage'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { logActivity } from '@/lib/activityLog'
import { displayCondition } from '@/lib/watch-condition'
import type { WatchWithBrand, WatchStatus, Brand } from '@/types'
import { WATCH_STATUSES } from '@/types'
import { INK, LIME, GREEN, AMBER, AMBER_BG, BLUE, RED, INK_45, INK_60, INK_08, CARD_BG, RADII, CONTROL_HEIGHT_LG } from '@/lib/design-tokens'

// ── Icons ────────────────────────────────────────────────────

function WatchPlaceholder({ small = false, mark }: { small?: boolean; mark?: string | null }) {
  return (
    <div className={`${small ? 'w-14 h-14' : 'w-full aspect-square'} rounded-xl flex flex-col items-center justify-center gap-0.5 shrink-0`} style={{ background: CARD_BG }}>
      {mark ? (
        <span className="text-[10px] font-bold tracking-wide" style={{ color: INK_45 }}>{mark}</span>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={INK_45} strokeWidth="1.5">
          <circle cx="12" cy="12" r="7"/>
          <path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  )
}

function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ShareIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.3M4.5 8.7l6 3.4" strokeLinecap="round"/></svg> }
function SearchIcon()  { return <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke={INK_45} strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/></svg> }
function ListViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h12M4 10h12M4 14h12" /></svg> }
function GridViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.6" y="3.6" width="5.4" height="5.4" rx="1.6" /><rect x="11" y="3.6" width="5.4" height="5.4" rx="1.6" /><rect x="3.6" y="11" width="5.4" height="5.4" rx="1.6" /><rect x="11" y="11" width="5.4" height="5.4" rx="1.6" /></svg> }
function FunnelIcon({ color }: { color: string }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="M3.4 5.2h13.2L11.4 11v4.6l-2.8 1.4V11z"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function DotsIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg> }
function ChevronIcon() { return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={INK_45} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3" /></svg> }
function CheckIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function RestoreIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function StarIcon()    { return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .8l2.163 4.382 4.837.703-3.5 3.412.826 4.815L8 11.8l-4.326 2.312.826-4.815-3.5-3.412 4.837-.703z"/></svg> }
function CalendarIcon(){ return <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3" strokeLinecap="round"/></svg> }
function PlusIcon()    { return <svg className="w-6 h-6" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg> }

// ── Status / condition indicators (tile view) ──────────────────

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  'Available': { bg: 'rgba(31,111,67,.1)', fg: GREEN, dot: GREEN },
  'On Hold':   { bg: AMBER_BG,             fg: AMBER, dot: '#b5761a' },
  'Sold':      { bg: 'rgba(20,20,15,.07)', fg: INK_60, dot: 'rgba(20,20,15,.4)' },
  'Consigned': { bg: 'rgba(63,95,138,.12)', fg: BLUE,  dot: BLUE },
}

function StatusDot({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Sold
  return (
    <span className="inline-flex items-center gap-1.5" title={status}>
      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} role="img" aria-label={status} />
      <span className="text-[12px]" style={{ color: INK_60 }}>{status}</span>
    </span>
  )
}

function ConditionIcon({ condition }: { condition?: string | null }) {
  const isUnworn = (condition ?? '').trim().toLowerCase() === 'unworn'
  const label = isUnworn ? 'Unworn' : 'Pre-Owned'
  return (
    <span title={label} role="img" aria-label={label} className="inline-flex" style={{ color: isUnworn ? GREEN : AMBER }}>
      {isUnworn ? <StarIcon /> : <CheckIcon />}
    </span>
  )
}

function ConditionBadge({ condition }: { condition?: string | null }) {
  const label = displayCondition(condition)
  const isUnworn = label === 'Unworn'
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold whitespace-nowrap" style={{ padding: '5px 10px', borderRadius: RADII.pill, background: isUnworn ? 'rgba(31,111,67,.09)' : 'rgba(138,111,46,.11)', color: isUnworn ? GREEN : AMBER }}>
      <ConditionIcon condition={condition} />{label}
    </span>
  )
}

// ── Types & constants ─────────────────────────────────────────

type SortOption      = 'last_added' | 'oldest_added' | 'sell_desc' | 'sell_asc' | 'buy_desc' | 'name_asc' | 'name_desc'
type ConditionFilter = 'All' | 'Unworn' | 'Pre-Owned'
type StatusFilter    = WatchStatus | 'All' | 'Deleted' | 'Drafts' | 'Sourced' | 'Consigned'
type ViewMode        = 'list' | 'tile'
type MenuKey          = 'brand' | 'condition' | 'sort' | null

const SORT_LABELS: Record<SortOption, string> = {
  last_added:    'Date Added: Newest First',
  oldest_added:  'Date Added: Oldest First',
  sell_desc:     'Price: High to Low',
  sell_asc:      'Price: Low to High',
  name_asc:      'Name: A to Z',
  name_desc:     'Name: Z to A',
  buy_desc:      'Buy Price: High → Low',
}

const TAB_COLORS: Record<StatusFilter, string> = {
  All:        INK,
  Available:  GREEN,
  'On Hold':  '#b5761a',
  Sold:       INK_60,
  Consigned:  BLUE,
  Drafts:     INK_60,
  Sourced:    INK_60,
  Deleted:    RED,
}

const DESKTOP_TILE_COLS = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' } as const
const MOBILE_TILE_COLS  = { 1: 'grid-cols-1', 2: 'grid-cols-2' } as const
type DesktopCols = keyof typeof DESKTOP_TILE_COLS
type MobileCols  = keyof typeof MOBILE_TILE_COLS

// ── Helpers ──────────────────────────────────────────────────

function formatLKR(n: number | null) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function displayDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = dt.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// Year of the watch, derived from `date_on_card` (there is no `year` column on
// `watches`). Returns null — not a placeholder — so callers can omit the element
// entirely when the date is missing.
function displayYear(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return String(dt.getUTCFullYear())
}

function brandMark(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function LabelBadges({ labels, createdAt }: { labels?: string[]; createdAt: string }) {
  if (!labels || labels.length === 0) return null
  const isNew = labels.includes('new_arrival') &&
    (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
  return (
    <span className="flex items-center gap-1 shrink-0">
      {isNew      && <span className="text-[10px] font-bold bg-emerald-500 text-white rounded px-1 py-0.5 leading-none">NEW</span>}
      {labels.includes('hot_sell')   && <span title="Hot Sell" className="inline-flex"><svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16z"/></svg></span>}
      {labels.includes('expensive')  && <span title="Expensive" className="inline-flex"><svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 16 16" fill="currentColor"><path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/></svg></span>}
    </span>
  )
}

// ── Checkbox ─────────────────────────────────────────────────

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  onClick,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange?: () => void
  onClick?: (e: React.MouseEvent) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange ?? (() => {})}
      onClick={onClick}
      className="w-4 h-4 rounded cursor-pointer accent-gray-900 shrink-0"
    />
  )
}

// ── Component ────────────────────────────────────────────────

export default function WatchInventory({
  watches: initial,
  brands,
  highlightId,
}: {
  watches:     WatchWithBrand[]
  brands:      Brand[]
  highlightId?: string
}) {
  const router = useRouter()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'super_admin'
  const isClerk = profile?.role === 'inventory_clerk'

  // Clear ?highlight param after animation completes
  useEffect(() => {
    if (highlightId) {
      const t = setTimeout(() => router.replace('/dashboard/inventory', { scroll: false }), 2600)
      return () => clearTimeout(t)
    }
  }, [highlightId, router])

  // Stagger animation: enabled for initial mount only
  const staggerActive = useRef(true)
  useEffect(() => {
    const t = setTimeout(() => { staggerActive.current = false }, 1400)
    return () => clearTimeout(t)
  }, [])
  const [watches,         setWatches]         = useState(initial)
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('Available')
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('All')
  const [brandIds,        setBrandIds]        = useState<string[]>([])
  const [search,          setSearch]          = useState('')
  const [sort,            setSort]            = useState<SortOption>('last_added')
  const [view,            setView]            = useState<ViewMode>('tile')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [openMenu,        setOpenMenu]        = useState<MenuKey>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [tileMenuId,          setTileMenuId]          = useState<string | null>(null)
  const [tileDeleteConfirmId, setTileDeleteConfirmId] = useState<string | null>(null)

  // Grid density (tile view), persisted for the session.
  // Loaded in an effect (not the useState initializer) so the server-rendered
  // default matches the client's first paint; persisted directly on selection
  // rather than via a state-watching effect, which would race the load above.
  const [desktopCols, setDesktopCols] = useState<DesktopCols>(4)
  const [mobileCols,  setMobileCols]  = useState<MobileCols>(1)
  useEffect(() => {
    const storedDesktop = sessionStorage.getItem('inventory_tile_cols_desktop')
    const storedMobile  = sessionStorage.getItem('inventory_tile_cols_mobile')
    if (storedDesktop && storedDesktop in DESKTOP_TILE_COLS) setDesktopCols(Number(storedDesktop) as DesktopCols)
    if (storedMobile && storedMobile in MOBILE_TILE_COLS) setMobileCols(Number(storedMobile) as MobileCols)
  }, [])

  function selectDesktopCols(n: DesktopCols) {
    setDesktopCols(n)
    sessionStorage.setItem('inventory_tile_cols_desktop', String(n))
  }
  function selectMobileCols(n: MobileCols) {
    setMobileCols(n)
    sessionStorage.setItem('inventory_tile_cols_mobile', String(n))
  }

  // Bulk edit
  const [bulkMode,    setBulkMode]    = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk mark-available dialog
  const [bulkAvailableDialog, setBulkAvailableDialog] = useState<{
    watchesWithDeals: Array<{ watchId: string; watchName: string; dealId: string }>
  } | null>(null)
  const [bulkAvailableActing, setBulkAvailableActing] = useState(false)
  const [confirmingBulkVoid, setConfirmingBulkVoid] = useState(false)

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState,   setUndoState]   = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Toast
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Inline confirm for permanent delete
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Deleted watches (lazy-loaded when Deleted tab is opened)
  const [deletedWatches, setDeletedWatches] = useState<WatchWithBrand[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  const searchRef   = useRef<HTMLDivElement>(null)

  // Drag-to-reorder (list view only)
  const dragFromIdx  = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Sliding pill under the active status tab
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  const exitBulkMode = useCallback(() => {
    setBulkMode(false)
    setSelectedIds(new Set())
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      if (!(e.target as HTMLElement).closest('[data-tile-menu]')) {
        setTileMenuId(null)
      }
      if (!(e.target as HTMLElement).closest('[data-filter-menu]')) {
        setOpenMenu(null)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setTileMenuId(null)
        setOpenMenu(null)
        exitBulkMode()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [exitBulkMode])

  // Load deleted watches on first visit to the Deleted tab
  useEffect(() => {
    if (statusFilter === 'Deleted' && deletedWatches === null && !loadingDeleted) {
      void loadDeletedWatches()
    }
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────

  const activeFilterCount = brandIds.length + (conditionFilter !== 'All' ? 1 : 0)

  const suggestions = useMemo(() => {
    if (!search.trim() || search.length < 2) return []
    const q = search.toLowerCase()
    return watches
      .filter(w =>
        w.watch_name.toLowerCase().includes(q) ||
        (w.reference ?? '').toLowerCase().includes(q) ||
        (w.serial_number ?? '').toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [watches, search])

  const processed = useMemo(() => {
    let list = [...watches]

    // Sourced watches live in a separate bucket — exclude from all tabs except 'Sourced'
    if (statusFilter === 'Sourced') {
      list = list.filter(w => w.watch_status === 'sourced')
    } else if (statusFilter === 'Drafts') {
      list = list.filter(w => w.is_draft && w.watch_status !== 'sourced')
    } else if (statusFilter === 'Consigned') {
      // Consignment is an ownership type, not a status — a consigned watch can be
      // Available/On Hold and still shows here, same as it does in its status tab.
      // Once sold, status overrides: it moves to the Sold tab only.
      list = list.filter(w => w.inventory_type === 'consign' && w.status !== 'Sold' && !w.is_draft && w.watch_status !== 'sourced')
    } else {
      list = list.filter(w => w.watch_status !== 'sourced')
      if (statusFilter !== 'All') {
        list = list.filter(w => !w.is_draft)
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.watch_name.toLowerCase().includes(q) ||
        (w.reference ?? '').toLowerCase().includes(q) ||
        (w.serial_number ?? '').toLowerCase().includes(q) ||
        (w.purchased_from ?? '').toLowerCase().includes(q)
      )
    }

    if (brandIds.length > 0) list = list.filter(w => w.brand_id && brandIds.includes(w.brand_id))
    if (statusFilter !== 'All' && statusFilter !== 'Deleted' && statusFilter !== 'Drafts' && statusFilter !== 'Sourced' && statusFilter !== 'Consigned') {
      list = list.filter(w => w.status === statusFilter)
    }

    if (conditionFilter !== 'All') {
      list = list.filter(w => displayCondition(w.condition) === conditionFilter)
    }

    switch (sort) {
      case 'sell_desc':    return [...list].sort((a, b) => (b.selling_price ?? 0) - (a.selling_price ?? 0))
      case 'sell_asc':     return [...list].sort((a, b) => (a.selling_price ?? 0) - (b.selling_price ?? 0))
      case 'buy_desc':     return [...list].sort((a, b) => (b.purchase_cost ?? 0) - (a.purchase_cost ?? 0))
      case 'name_asc':     return [...list].sort((a, b) => a.watch_name.localeCompare(b.watch_name))
      case 'name_desc':    return [...list].sort((a, b) => b.watch_name.localeCompare(a.watch_name))
      case 'oldest_added': return [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default: {
        // sort_order > 0 items first (ordered), then unordered by created_at desc
        const ordered   = list.filter(w => (w.sort_order ?? 0) > 0).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        const unordered = list.filter(w => (w.sort_order ?? 0) === 0).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return [...ordered, ...unordered]
      }
    }
  }, [watches, search, brandIds, statusFilter, conditionFilter, sort])

  function countByStatus(f: StatusFilter) {
    if (f === 'Deleted') return deletedWatches?.length ?? 0
    if (f === 'Sourced') return watches.filter(w => w.watch_status === 'sourced').length
    if (f === 'Drafts') {
      let list = watches.filter(w => w.is_draft && w.watch_status !== 'sourced')
      if (brandIds.length > 0) list = list.filter(w => w.brand_id && brandIds.includes(w.brand_id))
      return list.length
    }
    if (f === 'Consigned') {
      let list = watches.filter(w => w.inventory_type === 'consign' && w.status !== 'Sold' && !w.is_draft && w.watch_status !== 'sourced')
      if (brandIds.length > 0) list = list.filter(w => w.brand_id && brandIds.includes(w.brand_id))
      if (conditionFilter !== 'All') list = list.filter(w => displayCondition(w.condition) === conditionFilter)
      return list.length
    }
    let list = watches.filter(w => w.watch_status !== 'sourced')
    list = f === 'All' ? list : list.filter(w => !w.is_draft)
    if (brandIds.length > 0) list = list.filter(w => w.brand_id && brandIds.includes(w.brand_id))
    if (conditionFilter !== 'All') list = list.filter(w => displayCondition(w.condition) === conditionFilter)
    return f === 'All' ? list.length : list.filter(w => w.status === f).length
  }

  // Per-brand counts for the Brand dropdown — scoped by the current tab/search/
  // condition (everything except brand itself), so counts reflect what picking
  // that brand would actually show.
  const brandCounts = useMemo(() => {
    let list = [...watches]
    if (statusFilter === 'Sourced') {
      list = list.filter(w => w.watch_status === 'sourced')
    } else if (statusFilter === 'Drafts') {
      list = list.filter(w => w.is_draft && w.watch_status !== 'sourced')
    } else if (statusFilter === 'Consigned') {
      list = list.filter(w => w.inventory_type === 'consign' && !w.is_draft && w.watch_status !== 'sourced')
    } else {
      list = list.filter(w => w.watch_status !== 'sourced')
      if (statusFilter !== 'All') list = list.filter(w => !w.is_draft)
      if (statusFilter !== 'All') list = list.filter(w => w.status === statusFilter)
    }
    if (conditionFilter !== 'All') list = list.filter(w => displayCondition(w.condition) === conditionFilter)
    const map = new Map<string, number>()
    for (const w of list) {
      if (!w.brand_id) continue
      map.set(w.brand_id, (map.get(w.brand_id) ?? 0) + 1)
    }
    return map
  }, [watches, statusFilter, conditionFilter])

  const totalSellingValue = useMemo(
    () => watches.filter(w => !w.is_draft && w.watch_status !== 'sourced').reduce((sum, w) => sum + (w.selling_price ?? 0), 0),
    [watches]
  )

  // ── Filtered deleted (applies same search/brand/condition to the lazy-loaded deleted list) ──
  const filteredDeleted = useMemo(() => {
    if (!deletedWatches) return []
    let list = [...deletedWatches]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.watch_name.toLowerCase().includes(q) ||
        (w.reference ?? '').toLowerCase().includes(q) ||
        (w.serial_number ?? '').toLowerCase().includes(q)
      )
    }
    if (brandIds.length > 0) list = list.filter(w => w.brand_id && brandIds.includes(w.brand_id))
    if (conditionFilter !== 'All') list = list.filter(w => displayCondition(w.condition) === conditionFilter)
    switch (sort) {
      case 'sell_desc':    return [...list].sort((a, b) => (b.selling_price ?? 0) - (a.selling_price ?? 0))
      case 'sell_asc':     return [...list].sort((a, b) => (a.selling_price ?? 0) - (b.selling_price ?? 0))
      case 'name_asc':     return [...list].sort((a, b) => a.watch_name.localeCompare(b.watch_name))
      case 'name_desc':    return [...list].sort((a, b) => b.watch_name.localeCompare(a.watch_name))
      default:             return [...list].sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime())
    }
  }, [deletedWatches, search, brandIds, conditionFilter, sort])

  // ── Bulk helpers ──────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === processed.length && processed.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(processed.map(w => w.id)))
    }
  }

  function toggleBrand(id: string) {
    setBrandIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  // ── Undo ──────────────────────────────────────────────────

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2200)
  }

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

  // ── Deleted watches ───────────────────────────────────────

  async function loadDeletedWatches() {
    setLoadingDeleted(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('watches')
      .select('*, brands(name, color)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedWatches((data ?? []) as unknown as WatchWithBrand[])
    setLoadingDeleted(false)
  }

  async function handleRestore(watchId: string) {
    const watch = deletedWatches?.find(w => w.id === watchId)
    if (!watch) return
    const supabase = createClient()
    await supabase.from('watches').update({ deleted_at: null }).eq('id', watchId)
    setDeletedWatches(v => v?.filter(w => w.id !== watchId) ?? null)
    setWatches(v => [{ ...watch, deleted_at: null } as WatchWithBrand, ...v])
  }

  async function handlePermanentDelete(watchId: string) {
    if (confirmDeleteId !== watchId) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmDeleteId(watchId)
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 5000)
      return
    }
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
    setConfirmDeleteId(null)
    const supabase = createClient()
    await supabase.from('watches').delete().eq('id', watchId)
    setDeletedWatches(v => v?.filter(w => w.id !== watchId) ?? null)
  }

  // ── Single-item actions ───────────────────────────────────

  async function handleDelete(e: React.MouseEvent, watchId: string) {
    e.stopPropagation()
    const watch = watches.find(w => w.id === watchId)
    if (!watch) return
    const supabase = createClient()
    await supabase.from('watches').update({ deleted_at: new Date().toISOString() }).eq('id', watchId)
    void logActivity({ actionType: 'watch_deleted', entityType: 'watch', entityId: watchId, entityLabel: watch.watch_name })
    setWatches(v => v.filter(w => w.id !== watchId))
    showUndo('Watch deleted', async () => {
      const sb = createClient()
      await sb.from('watches').update({ deleted_at: null }).eq('id', watchId)
      setWatches(v => [watch, ...v])
    })
  }

  async function handleDuplicate(e: React.MouseEvent, watch: WatchWithBrand) {
    e.stopPropagation()
    const supabase = createClient()

    const { data: newWatch, error: insertErr } = await supabase
      .from('watches')
      .insert({
        watch_name:     `${watch.watch_name} (Copy)`,
        reference:      watch.reference,
        serial_number:  watch.serial_number,
        date_on_card:   watch.date_on_card,
        condition:      watch.condition,
        set_details:    watch.set_details,
        purchased_from: watch.purchased_from,
        purchase_cost:  watch.purchase_cost,
        currency:       watch.currency,
        status:         'Available' as WatchStatus,
        watch_status:   'Available',
        selling_price:  watch.selling_price,
        comments:       watch.comments,
        photos:         watch.photos,
        labels:         watch.labels,
        brand_id:       watch.brand_id,
        inventory_type: watch.inventory_type,
        consignee_name: watch.consignee_name,
        is_draft:       true,
      })
      .select()
      .single()

    if (insertErr || !newWatch) {
      showUndo('Failed to duplicate watch', async () => { /* no-op */ })
      return
    }

    const { data: investors } = await supabase
      .from('watch_investors')
      .select('investor_name, percentage')
      .eq('watch_id', watch.id)

    if (investors && investors.length > 0) {
      await supabase.from('watch_investors').insert(
        investors.map(i => ({ watch_id: newWatch.id, investor_name: i.investor_name, percentage: i.percentage }))
      )
    }

    void logActivity({ actionType: 'watch_duplicated', entityType: 'watch', entityId: newWatch.id, entityLabel: `${watch.watch_name} (Copy)` })
    setWatches(v => [newWatch as WatchWithBrand, ...v])
    router.refresh()
    showUndo('Watch duplicated as draft', async () => {
      const sb = createClient()
      await sb.from('watch_investors').delete().eq('watch_id', newWatch.id)
      await sb.from('watches').delete().eq('id', newWatch.id)
      setWatches(v => v.filter(w => w.id !== newWatch.id))
    })
  }

  function handleShare(e: React.MouseEvent, watchId: string) {
    e.stopPropagation()
    const w = watches.find(w => w.id === watchId)
    if (!w) return
    const segments = [
      w.watch_name,
      displayCondition(w.condition),
      w.reference ? `Ref: ${w.reference}` : null,
    ].filter((s): s is string => Boolean(s && s.trim()))
    const message = segments.join(' — ')
    void navigator.clipboard.writeText(message)
    showToast('Copied to clipboard')
    void logActivity({ actionType: 'watch_shared', entityType: 'watch', entityId: watchId, entityLabel: w.watch_name })
  }

  // ── Bulk actions ──────────────────────────────────────────

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (!confirm(`Delete ${ids.length} ${ids.length === 1 ? 'watch' : 'watches'}? You can restore from the Deleted tab.`)) return
    const supabase = createClient()
    const snapshot = watches.filter(w => ids.includes(w.id))
    await supabase.from('watches').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    setWatches(v => v.filter(w => !ids.includes(w.id)))
    exitBulkMode()
    showUndo(
      `${ids.length} ${ids.length === 1 ? 'watch' : 'watches'} deleted`,
      async () => {
        const sb = createClient()
        await sb.from('watches').update({ deleted_at: null }).in('id', ids)
        setWatches(v => [...snapshot, ...v])
      }
    )
  }

  async function bulkDuplicate() {
    const supabase = createClient()
    const selected = watches.filter(w => selectedIds.has(w.id))
    const newWatches: WatchWithBrand[] = []

    for (const w of selected) {
      const { data: newWatch } = await supabase
        .from('watches')
        .insert({
          watch_name:     `${w.watch_name} (Copy)`,
          reference:      w.reference,
          serial_number:  w.serial_number,
          date_on_card:   w.date_on_card,
          condition:      w.condition,
          set_details:    w.set_details,
          purchased_from: w.purchased_from,
          purchase_cost:  w.purchase_cost,
          currency:       w.currency,
          status:         'Available' as WatchStatus,
          watch_status:   'Available',
          selling_price:  w.selling_price,
          comments:       w.comments,
          photos:         w.photos,
          labels:         w.labels,
          brand_id:       w.brand_id,
          inventory_type: w.inventory_type,
          consignee_name: w.consignee_name,
          is_draft:       true,
        })
        .select()
        .single()

      if (!newWatch) continue
      newWatches.push(newWatch as WatchWithBrand)

      const { data: investors } = await supabase
        .from('watch_investors')
        .select('investor_name, percentage')
        .eq('watch_id', w.id)

      if (investors && investors.length > 0) {
        await supabase.from('watch_investors').insert(
          investors.map(i => ({ watch_id: newWatch.id, investor_name: i.investor_name, percentage: i.percentage }))
        )
      }
    }

    if (newWatches.length > 0) setWatches(v => [...newWatches, ...v])
    exitBulkMode()
  }

  async function bulkMarkStatus(newStatus: 'Sold' | 'On Hold') {
    const supabase = createClient()
    const ids = Array.from(selectedIds)
    const prev = watches
      .filter(w => ids.includes(w.id))
      .map(w => ({ id: w.id, status: w.status, watch_status: w.watch_status }))
    await supabase.from('watches').update({ status: newStatus, watch_status: newStatus }).in('id', ids)
    setWatches(v =>
      v.map(w =>
        ids.includes(w.id)
          ? { ...w, status: newStatus as WatchStatus, watch_status: newStatus }
          : w
      )
    )
    exitBulkMode()
    showUndo(
      `${ids.length} ${ids.length === 1 ? 'watch' : 'watches'} marked ${newStatus}`,
      async () => {
        const sb = createClient()
        for (const p of prev) {
          await sb.from('watches').update({ status: p.status, watch_status: p.watch_status }).eq('id', p.id)
        }
        setWatches(v =>
          v.map(w => {
            const p = prev.find(x => x.id === w.id)
            return p ? { ...w, status: p.status, watch_status: p.watch_status } : w
          })
        )
      }
    )
  }

  async function bulkMarkAvailable() {
    const supabase = createClient()
    const ids = Array.from(selectedIds)
    const selected = watches.filter(w => ids.includes(w.id))

    // Non-sold watches: update directly
    const nonSold = selected.filter(w => (w.watch_status ?? w.status) !== 'Sold')
    if (nonSold.length > 0) {
      const nonSoldIds = nonSold.map(w => w.id)
      await supabase.from('watches').update({ status: 'Available', watch_status: 'Available' }).in('id', nonSoldIds)
      setWatches(v => v.map(w => nonSoldIds.includes(w.id) ? { ...w, status: 'Available' as WatchStatus, watch_status: 'Available' } : w))
    }

    // Sold watches: check each for a linked active deal
    const soldWatches = selected.filter(w => (w.watch_status ?? w.status) === 'Sold')
    if (soldWatches.length === 0) {
      exitBulkMode()
      return
    }

    // deals is RLS-denied for inventory_clerk — the linked-deal check below
    // can't run, so skip sold watches entirely rather than risk silently
    // detaching a real sale.
    if (isClerk) {
      exitBulkMode()
      showToast(`${soldWatches.length} sold ${soldWatches.length === 1 ? 'watch was' : 'watches were'} skipped — changing a sold watch requires sales access`)
      return
    }

    const watchesWithDeals: Array<{ watchId: string; watchName: string; dealId: string }> = []
    const soldWithoutDeal: typeof soldWatches = []

    for (const w of soldWatches) {
      const { data } = await supabase
        .from('deals')
        .select('id')
        .eq('watch_id', w.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (data) {
        watchesWithDeals.push({ watchId: w.id, watchName: w.watch_name, dealId: data.id })
      } else {
        soldWithoutDeal.push(w)
      }
    }

    // Sold watches without a linked deal: update directly
    if (soldWithoutDeal.length > 0) {
      const noDealsIds = soldWithoutDeal.map(w => w.id)
      await supabase.from('watches').update({ status: 'Available', watch_status: 'Available', sold_price: null }).in('id', noDealsIds)
      setWatches(v => v.map(w => noDealsIds.includes(w.id) ? { ...w, status: 'Available' as WatchStatus, watch_status: 'Available' } : w))
    }

    if (watchesWithDeals.length > 0) {
      // Show dialog — don't exit bulk mode yet
      setConfirmingBulkVoid(false)
      setBulkAvailableDialog({ watchesWithDeals })
    } else {
      exitBulkMode()
    }
  }

  async function handleBulkAvailableDuplicate() {
    if (!bulkAvailableDialog || bulkAvailableActing) return
    setBulkAvailableActing(true)
    const supabase = createClient()
    const count = bulkAvailableDialog.watchesWithDeals.length
    let newWatchId: string | null = null

    for (const { watchId: wId } of bulkAvailableDialog.watchesWithDeals) {
      const { data: w } = await supabase.from('watches').select('*').eq('id', wId).single()
      if (!w) continue
      const { data: newW } = await supabase.from('watches').insert({
        watch_name:     w.watch_name,
        reference:      w.reference,
        serial_number:  w.serial_number,
        date_on_card:   w.date_on_card,
        condition:      w.condition,
        set_details:    w.set_details,
        purchased_from: w.purchased_from,
        purchase_cost:  w.purchase_cost,
        selling_price:  w.selling_price,
        currency:       w.currency,
        photos:         w.photos,
        labels:         w.labels,
        comments:       w.comments,
        brand_id:       w.brand_id,
        inventory_type: w.inventory_type,
        consignee_name: w.consignee_name,
        is_draft:       true,
        watch_status:   'Available',
        status:         'Available',
      }).select('id').single()
      if (newW) {
        newWatchId = newW.id
        const { data: investors } = await supabase.from('watch_investors').select('investor_name, percentage').eq('watch_id', wId)
        if (investors && investors.length > 0) {
          await supabase.from('watch_investors').insert(
            investors.map(inv => ({ watch_id: newW.id, investor_name: inv.investor_name, percentage: inv.percentage }))
          )
        }
      }
    }

    setBulkAvailableDialog(null)
    setBulkAvailableActing(false)
    setConfirmingBulkVoid(false)
    exitBulkMode()

    if (count === 1 && newWatchId) {
      router.push(`/dashboard/watches/${newWatchId}/edit`)
    } else {
      router.refresh()
    }
  }

  async function handleBulkAvailableRemoveSale() {
    if (!bulkAvailableDialog || bulkAvailableActing) return
    setBulkAvailableActing(true)
    const supabase = createClient()
    const now = new Date().toISOString()

    for (const { watchId: wId, dealId } of bulkAvailableDialog.watchesWithDeals) {
      // Delete sale first, then update watch
      await supabase.from('deals').update({ deleted_at: now }).eq('id', dealId)
      await supabase.from('watches').update({ watch_status: 'Available', status: 'Available', sold_price: null }).eq('id', wId)
    }

    const updatedIds = bulkAvailableDialog.watchesWithDeals.map(x => x.watchId)
    setWatches(v => v.map(w =>
      updatedIds.includes(w.id) ? { ...w, status: 'Available' as WatchStatus, watch_status: 'Available' } : w
    ))

    setBulkAvailableDialog(null)
    setBulkAvailableActing(false)
    setConfirmingBulkVoid(false)
    exitBulkMode()
    showUndo(
      `${updatedIds.length} ${updatedIds.length === 1 ? 'sale' : 'sales'} removed — watches marked Available`,
      async () => { /* deals can't easily be un-deleted — skip undo */ }
    )
  }

  // ── Drag-to-reorder ──────────────────────────────────────

  function onDragStart(idx: number) {
    dragFromIdx.current = idx
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function onDragLeave() {
    setDragOverIdx(null)
  }

  async function onDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    setDragOverIdx(null)
    const fromIdx = dragFromIdx.current
    dragFromIdx.current = null
    if (fromIdx === null || fromIdx === toIdx) return

    const newList = [...processed]
    const [moved] = newList.splice(fromIdx, 1)
    newList.splice(toIdx, 0, moved)

    const idOrder = newList.map(w => w.id)
    setWatches(curr => {
      const map = new Map(curr.map(w => [w.id, w]))
      const reordered = idOrder.map(id => map.get(id)).filter(Boolean) as typeof curr
      const rest = curr.filter(w => !idOrder.includes(w.id))
      return [...reordered, ...rest]
    })

    const supabase = createClient()
    await Promise.all(
      newList.map((w, i) =>
        supabase.from('watches').update({ sort_order: i + 1 }).eq('id', w.id)
      )
    )
  }

  // ── Render ────────────────────────────────────────────────

  const allProcessedSelected  = processed.length > 0 && selectedIds.size === processed.length
  const someProcessedSelected = selectedIds.size > 0 && selectedIds.size < processed.length
  const showingDeleted        = statusFilter === 'Deleted'
  const showingDrafts         = statusFilter === 'Drafts'
  const showingSourced        = statusFilter === 'Sourced'
  const activeCount           = countByStatus(statusFilter)

  const TABS: StatusFilter[] = ['All', ...WATCH_STATUSES, 'Consigned', 'Drafts', 'Sourced', 'Deleted']

  useLayoutEffect(() => {
    const el = tabRefs.current[statusFilter]
    if (!el) return
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    setPill(p => (p && p.left === next.left && p.width === next.width) ? p : next)
  }, [statusFilter])

  function brandLabel(): string {
    if (brandIds.length === 0) return 'All brands'
    if (brandIds.length === 1) return brands.find(b => b.id === brandIds[0])?.name ?? '1 selected'
    return `${brandIds.length} selected`
  }

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>Inventory</h1>
          <span className="text-[13px]" style={{ color: INK_45 }}>
            {activeCount} {activeCount === 1 ? 'watch' : 'watches'} shown
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          {/* List / Tile toggle */}
          {!bulkMode && !showingDeleted && !showingDrafts && (
            <div className="hidden md:flex gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${INK_08}` }}>
              <button onClick={() => setView('list')} title="List view" className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'list' ? CARD_BG : 'transparent' }}><ListViewIcon active={view === 'list'} /></button>
              <button onClick={() => setView('tile')} title="Tile view" className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'tile' ? CARD_BG : 'transparent' }}><GridViewIcon active={view === 'tile'} /></button>
            </div>
          )}

          {/* Grid density (desktop, tile view only) */}
          {!bulkMode && !showingDeleted && !showingDrafts && view === 'tile' && (
            <div className="hidden md:flex gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${INK_08}` }}>
              {([3, 4, 5] as const).map(n => (
                <button
                  key={n}
                  onClick={() => selectDesktopCols(n)}
                  title={`${n} columns`}
                  className="w-8 h-9 rounded-[10px] text-xs font-semibold transition-colors"
                  style={{ background: n === desktopCols ? CARD_BG : 'transparent', color: n === desktopCols ? INK : INK_45 }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* Select / Cancel bulk mode */}
          {!showingDeleted && !showingDrafts && (
            <button
              onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
              className="hidden md:flex items-center whitespace-nowrap transition-colors"
              style={{ height: 46, padding: '0 20px', borderRadius: RADII.pill, border: `1px solid ${bulkMode ? INK : INK_08}`, background: bulkMode ? INK : '#fff', color: bulkMode ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
            >
              {bulkMode ? 'Cancel' : 'Select'}
            </button>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && (
            <div className="flex md:hidden gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${INK_08}` }}>
              <button onClick={() => setView('list')} title="List view" className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'list' ? CARD_BG : 'transparent' }}><ListViewIcon active={view === 'list'} /></button>
              <button onClick={() => setView('tile')} title="Tile view" className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-colors" style={{ background: view === 'tile' ? CARD_BG : 'transparent' }}><GridViewIcon active={view === 'tile'} /></button>
            </div>
          )}

          {/* Grid density (mobile, tile view only) */}
          {!bulkMode && !showingDeleted && !showingDrafts && view === 'tile' && (
            <div className="flex md:hidden gap-0.5" style={{ padding: 4, borderRadius: RADII.sm, background: '#fff', border: `1px solid ${INK_08}` }}>
              {([1, 2] as const).map(n => (
                <button
                  key={n}
                  onClick={() => selectMobileCols(n)}
                  title={`${n} column${n === 1 ? '' : 's'}`}
                  className="w-8 h-9 rounded-[10px] text-xs font-semibold transition-colors"
                  style={{ background: n === mobileCols ? CARD_BG : 'transparent', color: n === mobileCols ? INK : INK_45 }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && (
            <button
              onClick={() => { setShowFilterPanel(v => !v); setOpenMenu(null) }}
              title="Filters"
              className="relative flex items-center justify-center transition-colors"
              style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${showFilterPanel ? INK : INK_08}`, background: showFilterPanel ? INK : '#fff' }}
            >
              <FunnelIcon color={showFilterPanel ? LIME : INK} />
              {activeFilterCount > 0 && !showFilterPanel && (
                <span className="absolute -top-1 -right-1 w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ background: GREEN }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && !showingSourced && (
            <Link href="/dashboard/watches/new" title="Add watch" className="hidden md:flex items-center justify-center flex-none rounded-full transition-colors" style={{ width: 46, height: 46, background: INK }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M10 4.2v11.6M4.2 10h11.6"/></svg>
            </Link>
          )}
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      {!bulkMode && (
        <div className="relative mb-4" ref={searchRef}>
          <div className="flex items-center gap-3" style={{ height: CONTROL_HEIGHT_LG, padding: '0 20px', borderRadius: RADII.md, background: '#fff', border: `1px solid ${INK_08}` }}>
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by name, reference, serial…"
              className="border-0 outline-0 bg-transparent w-full"
              style={{ fontSize: 14.5, color: INK, fontFamily: 'inherit' }}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-lg z-20 overflow-hidden" style={{ border: `1px solid ${INK_08}` }}>
              {suggestions.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onMouseDown={() => { setShowSuggestions(false); router.push(`/dashboard/watches/${w.id}`) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f7f6f3] transition-colors text-left"
                >
                  {w.photos && w.photos.length > 0 ? (
                    <LazyImage src={w.photos[0]} alt="" width={32} height={32} sizes="32px" className="rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: CARD_BG }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: INK }}>{w.watch_name}</p>
                    {w.reference && <p className="text-xs" style={{ color: INK_45 }}>Ref: {w.reference}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter dropdowns (brand / condition / sort) ──────── */}
      {!bulkMode && showFilterPanel && (
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">

          {/* Brand — multi-select */}
          <div className="relative" data-filter-menu>
            <button
              onClick={() => setOpenMenu(v => v === 'brand' ? null : 'brand')}
              className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
              style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${openMenu === 'brand' || brandIds.length > 0 ? INK : INK_08}`, background: openMenu === 'brand' || brandIds.length > 0 ? INK : '#fff', color: openMenu === 'brand' || brandIds.length > 0 ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: openMenu === 'brand' || brandIds.length > 0 ? 'rgba(255,255,255,.5)' : INK_45 }}>Brand</span>
              <span>{brandLabel()}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'brand' && (
              <div className="absolute top-[52px] left-0 z-40 bg-white rounded-2xl p-2 flex flex-col gap-0.5 max-h-[340px] overflow-auto" style={{ width: 290, border: `1px solid ${INK_08}`, boxShadow: '0 14px 36px rgba(20,20,15,.16)' }}>
                {brands.map(b => {
                  const on = brandIds.includes(b.id)
                  const count = brandCounts.get(b.id) ?? 0
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBrand(b.id)}
                      className="flex items-center gap-3 border-0 cursor-pointer text-left transition-colors"
                      style={{ padding: '8px 10px', borderRadius: 12, background: on ? CARD_BG : 'transparent', fontSize: 13, fontWeight: on ? 600 : 500 }}
                    >
                      <span className="w-9 h-9 flex-none rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: b.color ?? '#9ca3af' }}>
                        {brandMark(b.name)}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{b.name}</span>
                      <span className="text-[11.5px]" style={{ color: 'rgba(20,20,15,.35)' }}>{count}</span>
                      <span className="w-[18px] h-[18px] flex-none rounded-[6px] flex items-center justify-center text-white text-[11px] font-bold" style={{ border: `1.5px solid ${on ? INK : 'rgba(20,20,15,.2)'}`, background: on ? INK : 'transparent' }}>
                        {on ? '✓' : ''}
                      </span>
                    </button>
                  )
                })}
                {brandIds.length > 0 && (
                  <button onClick={() => setBrandIds([])} className="text-left border-0 cursor-pointer" style={{ marginTop: 4, borderTop: `1px solid ${INK_08}`, fontSize: 12.5, fontWeight: 600, color: GREEN, padding: '11px 10px 6px', background: 'transparent' }}>
                    Clear all brands
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Condition */}
          <div className="relative" data-filter-menu>
            <button
              onClick={() => setOpenMenu(v => v === 'condition' ? null : 'condition')}
              className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
              style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${openMenu === 'condition' || conditionFilter !== 'All' ? INK : INK_08}`, background: openMenu === 'condition' || conditionFilter !== 'All' ? INK : '#fff', color: openMenu === 'condition' || conditionFilter !== 'All' ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: openMenu === 'condition' || conditionFilter !== 'All' ? 'rgba(255,255,255,.5)' : INK_45 }}>Condition</span>
              <span>{conditionFilter}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'condition' && (
              <div className="absolute top-[52px] left-0 z-40 bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ minWidth: 190, border: `1px solid ${INK_08}`, boxShadow: '0 14px 36px rgba(20,20,15,.16)' }}>
                {(['All', 'Unworn', 'Pre-Owned'] as ConditionFilter[]).map(c => (
                  <button
                    key={c}
                    onClick={() => { setConditionFilter(c); setOpenMenu(null) }}
                    className="text-left border-0 cursor-pointer whitespace-nowrap"
                    style={{ fontSize: 13, fontWeight: conditionFilter === c ? 600 : 500, padding: '10px 12px', borderRadius: 11, background: conditionFilter === c ? CARD_BG : 'transparent', color: INK }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative" data-filter-menu>
            <button
              onClick={() => setOpenMenu(v => v === 'sort' ? null : 'sort')}
              className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
              style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${openMenu === 'sort' || sort !== 'last_added' ? INK : INK_08}`, background: openMenu === 'sort' || sort !== 'last_added' ? INK : '#fff', color: openMenu === 'sort' || sort !== 'last_added' ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: openMenu === 'sort' || sort !== 'last_added' ? 'rgba(255,255,255,.5)' : INK_45 }}>Sort by</span>
              <span>{SORT_LABELS[sort]}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'sort' && (
              <div className="absolute top-[52px] left-0 z-40 bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ minWidth: 236, border: `1px solid ${INK_08}`, boxShadow: '0 14px 36px rgba(20,20,15,.16)' }}>
                {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
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

          {(brandIds.length > 0 || conditionFilter !== 'All') && (
            <button
              onClick={() => { setBrandIds([]); setConditionFilter('All'); setOpenMenu(null) }}
              className="border-0 cursor-pointer"
              style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, background: 'transparent', fontSize: 13, fontWeight: 600, color: GREEN }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* ── Status filter tabs + total value ─────────────────── */}
      {!bulkMode && (
        <div className="mb-5">
          {isAdmin && !showingDeleted && totalSellingValue > 0 && (
            <p className="md:hidden text-xs mb-2" style={{ color: INK_45 }}>
              Total value: <span className="font-semibold tabular-nums" style={{ color: INK }}>{formatLKR(totalSellingValue)}</span>
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center gap-0.5 overflow-x-auto pb-px">
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all"
                style={{
                  left: pill?.left ?? 0, width: pill?.width ?? 0, height: 40,
                  background: '#fff', boxShadow: '0 1px 3px rgba(20,20,15,.09)',
                  transitionProperty: 'left,width', transitionDuration: '.34s', transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                  opacity: pill ? 1 : 0,
                }}
              />
              {TABS.map(f => {
                const isActive = statusFilter === f
                return (
                  <button
                    key={f}
                    ref={el => { tabRefs.current[f] = el }}
                    onClick={() => setStatusFilter(f)}
                    className="relative z-[1] flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    style={{ height: 40, padding: '0 14px', borderRadius: RADII.pill, background: 'transparent', fontSize: 13.5, fontWeight: isActive ? 600 : 500, color: TAB_COLORS[f] }}
                  >
                    {f}
                    {(f !== 'Deleted' || deletedWatches !== null) && (
                      <span className="text-[12px] tabular-nums" style={{ opacity: isActive ? 0.6 : 0.45 }}>
                        {countByStatus(f)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {isAdmin && !showingDeleted && totalSellingValue > 0 && (
              <div className="hidden md:flex items-center gap-2 ml-auto whitespace-nowrap shrink-0">
                <span className="text-[12.5px]" style={{ color: INK_45 }}>Total value</span>
                <span className="tabular-nums" style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-.02em' }}>{formatLKR(totalSellingValue)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk mode header bar ──────────────────────────────── */}
      {bulkMode && (
        <div className="flex items-center gap-3 mb-5 py-2">
          <Checkbox
            checked={allProcessedSelected}
            indeterminate={someProcessedSelected}
            onChange={toggleSelectAll}
          />
          <span className="text-sm" style={{ color: INK_60 }}>
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${processed.length} selected`
              : `Select watches — ${processed.length} shown`}
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 text-xs transition-colors"
              style={{ color: INK_45 }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Deleted tab content ───────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && (
            <div className="flex items-center justify-center py-20 text-sm" style={{ color: INK_45 }}>
              Loading deleted watches…
            </div>
          )}
          {!loadingDeleted && (deletedWatches === null || filteredDeleted.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: CARD_BG }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={INK_45} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: INK_45 }}>No deleted watches</p>
            </div>
          )}
          {!loadingDeleted && filteredDeleted.length > 0 && (
            <div className="flex flex-col gap-2">
              {filteredDeleted.map(w => {
                const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 cursor-pointer transition-colors"
                    style={{ padding: '12px 16px', background: '#fff', border: `1px solid ${INK_08}`, borderRadius: RADII.md }}
                    onClick={() => router.push(`/dashboard/watches/${w.id}`)}
                  >
                    {w.photos && w.photos.length > 0 ? (
                      <LazyImage src={w.photos[0]} alt={w.watch_name} width={56} height={56} sizes="56px" className="rounded-xl object-cover opacity-50" style={{ border: `1px solid ${INK_08}` }} />
                    ) : (
                      <WatchPlaceholder small mark={brandName ? brandMark(brandName) : null} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: INK_45 }}>{w.watch_name}</div>
                      {w.reference && <div className="text-xs mt-0.5" style={{ color: 'rgba(20,20,15,.3)' }}>Ref: {w.reference}</div>}
                    </div>
                    {brandName && (
                      <span className="hidden md:inline text-xs font-semibold opacity-40" style={{ color: brandColor ?? INK_45 }}>{brandName}</span>
                    )}
                    <span className="hidden sm:inline text-xs tabular-nums" style={{ color: 'rgba(20,20,15,.3)' }}>
                      {w.deleted_at ? new Date(w.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'}
                    </span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleRestore(w.id)}
                        className="flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: INK, background: '#fff', border: `1px solid ${INK_08}`, borderRadius: 10 }}
                      >
                        <RestoreIcon /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(w.id)}
                        className="whitespace-nowrap transition-colors"
                        style={confirmDeleteId === w.id
                          ? { padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#fff', background: RED, border: `1px solid ${RED}`, borderRadius: 10 }
                          : { padding: '7px 12px', fontSize: 12, fontWeight: 600, color: RED, background: '#fff', border: `1px solid ${INK_08}`, borderRadius: 10 }}
                      >
                        {confirmDeleteId === w.id ? 'Confirm delete?' : 'Delete forever'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Drafts tab content ───────────────────────────────── */}
      {showingDrafts && (
        <div>
          {processed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: AMBER_BG }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" strokeLinejoin="round"/>
                  <path d="M14 2v6h6" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: INK_45 }}>No draft watches</p>
            </div>
          )}
          {processed.length > 0 && (
            <div className="flex flex-col gap-2">
              {processed.map(w => {
                const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 cursor-pointer transition-colors"
                    style={{ padding: '12px 16px', background: '#fff', border: `1px solid ${INK_08}`, borderRadius: RADII.md }}
                    onClick={() => router.push(`/dashboard/watches/${w.id}/edit`)}
                  >
                    {w.photos && w.photos.length > 0 ? (
                      <LazyImage src={w.photos[0]} alt={w.watch_name} width={56} height={56} sizes="56px" className="rounded-xl object-cover opacity-70" style={{ border: `1px solid ${INK_08}` }} />
                    ) : (
                      <WatchPlaceholder small mark={brandName ? brandMark(brandName) : null} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate" style={{ color: INK }}>{w.watch_name}</span>
                        <span className="text-[10px] font-bold text-white rounded px-1 py-0.5 leading-none shrink-0" style={{ background: '#b5761a' }}>DRAFT</span>
                      </div>
                      {w.reference && <div className="text-xs mt-0.5" style={{ color: INK_45 }}>Ref: {w.reference}</div>}
                    </div>
                    {brandName && (
                      <span className="hidden md:inline text-xs font-semibold" style={{ color: brandColor ?? INK_45 }}>{brandName}</span>
                    )}
                    <span className="hidden sm:inline text-xs tabular-nums" style={{ color: INK_45 }}>
                      {new Date(w.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                    </span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/watches/${w.id}/edit`)}
                        className="flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: INK, background: '#fff', border: `1px solid ${INK_08}`, borderRadius: 10 }}
                      >
                        <EditIcon /> Edit
                      </button>
                      <button
                        onClick={e => handleDelete(e, w.id)}
                        className="whitespace-nowrap transition-colors"
                        style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: RED, background: '#fff', border: `1px solid ${INK_08}`, borderRadius: 10 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Normal content (non-Deleted, non-Drafts tab) ─────────── */}
      {!showingDeleted && !showingDrafts && (
        <>
          {/* ── Empty state ─────────────────────────────────────── */}
          {processed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: CARD_BG }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={INK_45} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: INK_60 }}>
                {watches.length === 0 ? 'No watches in inventory yet' : 'No results'}
              </p>
              {watches.length === 0 && (
                <Link href="/dashboard/watches/new" className="mt-3 text-sm underline underline-offset-4" style={{ color: INK }}>
                  Add your first watch
                </Link>
              )}
            </div>
          )}

          {/* ── Tile View ───────────────────────────────────────── */}
          {processed.length > 0 && view === 'tile' && (
            <div className={`grid gap-3 md:gap-4 ${MOBILE_TILE_COLS[mobileCols]} ${DESKTOP_TILE_COLS[desktopCols]}`}>
              {processed.map((w, tileIdx) => {
                const isSelected  = selectedIds.has(w.id)
                const isHighlight = w.id === highlightId
                const brandName   = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor  = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                const s = STATUS_STYLE[w.watch_status ?? w.status] ?? STATUS_STYLE.Sold
                // Ref · year · acquired — each segment drops out when its field is
                // null, so a watch with no reference or no date_on_card leaves no empty gap.
                const tileMeta = [
                  w.reference ? `Ref: ${w.reference}` : null,
                  displayYear(w.date_on_card),
                  w.date_acquired ? new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' }) : null,
                ].filter(Boolean).join(' · ')
                return (
                  <div
                    key={w.id}
                    className={`group relative bg-white overflow-visible cursor-pointer transition-all duration-200 card-hover ${isHighlight ? 'row-highlight' : ''} ${staggerActive.current && tileIdx < 20 ? 'stagger-item' : ''}`}
                    style={{
                      borderRadius: RADII.lg,
                      border: bulkMode && isSelected ? `2px solid ${INK}` : `1px solid ${INK_08}`,
                      ...(staggerActive.current && tileIdx < 20 ? { animationDelay: `${tileIdx * 40}ms` } : {}),
                    }}
                    onClick={() => bulkMode ? toggleSelect(w.id) : router.push(`/dashboard/watches/${w.id}`)}
                  >
                    {/* Photo */}
                    <div className="relative overflow-hidden" style={{ height: 180, background: CARD_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                      {w.photos && w.photos.length > 0 ? (
                        <LazyImage
                          src={w.photos[0]}
                          alt={w.watch_name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[13px] font-bold tracking-wide" style={{ color: INK_45 }}>{brandName ? brandMark(brandName) : ''}</span>
                        </div>
                      )}

                      {brandName && (
                        <span className="absolute top-3 left-3 pointer-events-none flex items-center" style={{ height: 28, padding: '0 12px', background: 'rgba(255,255,255,.94)', borderRadius: RADII.pill, boxShadow: '0 2px 8px rgba(20,20,15,.12)' }}>
                          <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: brandColor ?? INK }}>{brandName}</span>
                        </span>
                      )}

                      {/* Bulk mode checkbox overlay */}
                      {bulkMode && (
                        <div
                          className="absolute top-2 right-2 z-10"
                          onClick={e => { e.stopPropagation(); toggleSelect(w.id) }}
                        >
                          <div className="w-5 h-5 rounded-md flex items-center justify-center transition-colors" style={{ border: `2px solid ${isSelected ? INK : 'rgba(20,20,15,.25)'}`, background: isSelected ? INK : 'rgba(255,255,255,.9)' }}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Normal hover actions */}
                      {!bulkMode && (
                        <div
                          className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150"
                          onClick={e => e.stopPropagation()}
                        >
                          <TileBtn title="Share" onClick={e => handleShare(e, w.id)}><ShareIcon /></TileBtn>
                          <TileBtn title="Duplicate" onClick={e => handleDuplicate(e, w)}><CopyIcon /></TileBtn>
                          <div className="relative">
                            <TileBtn title="More options" onClick={e => { e.stopPropagation(); const next = tileMenuId === w.id ? null : w.id; setTileMenuId(next); if (!next) setTileDeleteConfirmId(null) }}>
                              <DotsIcon />
                            </TileBtn>
                            {tileMenuId === w.id && (
                              <div data-tile-menu className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-40 overflow-hidden min-w-[140px]" style={{ border: `1px solid ${INK_08}` }}>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#f7f6f3] transition-colors" style={{ color: INK }} onClick={e => { e.stopPropagation(); setTileMenuId(null); router.push(`/dashboard/watches/${w.id}/edit`) }}>
                                  <EditIcon /> Edit
                                </button>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#f7f6f3] transition-colors" style={{ color: INK }} onClick={e => {
                                  setTileMenuId(null)
                                  handleShare(e, w.id)
                                }}>
                                  <ShareIcon /> Share via WhatsApp
                                </button>
                                <div className="h-px mx-2" style={{ background: INK_08 }} />
                                {tileDeleteConfirmId === w.id ? (
                                  <div className="px-3 py-2">
                                    <p className="text-xs mb-1.5" style={{ color: INK_45 }}>Delete this watch?</p>
                                    <div className="flex gap-1.5">
                                      <button className="flex-1 text-xs font-medium text-white rounded-lg px-2 py-1 transition-colors" style={{ background: RED }} onClick={e => { e.stopPropagation(); setTileMenuId(null); setTileDeleteConfirmId(null); handleDelete(e, w.id) }}>Delete</button>
                                      <button className="flex-1 text-xs font-medium rounded-lg px-2 py-1 transition-colors" style={{ background: CARD_BG, color: INK_60 }} onClick={e => { e.stopPropagation(); setTileDeleteConfirmId(null) }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 transition-colors" style={{ color: RED }} onClick={e => { e.stopPropagation(); setTileDeleteConfirmId(w.id) }}>
                                    <TrashIcon /> Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '16px 18px 18px' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="truncate leading-tight" style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: '-.02em', color: INK }}>{w.watch_name}</p>
                        {w.is_draft && (
                          <span className="text-[10px] font-medium rounded px-1 py-0.5 leading-none shrink-0" style={{ background: CARD_BG, color: INK_45 }}>DRAFT</span>
                        )}
                        <LabelBadges labels={w.labels} createdAt={w.created_at} />
                      </div>
                      {tileMeta && (
                        <p className="text-[12px] truncate" style={{ color: INK_45 }}>{tileMeta}</p>
                      )}
                      <div className="mt-2.5 pt-2.5 flex flex-col gap-2" style={{ borderTop: `1px solid ${INK_08}` }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-[7px] h-[7px] flex-none rounded-full" style={{ background: s.dot }} />
                          <span className="text-[12.5px] whitespace-nowrap" style={{ color: INK_60 }}>{w.watch_status ?? w.status}</span>
                          <span className="ml-auto"><ConditionBadge condition={w.condition} /></span>
                        </div>
                        {w.selling_price != null && (
                          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.02em', color: '#8a6f2e' }}>
                            {formatLKR(w.selling_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Mobile list view ───────────────────────────────── */}
          {processed.length > 0 && view === 'list' && (
            <div className="md:hidden flex flex-col gap-2">
              {processed.map(w => {
                const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    className="flex items-start gap-3 cursor-pointer transition-colors"
                    style={{ padding: '14px', background: '#fff', border: `1px solid ${INK_08}`, borderRadius: RADII.md }}
                    onClick={() => router.push(`/dashboard/watches/${w.id}`)}
                  >
                    <div className="shrink-0">
                      {w.photos?.[0] ? (
                        <LazyImage src={w.photos[0]} alt={w.watch_name} width={64} height={64} sizes="64px" className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <WatchPlaceholder mark={brandName ? brandMark(brandName) : null} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate leading-snug" style={{ fontSize: 15, color: INK }}>{w.watch_name}</p>
                      {brandName && (
                        <p className="mt-0.5 font-bold uppercase tracking-wide truncate" style={{ fontSize: 11, color: brandColor ?? INK_45 }}>{brandName}</p>
                      )}
                      {w.reference && (
                        <p className="mt-0.5 truncate" style={{ fontSize: 12, color: INK_60 }}>Ref: {w.reference}</p>
                      )}
                      {w.date_acquired && (
                        <p className="flex items-center gap-1 mt-0.5 truncate" style={{ fontSize: 11, color: INK_45 }}>
                          <CalendarIcon />
                          {new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                        </p>
                      )}
                      <div className="mt-2"><StatusBadge status={w.watch_status ?? w.status} /></div>
                    </div>
                    <div className="shrink-0 text-right pt-0.5">
                      <p className="font-bold tabular-nums" style={{ fontSize: 15, color: '#8a6f2e' }}>{formatLKR(w.selling_price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Desktop List View ──────────────────────────────────── */}
          {processed.length > 0 && view === 'list' && (
            <div className="hidden md:flex flex-col gap-2.5">
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: `${bulkMode ? '28px ' : ''}minmax(320px,3.4fr) 108px 130px 104px 126px 118px 134px`, padding: '2px 22px', fontSize: 11, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(20,20,15,.42)' }}
              >
                {bulkMode && <div />}
                <div>Watch</div>
                <div>Date</div>
                <div>Condition</div>
                <div>Set</div>
                <div>Status</div>
                <div className="text-right">Buy</div>
                <div className="text-right">Sell</div>
              </div>
              {processed.map((w, idx) => {
                const isSelected  = selectedIds.has(w.id)
                const isHighlight = w.id === highlightId
                const brandName   = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor  = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    draggable={!bulkMode && sort === 'last_added'}
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDragLeave={onDragLeave}
                    onDrop={e => onDrop(e, idx)}
                    className={`group relative grid items-center cursor-pointer transition-all ${isHighlight ? 'row-highlight' : (staggerActive.current && idx < 20 ? 'stagger-item' : '')}`}
                    style={{
                      gridTemplateColumns: `${bulkMode ? '28px ' : ''}minmax(320px,3.4fr) 108px 130px 104px 126px 118px 134px`,
                      padding: '14px 22px', background: '#fff', borderRadius: 20,
                      border: `1px solid ${dragOverIdx === idx ? BLUE : (bulkMode && isSelected ? INK : INK_08)}`,
                      ...(staggerActive.current && idx < 20 ? { animationDelay: `${idx * 40}ms` } : {}),
                    }}
                    onClick={() => bulkMode ? toggleSelect(w.id) : router.push(`/dashboard/watches/${w.id}`)}
                  >
                    {bulkMode && (
                      <div onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(w.id)} />
                      </div>
                    )}

                    <div className="flex items-center gap-4 min-w-0" style={{ paddingRight: 20 }}>
                      {w.photos && w.photos.length > 0 ? (
                        <LazyImage src={w.photos[0]} alt={w.watch_name} width={64} height={64} sizes="64px" className="rounded-2xl object-cover shrink-0" style={{ border: `1px solid ${INK_08}` }} />
                      ) : (
                        <WatchPlaceholder small mark={brandName ? brandMark(brandName) : null} />
                      )}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        {brandName && (
                          <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: brandColor ?? INK_45 }}>{brandName}</span>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold truncate" style={{ fontSize: 15.5, letterSpacing: '-.01em', color: INK }}>{w.watch_name}</span>
                          {w.is_draft ? (
                            <span className="text-[10px] font-medium rounded px-1 py-0.5 leading-none shrink-0" style={{ background: CARD_BG, color: INK_45 }}>DRAFT</span>
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: GREEN }} title="Live" />
                          )}
                          <LabelBadges labels={w.labels} createdAt={w.created_at} />
                        </div>
                        <span className="text-[11.5px] truncate" style={{ color: INK_45 }}>
                          {w.reference ? `Ref: ${w.reference}` : ''}{w.date_acquired ? ` · added ${new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' })}` : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: INK_60, fontVariantNumeric: 'tabular-nums' }}>{displayDate(w.date_on_card)}</div>
                    <div><ConditionBadge condition={w.condition} /></div>
                    <div className="whitespace-nowrap" style={{ fontSize: 13, color: INK_60 }}>{w.set_details}</div>
                    <div>
                      {w.is_draft ? (
                        <span className="text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1.5" style={{ background: CARD_BG, color: INK_45 }}>Draft</span>
                      ) : (
                        <StatusDot status={w.watch_status ?? w.status} />
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap" style={{ fontSize: 13, color: 'rgba(20,20,15,.5)', fontVariantNumeric: 'tabular-nums' }}>{formatLKR(w.purchase_cost)}</div>
                    <div className="text-right whitespace-nowrap" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em', color: INK, fontVariantNumeric: 'tabular-nums' }}>{formatLKR(w.selling_price)}</div>

                    {/* Row hover actions — overlay so the 7-column grid above matches the design 1:1 */}
                    {!bulkMode && (
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white rounded-xl"
                        style={{ boxShadow: '0 4px 14px rgba(20,20,15,.12)', border: `1px solid ${INK_08}` }}
                        onClick={e => e.stopPropagation()}
                      >
                        <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/watches/${w.id}/edit`) }}><EditIcon /></ActionBtn>
                        <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, w)}><CopyIcon /></ActionBtn>
                        <ActionBtn title="Share"     onClick={e => handleShare(e, w.id)}><ShareIcon /></ActionBtn>
                        <ActionBtn title="Delete"    onClick={e => handleDelete(e, w.id)} danger><TrashIcon /></ActionBtn>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Bulk action bar ───────────────────────────────────── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white pl-4 pr-3 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none" style={{ background: INK }}>
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {selectedIds.size} {selectedIds.size === 1 ? 'watch' : 'watches'}
          </span>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={bulkDuplicate}
            title="Duplicate selected"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <CopyIcon /> Duplicate
          </button>

          <button
            onClick={bulkDelete}
            title="Delete selected"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors text-xs font-medium"
          >
            <TrashIcon /> Delete
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={bulkMarkAvailable}
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium whitespace-nowrap text-emerald-300 hover:text-emerald-200"
          >
            Mark Available
          </button>

          <button
            onClick={() => bulkMarkStatus('Sold')}
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium whitespace-nowrap"
          >
            Mark Sold
          </button>

          <button
            onClick={() => bulkMarkStatus('On Hold')}
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium whitespace-nowrap"
          >
            Mark On Hold
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={exitBulkMode}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            title="Exit selection (Esc)"
          >
            <XSmallIcon />
          </button>
        </div>
      )}

      {/* ── Bulk mark-available dialog ────────────────────────── */}
      {bulkAvailableDialog && createPortal(
        // Portal straight to <body>: the dashboard layout wraps every page in an
        // .animate-fade-in div whose forwards-filled transform establishes a new
        // containing block for position:fixed descendants, which pushes this
        // dialog off-screen (centers against full page height, not viewport)
        // without the portal.
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !bulkAvailableActing && setBulkAvailableDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            {!confirmingBulkVoid ? (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {bulkAvailableDialog.watchesWithDeals.length === 1
                    ? 'This watch has a completed sale'
                    : `${bulkAvailableDialog.watchesWithDeals.length} watches have linked sales`}
                </h3>
                <p className="text-sm text-gray-500 mb-5">Choose how you&apos;d like to proceed:</p>

                {bulkAvailableDialog.watchesWithDeals.length === 1 && (
                  <p className="text-xs text-gray-400 mb-4 font-medium truncate">
                    {bulkAvailableDialog.watchesWithDeals[0].watchName}
                  </p>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handleBulkAvailableDuplicate}
                    disabled={bulkAvailableActing}
                    className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900">Duplicate</span>
                    <span className="text-xs text-gray-400 mt-0.5">
                      Create draft {bulkAvailableDialog.watchesWithDeals.length === 1 ? 'copy' : 'copies'}. Originals stay as Sold.
                    </span>
                  </button>

                  <button
                    onClick={() => setConfirmingBulkVoid(true)}
                    disabled={bulkAvailableActing}
                    className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900">Void Sale</span>
                    <span className="text-xs text-gray-400 mt-0.5">
                      Delete linked {bulkAvailableDialog.watchesWithDeals.length === 1 ? 'sale' : 'sales'} and mark as Available.
                    </span>
                  </button>

                  <button
                    onClick={() => setBulkAvailableDialog(null)}
                    disabled={bulkAvailableActing}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  Void {bulkAvailableDialog.watchesWithDeals.length === 1 ? 'this sale' : `${bulkAvailableDialog.watchesWithDeals.length} sales`}?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  This permanently deletes the {bulkAvailableDialog.watchesWithDeals.length === 1 ? 'sale record' : 'sale records'} — it can&apos;t be undone.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleBulkAvailableRemoveSale}
                    disabled={bulkAvailableActing}
                    className="w-full text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
                  >
                    {bulkAvailableActing ? 'Voiding…' : 'Yes, void the sale' + (bulkAvailableDialog.watchesWithDeals.length === 1 ? '' : 's')}
                  </button>
                  <button
                    onClick={() => setConfirmingBulkVoid(false)}
                    disabled={bulkAvailableActing}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {bulkAvailableActing && !confirmingBulkVoid && (
              <div className="mt-3 text-center text-xs text-gray-400">Working…</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Share toast ───────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none" style={{ background: INK }}>
          {toast}
        </div>
      )}

      {/* ── Undo toast ────────────────────────────────────────── */}
      {undoState && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 text-white px-4 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none" style={{ background: INK }}>
          <span className="text-sm">{undoState.message}</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold transition-colors"
            style={{ color: LIME }}
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

      {/* ── Mobile Add Watch FAB ──────────────────────────────── */}
      {!bulkMode && !showingDeleted && !showingDrafts && !showingSourced && (
        <Link
          href="/dashboard/watches/new"
          aria-label="Add Watch"
          title="Add Watch"
          className="md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          style={{ background: INK }}
        >
          <PlusIcon />
        </Link>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function ActionBtn({
  children, title, onClick, danger = false,
}: {
  children: React.ReactNode
  title: string
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-2 transition-colors"
      style={{ color: danger ? 'rgba(178,58,44,.6)' : INK_45 }}
    >
      {children}
    </button>
  )
}

function TileBtn({
  children, title, onClick,
}: {
  children: React.ReactNode
  title: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-lg backdrop-blur-sm shadow-sm transition-colors"
      style={{ background: 'rgba(255,255,255,.9)', color: INK_60 }}
    >
      {children}
    </button>
  )
}
