'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { WatchWithBrand, WatchStatus, Brand } from '@/types'
import { WATCH_STATUSES } from '@/types'

// ── Icons ────────────────────────────────────────────────────

function WatchPlaceholder({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'w-14 h-14' : 'w-full aspect-square'} rounded-xl bg-gray-100 flex items-center justify-center shrink-0`}>
      <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="7"/>
        <path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ShareIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.3M4.5 8.7l6 3.4" strokeLinecap="round"/></svg> }
function SearchIcon()  { return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/></svg> }
function ListIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }
function FunnelIcon()  { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function DotsIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg> }
function CheckIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function RestoreIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }


// ── Types & constants ─────────────────────────────────────────

type SortOption      = 'last_added' | 'oldest_added' | 'sell_desc' | 'sell_asc' | 'buy_desc' | 'name_asc' | 'name_desc'
type ConditionFilter = 'All' | 'Brand New' | 'Pre-Owned'
type StatusFilter    = WatchStatus | 'All' | 'Deleted' | 'Drafts' | 'Sourced'
type ViewMode        = 'list' | 'tile'

const SORT_LABELS: Record<SortOption, string> = {
  last_added:    'Date Added: Newest First',
  oldest_added:  'Date Added: Oldest First',
  sell_desc:     'Price: High to Low',
  sell_asc:      'Price: Low to High',
  name_asc:      'Name: A to Z',
  name_desc:     'Name: Z to A',
  buy_desc:      'Buy Price: High → Low',
}

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
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('All')
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('All')
  const [brandId,         setBrandId]         = useState<string | null>(null)
  const [search,          setSearch]          = useState('')
  const [sort,            setSort]            = useState<SortOption>('last_added')
  const [view,            setView]            = useState<ViewMode>('tile')
  const [showSortMenu,    setShowSortMenu]    = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [tileMenuId,      setTileMenuId]      = useState<string | null>(null)

  // Bulk edit
  const [bulkMode,    setBulkMode]    = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk mark-available dialog
  const [bulkAvailableDialog, setBulkAvailableDialog] = useState<{
    watchesWithDeals: Array<{ watchId: string; watchName: string; dealId: string }>
  } | null>(null)
  const [bulkAvailableActing, setBulkAvailableActing] = useState(false)

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState,   setUndoState]   = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Inline confirm for permanent delete
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Deleted watches (lazy-loaded when Deleted tab is opened)
  const [deletedWatches, setDeletedWatches] = useState<WatchWithBrand[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  const searchRef   = useRef<HTMLDivElement>(null)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Drag-to-reorder (list view only)
  const dragFromIdx  = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const exitBulkMode = useCallback(() => {
    setBulkMode(false)
    setSelectedIds(new Set())
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
      setTileMenuId(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSortMenu(false)
        setTileMenuId(null)
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

  const hasActiveFilters =
    brandId !== null || conditionFilter !== 'All' || statusFilter !== 'All' || sort !== 'last_added'

  const activeFilterCount = (brandId !== null ? 1 : 0) + (conditionFilter !== 'All' ? 1 : 0)

  function clearAll() {
    setBrandId(null)
    setConditionFilter('All')
    setStatusFilter('All')
    setSort('last_added')
  }

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

    if (brandId) list = list.filter(w => w.brand_id === brandId)
    if (statusFilter !== 'All' && statusFilter !== 'Deleted' && statusFilter !== 'Drafts' && statusFilter !== 'Sourced') {
      list = list.filter(w => w.status === statusFilter)
    }

    if (conditionFilter === 'Brand New') {
      list = list.filter(w => w.condition === 'Brand New')
    } else if (conditionFilter === 'Pre-Owned') {
      list = list.filter(w => w.condition !== 'Brand New')
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
  }, [watches, search, brandId, statusFilter, conditionFilter, sort])

  function countByStatus(f: StatusFilter) {
    if (f === 'Deleted') return deletedWatches?.length ?? 0
    if (f === 'Sourced') return watches.filter(w => w.watch_status === 'sourced').length
    if (f === 'Drafts') {
      let list = watches.filter(w => w.is_draft && w.watch_status !== 'sourced')
      if (brandId) list = list.filter(w => w.brand_id === brandId)
      return list.length
    }
    let list = watches.filter(w => w.watch_status !== 'sourced')
    list = f === 'All' ? list : list.filter(w => !w.is_draft)
    if (brandId) list = list.filter(w => w.brand_id === brandId)
    if (conditionFilter === 'Brand New') list = list.filter(w => w.condition === 'Brand New')
    if (conditionFilter === 'Pre-Owned') list = list.filter(w => w.condition !== 'Brand New')
    return f === 'All' ? list.length : list.filter(w => w.status === f).length
  }

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
    if (brandId) list = list.filter(w => w.brand_id === brandId)
    if (conditionFilter === 'Brand New') list = list.filter(w => w.condition === 'Brand New')
    if (conditionFilter === 'Pre-Owned') list = list.filter(w => w.condition !== 'Brand New')
    switch (sort) {
      case 'sell_desc':    return [...list].sort((a, b) => (b.selling_price ?? 0) - (a.selling_price ?? 0))
      case 'sell_asc':     return [...list].sort((a, b) => (a.selling_price ?? 0) - (b.selling_price ?? 0))
      case 'name_asc':     return [...list].sort((a, b) => a.watch_name.localeCompare(b.watch_name))
      case 'name_desc':    return [...list].sort((a, b) => b.watch_name.localeCompare(a.watch_name))
      default:             return [...list].sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime())
    }
  }, [deletedWatches, search, brandId, conditionFilter, sort])

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

  // ── Undo ──────────────────────────────────────────────────

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
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/watches/${watchId}`)
  }

  // ── Bulk actions ──────────────────────────────────────────

  async function bulkDelete() {
    const supabase = createClient()
    const ids = Array.from(selectedIds)
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
    const rows = selected.map(w => ({
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
      is_draft:       true,
    }))
    const { data } = await supabase.from('watches').insert(rows).select()
    if (data) setWatches(v => [...(data as WatchWithBrand[]), ...v])
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
      await supabase.from('watches').update({ status: 'Available', watch_status: 'Available' }).in('id', noDealsIds)
      setWatches(v => v.map(w => noDealsIds.includes(w.id) ? { ...w, status: 'Available' as WatchStatus, watch_status: 'Available' } : w))
    }

    if (watchesWithDeals.length > 0) {
      // Show dialog — don't exit bulk mode yet
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
      await supabase.from('watches').update({ watch_status: 'Available', status: 'Available' }).eq('id', wId)
    }

    const updatedIds = bulkAvailableDialog.watchesWithDeals.map(x => x.watchId)
    setWatches(v => v.map(w =>
      updatedIds.includes(w.id) ? { ...w, status: 'Available' as WatchStatus, watch_status: 'Available' } : w
    ))

    setBulkAvailableDialog(null)
    setBulkAvailableActing(false)
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

  return (
    <div className="p-4 md:p-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Inventory</h2>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {watches.length} {watches.length === 1 ? 'watch' : 'watches'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* List / Tile toggle */}
          {!bulkMode && !showingDeleted && !showingDrafts && (
            <div className="hidden md:flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="List view"><ListIcon /></button>
              <button onClick={() => setView('tile')} className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="Tile view"><GridIcon /></button>
            </div>
          )}

          {/* Sort / filter */}
          {!bulkMode && (
            <div className="hidden md:flex items-center gap-1" ref={sortMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  title="Sort & filter"
                  className={`relative p-2 rounded-xl border transition-colors ${showSortMenu ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
                >
                  <FunnelIcon />
                  {hasActiveFilters && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white" />
                  )}
                </button>

                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden min-w-52">
                    <p className="px-3.5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort by</p>
                    {(Object.keys(SORT_LABELS) as SortOption[]).map(s => (
                      <button
                        key={s}
                        onClick={() => { setSort(s); setShowSortMenu(false) }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${sort === s ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        {SORT_LABELS[s]}
                        {sort === s && <span className="text-gray-400"><CheckIcon /></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button onClick={clearAll} title="Clear all filters" className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors">
                  <XSmallIcon />
                </button>
              )}
            </div>
          )}

          {/* Select / Cancel bulk mode */}
          {!showingDeleted && !showingDrafts && (
            <div className="hidden md:block">
              <button
                onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  bulkMode
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                }`}
              >
                {bulkMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && (
            <div className="flex md:hidden bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="List view"><ListIcon /></button>
              <button onClick={() => setView('tile')} className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} title="Tile view"><GridIcon /></button>
            </div>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && (
            <button
              onClick={() => setShowFilterPanel(v => !v)}
              title="Filter"
              className={`relative p-2 rounded-xl border transition-colors ${showFilterPanel ? 'text-white border-[#C9A84C]' : activeFilterCount > 0 ? 'bg-white border-[#C9A84C] text-[#C9A84C]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
              style={showFilterPanel ? { backgroundColor: '#C9A84C' } : undefined}
            >
              <FunnelIcon />
              {activeFilterCount > 0 && !showFilterPanel && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: '#C9A84C' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {!bulkMode && !showingDeleted && !showingDrafts && !showingSourced && (
            <Link href="/dashboard/watches/new" className="flex items-center gap-1.5 bg-sidebar text-white text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-[#333] transition-colors btn-press">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              Add Watch
            </Link>
          )}
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      {!bulkMode && (
        <div className="relative mb-4" ref={searchRef}>
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by name, reference, serial…"
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition-all"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {suggestions.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onMouseDown={() => { setShowSuggestions(false); router.push(`/dashboard/watches/${w.id}`) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  {w.photos && w.photos.length > 0 ? (
                    <Image src={w.photos[0]} alt="" width={32} height={32} sizes="32px" className="rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{w.watch_name}</p>
                    {w.reference && <p className="text-xs text-gray-400">Ref: {w.reference}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter panel (brand + condition) ─────────────────── */}
      {!bulkMode && showFilterPanel && (
        <div className="bg-white border border-[#E8E6E1] rounded-xl p-4 mb-4">
          {brands.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-px flex-nowrap">
                {brands.map(b => {
                  const active = brandId === b.id
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBrandId(active ? null : b.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold text-white whitespace-nowrap transition-all border-2 ${active ? 'border-white/70 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: b.color ?? '#374151' }}
                    >
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Condition</p>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-px flex-nowrap">
              {(['All', 'Brand New', 'Pre-Owned'] as ConditionFilter[]).map(c => (
                <button
                  key={c}
                  onClick={() => setConditionFilter(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${conditionFilter === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sort by</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: 'last_added',   label: 'Date: Newest First' },
                { key: 'oldest_added', label: 'Date: Oldest First' },
                { key: 'sell_desc',    label: 'Price: High to Low' },
                { key: 'sell_asc',     label: 'Price: Low to High' },
                { key: 'name_asc',     label: 'Name: A to Z' },
                { key: 'name_desc',    label: 'Name: Z to A' },
              ] as { key: SortOption; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${sort === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Status filter tabs + total value ─────────────────── */}
      {!bulkMode && (
        <div className="mb-5">
          {/* Mobile: total value above tabs */}
          {isAdmin && !showingDeleted && totalSellingValue > 0 && (
            <p className="md:hidden text-xs text-gray-400 mb-2">
              Total value: <span className="font-semibold text-gray-700 tabular-nums">{formatLKR(totalSellingValue)}</span>
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-px">
              {(['All', ...WATCH_STATUSES, 'Drafts', 'Sourced', 'Deleted'] as StatusFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                    statusFilter === f
                      ? f === 'Deleted'
                        ? 'bg-red-50 text-red-600 font-medium'
                        : f === 'Drafts'
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : f === 'Sourced'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'bg-gray-900 text-white font-medium'
                      : f === 'Deleted'
                      ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      : f === 'Drafts'
                      ? 'text-gray-400 hover:text-amber-700 hover:bg-amber-50'
                      : f === 'Sourced'
                      ? 'text-gray-400 hover:text-indigo-700 hover:bg-indigo-50'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {f}
                  {(f !== 'Deleted' || deletedWatches !== null) && (
                    <span className={`text-xs tabular-nums ${
                      statusFilter === f
                        ? f === 'Deleted' ? 'text-red-400'
                          : f === 'Drafts' ? 'text-amber-500'
                          : f === 'Sourced' ? 'text-indigo-500'
                          : 'text-gray-300'
                        : 'text-gray-400'
                    }`}>
                      {countByStatus(f)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Desktop: total value on same row as tabs */}
            {isAdmin && !showingDeleted && totalSellingValue > 0 && (
              <p className="hidden md:block text-xs text-gray-400 whitespace-nowrap shrink-0">
                Total value: <span className="font-semibold text-gray-700 tabular-nums">{formatLKR(totalSellingValue)}</span>
              </p>
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
          <span className="text-sm text-gray-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${processed.length} selected`
              : `Select watches — ${processed.length} shown`}
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
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
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading deleted watches…
            </div>
          )}
          {!loadingDeleted && (deletedWatches === null || filteredDeleted.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No deleted watches</p>
            </div>
          )}
          {!loadingDeleted && filteredDeleted.length > 0 && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-white w-14" />
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Watch</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden md:table-cell">Brand</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden sm:table-cell">Deleted</th>
                    <th className="w-52" />
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 pb-1"><div className="h-px bg-gray-100" /></td>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeleted.map(w => {
                    const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                    const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                    return (
                      <tr key={w.id} className="group">
                        <td className="px-4 py-3 sticky left-0 bg-white">
                          {w.photos && w.photos.length > 0 ? (
                            <Image src={w.photos[0]} alt={w.watch_name} width={56} height={56} sizes="56px" className="rounded-xl object-cover border border-gray-100 opacity-50" />
                          ) : (
                            <WatchPlaceholder small />
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="font-semibold text-gray-400 truncate">{w.watch_name}</div>
                          {w.reference && <div className="text-xs text-gray-300 mt-0.5">Ref: {w.reference}</div>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {brandName ? (
                            <span className="text-xs font-semibold opacity-40" style={{ color: brandColor ?? '#9ca3af' }}>{brandName}</span>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                          {w.deleted_at
                            ? new Date(w.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleRestore(w.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <RestoreIcon /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(w.id)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                confirmDeleteId === w.id
                                  ? 'text-white bg-red-500 border border-red-500'
                                  : 'text-red-400 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200'
                              }`}
                            >
                              {confirmDeleteId === w.id ? 'Confirm delete?' : 'Delete forever'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Drafts tab content ───────────────────────────────── */}
      {showingDrafts && (
        <div>
          {processed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" strokeLinejoin="round"/>
                  <path d="M14 2v6h6" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No draft watches</p>
            </div>
          )}
          {processed.length > 0 && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-white w-14" />
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Watch</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden md:table-cell">Brand</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden sm:table-cell">Created</th>
                    <th className="w-48" />
                  </tr>
                  <tr><td colSpan={5} className="px-4 pb-1"><div className="h-px bg-gray-100" /></td></tr>
                </thead>
                <tbody>
                  {processed.map(w => {
                    const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                    const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                    return (
                      <tr
                        key={w.id}
                        className="group cursor-pointer hover:bg-amber-50/50 transition-colors"
                        onClick={() => router.push(`/dashboard/watches/${w.id}/edit`)}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-amber-50/50 transition-colors">
                          {w.photos && w.photos.length > 0 ? (
                            <Image src={w.photos[0]} alt={w.watch_name} width={56} height={56} sizes="56px" className="rounded-xl object-cover border border-gray-100 opacity-70" />
                          ) : (
                            <WatchPlaceholder small />
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 truncate">{w.watch_name}</span>
                            <span className="text-[10px] font-bold bg-amber-500 text-white rounded px-1 py-0.5 leading-none shrink-0">DRAFT</span>
                          </div>
                          {w.reference && <div className="text-xs text-gray-400 mt-0.5">Ref: {w.reference}</div>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {brandName ? (
                            <span className="text-xs font-semibold" style={{ color: brandColor ?? '#9ca3af' }}>{brandName}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 tabular-nums hidden sm:table-cell">
                          {new Date(w.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => router.push(`/dashboard/watches/${w.id}/edit`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <EditIcon /> Edit
                            </button>
                            <button
                              onClick={e => handleDelete(e, w.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">
                {watches.length === 0 ? 'No watches in inventory yet' : 'No results'}
              </p>
              {watches.length === 0 && (
                <Link href="/dashboard/watches/new" className="mt-3 text-sm text-gray-900 underline underline-offset-4">
                  Add your first watch
                </Link>
              )}
            </div>
          )}

          {/* ── Tile View ───────────────────────────────────────── */}
          {processed.length > 0 && view === 'tile' && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {processed.map((w, tileIdx) => {
                const isSelected  = selectedIds.has(w.id)
                const isHighlight = w.id === highlightId
                const brandName   = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor  = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    className={`group relative bg-white rounded-xl overflow-visible cursor-pointer transition-all duration-200 card-hover ${
                      bulkMode && isSelected
                        ? 'border-2 border-gray-900 shadow-sm'
                        : bulkMode
                        ? 'border border-[#E8E6E1] hover:border-gray-300'
                        : 'border border-[#E8E6E1] hover:border-gray-200'
                    } ${isHighlight ? 'row-highlight' : ''} ${staggerActive.current && tileIdx < 20 ? 'stagger-item' : ''}`}
                    style={staggerActive.current && tileIdx < 20 ? { animationDelay: `${tileIdx * 40}ms` } : undefined}
                    onClick={() => bulkMode ? toggleSelect(w.id) : router.push(`/dashboard/watches/${w.id}`)}
                  >
                    {/* Photo */}
                    <div className="relative h-[180px] bg-gray-100 overflow-hidden rounded-t-xl">
                      {w.photos && w.photos.length > 0 ? (
                        <Image
                          src={w.photos[0]}
                          alt={w.watch_name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="7"/>
                            <path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}

                      {/* Bulk mode checkbox overlay */}
                      {bulkMode && (
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={e => { e.stopPropagation(); toggleSelect(w.id) }}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-gray-900 border-gray-900' : 'bg-white/90 border-gray-300 hover:border-gray-600'}`}>
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
                          <TileBtn title="Copy link" onClick={e => handleShare(e, w.id)}><ShareIcon /></TileBtn>
                          <TileBtn title="Duplicate" onClick={e => handleDuplicate(e, w)}><CopyIcon /></TileBtn>
                          <div className="relative">
                            <TileBtn title="More options" onClick={e => { e.stopPropagation(); setTileMenuId(tileMenuId === w.id ? null : w.id) }}>
                              <DotsIcon />
                            </TileBtn>
                            {tileMenuId === w.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden min-w-[128px]">
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={e => { e.stopPropagation(); setTileMenuId(null); router.push(`/dashboard/watches/${w.id}/edit`) }}>
                                  <EditIcon /> Edit
                                </button>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={e => { e.stopPropagation(); setTileMenuId(null); handleShare(e, w.id) }}>
                                  <ShareIcon /> Share
                                </button>
                                <div className="h-px bg-gray-100 mx-2" />
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors" onClick={e => { e.stopPropagation(); setTileMenuId(null); handleDelete(e, w.id) }}>
                                  <TrashIcon /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[14px] font-semibold text-[#111] truncate leading-tight">{w.watch_name}</p>
                        {w.is_draft && (
                          <span className="text-[10px] font-medium bg-gray-200 text-gray-500 rounded px-1 py-0.5 leading-none shrink-0">DRAFT</span>
                        )}
                        <LabelBadges labels={w.labels} createdAt={w.created_at} />
                      </div>
                      {brandName && (
                        <p className="text-[12px] truncate" style={{ color: brandColor ?? '#9CA3AF' }}>{brandName}</p>
                      )}
                      {w.reference && (
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">Ref: {w.reference}</p>
                      )}
                      {w.date_acquired && (
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">Acquired {new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' })}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <StatusBadge status={w.watch_status ?? w.status} />
                        {w.selling_price != null && (
                          <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#C9A84C' }}>
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
            <div className="md:hidden bg-[#F7F6F3] -mx-4 px-4">
              {processed.map(w => {
                const brandName  = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                const brandColor = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                return (
                  <div
                    key={w.id}
                    className="flex items-start gap-3 py-3 cursor-pointer border-b border-[#E8E6E1] transition-colors active:bg-[#F0EFE9]"
                    onClick={() => router.push(`/dashboard/watches/${w.id}`)}
                  >
                    <div className="shrink-0">
                      {w.photos?.[0] ? (
                        <Image src={w.photos[0]} alt={w.watch_name} width={64} height={64} sizes="64px" className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#F3F2EF] flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate leading-snug" style={{ fontSize: '15px', color: '#111111' }}>{w.watch_name}</p>
                      {brandName && (
                        <p className="mt-0.5 font-bold uppercase tracking-wide truncate" style={{ fontSize: '11px', color: brandColor ?? '#9CA3AF' }}>{brandName}</p>
                      )}
                      {w.reference && (
                        <p className="mt-0.5 truncate" style={{ fontSize: '12px', color: '#6B6B6B' }}>Ref: {w.reference}</p>
                      )}
                      {w.date_acquired && (
                        <p className="mt-0.5 truncate" style={{ fontSize: '11px', color: '#9CA3AF' }}>Acquired {new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' })}</p>
                      )}
                      <div className="mt-2"><StatusBadge status={w.watch_status ?? w.status} /></div>
                    </div>
                    <div className="shrink-0 text-right pt-0.5">
                      <p className="font-bold tabular-nums" style={{ fontSize: '15px', color: '#C9A84C' }}>{formatLKR(w.selling_price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Desktop List View ──────────────────────────────────── */}
          {processed.length > 0 && view === 'list' && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    {bulkMode && (
                      <th className="px-3 py-3 sticky left-0 bg-white w-10">
                        <Checkbox
                          checked={allProcessedSelected}
                          indeterminate={someProcessedSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] sticky left-0 bg-white w-14" />
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Watch</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden md:table-cell">Brand</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden md:table-cell">Condition</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden lg:table-cell">Set</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] hidden sm:table-cell">Buy</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Sell</th>
                    {!bulkMode && <th className="w-10" />}
                  </tr>
                  <tr>
                    <td colSpan={bulkMode ? 11 : 10} className="px-4 pb-1">
                      <div className="h-px bg-gray-100" />
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((w, idx) => {
                    const isSelected  = selectedIds.has(w.id)
                    const isHighlight = w.id === highlightId
                    const brandName   = w.brands?.name  ?? brands.find(b => b.id === w.brand_id)?.name  ?? null
                    const brandColor  = w.brands?.color ?? brands.find(b => b.id === w.brand_id)?.color ?? null
                    return (
                      <tr
                        key={w.id}
                        draggable={!bulkMode && sort === 'last_added'}
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={e => onDragOver(e, idx)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, idx)}
                        className={`group cursor-pointer transition-colors ${
                          dragOverIdx === idx ? 'bg-blue-50' :
                          bulkMode && isSelected
                            ? 'bg-gray-50'
                            : 'hover:bg-gray-50/80'
                        } ${isHighlight ? 'row-highlight' : (!isHighlight && staggerActive.current && idx < 20 ? 'stagger-item' : '')}`}
                        style={!isHighlight && staggerActive.current && idx < 20 ? { animationDelay: `${idx * 40}ms` } : undefined}
                        onClick={() => bulkMode ? toggleSelect(w.id) : router.push(`/dashboard/watches/${w.id}`)}
                      >
                        {/* Bulk checkbox */}
                        {bulkMode && (
                          <td className="px-3 py-3 sticky left-0 transition-colors" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onChange={() => toggleSelect(w.id)} />
                          </td>
                        )}

                        {/* Photo */}
                        <td className={`px-4 py-3 sticky left-0 bg-white transition-colors ${bulkMode && isSelected ? 'bg-gray-50' : 'group-hover:bg-gray-50/80'}`}>
                          {w.photos && w.photos.length > 0 ? (
                            <Image src={w.photos[0]} alt={w.watch_name} width={56} height={56} sizes="56px" className="rounded-xl object-cover border border-gray-100 shrink-0" />
                          ) : (
                            <WatchPlaceholder small />
                          )}
                        </td>

                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text-primary truncate">{w.watch_name}</span>
                            {w.is_draft ? (
                              <span className="text-[10px] font-medium bg-gray-200 text-gray-500 rounded px-1 py-0.5 leading-none shrink-0">DRAFT</span>
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" title="Live" />
                            )}
                            <LabelBadges labels={w.labels} createdAt={w.created_at} />
                          </div>
                          {w.reference && <div className="text-xs text-gray-400 mt-0.5">Ref: {w.reference}</div>}
                          {w.date_acquired && <div className="text-xs text-gray-400 mt-0.5">Acquired {new Date(w.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' })}</div>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                          {brandName ? (
                            <span className="text-xs font-semibold" style={{ color: brandColor ?? '#9ca3af' }}>{brandName}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs tabular-nums hidden sm:table-cell">{displayDate(w.date_on_card)}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{w.condition}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">{w.set_details}</td>
                        <td className="px-4 py-3"><StatusBadge status={w.watch_status ?? w.status} /></td>
                        <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs tabular-nums hidden sm:table-cell">{formatLKR(w.purchase_cost)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs tabular-nums font-medium">{formatLKR(w.selling_price)}</td>

                        {/* Row hover actions */}
                        {!bulkMode && (
                          <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                              <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/watches/${w.id}/edit`) }}><EditIcon /></ActionBtn>
                              <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, w)}><CopyIcon /></ActionBtn>
                              <ActionBtn title="Share"     onClick={e => handleShare(e, w.id)}><ShareIcon /></ActionBtn>
                              <ActionBtn title="Delete"    onClick={e => handleDelete(e, w.id)} danger><TrashIcon /></ActionBtn>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Bulk action bar ───────────────────────────────────── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white pl-4 pr-3 py-2.5 rounded-2xl shadow-2xl ring-1 ring-white/10 select-none">
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
      {bulkAvailableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !bulkAvailableActing && setBulkAvailableDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
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
                onClick={handleBulkAvailableRemoveSale}
                disabled={bulkAvailableActing}
                className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Remove Sale</span>
                <span className="text-xs text-gray-400 mt-0.5">
                  Soft-delete linked {bulkAvailableDialog.watchesWithDeals.length === 1 ? 'sale' : 'sales'} and mark as Available.
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

            {bulkAvailableActing && (
              <div className="mt-3 text-center text-xs text-gray-400">Working…</div>
            )}
          </div>
        </div>
      )}

      {/* ── Undo toast ────────────────────────────────────────── */}
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
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-gray-300 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
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
      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white shadow-sm transition-colors"
    >
      {children}
    </button>
  )
}
