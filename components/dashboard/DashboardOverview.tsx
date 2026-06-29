'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const TrendChart = dynamic(() => import('./TrendChart'), {
  loading: () => <div className="h-44 bg-[#F7F6F3] rounded-xl animate-pulse" />,
  ssr: false,
})
import {
  type DealRow, type Target, type DateRange, type AgeingWatch,
  filterDeals, getDateBounds, getPrevBounds, computeStats,
  monthlyTrend, salesByBrand, salesByManager, salesByReferral,
  topClients, clubTwbDeals, newVsExisting, targetForPeriod,
  fmtLKR, fmtCompact, pctChange,
} from '@/lib/analytics'
import { useAuth } from '@/context/AuthContext'

const RANGES: { label: string; value: DateRange }[] = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3'     },
  { label: 'Last 6 Months', value: 'last_6'     },
  { label: 'This Year',     value: 'this_year'  },
]

const MGR_COLORS   = ['#64748B', '#0D9488', '#4F46E5', '#BE185D', '#D97706', '#0284C7', '#15803D', '#7C3AED']
const BRAND_COLORS = ['#C9A84C', '#0D9488', '#4F46E5', '#BE185D', '#D97706', '#64748B', '#15803D', '#7C3AED']

const mgrColor   = (i: number) => MGR_COLORS[i % MGR_COLORS.length]
const brandColor = (i: number) => BRAND_COLORS[i % BRAND_COLORS.length]

function formatRevenue(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MiniBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div className="h-1 bg-[#E8E6E1] rounded-full overflow-hidden mt-2">
      <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1 bg-[#E8E6E1] rounded-full overflow-hidden">
      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function AchievePill({ value, target }: { value: number; target: number }) {
  if (target === 0) return null
  const pct = (value / target) * 100
  const cls = pct >= 100
    ? 'bg-[#DCFCE7] text-[#16A34A]'
    : pct >= 60
    ? 'bg-[#FEF3C7] text-[#D97706]'
    : 'bg-[#FEE2E2] text-[#DC2626]'
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {pct.toFixed(0)}% of target
    </span>
  )
}

function ChangePill({ current, prev }: { current: number; prev: number }) {
  const chg = pctChange(current, prev)
  if (chg == null) return null
  const pos = chg >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pos ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
      {pos ? '↑' : '↓'}{Math.abs(chg).toFixed(1)}% vs prev
    </span>
  )
}

