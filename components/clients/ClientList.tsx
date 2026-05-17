'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client } from '@/types'

// ── Helpers ──────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-red-100    text-red-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100  text-amber-600',
  'bg-emerald-100 text-emerald-600',
  'bg-sky-100    text-sky-600',
  'bg-violet-100 text-violet-600',
  'bg-pink-100   text-pink-600',
  'bg-teal-100   text-teal-600',
]

export function avatarColor(name: string) {
  const n = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Badges ───────────────────────────────────────────────────

function VIPBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
      ★ VIP
    </span>
  )
}

function ClubBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white">
      Club TWB
    </span>
  )
}

// ── Component ────────────────────────────────────────────────

type Filter = 'All' | 'VIP' | 'Club TWB'

export default function ClientList({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('All')

  const visible = useMemo(() => {
    let list = clients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          (c.whatsapp ?? '').includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.instagram ?? '').toLowerCase().includes(q)
      )
    }
    if (filter === 'VIP')      list = list.filter(c => c.is_vip)
    if (filter === 'Club TWB') list = list.filter(c => c.club_twb)
    return list
  }, [clients, search, filter])

  const counts: Record<Filter, number> = {
    'All':      clients.length,
    'VIP':      clients.filter(c => c.is_vip).length,
    'Club TWB': clients.filter(c => c.club_twb).length,
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-black transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
          </svg>
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l3.5 3.5" strokeLinecap="round"/>
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, WhatsApp, email…"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 mb-6">
        {(['All', 'VIP', 'Club TWB'] as Filter[]).map(f => (
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
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            {clients.length === 0 ? 'No clients yet' : 'No results'}
          </p>
          {clients.length === 0 && (
            <Link href="/dashboard/clients/new" className="mt-3 text-sm text-gray-900 underline underline-offset-4">
              Add your first client
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="space-y-1">
          {visible.map(client => (
            <div
              key={client.id}
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(client.name)}`}>
                {getInitials(client.name)}
              </div>

              {/* Name + contact */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{client.name}</span>
                  {client.is_vip   && <VIPBadge />}
                  {client.club_twb && <ClubBadge />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {client.whatsapp ?? client.email ?? client.phone ?? 'No contact info'}
                </p>
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
