'use client'

import { useState, useRef, useEffect } from 'react'
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
  return (
    d.sale_price
    - (d.watches?.purchase_cost ?? 0)
    - (d.other_costs ? (d.other_costs_amount ?? 0) : 0)
    - (d.commission_payable ? (d.commission_amount ?? 0) : 0)
  )
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  )
}

function ListIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg> }
function GridIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg> }
function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function XSmallIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> }

type StageFilter = DealStage | 'All' | 'Deleted'

const STAGES: DealStage[] = ['Inquiry', 'Offer', 'Negotiation', 'Closed', 'Delivered', 'Lost']
const TYPES:  DealType[]  = ['Sale', 'Purchase', 'Trade']

export default function DealList({ initialDeals }: { initialDeals: DealWithRelations[] }) {
  const router = useRouter()
  const [deals,       setDeals]       = useState(initialDeals)
  const [search,      setSearch]      = useState('')
  const [stage,       setStage]       = useState<StageFilter>('All')
  const [type,        setType]        = useState<DealType | 'All'>('All')
  const [view,        setView]        = useState<'list' | 'tile'>('list')
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // Undo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoState,   setUndoState]   = useState<{ message: string; restore: () => Promise<void> } | null>(null)

  // Deleted deals (lazy-loaded)
  const [deletedDeals, setDeletedDeals] = useState<DealWithRelations[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  // Load deleted deals on first visit to the Deleted tab
  useEffect(() => {
    if (stage === 'Deleted' && deletedDeals === null && !loadingDeleted) {
      void loadDeletedDeals()
    }
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = deals.filter(d => {
    if (stage !== 'All' && stage !== 'Deleted' && d.stage !== stage) return false
    if (type  !== 'All' && d.deal_type !== type) return false
    if (search) {
      const q = search.toLowerCase()
      const watchMatch  = d.watches?.watch_name.toLowerCase().includes(q) || d.watches?.reference?.toLowerCase().includes(q)
      const clientMatch = d.clients?.name.toLowerCase().includes(q)
      if (!watchMatch && !clientMatch) return false
    }
    return true
  })

  // ── Undo ─────────────────────────────────────────────────

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

  // ── Deleted deals ─────────────────────────────────────────

  async function loadDeletedDeals() {
    setLoadingDeleted(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos), clients(name, avatar_color)')
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

  async function handleDelete(id: string) {
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

  async function handleDuplicate(deal: DealWithRelations) {
    setDuplicating(deal.id)
    const supabase = createClient()
    const { data: newDeal, error } = await supabase
      .from('deals')
      .insert({
        watch_id:           deal.watch_id,
        client_id:          deal.client_id,
        deal_type:          deal.deal_type,
        stage:              'Inquiry',
        offered_price:      deal.offered_price,
        sale_price:         deal.sale_price,
        payment_method:     deal.payment_method,
        currency:           deal.currency,
        notes:              deal.notes,
        sales_manager:      deal.sales_manager,
        other_costs:        deal.other_costs ?? false,
        other_costs_amount: deal.other_costs_amount,
        commission_payable: deal.commission_payable ?? false,
        commission_amount:  deal.commission_amount,
        new_client:         deal.new_client ?? false,
      })
      .select('id')
      .single()

    if (!error && newDeal) {
      router.push(`/dashboard/deals/${newDeal.id}`)
    }
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
          {/* View toggle */}
          {!showingDeleted && (
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                title="List view"
              >
                <ListIcon />
              </button>
              <button
                onClick={() => setView('tile')}
                className={`p-2 rounded-lg transition-colors ${view === 'tile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                title="Tile view"
              >
                <GridIcon />
              </button>
            </div>
          )}
          {!showingDeleted && (
            <Link
              href="/dashboard/deals/new"
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
              </svg>
              New Sale
            </Link>
          )}
        </div>
      </div>

      {/* Search + type filter */}
      {!showingDeleted && (
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
      )}

      {/* Stage tabs */}
      <div className="flex gap-0 border-b border-gray-100 px-4 md:px-8 overflow-x-auto">
        {(['All', ...STAGES, 'Deleted'] as StageFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              stage === s
                ? s === 'Deleted'
                  ? 'border-red-400 text-red-600'
                  : 'border-gray-900 text-gray-900'
                : s === 'Deleted'
                ? 'border-transparent text-gray-300 hover:text-red-500'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {s}
            {s !== 'All' && s !== 'Deleted' && (
              <span className="ml-1.5 text-xs text-gray-300 tabular-nums">
                {deals.filter(d => d.stage === s).length}
              </span>
            )}
            {s === 'Deleted' && deletedDeals !== null && (
              <span className="ml-1.5 text-xs text-red-300 tabular-nums">
                {deletedDeals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Deleted tab content ──────────────────────────────── */}
      {showingDeleted && (
        <div>
          {loadingDeleted && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading deleted sales…
            </div>
          )}
          {!loadingDeleted && (deletedDeals === null || deletedDeals.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                </svg>
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
                        <p className="text-sm font-medium text-gray-400 truncate max-w-[180px]">
                          {deal.watches?.watch_name ?? <span className="text-gray-300">—</span>}
                        </p>
                        {deal.watches?.reference && (
                          <p className="text-xs text-gray-300 mt-0.5">Ref: {deal.watches.reference}</p>
                        )}
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        {deal.clients ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 opacity-50 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                              {getInitials(deal.clients.name)}
                            </div>
                            <span className="text-sm text-gray-400 truncate max-w-[120px]">{deal.clients.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                        {(deal as any).deleted_at
                          ? new Date((deal as any).deleted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="px-3 py-3.5 pr-4 md:pr-8">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRestoreDeal(deal.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <RestoreIcon /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteDeal(deal.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
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

      {/* ── Normal content ───────────────────────────────────── */}
      {!showingDeleted && (
        <>
          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">No sales found</p>
            </div>
          )}

          {/* Tile View */}
          {filtered.length > 0 && view === 'tile' && (
            <div className="px-4 md:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(deal => {
                const gp = grossProfit(deal)
                return (
                  <Link
                    key={deal.id}
                    href={`/dashboard/deals/${deal.id}`}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="relative h-40 bg-gray-50 overflow-hidden">
                      {deal.watches?.photos && deal.watches.photos.length > 0 ? (
                        <img
                          src={deal.watches.photos[0]}
                          alt={deal.watches.watch_name ?? ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                          </svg>
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
                          {deal.watches?.reference && (
                            <p className="text-xs text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>
                          )}
                        </div>
                        <TypeBadge type={deal.deal_type} />
                      </div>
                      {deal.clients && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                            {getInitials(deal.clients.name)}
                          </div>
                          <span className="text-xs text-gray-600 truncate">{deal.clients.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          {deal.sale_price != null && (
                            <p className="text-sm font-bold text-gray-900 tabular-nums">{formatLKR(deal.sale_price)}</p>
                          )}
                          {gp != null && (
                            <p className={`text-xs font-medium tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {gp >= 0 ? '+' : ''}{formatLKR(gp)} profit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* List View */}
          {filtered.length > 0 && view === 'list' && (
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
                        <td className="px-4 md:px-8 py-3.5">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                            {deal.watches?.watch_name ?? <span className="text-gray-300">—</span>}
                          </p>
                          {deal.watches?.reference && (
                            <p className="text-xs text-gray-400 mt-0.5">Ref: {deal.watches.reference}</p>
                          )}
                        </td>
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
                        <td className="px-3 py-3.5">
                          <StageBadge stage={deal.stage} />
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell">
                          <TypeBadge type={deal.deal_type} />
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell text-right">
                          <span className="text-sm text-gray-900 tabular-nums">
                            {formatLKR(deal.sale_price ?? deal.offered_price)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 hidden lg:table-cell text-right">
                          {gp != null ? (
                            <span className={`text-sm font-medium tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {gp >= 0 ? '+' : ''}{formatLKR(gp)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 hidden lg:table-cell pr-4 md:pr-8 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-gray-400 group-hover:hidden">
                              {new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                            </span>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <Link
                                href={`/dashboard/deals/${deal.id}/edit`}
                                onClick={e => e.stopPropagation()}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={e => { e.stopPropagation(); handleDuplicate(deal) }}
                                disabled={duplicating === deal.id}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                {duplicating === deal.id ? '…' : 'Copy'}
                              </button>
                              <button
                                onClick={e => handleShare(e, deal.id)}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Share
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(deal.id) }}
                                className="px-2.5 py-1 text-xs font-medium text-red-500 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Delete
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
            {filtered.length} sale{filtered.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* ── Undo toast ──────────────────────────────────────── */}
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