function AbsChangePill({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev
  const sign = diff >= 0 ? '+' : '−'
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F2EF] text-[#6B6B6B]">
      {sign}LKR {fmtCompact(Math.abs(diff))} vs prev
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 card-hover ${className}`} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-[0.15em] mb-3">
      {children}
    </p>
  )
}

function Empty({ msg = 'No data for this period.' }: { msg?: string }) {
  return <p className="text-[13px] text-[#9CA3AF]">{msg}</p>
}


export default function DashboardOverview({
  deals,
  inventoryValue,
  targets,
  ageingWatches = [],
}: {
  deals: DealRow[]
  inventoryValue: number
  targets: Target[]
  sourceSummary?: { source: string; count: number; revenue: number }[]
  ageingWatches?: AgeingWatch[]
}) {
  const [range, setRange]         = useState<DateRange>('this_month')
  const [hoveredMgr, setHoveredMgr] = useState<number | null>(null)
  const { profile } = useAuth()

  const [start, end]         = getDateBounds(range)
  const [prevStart, prevEnd] = getPrevBounds(range)

  const current   = filterDeals(deals, start, end)
  const prev      = filterDeals(deals, prevStart, prevEnd)
  const curStats  = computeStats(current)
  const prevStats = computeStats(prev)

  const getTarget = (metric: string) => targets.find(t => t.metric === metric)?.target_value ?? 0
  const tSold  = targetForPeriod(getTarget('watches_sold'), range)
  const tSales = targetForPeriod(getTarget('total_sales'),  range)
  const tGP    = targetForPeriod(getTarget('gross_profit'), range)
  const GP_PCT_TARGET = 30

  const trend      = monthlyTrend(deals, 6)
  const byBrand    = salesByBrand(current)
  const byManager  = salesByManager(current)
  const byReferral = salesByReferral(current)
  const top5       = topClients(current, 5)
  const clubTwb    = clubTwbDeals(current)
  const nve        = newVsExisting(current)

  const totalMgrRevenue  = byManager.reduce((s, m) => s + m.totalSales, 0)
  const totalBrandRevenue = byBrand.reduce((s, b) => s + b.totalSales, 0)
  const maxRefSales       = Math.max(...byReferral.map(r => r.totalSales), 1)
  const maxClientSales    = Math.max(...top5.map(c => c.totalSales), 1)

  const rangeLabel = RANGES.find(r => r.value === range)?.label ?? ''

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-5">

      {/* ── Greeting + range selector ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#111111]">{greeting}, {firstName}</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            {new Date().toLocaleDateString('en-LK', { dateStyle: 'full' })}
          </p>
        </div>
        <div className="overflow-x-auto -mx-1 px-1 self-start md:self-auto">
          <div className="inline-flex gap-1 bg-[#EDECE9] rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors flex-shrink-0 ${
                  range === r.value
                    ? 'bg-white shadow-sm text-[#111111]'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — REVENUE HERO
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">

        {/* Left: big number */}
        <div className="flex-1 min-w-0 py-2">
          <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-[0.15em] mb-2">Revenue</p>
          <div className="flex items-baseline flex-wrap">
            <span className="text-[32px] md:text-[48px] font-bold text-[#111111] tabular-nums leading-none tracking-tight">
              LKR&nbsp;{formatRevenue(curStats.totalSales)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <AchievePill value={curStats.totalSales} target={tSales} />
            <ChangePill  current={curStats.totalSales} prev={prevStats.totalSales} />
            <AbsChangePill current={curStats.totalSales} prev={prevStats.totalSales} />
          </div>
        </div>

        {/* Right: 3 mini KPI cards */}
        <div className="grid grid-cols-3 gap-3 lg:w-[58%] lg:shrink-0">

          {/* Watches Sold */}
          <div className="bg-white rounded-2xl p-4 animate-scale-in card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)', animationDelay: '0s', opacity: 0 }}>
            <p className="text-[9px] font-semibold text-[#6B6B6B] uppercase tracking-[0.12em] mb-2 leading-tight">Watches Sold</p>
            <p className="text-[30px] font-bold text-[#111111] tabular-nums leading-none">{curStats.watchesSold}</p>
            {tSold > 0 && (
              <p className="text-[10px] text-[#9CA3AF] mt-1">of {Math.round(tSold)} target</p>
            )}
            <MiniBar value={curStats.watchesSold} target={tSold} />
            <div className="mt-2">
              <AchievePill value={curStats.watchesSold} target={tSold} />
            </div>
          </div>

          {/* GP Margin */}
          <div className="bg-white rounded-2xl p-4 animate-scale-in card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)', animationDelay: '0.08s', opacity: 0 }}>
            <p className="text-[9px] font-semibold text-[#6B6B6B] uppercase tracking-[0.12em] mb-2 leading-tight">GP Margin</p>
            <p className="text-[30px] font-bold text-[#111111] tabular-nums leading-none">{curStats.gpMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">of {GP_PCT_TARGET}% target</p>
            <MiniBar value={curStats.gpMargin} target={GP_PCT_TARGET} />
            <div className="mt-2">
              <AchievePill value={curStats.gpMargin} target={GP_PCT_TARGET} />
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white rounded-2xl p-4 animate-scale-in card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)', animationDelay: '0.16s', opacity: 0 }}>
            <p className="text-[9px] font-semibold text-[#6B6B6B] uppercase tracking-[0.12em] mb-2 leading-tight">Gross Profit</p>
            <p className="text-[30px] font-bold text-[#111111] tabular-nums leading-none">LKR {fmtCompact(curStats.grossProfit)}</p>
            {tGP > 0 && (
              <p className="text-[10px] text-[#9CA3AF] mt-1">of LKR {fmtCompact(tGP)} target</p>
            )}
            <MiniBar value={curStats.grossProfit} target={tGP} />
            <div className="mt-2">
              <AchievePill value={curStats.grossProfit} target={tGP} />
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — SALES REPS HORIZONTAL BAR
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-[0.15em]">Sales Performance</p>
          <span className="text-[11px] text-[#9CA3AF]">{rangeLabel}</span>
        </div>

        {byManager.length === 0 ? (
          <Empty />
        ) : (
          <>
            {/* Segmented bar */}
            <div className="relative">
              <div className="flex h-8 rounded-xl overflow-hidden gap-px bg-[#F3F2EF]">
                {byManager.map((m, i) => {
                  const pct = totalMgrRevenue > 0 ? (m.totalSales / totalMgrRevenue) * 100 : 0
                  return (
                    <div
                      key={m.manager}
                      style={{ width: `${pct}%`, backgroundColor: mgrColor(i) }}
                      className="relative cursor-pointer transition-opacity hover:opacity-80"
                      onMouseEnter={() => setHoveredMgr(i)}
                      onMouseLeave={() => setHoveredMgr(null)}
                    />
                  )
                })}
              </div>

              {/* Hover tooltip */}
              {hoveredMgr !== null && byManager[hoveredMgr] && (
                <div className="absolute -top-[68px] left-1/2 -translate-x-1/2 bg-[#111111] text-white rounded-xl px-3 py-2.5 text-xs shadow-xl pointer-events-none z-20 whitespace-nowrap">
                  <p className="font-semibold mb-1" style={{ color: mgrColor(hoveredMgr) }}>
                    {byManager[hoveredMgr].manager}
                  </p>
                  <p className="text-[#D1D5DB]">{fmtLKR(byManager[hoveredMgr].totalSales)} · {byManager[hoveredMgr].sold} {byManager[hoveredMgr].sold === 1 ? 'watch' : 'watches'}</p>
                  <p className="text-[#9CA3AF]">Commission: {fmtLKR(byManager[hoveredMgr].commission)}</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-[#F3F2EF]">
              {byManager.map((m, i) => {
                const pct = totalMgrRevenue > 0 ? (m.totalSales / totalMgrRevenue) * 100 : 0
                return (
                  <div key={m.manager} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mgrColor(i) }} />
                    <span className="text-[12px] font-medium text-[#111111]">{m.manager}</span>
                    <span className="text-[11px] text-[#9CA3AF] tabular-nums">{fmtLKR(m.totalSales)}</span>
                    <span className="text-[10px] font-semibold text-[#6B6B6B] bg-[#F3F2EF] px-1.5 py-0.5 rounded-full">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — BENTO ANALYTICS GRID
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* CARD A — BY BRAND (5 cols) */}
        <Card className="md:col-span-5">
          <CardLabel>By Brand</CardLabel>
          {byBrand.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {byBrand.slice(0, 5).map((b, i) => {
                const pct = totalBrandRevenue > 0 ? (b.totalSales / totalBrandRevenue) * 100 : 0
                return (
                  <div key={b.brand}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor(i) }} />
                      <span className="text-[12px] font-medium text-[#111111] flex-1 truncate">{b.brand}</span>
                      <span className="text-[12px] text-[#6B6B6B] tabular-nums">{fmtLKR(b.totalSales)}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F2EF] text-[#6B6B6B] min-w-[36px] text-center">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-[3px] bg-[#E8E6E1] rounded-sm overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-sm" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* CARD B — TOP CLIENTS (4 cols) */}
        <Card className="md:col-span-4">
          <CardLabel>Top Clients</CardLabel>
          {top5.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {top5.map((c, i) => {
                const pct = maxClientSales > 0 ? (c.totalSales / maxClientSales) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#C9A84C] w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-[12px] font-medium text-[#111111] truncate">{c.name}</span>
                        {c.clientType && (
                          <span className="text-[9px] text-[#9CA3AF] bg-[#F3F2EF] px-1.5 py-0.5 rounded-full flex-shrink-0">{c.clientType}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#6B6B6B] tabular-nums flex-shrink-0 ml-2">{fmtLKR(c.totalSales)}</span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* CARD C — NEW vs EXISTING (3 cols) */}
        <Card className="md:col-span-3">
          <CardLabel>New vs Existing</CardLabel>
          {nve[0].sold + nve[1].sold === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {nve.map((row, i) => {
                const total = nve[0].sold + nve[1].sold
                const pct   = total > 0 ? (row.sold / total) * 100 : 0
                const color = i === 0 ? '#C9A84C' : '#CBD5E1'
                return (
                  <div key={row.type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-[12px] font-medium text-[#111111]">{row.type}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#6B6B6B]">{pct.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] pl-4">{row.sold} sold · {fmtLKR(row.totalSales)}</p>
                  </div>
                )
              })}
              {/* Stacked bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden mt-1">
                {nve.map((row, i) => {
                  const total = nve[0].sold + nve[1].sold
                  const pct   = total > 0 ? (row.sold / total) * 100 : 0
                  return (
                    <div key={i} style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#C9A84C' : '#CBD5E1' }} />
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* CARD D1 — SALES TREND (6 cols) */}
        <Card className="md:col-span-6">
          <CardLabel>Sales Trend — Last 6 Months</CardLabel>
          <TrendChart data={trend} dataKey="sales" name="Sales" stroke="#C9A84C" />
        </Card>

        {/* CARD D2 — GROSS PROFIT TREND (6 cols) */}
        <Card className="md:col-span-6">
          <CardLabel>Gross Profit Trend — Last 6 Months</CardLabel>
          <TrendChart data={trend} dataKey="gp" name="Gross Profit" stroke="#16A34A" />
        </Card>

        {/* CARD E — LEAD SOURCE (4 cols) */}
        <Card className="md:col-span-4">
          <CardLabel>Lead Source</CardLabel>
          {byReferral.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {byReferral.map((r, i) => {
                const pct = maxRefSales > 0 ? (r.totalSales / maxRefSales) * 100 : 0
                return (
                  <div key={r.source}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor(i) }} />
                        <span className="text-[12px] font-medium text-[#111111]">{r.source}</span>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] tabular-nums">{r.count} · {fmtLKR(r.avgSale)} avg</span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* CARD F — COMMISSION SUMMARY (6 cols) */}
        <Card className="md:col-span-6">
          <CardLabel>Commission Summary</CardLabel>
          {byManager.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F3F2EF]">
                  <th className="text-left font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pr-3 text-[9px]">Manager</th>
                  <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Sold</th>
                  <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Sales</th>
                  <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pl-2 text-[9px]">Commission</th>
                </tr>
              </thead>
              <tbody>
                {[...byManager].sort((a, b) => b.sold - a.sold).map((m, i) => (
                  <tr key={i} className="border-b border-[#F7F6F3] last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mgrColor(i) }} />
                        <span className="font-medium text-[#111111] truncate max-w-[90px]">{m.manager}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#6B6B6B]">{m.sold}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-[#6B6B6B]">{fmtLKR(m.totalSales)}</td>
                    <td className="py-2.5 pl-2 text-right font-semibold tabular-nums text-[#111111]">{fmtLKR(m.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* CARD G — CLUB TWB (6 cols) */}
        <Card className="md:col-span-6">
          <CardLabel>Club TWB</CardLabel>
          {clubTwb.length === 0 ? (
            <Empty msg="No Club TWB sales this period." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F3F2EF]">
                  <th className="text-left font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pr-3 text-[9px]">Client</th>
                  <th className="text-center font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Type</th>
                  <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Sold</th>
                  <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pl-2 text-[9px]">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...clubTwb].sort((a, b) => b.totalSales - a.totalSales).map((c, i) => (
                  <tr key={i} className="border-b border-[#F7F6F3] last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-[#111111] truncate max-w-[120px]">{c.name}</td>
                    <td className="py-2.5 px-2 text-center text-[#6B6B6B]">{c.clientType ?? '—'}</td>
                    <td className="py-2.5 px-2 text-right text-[#6B6B6B]">{c.sold}</td>
                    <td className="py-2.5 pl-2 text-right font-medium tabular-nums text-[#111111]">{fmtLKR(c.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Inventory value footer card */}
        <div
          className="md:col-span-12 bg-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
        >
          <div>
            <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-[0.15em] mb-1">Inventory Value</p>
            <p className="text-[22px] font-bold text-[#111111] tabular-nums">{fmtLKR(inventoryValue)}</p>
          </div>
          <p className="text-[11px] text-[#9CA3AF]">Available, on-hold &amp; offered watches</p>
        </div>

        {/* AGEING INVENTORY — full width */}
        <Card className="md:col-span-12">
          <div className="flex items-baseline gap-3 mb-4">
            <CardLabel>Ageing Inventory</CardLabel>
            <p className="text-[11px] text-[#9CA3AF] -mt-3">Watches in stock over 60 days</p>
          </div>
          {ageingWatches.length === 0 ? (
            <div className="flex items-center gap-2 text-[#16A34A]">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[13px] font-medium">No ageing inventory — all watches added within 60 days</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F3F2EF]">
                    <th className="text-left font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pr-3 text-[9px]">Watch</th>
                    <th className="text-left font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Brand</th>
                    <th className="text-left font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Condition</th>
                    <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 px-2 text-[9px]">Days in Stock</th>
                    <th className="text-right font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] pb-2 pl-2 text-[9px]">Asking Price</th>
                  </tr>
                </thead>
                <tbody>
                  {ageingWatches.map(w => {
                    const refDate = w.date_acquired ?? w.created_at
                    const days = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
                    const daysColor = days >= 120 ? 'text-[#DC2626]' : days >= 90 ? 'text-[#EA580C]' : 'text-[#D97706]'
                    return (
                      <tr key={w.id} className="border-b border-[#F7F6F3] last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-[#111111] max-w-[180px] truncate">{w.watch_name}</td>
                        <td className="py-2.5 px-2 text-[#6B6B6B]">{w.brands?.name ?? '—'}</td>
                        <td className="py-2.5 px-2 text-[#6B6B6B]">{w.condition ?? '—'}</td>
                        <td className={`py-2.5 px-2 text-right font-semibold tabular-nums ${daysColor}`}>{days}d</td>
                        <td className="py-2.5 pl-2 text-right font-medium tabular-nums text-[#111111]">
                          {w.selling_price ? fmtLKR(w.selling_price) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
