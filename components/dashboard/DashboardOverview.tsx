'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import { createClient } from '@/lib/supabase/client'
import {
  type DealRow, type Target, type DateRange,
  filterDeals, getDateBounds, getPrevBounds,
  overviewRevenue, computeGP, newCustomersInPeriod,
  salesByBrand, salesByManager, salesByReferral, salesByChannel,
  topClients, newVsExisting, targetForPeriod,
  fmtCompact, pctChange,
} from '@/lib/analytics'
import { dealSalePriceLKR } from '@/lib/deal-currency'
import type { InvestorStat } from '@/lib/investor-stats'
import { useAuth } from '@/context/AuthContext'

// ── Palette (matches the Sales Dashboard design) ────────────────────────────
const INK        = '#14140f'
const INK_60     = 'rgba(20,20,15,.6)'
const INK_50     = 'rgba(20,20,15,.5)'
const INK_45     = 'rgba(20,20,15,.45)'
const INK_08     = 'rgba(20,20,15,.08)'
const GREEN      = '#1f6f43'
const RED        = '#b23a2c'
const CARD_BG    = '#f7f6f3'
const SEG_COLORS = ['#14140f', '#1f6f43', '#43b877', '#b9a271', '#c9c4b8']
const AVATARS    = ['#e2ddd0', '#d8e3d9', '#e6ded6', '#dcdde6', '#e5e2d3']

const RANGES: { label: string; value: DateRange }[] = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3'     },
  { label: 'Last 6 Months', value: 'last_6'     },
  { label: 'This Year',     value: 'this_year'  },
]

function deltaColor(n: number | null) {
  if (n == null) return { bg: INK_08, fg: INK_50 }
  return n >= 0 ? { bg: 'rgba(31,111,67,.1)', fg: GREEN } : { bg: 'rgba(178,58,44,.1)', fg: RED }
}

function fmtDelta(n: number | null) {
  if (n == null) return '—'
  return (n >= 0 ? '↑ ' : '↓ ') + Math.abs(n).toFixed(1) + '%'
}

