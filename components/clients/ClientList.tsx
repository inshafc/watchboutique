'use client'

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient as supabase } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { ClientBadgeType } from '@/lib/client-badges'
import { INK, INK_45, INK_60, INK_08, CARD_BG, GREEN, RED, GOLD, AMBER, BLUE, LIME, RADII } from '@/lib/design-tokens'
import type { Client } from '@/types'

export { avatarColor, getInitials }

// ── Types ────────────────────────────────────────────────────

type Filter    = 'All' | 'Club TWB' | 'Retail' | 'Reseller' | 'Drafts' | 'Deleted'
type SortKey   = 'created_desc' | 'name_asc' | 'name_desc' | 'sales_desc' | 'sales_asc' | 'type_asc' | 'type_desc' | 'manager_asc' | 'manager_desc'
type ViewMode  = 'list' | 'grid3' | 'grid4'
type TypeFilter = 'Retail' | 'Reseller' | 'Club TWB' | null
type MenuKey   = 'type' | 'sort' | null

const SORT_LABELS: Record<SortKey, string> = {
  created_desc: 'Latest',
  name_asc:     'Name A → Z',
  name_desc:    'Name Z → A',
  sales_desc:   'Highest Sales',
  sales_asc:    'Lowest Sales',
  type_asc:     'Type A → Z',
  type_desc:    'Type Z → A',
  manager_asc:  'Sales Mgr A → Z',
  manager_desc: 'Sales Mgr Z → A',
}

// Design values from Clients.dc.html that don't match anything in
// lib/design-tokens.ts. Flagged rather than rounded to an existing token
// — see the PR description for the full list.
const LABEL_INK    = 'rgba(20,20,15,.42)' // eyebrow labels / table headers
const FIELD_BORDER = 'rgba(20,20,15,.1)'  // toolbar button border (default)
const CARD_BORDER  = 'rgba(20,20,15,.06)' // grid card border (default)
const HAIRLINE     = 'rgba(20,20,15,.07)' // toolbar/search border, card internal dividers
const GRID_RADIUS  = 22                    // grid card radius (between RADII.md=18 and RADII.lg=24)
const TOOLBAR_RADIUS = 14                  // search bar / view-toggle radius (close to RADII.sm=14 for view toggle only)

// ── Badges ───────────────────────────────────────────────────

function pill(bg: string, fg: string, children: React.ReactNode) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap" style={{ padding: '4px 11px', borderRadius: RADII.pill, background: bg, color: fg }}>
      {children}
    </span>
  )
}

function PoliticalBadge()      { return pill('rgba(178,58,44,.1)', RED, 'Political') }
function AtRiskBadge()         { return pill('rgba(181,118,26,.14)', AMBER, 'At Risk') }
function HighPotentialBadge()  { return pill('rgba(31,111,67,.1)', GREEN, 'High Potential') }
function DraftBadge()          { return pill('rgba(181,118,26,.14)', AMBER, 'Draft') }

const TYPE_STYLE: Record<string, { bg: string; fg: string }> = {
  'Retail':   { bg: 'rgba(63,95,138,.12)', fg: BLUE },
  'Reseller': { bg: 'rgba(138,111,46,.14)', fg: GOLD },
}

export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  const t = TYPE_STYLE[type] ?? { bg: 'rgba(20,20,15,.07)', fg: INK_60 }
  return pill(t.bg, t.fg, type)
}

export function ClubTWBBadge() {
  return pill(INK, LIME, 'Club TWB')
}

// Type-slot badge: Club TWB (tier) takes priority over the plain Retail/Reseller
// client_type label — only one shows, per the tile's single badge slot.
function ClientTypeSlotBadge({ client }: { client: Client }) {
  const isClubTwb = client.club_twb || client.status_tier === 'Club TWB'
  if (isClubTwb) return <ClubTWBBadge />
  return <TypeBadge type={client.client_type} />
}

