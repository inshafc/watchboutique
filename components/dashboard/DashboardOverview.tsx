'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import {
  type DealRow, type Target, type DateRange,
  filterDeals, getDateBounds, getPrevBounds, computeStats, computeGP,
  monthlyTrend, salesByBrand, salesByManager, salesByReferral,
  topClients, clubTwbDeals, newVsExisting, targetForPeriod,
  fmtLKR, fmtCompact, pctChange,
} from '@/lib/analytics'

const RANGES: { label: string; value: DateRange }[] = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3'     },
  { label: 'Last 6 Months', value: 'last_6'     },
  { label: 'This Year',     value: 'this_year'  },
]

const DONUT_COLORS = ['#111827', '#d1d5db']

function Sparkbar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-gray-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function PctBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="text-xs text-gray-300">—</span>
  const pos = inverse ? value <= 0 : value >= 0
  return (
    <span className={`text-xs font-medium ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

function TargetBadge({ actual, target }: { actual: number; target: number }) {
  if (target === 0) return null
  const pct = (actual / target) * 100
  const color = pct >= 100 ? 'text-emerald-600 bg-emerald-50' : pct >= 70 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50'
  return (
    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${color}`}>
      {pct.toFixed(0)}% of target
    </span>
  )
}

function KPICard({
  label, value, sub, target, actual, prevActual,
}: {
  label: string
  value: string
  sub?: string
  target: number
  actual: number
  prevActual: number
}) {
  const change = pctChange(actual, prevActual)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mb-2">{sub}</p>}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <TargetBadge actual={actual} target={target} />
        <PctBadge value={change} />
        <span className="text-[10px] text-gray-300">vs prev</span>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-700 mb-3">{children}</h2>
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
}

