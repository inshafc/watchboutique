'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient as supabase } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { Client } from '@/types'

export { avatarColor, getInitials }

// ── Types ────────────────────────────────────────────────────

type Filter  = 'All' | 'VIP' | 'Club TWB' | 'Retail' | 'Reseller'
type SortKey = 'name' | 'created_at' | 'client_type'

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
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white whitespace-nowrap">
      Club TWB
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

function EditIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function TrashIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CopyIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8" strokeLinecap="round"/></svg> }
function SearchIcon(){ return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/></svg> }

function SortArrow({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className={`ml-1 text-xs transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}>
      {active && dir === 'desc' ? '↓' : '↑'}
    </span>
  )
}

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

// ── Component ────────────────────────────────────────────────

export default function ClientList({ clients: initial }: { clients: Client[] }) {
  const router = useRouter()
  const [clients, setClients] = useState(initial)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('All')
  const [sort, setSort]       = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>({ key: 'name', dir: 'asc' })

  function toggleSort(key: SortKey) {
    setSort(s => s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

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
      case 'VIP':      list = list.filter(c => c.is_vip); break
      case 'Club TWB': list = list.filter(c => c.club_twb); break
      case 'Retail':   list = list.filter(c => c.client_type === 'Retail'); break
      case 'Reseller': list = list.filter(c => c.client_type === 'Reseller'); break
    }
    if (sort) {
      const m = sort.dir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        switch (sort.key) {
          case 'name':        return m * a.name.localeCompare(b.name)
          case 'created_at':  return m * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          case 'client_type': return m * (a.client_type ?? '').localeCompare(b.client_type ?? '')
        }
        return 0
      })
    }
    return list
  }, [clients, search, filter, sort])

  const counts: Record<Filter, number> = {
    'All':      clients.length,
    'VIP':      clients.filter(c => c.is_vip).length,
    'Club TWB': clients.filter(c => c.club_twb).length,
    'Retail':   clients.filter(c => c.client_type === 'Retail').length,
    'Reseller': clients.filter(c => c.client_type === 'Reseller').length,
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this client? All wishlists and contact history will be removed.')) return
    const db = supabase()
    await db.from('clients').delete().eq('id', id)
    setClients(v => v.filter(c => c.id !== id))
  }

  function handleCopy(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    const lines = [
      c.name,
      c.whatsapp    && `WhatsApp: ${c.whatsapp}`,
      c.phone       && `Phone: ${c.phone}`,
      c.email       && `Email: ${c.email}`,
      c.instagram   && `Instagram: ${c.instagram}`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h2>
          <p className="text-sm text-gray-400 mt-0.5">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-black transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email…"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-px">
        {(['All', 'VIP', 'Club TWB', 'Retail', 'Reseller'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === f ? 'bg-gray-900 text-white font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {f}
            <span className={`text-xs tabular-nums ${filter === f ? 'text-gray-300' : 'text-gray-400'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

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

      {/* Table */}
      {visible.length > 0 && (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                {/* Avatar */}
                <th className="px-4 py-3 w-12" />
                {/* Name */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors whitespace-nowrap"
                  onClick={() => toggleSort('name')}
                >
                  Name <SortArrow active={sort?.key === 'name'} dir={sort?.key === 'name' ? sort.dir : 'asc'} />
                </th>
                {/* Phone */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">Phone</th>
                {/* Email */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">Email</th>
                {/* Type */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors whitespace-nowrap"
                  onClick={() => toggleSort('client_type')}
                >
                  Type <SortArrow active={sort?.key === 'client_type'} dir={sort?.key === 'client_type' ? sort.dir : 'asc'} />
                </th>
                {/* Sales Manager */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">Sales Mgr</th>
                {/* Lead */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">Lead</th>
                {/* Date */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors hidden xl:table-cell whitespace-nowrap"
                  onClick={() => toggleSort('created_at')}
                >
                  Added <SortArrow active={sort?.key === 'created_at'} dir={sort?.key === 'created_at' ? sort.dir : 'asc'} />
                </th>
                {/* Actions */}
                <th className="w-10" />
              </tr>
              <tr>
                <td colSpan={9} className="px-4 pb-1"><div className="h-px bg-gray-100" /></td>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr
                  key={c.id}
                  className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                  onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                >
                  {/* Avatar */}
                  <td className="px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(c.name, c.avatar_color)}`}>
                      {getInitials(c.name)}
                    </div>
                  </td>

                  {/* Name + badges */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {c.is_vip   && <VIPBadge />}
                      {c.club_twb && <ClubTWBBadge />}
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap hidden sm:table-cell">
                    {c.phone ?? c.whatsapp ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px] hidden md:table-cell">
                    {c.email ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <TypeBadge type={c.client_type} />
                  </td>

                  {/* Sales Manager */}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap hidden lg:table-cell">
                    {c.sales_manager ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Lead Referral */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <LeadBadge lead={c.lead_referral} />
                  </td>

                  {/* Date Added */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden xl:table-cell">
                    {new Date(c.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                  </td>

                  {/* Hover actions */}
                  <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                      <ActionBtn title="Edit"   onClick={e => { e.stopPropagation(); router.push(`/dashboard/clients/${c.id}/edit`) }}><EditIcon /></ActionBtn>
                      <ActionBtn title="Copy"   onClick={e => handleCopy(e, c)}><CopyIcon /></ActionBtn>
                      <ActionBtn title="Delete" onClick={e => handleDelete(e, c.id)} danger><TrashIcon /></ActionBtn>
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