function FireIcon()    { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15c-3 0-5-2-5-4.8C3 7.5 5 5.8 5.3 3.5c.1-.6.9-.8 1.2-.3.5.8.7 1.8.5 2.6C8.3 4.6 9 2.8 8.7 1.2c-.1-.5.5-.9.9-.5C11.5 2.5 13 5 13 8c0 4-2.5 7-5 7zm0-1.5c1.7 0 3-1.3 3-3.2 0-1-.4-1.8-1-2.5-.2.7-.7 1.2-1.4 1.2-.9 0-1.5-.8-1.3-1.7-.9.7-1.5 1.8-1.5 3 0 1.9 1.3 3.2 3 3.2z"/></svg> }
function SleepIcon()   { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 9.5A6 6 0 1 1 6.5 2.5a5 5 0 1 0 7 7z"/></svg> }
function SparkleIcon() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.2 4.8L14 7l-4.8 1.2L8 13l-1.2-4.8L2 7l4.8-1.2z"/></svg> }

function BehavioralBadge({ type }: { type: ClientBadgeType }) {
  if (type === 'hot')     return pill('rgba(178,58,44,.1)', RED, <><FireIcon /> Hot</>)
  if (type === 'dormant') return pill('rgba(20,20,15,.08)', INK_60, <><SleepIcon /> Dormant</>)
  return pill('rgba(31,111,67,.1)', GREEN, <><SparkleIcon /> New</>)
}

function WatchMark() {
  return (
    <svg width="188" height="188" viewBox="0 0 120 120" fill="none" aria-hidden="true" className="absolute pointer-events-none opacity-[.05] group-hover:opacity-[.09] transition-opacity duration-200" style={{ top: -34, right: -30, color: INK, transform: 'rotate(-8deg)' }}>
      <path d="M46 22h28l-2.5 14M46 98h28l-2.5-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="26" stroke="currentColor" strokeWidth="3" />
      <path d="M60 46v14l9 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M88 54h4a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function VIPBadge() {
  return pill('rgba(181,118,26,.14)', AMBER, '★ VIP')
}

function StatusTierBadge({ client }: { client: Client }) {
  const tier = client.status_tier ?? (client.club_twb ? 'Club TWB' : client.is_vip ? 'VIP' : 'General')
  if (tier === 'Club TWB') return <ClubTWBBadge />
  if (tier === 'VIP')      return <VIPBadge />
  return pill('rgba(20,20,15,.07)', INK_60, 'General')
}

const LEAD_STYLE: Record<string, { bg: string; fg: string }> = {
  'Socials':  { bg: 'rgba(63,95,138,.12)', fg: BLUE },
  'Referral': { bg: 'rgba(31,111,67,.1)', fg: GREEN },
  'Website':  { bg: 'rgba(138,111,46,.14)', fg: GOLD },
  'Hotline':  { bg: 'rgba(178,58,44,.1)', fg: RED },
}
function LeadBadge({ lead }: { lead: string | null }) {
  if (!lead) return <span style={{ color: 'rgba(20,20,15,.28)' }}>—</span>
  const s = LEAD_STYLE[lead] ?? { bg: 'rgba(20,20,15,.07)', fg: INK_60 }
  return pill(s.bg, s.fg, lead)
}

// ── Icons ────────────────────────────────────────────────────

function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function SearchIcon()  { return <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="rgba(20,20,15,.4)" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }
function ListViewIcon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h12M4 10h12M4 14h12"/></svg> }
function Grid3Icon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.2" y="5" width="3.8" height="10" rx="1.4"/><rect x="8.1" y="5" width="3.8" height="10" rx="1.4"/><rect x="13" y="5" width="3.8" height="10" rx="1.4"/></svg> }
function Grid4Icon({ active }: { active: boolean }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={active ? INK : INK_45} strokeWidth="1.7"><rect x="3.6" y="3.6" width="5.4" height="5.4" rx="1.6"/><rect x="11" y="3.6" width="5.4" height="5.4" rx="1.6"/><rect x="3.6" y="11" width="5.4" height="5.4" rx="1.6"/><rect x="11" y="11" width="5.4" height="5.4" rx="1.6"/></svg> }
function FilterIcon({ color }: { color: string }) { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="M3.4 5.2h13.2L11.4 11v4.6l-2.8 1.4V11z"/></svg> }
function PlusIcon()    { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M10 4.2v11.6M4.2 10h11.6"/></svg> }
function ChevronIcon({ color }: { color: string }) { return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3"/></svg> }
function DotsIcon()    { return <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(20,20,15,.35)' }}>⋯</span> }

function ActionBtn({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} className="p-1.5 rounded-lg transition-colors" style={{ color: danger ? 'rgba(20,20,15,.3)' : INK_45 }}>
      {children}
    </button>
  )
}

function SortHeader({ label, currentSort, ascKey, descKey, onSort }: { label: string; currentSort: SortKey; ascKey: SortKey; descKey: SortKey; onSort: (k: SortKey) => void }) {
  const isAsc  = currentSort === ascKey
  const isDesc = currentSort === descKey
  const active = isAsc || isDesc
  return (
    <button onClick={() => onSort(isAsc ? descKey : ascKey)} className="flex items-center gap-1 text-[10.5px] font-semibold uppercase transition-colors" style={{ letterSpacing: '.09em', color: active ? INK : LABEL_INK }}>
      {label}
      <span className="flex flex-col gap-px leading-none">
        <svg className="w-2 h-2" viewBox="0 0 8 5" fill={isAsc ? INK : 'rgba(20,20,15,.25)'}><path d="M4 0 8 5H0z"/></svg>
        <svg className="w-2 h-2" viewBox="0 0 8 5" fill={isDesc ? INK : 'rgba(20,20,15,.25)'}><path d="M4 5 0 0h8z"/></svg>
      </span>
    </button>
  )
}

function formatLKR(n: number) { return 'LKR ' + n.toLocaleString('en-LK') }

// ── Component ────────────────────────────────────────────────

export default function ClientList({
  clients: initial,
  clientSales = {},
  clientDealCounts = {},
  clientBadges = {},
}: {
  clients: Client[]
  clientSales?: Record<string, number>
  clientDealCounts?: Record<string, number>
  clientBadges?: Record<string, ClientBadgeType>
}) {
  const router = useRouter()
  const [clients, setClients]     = useState(initial)
  const [search,  setSearch]      = useState('')
  const [filter,  setFilter]      = useState<Filter>('All')
  const [sort,    setSort]        = useState<SortKey>('created_desc')
  const [view,    setView]        = useState<ViewMode>('grid3')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuKey>(null)

  // Select mode
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!openMenuId) return
    function close() { setOpenMenuId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-filter-menu]')) {
        setOpenMenu(null)
      }
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

  // Deleted clients (lazy-loaded)
  const [deletedClients, setDeletedClients] = useState<Client[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  useEffect(() => {
    if (filter === 'Deleted' && deletedClients === null && !loadingDeleted) {
      void loadDeletedClients()
    }
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Draft clients are in `clients` already — just filtered by is_draft
  const draftClients = useMemo(() => clients.filter(c => c.is_draft), [clients])
  const liveClients  = useMemo(() => clients.filter(c => !c.is_draft), [clients])

  const visible = useMemo(() => {
    const base = filter === 'Drafts' ? draftClients : liveClients
    let list = base
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.whatsapp ?? '').includes(q)
      )
    }
    if (filter === 'Club TWB') list = list.filter(c => c.club_twb || c.status_tier === 'Club TWB')
    if (filter === 'Retail')   list = list.filter(c => c.client_type === 'Retail')
    if (filter === 'Reseller') list = list.filter(c => c.client_type === 'Reseller')
    if (typeFilter === 'Retail')   list = list.filter(c => c.client_type === 'Retail')
    if (typeFilter === 'Reseller') list = list.filter(c => c.client_type === 'Reseller')
    if (typeFilter === 'Club TWB') list = list.filter(c => c.club_twb || c.status_tier === 'Club TWB')
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
  }, [search, filter, sort, clientSales, typeFilter, draftClients, liveClients])

  const counts: Record<Filter, number> = {
    'All':      liveClients.length,
    'Club TWB': liveClients.filter(c => c.club_twb || c.status_tier === 'Club TWB').length,
    'Retail':   liveClients.filter(c => c.client_type === 'Retail').length,
    'Reseller': liveClients.filter(c => c.client_type === 'Reseller').length,
    'Drafts':   draftClients.length,
    'Deleted':  deletedClients?.length ?? 0,
  }

  // Lifetime value of the currently visible/filtered set — pure display sum
  // over the clientSales prop already computed upstream via dealSalePriceLKR().
  const lifetimeValue = useMemo(() => visible.reduce((s, c) => s + (clientSales[c.id] ?? 0), 0), [visible, clientSales])

  // Sliding pill under the active tab
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pillRect, setPillRect] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = tabRefs.current[filter]
    if (!el) return
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    setPillRect(p => (p && p.left === next.left && p.width === next.width) ? p : next)
  }, [filter])

  // ── Select mode ───────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visible.map(c => c.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

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

  // ── Deleted clients ───────────────────────────────────────

  async function loadDeletedClients() {
    setLoadingDeleted(true)
    const db = supabase()
    const { data } = await db.from('clients').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
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
    if (confirmDeleteId !== id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmDeleteId(id)
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 5000)
      return
    }
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
    setConfirmDeleteId(null)
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
      await supabase().from('clients').update({ deleted_at: null }).eq('id', id)
      setClients(v => [client, ...v])
    })
  }

  async function handleDuplicate(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    const db = supabase()
    const { data: newClient } = await db.from('clients').insert({
      name: c.name + ' (Copy)',
      email: c.email, phone: c.phone, whatsapp: c.whatsapp, instagram: c.instagram,
      address: c.address, profile_notes: c.profile_notes,
      is_vip: c.is_vip, club_twb: c.club_twb, status_tier: c.status_tier,
      lead_referral: c.lead_referral, client_type: c.client_type,
      sales_manager: c.sales_manager, labels: c.labels, is_draft: true,
      birthday: c.birthday, anniversary: c.anniversary,
    }).select('id').single()
    if (newClient) router.push(`/dashboard/clients/${newClient.id}/edit`)
  }

  // ── Bulk actions ─────────────────────────────────────────

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    const affected = clients.filter(c => ids.includes(c.id))
    const db = supabase()
    await db.from('clients').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    setClients(v => v.filter(c => !selectedIds.has(c.id)))
    setSelectedIds(new Set())
    showUndo(`${ids.length} client${ids.length !== 1 ? 's' : ''} deleted`, async () => {
      await supabase().from('clients').update({ deleted_at: null }).in('id', ids)
      setClients(v => [...affected, ...v])
    })
  }

  async function handleBulkDuplicate() {
    const toDuplicate = clients.filter(c => selectedIds.has(c.id))
    const db = supabase()
    for (const c of toDuplicate) {
      await db.from('clients').insert({
        name: c.name + ' (Copy)', email: c.email, phone: c.phone,
        whatsapp: c.whatsapp, instagram: c.instagram, address: c.address,
        profile_notes: c.profile_notes, is_vip: c.is_vip, club_twb: c.club_twb,
        status_tier: c.status_tier, lead_referral: c.lead_referral,
        client_type: c.client_type, sales_manager: c.sales_manager,
        labels: c.labels, is_draft: true, birthday: c.birthday, anniversary: c.anniversary,
      })
    }
    exitSelectMode()
    router.refresh()
  }

  async function handleBulkMarkClubTWB() {
    const ids = Array.from(selectedIds)
    const db = supabase()
    await db.from('clients').update({ club_twb: true, is_vip: false, status_tier: 'Club TWB' }).in('id', ids)
    setClients(v => v.map(c => ids.includes(c.id) ? { ...c, club_twb: true, is_vip: false, status_tier: 'Club TWB' } : c))
    setSelectedIds(new Set())
  }

  const showingDeleted = filter === 'Deleted'
  const showingDrafts  = filter === 'Drafts'
  const TABS: Filter[] = ['All', 'Club TWB', 'Retail', 'Reseller', 'Drafts', 'Deleted']

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 }}>Clients</h1>
          <span className="text-[13px]" style={{ color: INK_45 }}>{liveClients.length} {liveClients.length === 1 ? 'client' : 'clients'}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {!showingDeleted && (
            <div className="flex gap-0.5" style={{ padding: 4, borderRadius: TOOLBAR_RADIUS, background: '#fff', border: `1px solid ${HAIRLINE}` }}>
              <button onClick={() => setView('list')} title="List view" className="flex items-center justify-center transition-colors" style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: view === 'list' ? CARD_BG : 'transparent' }}><ListViewIcon active={view === 'list'} /></button>
              <button onClick={() => setView('grid3')} title="Cards — 3 per row" className="flex items-center justify-center transition-colors" style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: view === 'grid3' ? CARD_BG : 'transparent' }}><Grid3Icon active={view === 'grid3'} /></button>
              <button onClick={() => setView('grid4')} title="Cards — 4 per row" className="flex items-center justify-center transition-colors" style={{ width: 38, height: 38, border: 0, borderRadius: 11, background: view === 'grid4' ? CARD_BG : 'transparent' }}><Grid4Icon active={view === 'grid4'} /></button>
            </div>
          )}
          {!showingDeleted && !showingDrafts && (
            <button
              onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
              className="hidden md:flex items-center font-semibold transition-colors"
              style={{ height: 46, padding: '0 22px', borderRadius: RADII.pill, border: `1px solid ${selectMode ? INK : FIELD_BORDER}`, background: selectMode ? INK : '#fff', color: selectMode ? '#fff' : INK, fontSize: 13.5 }}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          {!showingDeleted && (
            <div className="relative" data-filter-menu>
              <button
                onClick={() => setShowFilters(v => !v)}
                title="Filters"
                className="flex items-center justify-center transition-colors relative"
                style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${showFilters || typeFilter !== null ? INK : FIELD_BORDER}`, background: showFilters ? INK : '#fff' }}
              >
                <FilterIcon color={showFilters ? LIME : typeFilter !== null ? INK : INK} />
                {typeFilter !== null && !showFilters && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: INK }}>1</span>
                )}
              </button>
            </div>
          )}
          {!showingDeleted && (
            <Link
              href="/dashboard/clients/new"
              title="Add client"
              className="flex items-center justify-center shrink-0 transition-colors"
              style={{ width: 46, height: 46, border: 0, borderRadius: '50%', background: INK }}
            >
              <PlusIcon />
            </Link>
          )}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      {!showingDeleted && (
        <div className="flex items-center gap-3 mb-4" style={{ height: 60, padding: '0 22px', borderRadius: RADII.md, background: '#fff', border: `1px solid ${HAIRLINE}` }}>
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: INK }}
          />
        </div>
      )}

      {/* ── Filters — Type + Sort dropdowns. The mockup's "Activity"
             filter (bought this month/year, no purchases yet) needs a
             last-purchase-date per client we don't currently pass down;
             substituted with our existing Client Type filter instead. ── */}
      {showFilters && !showingDeleted && (
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          {!showingDrafts && (
            <div className="relative" data-filter-menu>
              <button
                onClick={() => setOpenMenu(v => v === 'type' ? null : 'type')}
                className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
                style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${openMenu === 'type' || typeFilter !== null ? INK : FIELD_BORDER}`, background: openMenu === 'type' || typeFilter !== null ? INK : '#fff', color: openMenu === 'type' || typeFilter !== null ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
              >
                <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: openMenu === 'type' || typeFilter !== null ? 'rgba(255,255,255,.5)' : LABEL_INK }}>Type</span>
                <span>{typeFilter ?? 'All clients'}</span>
                <ChevronIcon color={openMenu === 'type' || typeFilter !== null ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)'} />
              </button>
              {openMenu === 'type' && (
                <div className="absolute z-40 bg-white flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 212, border: `1px solid ${INK_08}`, borderRadius: RADII.md, boxShadow: '0 14px 36px rgba(20,20,15,.16)', padding: 6 }}>
                  {([null, 'Retail', 'Reseller', 'Club TWB'] as TypeFilter[]).map(opt => (
                    <button
                      key={opt ?? 'all'}
                      onClick={() => { setTypeFilter(opt); setOpenMenu(null) }}
                      className="text-left border-0 cursor-pointer whitespace-nowrap"
                      style={{ fontSize: 13, fontWeight: typeFilter === opt ? 600 : 500, padding: '10px 12px', borderRadius: 11, background: typeFilter === opt ? CARD_BG : 'transparent', color: INK }}
                    >
                      {opt ?? 'All clients'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative" data-filter-menu>
            <button
              onClick={() => setOpenMenu(v => v === 'sort' ? null : 'sort')}
              className="flex items-center gap-2.5 whitespace-nowrap transition-colors"
              style={{ height: 44, padding: '0 16px', borderRadius: RADII.pill, border: `1px solid ${openMenu === 'sort' || sort !== 'created_desc' ? INK : FIELD_BORDER}`, background: openMenu === 'sort' || sort !== 'created_desc' ? INK : '#fff', color: openMenu === 'sort' || sort !== 'created_desc' ? '#fff' : INK, fontSize: 13.5, fontWeight: 600 }}
            >
              <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: openMenu === 'sort' || sort !== 'created_desc' ? 'rgba(255,255,255,.5)' : LABEL_INK }}>Sort by</span>
              <span>{SORT_LABELS[sort]}</span>
              <ChevronIcon color={openMenu === 'sort' || sort !== 'created_desc' ? 'rgba(255,255,255,.6)' : 'rgba(20,20,15,.5)'} />
            </button>
            {openMenu === 'sort' && (
              <div className="absolute z-40 bg-white flex flex-col gap-0.5" style={{ top: 52, left: 0, minWidth: 212, border: `1px solid ${INK_08}`, borderRadius: RADII.md, boxShadow: '0 14px 36px rgba(20,20,15,.16)', padding: 6 }}>
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
        </div>
      )}

      {/* ── Tabs + lifetime value ────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex items-center gap-0.5 overflow-x-auto pb-px">
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: pillRect?.left ?? 0, width: pillRect?.width ?? 0, height: 42,
              background: '#fff', boxShadow: '0 1px 3px rgba(20,20,15,.09)',
              transitionProperty: 'left,width', transitionDuration: '.34s', transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
              opacity: pillRect ? 1 : 0,
            }}
          />
          {TABS.map(f => {
            const isActive = filter === f
            return (
              <button
                key={f}
                ref={el => { tabRefs.current[f] = el }}
                onClick={() => { setFilter(f); setSelectMode(false); setSelectedIds(new Set()) }}
                className="relative z-[1] flex items-center gap-1.5 whitespace-nowrap transition-colors"
                style={{ height: 42, padding: '0 15px', borderRadius: RADII.pill, background: 'transparent', fontSize: 14, fontWeight: isActive ? 600 : 500, color: f === 'Deleted' ? RED : INK }}
              >
                {f}
                {(f !== 'Deleted' || deletedClients !== null) && (
                  <span className="text-[12.5px] tabular-nums" style={{ color: isActive ? INK_45 : 'rgba(20,20,15,.35)' }}>
                    {counts[f]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {!showingDeleted && (
          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0 whitespace-nowrap">
            <span className="text-[12.5px]" style={{ color: INK_45 }}>Lifetime value</span>
            <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.02em' }}>{formatLKR(lifetimeValue)}</span>
          </div>
        )}
      </div>

      {/* ── Deleted tab ──────────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && <div className="flex items-center justify-center py-20 text-sm" style={{ color: INK_45 }}>Loading deleted clients…</div>}
          {!loadingDeleted && (deletedClients === null || deletedClients.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: CARD_BG, borderRadius: RADII.md }}>
                <svg width="28" height="28" viewBox="0 0 16 16" fill="rgba(20,20,15,.3)"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zM1 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H1zm7-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
              </div>
              <p className="text-sm" style={{ color: INK_45 }}>No deleted clients</p>
            </div>
          )}
          {!loadingDeleted && deletedClients && deletedClients.length > 0 && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-3 w-12" />
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Name</th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden sm:table-cell" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Phone</th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden sm:table-cell" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Deleted</th>
                    <th className="w-52" />
                  </tr>
                  <tr><td colSpan={5} className="px-4 pb-1"><div className="h-px" style={{ background: INK_08 }} /></td></tr>
                </thead>
                <tbody>
                  {deletedClients.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 opacity-50 ${avatarColor(c.name, c.avatar_color)}`}>{getInitials(c.name)}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="font-semibold truncate" style={{ color: INK_45 }}>{c.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: 'rgba(20,20,15,.3)' }}>{c.phone ?? c.whatsapp ?? '—'}</td>
                      <td className="px-4 py-3 text-xs tabular-nums hidden sm:table-cell" style={{ color: 'rgba(20,20,15,.3)' }}>
                        {c.deleted_at ? new Date(c.deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleRestoreClient(c.id)} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${FIELD_BORDER}`, background: '#fff', color: INK }}>
                            <RestoreIcon /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteClient(c.id)}
                            className="text-xs font-medium transition-colors"
                            style={
                              confirmDeleteId === c.id
                                ? { padding: '6px 12px', borderRadius: 10, color: '#fff', background: RED, border: `1px solid ${RED}` }
                                : { padding: '6px 12px', borderRadius: 10, color: 'rgba(178,58,44,.7)', background: '#fff', border: `1px solid ${FIELD_BORDER}` }
                            }
                          >
                            {confirmDeleteId === c.id ? 'Confirm delete?' : 'Delete forever'}
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
          {visible.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: CARD_BG, borderRadius: RADII.md }}>
                <svg width="28" height="28" viewBox="0 0 16 16" fill="rgba(20,20,15,.3)"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zM1 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H1zm7-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: INK_60 }}>
                {filter === 'Drafts' ? 'No draft clients' : clients.length === 0 ? 'No clients yet' : 'No results'}
              </p>
              {liveClients.length === 0 && filter === 'All' && (
                <Link href="/dashboard/clients/new" className="mt-3 text-sm underline underline-offset-4" style={{ color: INK }}>Add your first client</Link>
              )}
            </div>
          )}

          {/* Grid view */}
          {visible.length > 0 && view !== 'list' && (
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${view === 'grid4' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {visible.map((c, idx) => {
                const totalSales  = clientSales[c.id] ?? 0
                const watchCount  = clientDealCounts[c.id] ?? 0
                const badge       = clientBadges[c.id]
                const isClubTwb   = c.club_twb || c.status_tier === 'Club TWB'
                const phone       = c.phone ?? c.whatsapp
                // The mockup shows a per-client "last purchase" date here — we
                // don't currently thread a last-purchase timestamp down to this
                // component (only aggregate sales/deal-count), so this slot
                // keeps showing date-added, matching the previous behavior.
                const dateAdded   = new Date(c.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                return (
                  <div
                    key={c.id}
                    onClick={() => !selectMode && router.push(`/dashboard/clients/${c.id}`)}
                    className={`group bg-white cursor-pointer relative overflow-hidden card-hover transition-colors hover:border-[rgba(20,20,15,.14)] ${isClubTwb ? 'club-twb-glow' : ''}`}
                    style={{
                      borderRadius: GRID_RADIUS, padding: 22,
                      border: `1px solid ${selectMode && selectedIds.has(c.id) ? INK : CARD_BORDER}`,
                      animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${idx > 10 ? 0.4 : idx * 0.04}s`, opacity: 0,
                    }}
                  >
                    <WatchMark />

                    {/* Select checkbox */}
                    {selectMode && (
                      <div className="absolute z-10" style={{ top: 12, left: 12 }} onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}>
                        <div className="flex items-center justify-center transition-colors" style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selectedIds.has(c.id) ? INK : 'rgba(20,20,15,.2)'}`, background: selectedIds.has(c.id) ? INK : '#fff' }}>
                          {selectedIds.has(c.id) && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Three-dot menu */}
                    {!selectMode && (
                      <div className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ top: 12, right: 12 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id) }}
                          className="p-1 rounded-lg transition-colors"
                        >
                          <DotsIcon />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 bg-white overflow-hidden z-20" style={{ top: 28, minWidth: 130, borderRadius: RADII.sm, border: `1px solid ${INK_08}`, boxShadow: '0 14px 36px rgba(20,20,15,.16)' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => router.push(`/dashboard/clients/${c.id}/edit`)} className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[#f2f1ed]" style={{ color: INK }}><EditIcon /> Edit</button>
                            <button onClick={e => { handleDuplicate(e, c); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-[#f2f1ed]" style={{ color: INK }}><CopyIcon /> Duplicate</button>
                            <button onClick={e => { handleDelete(e, c.id); setOpenMenuId(null) }} className="w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-red-50" style={{ color: RED }}><TrashIcon /> Delete</button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`shrink-0 rounded-full flex items-center justify-center font-semibold ${avatarColor(c.name, c.avatar_color)}`} style={{ width: 52, height: 52, fontSize: 15, letterSpacing: '.02em' }}>
                          {getInitials(c.name)}
                        </div>
                        <div className="flex flex-col gap-2 min-w-0">
                          <span className="font-semibold truncate" style={{ fontSize: 18, letterSpacing: '-.02em', lineHeight: 1.2 }}>{c.name}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <ClientTypeSlotBadge client={c} />
                            {c.is_draft && <DraftBadge />}
                            {badge && <BehavioralBadge type={badge} />}
                            {c.labels?.includes('political')      && <PoliticalBadge />}
                            {c.labels?.includes('at_risk')         && <AtRiskBadge />}
                            {c.labels?.includes('high_potential')  && <HighPotentialBadge />}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2.5 flex-wrap" style={{ paddingTop: 14, borderTop: `1px solid ${HAIRLINE}` }}>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: 'rgba(20,20,15,.4)' }}>Spend</span>
                          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.02em' }}>{formatLKR(totalSales)}</span>
                        </div>
                        <div className="flex flex-col gap-1" style={{ paddingLeft: 18, borderLeft: `1px solid ${HAIRLINE}` }}>
                          <span className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: 'rgba(20,20,15,.4)' }}>Watches</span>
                          <span className="tabular-nums" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.02em' }}>{watchCount}</span>
                        </div>
                        <div className="ml-auto min-w-0 flex flex-col items-end gap-1">
                          <span className="whitespace-nowrap" style={{ fontSize: 11.5, color: LABEL_INK }}>{dateAdded}</span>
                          {phone && <span className="whitespace-nowrap" style={{ fontSize: 11.5, color: LABEL_INK }}>{phone}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* List view */}
          {visible.length > 0 && view === 'list' && (
            <>
            {/* Mobile card stack */}
            <div className="md:hidden space-y-2 mb-2">
              {visible.map(c => {
                const totalSales = clientSales[c.id] ?? 0
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 bg-white cursor-pointer"
                    style={{ padding: 16, borderRadius: RADII.sm, border: `1px solid ${CARD_BORDER}` }}
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  >
                    <div className={`rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`} style={{ width: 44, height: 44 }}>
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate leading-snug" style={{ fontSize: 15, color: INK }}>{c.name}</p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: INK_45 }}>{c.client_type ?? 'Client'}{c.club_twb ? ' · Club TWB' : ''}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <TypeBadge type={c.client_type} />
                      </div>
                    </div>
                    {totalSales > 0 ? (
                      <div className="shrink-0 text-right" style={{ paddingTop: 2 }}>
                        <p className="font-bold tabular-nums" style={{ fontSize: 15, color: GOLD }}>{formatLKR(totalSales)}</p>
                        {(c.phone ?? c.whatsapp) && (
                          <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(20,20,15,.35)' }}>{c.phone ?? c.whatsapp}</p>
                        )}
                      </div>
                    ) : (c.phone ?? c.whatsapp) ? (
                      <div className="shrink-0 text-right" style={{ paddingTop: 2 }}>
                        <p className="text-[11px]" style={{ color: 'rgba(20,20,15,.35)' }}>{c.phone ?? c.whatsapp}</p>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {/* Desktop table — the mockup's list view is a narrower Client/Type/
                Watches/Spend/Last-purchase grid; Status, Sales Mgr, Lead, and
                per-row actions are existing features kept and restyled rather
                than dropped to match the mockup's column set. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    {selectMode ? (
                      <th className="px-4 py-3 w-10">
                        <div
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center cursor-pointer transition-colors mx-auto"
                          style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selectedIds.size === visible.length && visible.length > 0 ? INK : 'rgba(20,20,15,.2)'}`, background: selectedIds.size === visible.length && visible.length > 0 ? INK : '#fff' }}
                        >
                          {selectedIds.size === visible.length && visible.length > 0 && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                      </th>
                    ) : (
                      <th className="px-4 py-3 w-12" />
                    )}
                    <th className="px-4 py-3 text-left whitespace-nowrap"><SortHeader label="Name" currentSort={sort} ascKey="name_asc" descKey="name_desc" onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden sm:table-cell whitespace-nowrap" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Phone</th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden md:table-cell whitespace-nowrap" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Email</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap"><SortHeader label="Type" currentSort={sort} ascKey="type_asc" descKey="type_desc" onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden sm:table-cell whitespace-nowrap" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap hidden md:table-cell"><SortHeader label="Total Sales" currentSort={sort} ascKey="sales_asc" descKey="sales_desc" onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell"><SortHeader label="Sales Mgr" currentSort={sort} ascKey="manager_asc" descKey="manager_desc" onSort={setSort} /></th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase hidden lg:table-cell whitespace-nowrap" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Lead</th>
                    <th className="w-10" />
                  </tr>
                  <tr>
                    <td colSpan={10} className="px-4 pb-1"><div className="h-px" style={{ background: INK_08 }} /></td>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(c => {
                    const totalSales = clientSales[c.id] ?? 0
                    const isSelected = selectedIds.has(c.id)
                    return (
                      <tr
                        key={c.id}
                        className="group cursor-pointer transition-colors"
                        style={{ background: isSelected ? CARD_BG : 'transparent' }}
                        onClick={() => selectMode ? toggleSelect(c.id) : router.push(`/dashboard/clients/${c.id}`)}
                      >
                        {selectMode ? (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div
                              onClick={() => toggleSelect(c.id)}
                              className="flex items-center justify-center cursor-pointer transition-colors mx-auto"
                              style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? INK : 'rgba(20,20,15,.2)'}`, background: isSelected ? INK : '#fff' }}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3">
                            <div className={`rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`} style={{ width: 36, height: 36 }}>
                              {getInitials(c.name)}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="font-semibold truncate" style={{ color: INK }}>{c.name}</div>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {c.is_draft                              && <DraftBadge />}
                            {c.labels?.includes('political')         && <PoliticalBadge />}
                            {c.labels?.includes('at_risk')           && <AtRiskBadge />}
                            {c.labels?.includes('high_potential')    && <HighPotentialBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap hidden sm:table-cell" style={{ color: 'rgba(20,20,15,.55)' }}>
                          {c.phone ?? c.whatsapp ?? <span style={{ color: 'rgba(20,20,15,.28)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs truncate max-w-[160px] hidden md:table-cell" style={{ color: 'rgba(20,20,15,.55)' }}>
                          {c.email ?? <span style={{ color: 'rgba(20,20,15,.28)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={c.client_type} /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><StatusTierBadge client={c} /></td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums font-medium hidden md:table-cell">
                          {totalSales > 0
                            ? <span style={{ color: INK }}>{formatLKR(totalSales)}</span>
                            : <span style={{ color: 'rgba(20,20,15,.28)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap hidden lg:table-cell" style={{ color: 'rgba(20,20,15,.55)' }}>
                          {c.sales_manager ?? <span style={{ color: 'rgba(20,20,15,.28)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell"><LeadBadge lead={c.lead_referral} /></td>
                        <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                          {!selectMode && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ActionBtn title="Edit"      onClick={e => { e.stopPropagation(); router.push(`/dashboard/clients/${c.id}/edit`) }}><EditIcon /></ActionBtn>
                              <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, c)}><CopyIcon /></ActionBtn>
                              <ActionBtn title="Delete"    onClick={e => handleDelete(e, c.id)} danger><TrashIcon /></ActionBtn>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}

      {/* ── Bulk action bar ───────────────────────────────── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed z-50 flex items-center gap-2 select-none" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', background: INK, color: '#fff', padding: '10px 16px', borderRadius: RADII.md, boxShadow: '0 20px 40px rgba(20,20,15,.28)' }}>
          <span className="text-sm font-medium pr-1">{selectedIds.size} selected</span>
          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,.2)' }} />
          <button onClick={handleBulkDuplicate} className="text-sm font-medium px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,.8)' }}>
            <CopyIcon /> Duplicate
          </button>
          <button onClick={handleBulkMarkClubTWB} className="text-sm font-medium px-2 py-1 rounded-lg transition-colors" style={{ color: LIME }}>
            ★ Club TWB
          </button>
          <button onClick={handleBulkDelete} className="text-sm font-medium px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" style={{ color: '#f87171' }}>
            <TrashIcon /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-1 transition-colors" style={{ color: 'rgba(255,255,255,.4)' }}>
            <XSmallIcon />
          </button>
        </div>
      )}

      {/* ── Undo toast ──────────────────────────────────────── */}
      {undoState && (
        <div className="fixed z-50 flex items-center gap-3 select-none" style={{ bottom: 24, left: 24, background: INK, color: '#fff', padding: '10px 16px', borderRadius: RADII.md, boxShadow: '0 20px 40px rgba(20,20,15,.28)' }}>
          <span className="text-sm">{undoState.message}</span>
          <button onClick={handleUndo} className="text-sm font-semibold transition-colors" style={{ color: '#7dd3fc' }}>Undo</button>
          <button onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = null; setUndoState(null) }} className="ml-1 transition-colors" style={{ color: 'rgba(255,255,255,.4)' }}>
            <XSmallIcon />
          </button>
        </div>
      )}
    </div>
  )
}