function ChartTooltipLKR({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-500 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmtLKR(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardOverview({
  deals,
  inventoryValue,
  targets,
}: {
  deals: DealRow[]
  inventoryValue: number
  targets: Target[]
}) {
  const [range, setRange] = useState<DateRange>('this_month')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [start, end]         = getDateBounds(range)
  const [prevStart, prevEnd] = getPrevBounds(range)

  const current  = filterDeals(deals, start, end)
  const prev     = filterDeals(deals, prevStart, prevEnd)
  const curStats = computeStats(current)
  const prevStats = computeStats(prev)

  const getTarget = (metric: string) => targets.find(t => t.metric === metric)?.target_value ?? 0
  const tSold = targetForPeriod(getTarget('watches_sold'), range)
  const tSales = targetForPeriod(getTarget('total_sales'), range)
  const tGP    = targetForPeriod(getTarget('gross_profit'), range)

  const trend      = monthlyTrend(deals, 6)
  const byBrand    = salesByBrand(current)
  const byManager  = salesByManager(current)
  const byReferral = salesByReferral(current)
  const top5       = topClients(current, 5)
  const clubTwb    = clubTwbDeals(current)
  const nve        = newVsExisting(current)

  const maxBrandSales = Math.max(...byBrand.map(b => b.totalSales), 1)
  const maxMgrSales   = Math.max(...byManager.map(m => m.totalSales), 1)
  const maxRefSales   = Math.max(...byReferral.map(r => r.totalSales), 1)
  const maxClientSales = Math.max(...top5.map(c => c.totalSales), 1)
  const maxClubSales   = Math.max(...clubTwb.map(c => c.totalSales), 1)
  const maxMgrComm     = Math.max(...byManager.map(m => m.commission), 1)

  return (
    <div className="px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Imad</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-LK', { dateStyle: 'full' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 self-start">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 1 — KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Watches Sold"
          value={curStats.watchesSold.toString()}
          target={tSold}
          actual={curStats.watchesSold}
          prevActual={prevStats.watchesSold}
        />
        <KPICard
          label="Total Sales"
          value={'LKR ' + fmtCompact(curStats.totalSales)}
          sub={fmtLKR(curStats.totalSales)}
          target={tSales}
          actual={curStats.totalSales}
          prevActual={prevStats.totalSales}
        />
        <KPICard
          label="Gross Profit"
          value={'LKR ' + fmtCompact(curStats.grossProfit)}
          sub={fmtLKR(curStats.grossProfit)}
          target={tGP}
          actual={curStats.grossProfit}
          prevActual={prevStats.grossProfit}
        />
        <KPICard
          label="Inventory Value"
          value={'LKR ' + fmtCompact(inventoryValue)}
          sub={fmtLKR(inventoryValue)}
          target={0}
          actual={inventoryValue}
          prevActual={0}
        />
      </div>

      {/* ── ROW 2 — Trend Charts ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Sales Trend (last 6 months)</SectionTitle>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#111827" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}
        </Card>
        <Card>
          <SectionTitle>Gross Profit Trend (last 6 months)</SectionTitle>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Line type="monotone" dataKey="gp" name="Gross Profit" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}
        </Card>
      </div>

      {/* ── ROW 3 — Brand + Manager ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Sales by Brand</SectionTitle>
          {byBrand.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={Math.max(160, byBrand.length * 36)}>
              <BarChart layout="vertical" data={byBrand} margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="brand" width={80} tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Bar dataKey="totalSales" name="Total Sales" fill="#111827" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}
          {byBrand.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
              {byBrand.slice(0, 5).map(b => (
                <div key={b.brand} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 truncate max-w-[120px]">{b.brand}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{b.sold} sold</span>
                    <span className="font-medium text-gray-900 tabular-nums">{fmtLKR(b.gp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle>Sales by Manager</SectionTitle>
          {byManager.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={Math.max(160, byManager.length * 48)}>
              <BarChart data={byManager} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="manager" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Bar dataKey="totalSales" name="Total Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}
          {byManager.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
              {byManager.map(m => (
                <div key={m.manager} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium truncate max-w-[120px]">{m.manager}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{m.sold} sold</span>
                    <span className="text-gray-400">comm: {fmtLKR(m.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── ROW 4 — New/Existing + Referral + Top Clients ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New vs Existing */}
        <Card>
          <SectionTitle>New vs Existing Customers</SectionTitle>
          {mounted && nve[0].sold + nve[1].sold > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie data={nve} dataKey="sold" innerRadius={24} outerRadius={38} paddingAngle={2} startAngle={90} endAngle={-270}>
                    {nve.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {nve.map((row, i) => (
                  <div key={row.type}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                      <span className="text-xs font-medium text-gray-700">{row.type}</span>
                    </div>
                    <p className="text-xs text-gray-400 pl-3.5">{row.sold} sold · {fmtLKR(row.totalSales)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : !mounted ? (
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <p className="text-sm text-gray-400">No data.</p>
          )}
        </Card>

        {/* Referral Source */}
        <Card>
          <SectionTitle>Referral Source</SectionTitle>
          {byReferral.length === 0 ? (
            <p className="text-sm text-gray-400">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {byReferral.map(r => (
                <div key={r.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{r.source}</span>
                    <span className="text-xs text-gray-500">{r.count} · {fmtLKR(r.avgSale)} avg</span>
                  </div>
                  <Sparkbar value={r.totalSales} max={maxRefSales} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top 5 Clients */}
        <Card>
          <SectionTitle>Top 5 Clients</SectionTitle>
          {top5.length === 0 ? (
            <p className="text-sm text-gray-400">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {top5.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs font-medium text-gray-800">{c.name}</span>
                      {c.clientType && <span className="ml-1.5 text-[10px] text-gray-400">{c.clientType}</span>}
                    </div>
                    <span className="text-xs text-gray-500">{c.sold} · {fmtLKR(c.totalSales)}</span>
                  </div>
                  <Sparkbar value={c.totalSales} max={maxClientSales} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── ROW 5 — Club TWB + Commission ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Club TWB */}
        <Card>
          <SectionTitle>Club TWB Clients This Period</SectionTitle>
          {clubTwb.length === 0 ? (
            <p className="text-sm text-gray-400">No Club TWB sales this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-400 py-2 pr-3">Name</th>
                    <th className="text-center font-medium text-gray-400 py-2 px-2">Type</th>
                    <th className="text-right font-medium text-gray-400 py-2 px-2">Sold</th>
                    <th className="text-right font-medium text-gray-400 py-2 pl-2">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {clubTwb.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[120px]">{c.name}</td>
                      <td className="py-2 px-2 text-center text-gray-400">{c.clientType ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-gray-700">{c.sold}</td>
                      <td className="py-2 pl-2 text-right font-medium tabular-nums text-gray-900">{fmtLKR(c.totalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Commission Summary */}
        <Card>
          <SectionTitle>Commission Summary</SectionTitle>
          {byManager.length === 0 ? (
            <p className="text-sm text-gray-400">No data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-400 py-2 pr-3">Manager</th>
                    <th className="text-right font-medium text-gray-400 py-2 px-2">Sold</th>
                    <th className="text-right font-medium text-gray-400 py-2 px-2">Sales</th>
                    <th className="text-right font-medium text-gray-400 py-2 pl-2">Commission</th>
                    <th className="py-2 pl-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {byManager.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[100px]">{m.manager}</td>
                      <td className="py-2 px-2 text-right text-gray-700">{m.sold}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtLKR(m.totalSales)}</td>
                      <td className="py-2 pl-2 text-right font-semibold tabular-nums text-gray-900">{fmtLKR(m.commission)}</td>
                      <td className="py-2 pl-3"><Sparkbar value={m.commission} max={maxMgrComm} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
