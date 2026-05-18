'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { DealWithRelations, DealStage, DealType } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function grossProfit(d: DealWithRelations): number | null {
  if (d.sale_price == null) return null
  return d.sale_price - (d.trade_value ?? 0) - (d.adjustment ?? 0) - (d.commission ?? 0)
}

const STAGE_COLORS: Record<DealStage, string> = {
  Inquiry:     'bg-gray-100 text-gray-600',
  Offer:       'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  Negotiation: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Closed:      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Lost:        'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
}

const TYPE_COLORS: Record<DealType, string> = {
  Sale:     'bg-sky-50 text-sky-600',
  Purchase: 'bg-violet-50 text-violet-600',
  Trade:    'bg-amber-50 text-amber-600',
}

function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}>
      {stage}
    </span>
  )
}

function TypeBadge({ type }: { type: DealType }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  )
}

const STAGES: DealStage[] = ['Inquiry', 'Offer', 'Negotiation', 'Closed', 'Lost']
const TYPES:  DealType[]  = ['Sale', 'Purchase', 'Trade']

export default function DealList({ initialDeals }: { initialDeals: DealWithRelations[] }) {
  const router = useRouter()
  const [deals, setDeals]       = useState(initialDeals)
  const [search, setSearch]     = useState('')
  const [stage, setStage]       = useState<DealStage | 'All'>('All')
  const [type, setType]         = useState<DealType | 'All'>('All')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = deals.filter(d => {
    if (stage !== 'All' && d.stage !== stage) return false
    if (type  !== 'All' && d.deal_type !== type) return false
    if (search) {
      const q = search.toLowerCase()
      const watchMatch  = d.watches?.watch_name.toLowerCase().includes(q) || d.watches?.reference?.toLowerCase().includes(q)
      const clientMatch = d.clients?.name.toLowerCase().includes(q)
      if (!watchMatch && !clientMatch) return false
    }
    return true
  })

  async function handleDelete(id: string) {
    if (!confirm('Delete this deal? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) { alert(error.message); setDeleting(null); return }
    setDeals(ds => ds.filter(d => d.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Deals</h1>
        <Link
          href="/dashboard/deals/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
          </svg>
          New Deal
        </Link>
      </div>

      {/* Search + type filter */}
      <div className="flex items-center gap-3 px-4 md:px-8 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
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
        <div className="flex gap-1.5">
          {(['All', ...TYPES] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-0 border-b border-gray-100 px-4 md:px-8 overflow-x-auto">
        {(['All', ...STAGES] as const).map(s => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              stage === s
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {s}
            {s !== 'All' && (
              <span className="ml-1.5 text-xs text-gray-300 tabular-nums">
                {deals.filter(d => d.stage === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">No deals found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 md:px-8 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Watch</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Client</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stage</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Price</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Gross Profit</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell pr-4 md:pr-8">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(deal => {
                const gp = grossProfit(deal)
                return (
                  <tr
                    key={deal.id}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                  >
                    {/* Watch */}
                    <td className="px-4 md:px-8 py-3.5">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                        {deal.watches?.watch_name ?? <span className="text-gray-300">—</span>}
                      </p>
                      {deal.watches?.reference && (
                        <p className="text-xs text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      {deal.clients ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                            {getInitials(deal.clients.name)}
                          </div>
                          <span className="text-sm text-gray-700 truncate max-w-[120px]">{deal.clients.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>

                    {/* Stage */}
                    <td className="px-3 py-3.5">
                      <StageBadge stage={deal.stage} />
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <TypeBadge type={deal.deal_type} />
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3.5 hidden md:table-cell text-right">
                      <span className="text-sm text-gray-900 tabular-nums">
                        {formatLKR(deal.sale_price ?? deal.offered_price)}
                      </span>
                    </td>

                    {/* Gross Profit */}
                    <td className="px-3 py-3.5 hidden lg:table-cell text-right">
                      {gp != null ? (
                        <span className={`text-sm font-medium tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {gp >= 0 ? '+' : ''}{formatLKR(gp)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>

                    {/* Date + actions */}
                    <td className="px-3 py-3.5 hidden lg:table-cell pr-4 md:pr-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-400 group-hover:hidden">
                          {new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <Link
                            href={`/dashboard/deals/${deal.id}`}
                            onClick={e => e.stopPropagation()}
                            className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(deal.id) }}
                            disabled={deleting === deal.id}
                            className="px-2.5 py-1 text-xs font-medium text-red-500 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deleting === deal.id ? '…' : 'Delete'}
                          </button>
                        </div>
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
        {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