function barGradient(pct: number) {
  if (pct >= 80) return 'linear-gradient(90deg,#1f6f43,#43b877)'
  if (pct >= 50) return 'linear-gradient(90deg,#b5761a,#e2a33c)'
  return 'linear-gradient(90deg,#8f2c1d,#d1543c)'
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function daysAgo(iso: string | null): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-[24px] p-6 flex flex-col gap-4 ${className}`} style={{ boxShadow: '0 1px 2px rgba(20,20,15,.05)' }}>
      {children}
    </section>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────
type ChartRow = { label: string; totalSales: number; count: number }

function DonutChart({
  title, rows, mode, onModeChange,
}: {
  title: string
  rows: ChartRow[]
  mode: 'value' | 'count'
  onModeChange: (m: 'value' | 'count') => void
}) {
  const raw = rows.map(r => mode === 'value' ? r.totalSales : r.count)
  const total = raw.reduce((a, b) => a + b, 0) || 1
  const C = 2 * Math.PI * 46
  let acc = 0
  const segs = rows.map((r, i) => {
    const val = raw[i]
    const frac = val / total
    const len = frac * C
    const seg = {
      label: r.label,
      color: SEG_COLORS[i % SEG_COLORS.length],
      dash: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      offset: (-acc).toFixed(2),
      display: mode === 'value' ? fmtCompact(val) : String(val),
      pct: Math.round(frac * 100),
    }
    acc += len
    return seg
  })
  const displayTotal = mode === 'value' ? fmtCompact(raw.reduce((a, b) => a + b, 0)) : String(raw.reduce((a, b) => a + b, 0))

  return (
    <div className="bg-white rounded-[24px] p-6 flex flex-col gap-5" style={{ boxShadow: '0 1px 2px rgba(20,20,15,.05)' }}>
      <div className="flex items-center gap-2.5">
        <h3 className="m-0 text-[16.5px] font-semibold tracking-tight" style={{ color: INK }}>{title}</h3>
        <div className="ml-auto flex gap-0.5 p-0.5 rounded-full" style={{ background: '#f2f1ed' }}>
          {(['value', 'count'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className="border-0 cursor-pointer font-semibold px-2.5 py-1 rounded-full text-[11.5px]"
              style={{ background: mode === m ? INK : 'transparent', color: mode === m ? '#fff' : INK_50 }}
            >
              {m === 'value' ? 'Value' : '#'}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No data for this period.</p>
      ) : (
        <div className="flex items-center gap-3.5">
          <div className="relative w-[146px] h-[146px] flex-none">
            <svg width="146" height="146" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="46" fill="none" stroke="#f2f1ed" strokeWidth="17" />
              {segs.map(s => (
                <circle key={s.label} cx="60" cy="60" r="46" fill="none" stroke={s.color} strokeWidth="17" strokeDasharray={s.dash} strokeDashoffset={s.offset} />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
              <span className="text-[21px] font-semibold tracking-tight" style={{ color: INK }}>{displayTotal}</span>
              <span className="text-[11px]" style={{ color: INK_45 }}>{mode === 'value' ? 'LKR total' : 'watches'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {segs.map(s => (
              <div key={s.label} className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-sm flex-none" style={{ background: s.color }} />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: INK_60 }}>{s.label}</span>
                  <span className="text-[12.5px] font-semibold tabular-nums whitespace-nowrap">{s.display}</span>
                </div>
                <span className="ml-auto text-[11.5px] tabular-nums whitespace-nowrap" style={{ color: INK_45 }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type ChartMode = { manager: 'value' | 'count'; brand: 'value' | 'count'; channel: 'value' | 'count'; clients: 'value' | 'count' }
type InvestorSortKey = 'displayName' | 'capitalTiedUp' | 'totalSales' | 'netProfit' | 'roi'

export default function DashboardOverview({
  deals,
  stockValue,
  stockCount,
  targets,
  clients,
  investorStats,
}: {
  deals: DealRow[]
  stockValue: number
  stockCount: number
  targets: Target[]
  clients: { id: string; created_at: string; lead_referral: string | null }[]
  investorStats: InvestorStat[]
}) {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [range, setRange] = useState<DateRange>('this_month')
  const [chartMode, setChartMode] = useState<ChartMode>({ manager: 'value', brand: 'value', channel: 'value', clients: 'value' })
  const [sortKey, setSortKey] = useState<InvestorSortKey>('capitalTiedUp')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const [searchQuery, setSearchQuery]     = useState('')
  const [searchOpen, setSearchOpen]       = useState(false)
  const [searching, setSearching]         = useState(false)
  const [searchResults, setSearchResults] = useState<{
    watches: { id: string; watch_name: string; reference: string | null }[]
    clients: { id: string; name: string }[]
  }>({ watches: [], clients: [] })
  const searchSeq = useRef(0)

  useEffect(() => {
    // Strip characters with special meaning in PostgREST's .or() filter
    // syntax (comma separates conditions, parens group them) — otherwise
    // typed search text could inject extra filter clauses.
    const q = searchQuery.trim().replace(/[,()]/g, ' ').trim()
    if (q.length < 2) {
      setSearchResults({ watches: [], clients: [] })
      setSearching(false)
      return
    }
    setSearching(true)
    const seq = ++searchSeq.current
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const [watchesRes, clientsRes] = await Promise.all([
        supabase
          .from('watches')
          .select('id, watch_name, reference')
          .is('deleted_at', null)
          .or(`watch_name.ilike.%${q}%,reference.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('clients')
          .select('id, name')
          .is('deleted_at', null)
          .ilike('name', `%${q}%`)
          .limit(5),
      ])
      if (seq !== searchSeq.current) return
      setSearchResults({
        watches: watchesRes.data ?? [],
        clients: clientsRes.data ?? [],
      })
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    setAvatarUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `avatars/${user.id}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('watch-photos').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data } = supabase.storage.from('watch-photos').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      await refreshProfile()
    }
    setAvatarUploading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const [start, end]         = getDateBounds(range)
  const [prevStart, prevEnd] = getPrevBounds(range)
  const current = filterDeals(deals, start, end)
  const prev    = filterDeals(deals, prevStart, prevEnd)

  // ── Overview cards — exact formulas (see lib/analytics.ts), scoped by
  // sale_date via the same `current`/`prev` arrays as the rest of this page.
  // closed_at was tried first per the original spec, but it turned out to be
  // a data-entry timestamp (when staff flip a deal's stage in the system),
  // not the actual sale date — deals sold in one month often get closed_at
  // stamped days/weeks later, silently dropping them out of the correct
  // period. sale_date reflects when the sale actually happened.
  const revenue      = overviewRevenue(current)
  const revenuePrev  = overviewRevenue(prev)
  const grossProfit     = current.reduce((s, d) => s + computeGP(d), 0)
  const grossProfitPrev = prev.reduce((s, d) => s + computeGP(d), 0)
  const watchesSold  = current.length
  const gpMargin     = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const gpMarginPrev = revenuePrev > 0 ? (grossProfitPrev / revenuePrev) * 100 : 0
  const newCustomers         = newCustomersInPeriod(clients, start, end)
  const newCustomersReferral = newCustomers.filter(c => c.lead_referral === 'Referral').length

  const getTarget = (metric: string) => targets.find(t => t.metric === metric)?.target_value ?? 0
  const tSales    = targetForPeriod(getTarget('total_sales'), range)
  const achieved  = tSales > 0 ? Math.round((revenue / tSales) * 100) : 0
  const tGP       = targetForPeriod(getTarget('gross_profit'), range)
  const gpAchieved = tGP > 0 ? Math.round((grossProfit / tGP) * 100) : 0
  const tWatches  = targetForPeriod(getTarget('watches_sold'), range)
  const watchesAchieved = tWatches > 0 ? Math.round((watchesSold / tWatches) * 100) : 0
  const GP_PCT_TARGET = getTarget('gp_margin') || 30
  const gpMarginAchieved = GP_PCT_TARGET > 0 ? Math.round((gpMargin / GP_PCT_TARGET) * 100) : 0

  const byManager  = salesByManager(current)
  const byBrand    = salesByBrand(current)
  const byChannel  = salesByChannel(current)
  const nve        = newVsExisting(current)
  const byReferral = salesByReferral(current)
  const top5       = topClients(current, 5)
  const commissionTotal = byManager.reduce((s, m) => s + m.commission, 0)
  // Cost of Sales — real, period-scoped figures only. Commission and other
  // costs are already netted into Gross Profit above; these are shown as
  // informational line items, not subtracted again anywhere. Investor
  // payout is all-time (investorStats isn't period-scoped) and is itself a
  // split of Gross Profit, not an additional cost — labeled accordingly.
  const otherCostsTotal = current.reduce((s, d) => s + (d.other_costs ? (d.other_costs_amount ?? 0) : 0), 0)
  const investorPayoutTotal = investorStats.reduce((s, i) => s + i.netProfit, 0)

  // Latest 5 completed sales — not scoped to the period picker.
  const latestSales = [...deals]
    .sort((a, b) => (b.sale_date ?? b.created_at).localeCompare(a.sale_date ?? a.created_at))
    .slice(0, 5)

  const sortedInvestors = [...investorStats].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    const an = av == null ? -Infinity : (typeof av === 'string' ? 0 : av)
    const bn = bv == null ? -Infinity : (typeof bv === 'string' ? 0 : bv)
    if (sortKey === 'displayName') return a.displayName.localeCompare(b.displayName) * sortDir
    return (an - bn) * sortDir
  })
  const maxRoi = Math.max(...investorStats.map(i => i.roi ?? 0), 1)

  function toggleSort(key: InvestorSortKey) {
    setSortDir(d => (sortKey === key ? (d === -1 ? 1 : -1) : -1))
    setSortKey(key)
  }

  const investorCols: { key: InvestorSortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'displayName',   label: 'Investor',        align: 'left' },
    { key: 'capitalTiedUp', label: 'Capital employed', align: 'right' },
    { key: 'totalSales',    label: 'Sales',            align: 'right' },
    { key: 'netProfit',     label: 'Profit',           align: 'right' },
    { key: 'roi',           label: 'ROI',              align: 'right' },
  ]

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-4" style={{ color: INK }}>

      {/* ── Greeting + utility cluster ───────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-1.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h1 className="m-0 text-[29px] font-bold tracking-tight whitespace-nowrap">Hi there, {firstName}</h1>
          <span className="text-[13px]" style={{ color: INK_45 }}>
            {new Date().toLocaleDateString('en-LK', { dateStyle: 'full' })}
          </span>
        </div>

        <div className="lg:ml-auto flex items-center gap-3 flex-wrap">
          {/* Search — watches (name/reference) + clients (name) */}
          <div className="relative hidden md:block">
            <div className="flex items-center gap-2.5 w-[280px] h-[46px] px-4 rounded-full bg-white" style={{ border: `1px solid ${INK_08}` }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={INK_45} strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>
              <input
                placeholder="Search watches, clients, refs…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                className="border-0 outline-0 bg-transparent text-[13.5px] w-full"
                style={{ color: INK, fontFamily: 'inherit' }}
              />
            </div>
            {searchOpen && searchQuery.trim().length >= 2 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
                <div className="absolute top-[52px] left-0 z-40 w-[320px] max-h-[360px] overflow-y-auto bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ border: `1px solid ${INK_08}`, boxShadow: '0 12px 32px rgba(20,20,15,.16)' }}>
                  {searching ? (
                    <p className="text-[13px] px-3.5 py-2.5" style={{ color: INK_45 }}>Searching…</p>
                  ) : searchResults.watches.length === 0 && searchResults.clients.length === 0 ? (
                    <p className="text-[13px] px-3.5 py-2.5" style={{ color: INK_45 }}>No matches.</p>
                  ) : (
                    <>
                      {searchResults.watches.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider px-3.5 pt-2 pb-1" style={{ color: INK_45 }}>Watches</span>
                          {searchResults.watches.map(w => (
                            <Link
                              key={w.id}
                              href={`/dashboard/watches/${w.id}`}
                              onClick={() => setSearchOpen(false)}
                              className="text-left text-[13px] px-3.5 py-2 rounded-xl whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ color: INK }}
                            >
                              {w.watch_name}{w.reference ? <span style={{ color: INK_45 }}> · {w.reference}</span> : null}
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.clients.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider px-3.5 pt-2 pb-1" style={{ color: INK_45 }}>Clients</span>
                          {searchResults.clients.map(c => (
                            <Link
                              key={c.id}
                              href={`/dashboard/clients/${c.id}`}
                              onClick={() => setSearchOpen(false)}
                              className="text-left text-[13px] px-3.5 py-2 rounded-xl whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ color: INK }}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Period picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setPeriodOpen(v => !v); setAddOpen(false) }}
              className="flex items-center gap-2 h-[46px] px-4 rounded-full bg-white text-[13.5px] font-semibold whitespace-nowrap"
              style={{ border: `1px solid ${INK_08}`, color: INK }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4.6" width="14" height="12.4" rx="3" /><path d="M3 8.6h14M6.8 3.2v2.8M13.2 3.2v2.8" /></svg>
              {RANGES.find(r => r.value === range)?.label}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={INK_50} strokeWidth="1.6" strokeLinecap="round"><path d="m3 4.6 3 3 3-3" /></svg>
            </button>
            {periodOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setPeriodOpen(false)} />
                <div className="absolute top-[52px] right-0 z-40 min-w-[180px] bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ border: `1px solid ${INK_08}`, boxShadow: '0 12px 32px rgba(20,20,15,.16)' }}>
                  {RANGES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { setRange(r.value); setPeriodOpen(false) }}
                      className="text-left border-0 cursor-pointer text-[13px] px-3.5 py-2.5 rounded-xl whitespace-nowrap"
                      style={{ fontWeight: r.value === range ? 600 : 500, background: r.value === range ? '#f2f1ed' : 'transparent', color: r.value === range ? INK : INK_60 }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Add new */}
          <div className="relative">
            <button
              type="button"
              title="Add new"
              onClick={() => { setAddOpen(v => !v); setPeriodOpen(false) }}
              className="w-[46px] h-[46px] rounded-full flex items-center justify-center flex-none"
              style={{ background: INK, color: '#fff' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M10 4.2v11.6M4.2 10h11.6" /></svg>
            </button>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
                <div className="absolute top-[52px] right-0 z-40 min-w-[170px] bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ border: `1px solid ${INK_08}`, boxShadow: '0 12px 32px rgba(20,20,15,.16)' }}>
                  {[
                    { label: 'Add sale',   href: '/dashboard/deals/new' },
                    { label: 'Add watch',  href: '/dashboard/watches/new' },
                    { label: 'Add client', href: '/dashboard/clients/new' },
                  ].map(o => (
                    <Link
                      key={o.href}
                      href={o.href}
                      onClick={() => setAddOpen(false)}
                      className="text-left text-[13px] font-medium px-3 py-2.5 rounded-xl whitespace-nowrap"
                      style={{ color: INK }}
                    >
                      {o.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              type="button"
              title={profile?.full_name ?? firstName}
              onClick={() => { setProfileOpen(v => !v); setPeriodOpen(false); setAddOpen(false) }}
              className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[13px] font-semibold flex-none overflow-hidden"
              style={{ background: '#c9c4b8', border: '2px solid #fff', color: INK }}
            >
              {profile?.avatar_url ? (
                <LazyImage src={profile.avatar_url} alt="" width={46} height={46} sizes="46px" className="w-full h-full object-cover" />
              ) : (
                initials(profile?.full_name ?? firstName)
              )}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <div className="absolute top-[52px] right-0 z-40 min-w-[220px] bg-white rounded-2xl p-1.5 flex flex-col gap-0.5" style={{ border: `1px solid ${INK_08}`, boxShadow: '0 12px 32px rgba(20,20,15,.16)' }}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold flex-none overflow-hidden" style={{ background: '#c9c4b8', color: INK }}>
                      {profile?.avatar_url ? (
                        <LazyImage src={profile.avatar_url} alt="" width={36} height={36} sizes="36px" className="w-full h-full object-cover" />
                      ) : (
                        initials(profile?.full_name ?? firstName)
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold truncate">{profile?.full_name ?? firstName}</span>
                      {profile?.email && <span className="text-[11.5px] truncate" style={{ color: INK_45 }}>{profile.email}</span>}
                    </div>
                  </div>
                  <div className="h-px my-0.5" style={{ background: INK_08 }} />
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => { avatarInputRef.current?.click() }}
                    className="text-left text-[13px] font-medium px-3 py-2.5 rounded-xl whitespace-nowrap disabled:opacity-50"
                    style={{ color: INK }}
                  >
                    {avatarUploading ? 'Uploading…' : 'Change profile photo'}
                  </button>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    className="text-left text-[13px] font-medium px-3 py-2.5 rounded-xl whitespace-nowrap"
                    style={{ color: INK }}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); signOut() }}
                    className="text-left text-[13px] font-medium px-3 py-2.5 rounded-xl whitespace-nowrap"
                    style={{ color: RED }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          OVERVIEW + LATEST SALES
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_336px] gap-4 items-stretch">

        <Card>
          <h2 className="m-0 text-[19px] font-semibold tracking-tight">Overview</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Revenue */}
            <div className="rounded-[20px] p-5 flex flex-col gap-3.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[13.5px] font-medium" style={{ color: INK_60 }}>Revenue</span>
              <div className="flex flex-col items-start gap-2">
                <span className="text-[42px] font-semibold tracking-tight leading-none tabular-nums">LKR {fmtCompact(revenue)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: deltaColor(pctChange(revenue, revenuePrev)).bg, color: deltaColor(pctChange(revenue, revenuePrev)).fg }}>
                    {fmtDelta(pctChange(revenue, revenuePrev))}
                  </span>
                  <span className="text-[11.5px]" style={{ color: INK_45 }}>vs prev. period</span>
                </div>
              </div>
              {tSales > 0 && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex justify-between text-[12px]" style={{ color: INK_60 }}>
                    <span>Target LKR {fmtCompact(tSales)}</span>
                    <span className="font-semibold" style={{ color: INK }}>{achieved}% achieved</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: INK_08 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(achieved, 100)}%`, background: barGradient(achieved) }} />
                  </div>
                </div>
              )}
            </div>

            {/* Gross profit */}
            <div className="rounded-[20px] p-5 flex flex-col gap-3.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[13.5px] font-medium" style={{ color: INK_60 }}>Gross profit</span>
              <div className="flex flex-col items-start gap-2">
                <span className="text-[42px] font-semibold tracking-tight leading-none tabular-nums">LKR {fmtCompact(grossProfit)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: deltaColor(pctChange(grossProfit, grossProfitPrev)).bg, color: deltaColor(pctChange(grossProfit, grossProfitPrev)).fg }}>
                    {fmtDelta(pctChange(grossProfit, grossProfitPrev))}
                  </span>
                  <span className="text-[11.5px]" style={{ color: INK_45 }}>vs prev. period</span>
                </div>
              </div>
              {tGP > 0 && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex justify-between text-[12px]" style={{ color: INK_60 }}>
                    <span>Target LKR {fmtCompact(tGP)}</span>
                    <span className="font-semibold" style={{ color: INK }}>{gpAchieved}% achieved</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: INK_08 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(gpAchieved, 100)}%`, background: barGradient(gpAchieved) }} />
                  </div>
                </div>
              )}
            </div>

            {/* GP Margin */}
            <div className="rounded-[20px] p-5 flex flex-col gap-3.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[13.5px] font-medium" style={{ color: INK_60 }}>GP margin</span>
              <div className="flex flex-col items-start gap-2">
                <span className="text-[42px] font-semibold tracking-tight leading-none tabular-nums">{gpMargin.toFixed(1)}%</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: deltaColor(pctChange(gpMargin, gpMarginPrev)).bg, color: deltaColor(pctChange(gpMargin, gpMarginPrev)).fg }}>
                    {fmtDelta(pctChange(gpMargin, gpMarginPrev))}
                  </span>
                  <span className="text-[11.5px]" style={{ color: INK_45 }}>vs prev. period</span>
                </div>
              </div>
              {GP_PCT_TARGET > 0 && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex justify-between text-[12px]" style={{ color: INK_60 }}>
                    <span>Target {GP_PCT_TARGET}%</span>
                    <span className="font-semibold" style={{ color: INK }}>{gpMarginAchieved}% achieved</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: INK_08 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(gpMarginAchieved, 100)}%`, background: barGradient(gpMarginAchieved) }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Watches sold */}
            <div className="rounded-2xl p-3.5 flex flex-col gap-0.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[12.5px] whitespace-nowrap" style={{ color: INK_50 }}>Watches sold</span>
              <span className="text-[25px] font-semibold tracking-tight leading-none tabular-nums">{watchesSold}</span>
              {tWatches > 0 && (
                <span className="text-[11px] mt-0.5" style={{ color: INK_45 }}>{watchesAchieved}% of {Math.round(tWatches)} target</span>
              )}
            </div>
            {/* Value of stock — current on-hand inventory, cost basis, never period-filtered */}
            <div className="rounded-2xl p-3.5 flex flex-col gap-0.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[12.5px] whitespace-nowrap" style={{ color: INK_50 }}>Value of stock</span>
              <span className="text-[25px] font-semibold tracking-tight leading-none tabular-nums">LKR {fmtCompact(stockValue)}</span>
              <span className="text-[11px] mt-0.5" style={{ color: INK_45 }}>{stockCount} pieces on hand</span>
            </div>
            {/* New customers */}
            <div className="rounded-2xl p-3.5 flex flex-col gap-0.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
              <span className="text-[12.5px] whitespace-nowrap" style={{ color: INK_50 }}>New customers</span>
              <span className="text-[25px] font-semibold tracking-tight leading-none tabular-nums">{newCustomers.length}</span>
              <span className="text-[11px] mt-0.5" style={{ color: INK_45 }}>{newCustomersReferral} from referrals</span>
            </div>
          </div>
        </Card>

        {/* Latest sales */}
        <section className="bg-white rounded-[24px] p-5 flex flex-col gap-3.5" style={{ boxShadow: '0 1px 2px rgba(20,20,15,.05)' }}>
          <div className="flex items-baseline gap-2 px-1">
            <h2 className="m-0 text-[17px] font-semibold tracking-tight">Latest sales</h2>
            <span className="ml-auto text-[12px]" style={{ color: INK_45 }}>Last 5 completed</span>
          </div>
          <div className="flex flex-col gap-1">
            {latestSales.length === 0 ? (
              <p className="text-[13px] px-2.5" style={{ color: '#9CA3AF' }}>No sales yet.</p>
            ) : latestSales.map(s => {
              const price = dealSalePriceLKR(s)
              const brandName = s.watches?.brands?.name ?? s.watches?.watch_name ?? '—'
              const code = brandName.slice(0, 3).toUpperCase()
              const channel = s.clients?.client_type ?? '—'
              const photo = s.watches?.photos?.[0]
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/deals/${s.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-2xl transition-colors hover:bg-[#f7f6f3]"
                >
                  {photo ? (
                    <LazyImage
                      src={photo}
                      alt=""
                      width={46}
                      height={46}
                      sizes="46px"
                      className="w-[46px] h-[46px] flex-none rounded-xl object-cover"
                      style={{ border: `1px solid ${INK_08}` }}
                    />
                  ) : (
                    <div className="w-[46px] h-[46px] flex-none rounded-xl flex flex-col items-center justify-center gap-px" style={{ background: '#eceae5', border: `1px solid ${INK_08}` }}>
                      <span className="text-[10px] font-bold tracking-wide" style={{ color: INK_50 }}>{code}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-semibold tracking-tight leading-tight truncate">{s.watches?.watch_name ?? 'Unknown Watch'}</span>
                    <span className="text-[11.5px] truncate" style={{ color: INK_45 }}>{s.sales_manager ?? 'Unassigned'} · {channel} · {daysAgo(s.sale_date ?? s.created_at)}</span>
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[14px] font-semibold tracking-tight whitespace-nowrap tabular-nums">{price != null ? 'LKR ' + fmtCompact(price) : '—'}</span>
                    <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: s.stage === 'Delivered' ? 'rgba(31,111,67,.1)' : 'rgba(185,162,113,.22)', color: s.stage === 'Delivered' ? GREEN : '#8a6f2e' }}>
                      {s.stage}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          <Link
            href="/dashboard/deals"
            className="mt-auto h-11 flex-none rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors hover:bg-[#f7f6f3]"
            style={{ border: `1px solid ${INK_08.replace('.08', '.1')}` }}
          >
            All sales
          </Link>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════
          PERFORMANCE — INVESTOR RELATIONS
      ══════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex items-center gap-2.5">
          <h3 className="m-0 text-[14.5px] font-semibold">Investor relations</h3>
          <span className="text-[12px]" style={{ color: INK_45 }}>Click a header to sort</span>
        </div>
        {investorStats.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No investors yet.</p>
        ) : (
          <div className="rounded-[18px] overflow-hidden text-[13px]" style={{ border: `1px solid rgba(20,20,15,.07)` }}>
            <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.7fr) repeat(4,minmax(0,1fr))', background: CARD_BG }}>
              {investorCols.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleSort(c.key)}
                  className="text-left px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider whitespace-nowrap border-0 bg-transparent cursor-pointer"
                  style={{ textAlign: c.align, color: sortKey === c.key ? INK : INK_45 }}
                >
                  {c.label}{sortKey === c.key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
            {sortedInvestors.map(inv => {
              const roiPct = inv.roi == null ? 0 : Math.max(inv.roi, 0)
              const roiW = Math.round((roiPct / maxRoi) * 100)
              return (
                <div key={inv.key} className="grid items-center" style={{ gridTemplateColumns: 'minmax(0,1.7fr) repeat(4,minmax(0,1fr))', borderTop: `1px solid rgba(20,20,15,.06)` }}>
                  <div className="px-4 py-3.5 flex items-center gap-2.5 min-w-0">
                    <div className="w-[30px] h-[30px] flex-none rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: AVATARS[initials(inv.displayName).charCodeAt(0) % AVATARS.length] }}>
                      {initials(inv.displayName)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold whitespace-nowrap truncate">{inv.displayName}</span>
                      <span className="text-[11.5px] whitespace-nowrap" style={{ color: INK_45 }}>{inv.activeWatches} pieces on floor</span>
                    </div>
                  </div>
                  <div className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">LKR {fmtCompact(inv.capitalTiedUp)}</div>
                  <div className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">LKR {fmtCompact(inv.totalSales)}</div>
                  <div className="px-4 py-3.5 text-right tabular-nums font-semibold whitespace-nowrap" style={{ color: inv.netProfit >= 0 ? GREEN : RED }}>
                    {inv.netProfit >= 0 ? '+' : ''}LKR {fmtCompact(inv.netProfit)}
                  </div>
                  <div className="px-4 py-3.5 flex items-center gap-2 justify-end">
                    <div className="w-[64px] h-1.5 rounded-full overflow-hidden" style={{ background: INK_08 }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${roiW}%`, background: barGradient(roiW) }} />
                    </div>
                    <span className="text-[12.5px] font-semibold w-11 text-right tabular-nums">{inv.roi == null ? '—' : inv.roi.toFixed(1) + '%'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════
          CHARTS
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutChart
          title="Split by salesman"
          rows={byManager.map(m => ({ label: m.manager, totalSales: m.totalSales, count: m.sold }))}
          mode={chartMode.manager}
          onModeChange={m => setChartMode(s => ({ ...s, manager: m }))}
        />
        <DonutChart
          title="Split by brand"
          rows={byBrand.map(b => ({ label: b.brand, totalSales: b.totalSales, count: b.sold }))}
          mode={chartMode.brand}
          onModeChange={m => setChartMode(s => ({ ...s, brand: m }))}
        />
        <DonutChart
          title="Retail vs reseller"
          rows={byChannel.map(c => ({ label: c.channel, totalSales: c.totalSales, count: c.sold }))}
          mode={chartMode.channel}
          onModeChange={m => setChartMode(s => ({ ...s, channel: m }))}
        />
        <DonutChart
          title="New vs existing clients"
          rows={nve.map(r => ({ label: r.type, totalSales: r.totalSales, count: r.sold }))}
          mode={chartMode.clients}
          onModeChange={m => setChartMode(s => ({ ...s, clients: m }))}
        />
      </div>

      {/* ══════════════════════════════════════════════════════
          LEAD REFERRAL VIEW
      ══════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex items-baseline gap-3">
          <h2 className="m-0 text-[19px] font-semibold tracking-tight">Lead referral view</h2>
          <span className="text-[13px]" style={{ color: INK_45 }}>Where {byReferral.reduce((s, r) => s + r.count, 0)} leads came from</span>
        </div>
        {byReferral.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No data for this period.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byReferral.map((r, i) => {
              const maxCount = Math.max(...byReferral.map(x => x.count), 1)
              const total = byReferral.reduce((s, x) => s + x.count, 0) || 1
              return (
                <div key={r.source} className="rounded-[20px] p-4 flex flex-col gap-3.5" style={{ background: CARD_BG, border: `1px solid ${INK_08}` }}>
                  <div className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-[13px] font-semibold" style={{ background: '#fff', border: `1px solid ${INK_08.replace('.08', '.06')}`, color: SEG_COLORS[i % SEG_COLORS.length] }}>
                    {r.source.slice(0, 1)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12.5px] truncate" style={{ color: INK_50 }}>{r.source}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[24px] font-semibold tracking-tight leading-none">{Math.round((r.count / total) * 100)}%</span>
                      <span className="text-[12.5px]" style={{ color: INK_45 }}>{r.count} leads</span>
                    </div>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: INK_08 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((r.count / maxCount) * 100)}%`, background: INK }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════
          COST OF SALES + TOP SALESMEN
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="m-0 text-[17px] font-semibold tracking-tight">Cost of sales</h2>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 px-4 py-4 rounded-2xl" style={{ background: INK }}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,.72)' }}>Investor payout</span>
                <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,.45)' }}>All-time, their share of net profit</span>
              </div>
              <span className="ml-auto text-[19px] font-semibold tabular-nums whitespace-nowrap" style={{ color: '#d8f24a' }}>LKR {fmtCompact(investorPayoutTotal)}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: CARD_BG, borderRadius: 14 }}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[12.5px] font-medium whitespace-nowrap" style={{ color: INK_60 }}>Commission payout</span>
                <span className="text-[11px] whitespace-nowrap" style={{ color: INK_45 }}>Salesmen, this period</span>
              </div>
              <span className="ml-auto text-[14px] font-semibold tabular-nums whitespace-nowrap">LKR {fmtCompact(commissionTotal)}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: CARD_BG, borderRadius: 14 }}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[12.5px] font-medium whitespace-nowrap" style={{ color: INK_60 }}>Other costs</span>
                <span className="text-[11px] whitespace-nowrap" style={{ color: INK_45 }}>Logged against deals, this period</span>
              </div>
              <span className="ml-auto text-[14px] font-semibold tabular-nums whitespace-nowrap">LKR {fmtCompact(otherCostsTotal)}</span>
            </div>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: INK_45 }}>
            Commission and other costs are already reflected in Gross Profit above — shown here for reference, not subtracted again. Packaging, courier, and box costs aren&apos;t tracked in this app yet.
          </p>
        </Card>

        <Card>
          <div className="flex items-baseline gap-2.5">
            <h2 className="m-0 text-[17px] font-semibold tracking-tight">Top performing salesmen</h2>
            <span className="ml-auto text-[12px]" style={{ color: INK_45 }}>Commission paid LKR {fmtCompact(commissionTotal)}</span>
          </div>
          {byManager.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No data for this period.</p>
          ) : (
            <div className="flex flex-col">
              {[...byManager].sort((a, b) => b.sold - a.sold).map((m, i) => (
                <div key={m.manager} className="flex items-center gap-3.5 py-4" style={{ borderTop: i === 0 ? 'none' : `1px solid rgba(20,20,15,.06)` }}>
                  <div className="w-[38px] h-[38px] flex-none rounded-full flex items-center justify-center text-[12.5px] font-semibold" style={{ background: AVATARS[i % AVATARS.length] }}>
                    {initials(m.manager)}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[16px] font-semibold tracking-tight truncate">{m.manager}</span>
                    <span className="text-[12.5px] whitespace-nowrap" style={{ color: INK_45 }}>{m.sold} watches · LKR {fmtCompact(m.totalSales)}</span>
                  </div>
                  <span className="ml-auto text-[16px] font-semibold tabular-nums whitespace-nowrap">{m.commission > 0 ? 'LKR ' + fmtCompact(m.commission) : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          TOP CLIENTS
      ══════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0 text-[17px] font-semibold tracking-tight">Top performing clients</h2>
          <span className="ml-auto text-[12px]" style={{ color: INK_45 }}>By revenue</span>
        </div>
        <div className="text-[13px]">
          <div className="grid text-[11.5px] font-semibold uppercase tracking-wider pb-2.5" style={{ gridTemplateColumns: 'minmax(0,1.4fr) 72px 104px 88px', color: INK_45 }}>
            <div>Client</div>
            <div className="text-right">Watches</div>
            <div className="text-right">Revenue</div>
            <div className="text-right">Type</div>
          </div>
          {top5.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No data for this period.</p>
          ) : top5.map((c, i) => (
            <div key={i} className="grid items-center py-3" style={{ gridTemplateColumns: 'minmax(0,1.4fr) 72px 104px 88px', borderTop: `1px solid rgba(20,20,15,.06)` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 flex-none rounded-full flex items-center justify-center text-[10.5px] font-semibold" style={{ background: AVATARS[(i + 2) % AVATARS.length] }}>
                  {initials(c.name)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold whitespace-nowrap truncate">{c.name}</span>
                  <span className="text-[11.5px] whitespace-nowrap" style={{ color: INK_45 }}>Last buy {daysAgo(c.lastSaleAt)}</span>
                </div>
              </div>
              <div className="text-right tabular-nums">{c.sold}</div>
              <div className="text-right tabular-nums font-semibold whitespace-nowrap">LKR {fmtCompact(c.totalSales)}</div>
              <div className="text-right">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: c.clientType === 'Retail' ? INK_08 : 'rgba(31,111,67,.1)', color: c.clientType === 'Retail' ? INK_60 : GREEN }}>
                  {c.clientType ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
