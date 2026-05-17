'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import type { Watch, WatchStatus } from '@/types'
import { WATCH_STATUSES } from '@/types'

// ── Icons ────────────────────────────────────────────────────

function WatchPlaceholder() {
  return (
    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
      <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="7"/>
        <path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg className={`w-3 h-3 inline ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`} viewBox="0 0 8 10" fill="currentColor">
      {dir === 'asc' || !active ? (
        <path d="M4 0L7.5 5H.5L4 0z" opacity={active && dir === 'asc' ? 1 : 0.4}/>
      ) : null}
      {dir === 'desc' || !active ? (
        <path d="M4 10L.5 5H7.5L4 10z" opacity={active && dir === 'desc' ? 1 : 0.4}/>
      ) : null}
    </svg>
  )
}

function EditIcon()      { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function CopyIcon()      { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function TrashIcon()     { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ShareIcon()     { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.3M4.5 8.7l6 3.4" strokeLinecap="round"/></svg> }
function SearchIcon()    { return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/></svg> }

// ── Types ────────────────────────────────────────────────────

type SortKey = 'year' | 'purchase_cost' | 'selling_price' | 'status'
type Filter  = WatchStatus | 'All'

// ── Helpers ──────────────────────────────────────────────────

function formatLKR(n: number | null) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function extractYear(d: string | null): number {
  if (!d) return 0
  return new Date(d).getFullYear()
}

function displayYear(d: string | null) {
  const y = extractYear(d)
  return y === 0 ? '—' : y.toString()
}

// ── Component ────────────────────────────────────────────────

export default function WatchInventory({ watches: initial }: { watches: Watch[] }) {
  const router = useRouter()
  const [watches, setWatches] = useState(initial)
  const [filter, setFilter]   = useState<Filter>('All')
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  // ── Derived ────────────────────────────────────────────────

  const processed = useMemo(() => {
    let list = watches

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        w =>
          w.watch_name.toLowerCase().includes(q) ||
          (w.reference ?? '').toLowerCase().includes(q) ||
          (w.serial_number ?? '').toLowerCase().includes(q) ||
          (w.purchased_from ?? '').toLowerCase().includes(q)
      )
    }

    if (filter !== 'All') list = list.filter(w => w.status === filter)

    if (sort) {
      const m = sort.dir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        switch (sort.key) {
          case 'year':          return m * (extractYear(a.date_on_card) - extractYear(b.date_on_card))
          case 'purchase_cost': return m * ((a.purchase_cost ?? 0) - (b.purchase_cost ?? 0))
          case 'selling_price': return m * ((a.selling_price ?? 0) - (b.selling_price ?? 0))
          case 'status':        return m * a.status.localeCompare(b.status)
          default:              return 0
        }
      })
    }

    return list
  }, [watches, search, filter, sort])

  function toggleSort(key: SortKey) {
    setSort(s =>
      s?.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  function countByStatus(f: Filter) {
    return f === 'All' ? watches.length : watches.filter(w => w.status === f).length
  }

  // ── Row actions ────────────────────────────────────────────

  async function handleDelete(e: React.MouseEvent, watchId: string) {
    e.stopPropagation()
    if (!confirm('Delete this watch? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('watches').delete().eq('id', watchId)
    setWatches(v => v.filter(w => w.id !== watchId))
  }

  async function handleDuplicate(e: React.MouseEvent, watch: Watch) {
    e.stopPropagation()
    const supabase = createClient()
    const { data } = await supabase
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
        selling_price:  watch.selling_price,
        comments:       watch.comments,
        photos:         watch.photos,
      })
      .select()
      .single()
    if (data) {
      setWatches(v => [data as Watch, ...v])
      router.push(`/dashboard/watches/${data.id}`)
    }
  }

  function handleShare(e: React.MouseEvent, watchId: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/watches/${watchId}`)
  }

  // ── Sortable column header ─────────────────────────────────

  function SortTh({ label, sortKey, className = '' }: { label: string; sortKey: SortKey; className?: string }) {
    const active = sort?.key === sortKey
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-gray-700 transition-colors ${className}`}
        onClick={() => toggleSort(sortKey)}
      >
        {label}
        <SortIcon active={active} dir={active ? sort!.dir : 'asc'} />
      </th>
    )
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {watches.length} {watches.length === 1 ? 'watch' : 'watches'}
          </p>
        </div>
        <Link
          href="/dashboard/watches/new"
          className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-black transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
          </svg>
          Add Watch
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, reference, serial…"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-px scrollbar-hide">
        {(['All', ...WATCH_STATUSES] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-gray-900 text-white font-medium'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {f}
            <span className={`text-xs tabular-nums ${filter === f ? 'text-gray-300' : 'text-gray-400'}`}>
              {countByStatus(f)}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
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

      {/* Table */}
      {processed.length > 0 && (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-white w-14" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Watch</th>
                <SortTh label="Year"     sortKey="year"          className="text-left hidden sm:table-cell" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Set</th>
                <SortTh label="Status"   sortKey="status"        className="text-left" />
                <SortTh label="Buy"      sortKey="purchase_cost" className="text-right hidden sm:table-cell" />
                <SortTh label="Sell"     sortKey="selling_price" className="text-right" />
                <th className="w-10" />
              </tr>
              <tr>
                <td colSpan={9} className="px-4 pb-1">
                  <div className="h-px bg-gray-100" />
                </td>
              </tr>
            </thead>
            <tbody>
              {processed.map(w => (
                <tr
                  key={w.id}
                  className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                  onClick={() => router.push(`/dashboard/watches/${w.id}`)}
                >
                  {/* Photo */}
                  <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50/80 transition-colors">
                    {w.photos && w.photos.length > 0 ? (
                      <img
                        src={w.photos[0]}
                        alt={w.watch_name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0"
                      />
                    ) : (
                      <WatchPlaceholder />
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-semibold text-gray-900 truncate">{w.watch_name}</div>
                    {w.reference && (
                      <div className="text-xs text-gray-400 mt-0.5">Ref: {w.reference}</div>
                    )}
                  </td>

                  {/* Year */}
                  <td className="px-4 py-3 text-gray-500 tabular-nums hidden sm:table-cell">{displayYear(w.date_on_card)}</td>

                  {/* Condition */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{w.condition}</td>

                  {/* Set */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">{w.set_details}</td>

                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>

                  {/* Buy Price */}
                  <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs tabular-nums hidden sm:table-cell">
                    {formatLKR(w.purchase_cost)}
                  </td>

                  {/* Sell Price */}
                  <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs tabular-nums font-medium">
                    {formatLKR(w.selling_price)}
                  </td>

                  {/* Hover actions */}
                  <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                      <ActionBtn title="Edit" onClick={e => { e.stopPropagation(); router.push(`/dashboard/watches/${w.id}/edit`) }}>
                        <EditIcon />
                      </ActionBtn>
                      <ActionBtn title="Duplicate" onClick={e => handleDuplicate(e, w)}>
                        <CopyIcon />
                      </ActionBtn>
                      <ActionBtn title="Share" onClick={e => handleShare(e, w.id)}>
                        <ShareIcon />
                      </ActionBtn>
                      <ActionBtn title="Delete" onClick={e => handleDelete(e, w.id)} danger>
                        <TrashIcon />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  children,
  title,
  onClick,
  danger = false,
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
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? 'text-gray-300 hover:text-red-500 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
