'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import {
  type DealRow, type Target, type DateRange,
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

const DONUT_COLORS = ['#C9A84C', '#E8E6E1']

function Sparkbar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-20 h-1.5 bg-[#F3F2EF] rounded-full overflow-hidden">
      <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function PctBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="text-xs text-text-muted">—</span>
  const pos = inverse ? value <= 0 : value >= 0
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pos ? 'bg-[#DCFCE7] text-positive' : 'bg-[#FEE2E2] text-negative'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

function TargetBadge({ actual, target }: { actual: number; target: number }) {
  if (target === 0) return null
  const pct = (actual / target) * 100
  const color = pct >= 100 ? 'text-positive bg-[#DCFCE7]' : pct >= 70 ? 'text-[#D97706] bg-[#FEF3C7]' : 'text-negative bg-[#FEE2E2]'
  return (
    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${color}`}>
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
    <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.1em] mb-3">{label}</p>
      <p className="text-[28px] font-bold text-text-primary tabular-nums leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-text-muted mb-2">{sub}</p>}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <TargetBadge actual={actual} target={target} />
        <PctBadge value={change} />
        <span className="text-[10px] text-text-muted">vs prev</span>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-text-primary mb-1">{children}</h2>
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-xl p-5 ${className}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>{children}</div>
}

interface ChartEntry { name: string; value: number | string; color: string }
function ChartTooltipLKR({ active, payload, label }: { active?: boolean; payload?: ChartEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-text-secondary mb-1.5">{label}</p>
      {payload.map((p) => (
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
  sourceSummary?: { source: string; count: number; revenue: number }[]
}) {
  const [range, setRange] = useState<DateRange>('this_month')
  const [mounted, setMounted] = useState(false)
  const { profile } = useAuth()

  useEffect(() => setMounted(true), [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

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

  const maxRefSales   = Math.max(...byReferral.map(r => r.totalSales), 1)
  const maxClientSales = Math.max(...top5.map(c => c.totalSales), 1)
  const maxMgrComm     = Math.max(...byManager.map(m => m.commission), 1)

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{greeting}, {firstName}</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {new Date().toLocaleDateString('en-LK', { dateStyle: 'full' })}
          </p>
        </div>
        <div className="overflow-x-auto -mx-1 px-1 self-start">
          <div className="inline-flex gap-1 bg-[#F3F2EF] rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                  range === r.value ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bento Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* ROW 1 — KPI Cards (3 cols each) */}
        <div className="md:col-span-3">
          <KPICard
            label="Watches Sold"
            value={curStats.watchesSold.toString()}
            target={tSold}
            actual={curStats.watchesSold}
            prevActual={prevStats.watchesSold}
          />
        </div>
        <div className="md:col-span-3">
          <KPICard
            label="Total Sales"
            value={'LKR ' + fmtCompact(curStats.totalSales)}
            sub={fmtLKR(curStats.totalSales)}
            target={tSales}
            actual={curStats.totalSales}
            prevActual={prevStats.totalSales}
          />
        </div>
        <div className="md:col-span-3">
          <KPICard
            label="Gross Profit"
            value={'LKR ' + fmtCompact(curStats.grossProfit)}
            sub={fmtLKR(curStats.grossProfit)}
            target={tGP}
            actual={curStats.grossProfit}
            prevActual={prevStats.grossProfit}
          />
        </div>
        <div className="md:col-span-3">
          <KPICard
            label="Inventory Value"
            value={'LKR ' + fmtCompact(inventoryValue)}
            sub={fmtLKR(inventoryValue)}
            target={0}
            actual={inventoryValue}
            prevActual={0}
          />
        </div>

        {/* ROW 2 — Trend Charts (7 + 5) */}
        <Card className="md:col-span-7">
          <SectionTitle>Sales Trend (last 6 months)</SectionTitle>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F2EF" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#C9A84C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 bg-[#F7F6F3] rounded-xl animate-pulse" />}
        </Card>
        <Card className="md:col-span-5">
          <SectionTitle>Gross Profit Trend (last 6 months)</SectionTitle>
          {mounted ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F2EF" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Line type="monotone" dataKey="gp" name="Gross Profit" stroke="#16A34A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 bg-[#F7F6F3] rounded-xl animate-pulse" />}
        </Card>

        {/* ROW 3 — Brand (5) + Manager (7) */}
        <Card className="md:col-span-5">
          <SectionTitle>Sales by Brand</SectionTitle>
          {byBrand.length === 0 ? (
            <p className="text-sm text-text-muted">No data for this period.</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={Math.max(160, byBrand.length * 36)}>
              <BarChart layout="vertical" data={byBrand} margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis type="category" dataKey="brand" width={80} tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Bar dataKey="totalSales" name="Total Sales" fill="#C9A84C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 bg-[#F7F6F3] rounded-xl animate-pulse" />}
          {byBrand.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              {byBrand.slice(0, 5).map(b => (
                <div key={b.brand} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary truncate max-w-[120px]">{b.brand}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{b.sold} sold</span>
                    <span className="font-medium text-text-primary tabular-nums">{fmtLKR(b.gp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="md:col-span-7">
          <SectionTitle>Sales by Manager</SectionTitle>
          {byManager.length === 0 ? (
            <p className="text-sm text-text-muted">No data for this period.</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={Math.max(160, byManager.length * 48)}>
              <BarChart data={byManager} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F2EF" vertical={false} />
                <XAxis dataKey="manager" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} width={48} />
                <Tooltip content={<ChartTooltipLKR />} />
                <Bar dataKey="totalSales" name="Total Sales" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 bg-[#F7F6F3] rounded-xl animate-pulse" />}
          {byManager.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              {byManager.map(m => (
                <div key={m.manager} className="flex items-center justify-between text-xs">
                  <span className="text-text-primary font-medium truncate max-w-[120px]">{m.manager}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{m.sold} sold</span>
                    <span className="text-text-muted">comm: {fmtLKR(m.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ROW 4 — New/Existing (4) + Referral (4) + Top Clients (4) */}
        <Card className="md:col-span-4">
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
                      <span className="text-xs font-medium text-text-primary">{row.type}</span>
                    </div>
                    <p className="text-xs text-text-muted pl-3.5">{row.sold} sold · {fmtLKR(row.totalSales)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : !mounted ? (
            <div className="h-24 bg-[#F7F6F3] rounded-xl animate-pulse" />
          ) : (
            <p className="text-sm text-text-muted">No data.</p>
          )}
        </Card>
        <Card className="md:col-span-4">
          <SectionTitle>Referral Source</SectionTitle>
          {byReferral.length === 0 ? (
            <p className="text-sm text-text-muted">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {byReferral.map(r => (
                <div key={r.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary">{r.source}</span>
                    <span className="text-xs text-text-secondary">{r.count} · {fmtLKR(r.avgSale)} avg</span>
                  </div>
                  <Sparkbar value={r.totalSales} max={maxRefSales} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="md:col-span-4">
          <SectionTitle>Top 5 Clients</SectionTitle>
          {top5.length === 0 ? (
            <p className="text-sm text-text-muted">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {top5.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs font-medium text-text-primary">{c.name}</span>
                      {c.clientType && <span className="ml-1.5 text-[10px] text-text-muted">{c.clientType}</span>}
                    </div>
                    <span className="text-xs text-text-secondary">{c.sold} · {fmtLKR(c.totalSales)}</span>
                  </div>
                  <Sparkbar value={c.totalSales} max={maxClientSales} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ROW 5 — Club TWB (6) + Commission (6) */}
        <Card className="md:col-span-6">
          <SectionTitle>Club TWB Clients This Period</SectionTitle>
          {clubTwb.length === 0 ? (
            <p className="text-sm text-text-muted">No Club TWB sales this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-text-muted uppercase tracking-[0.08em] py-2 pr-3">Name</th>
                    <th className="text-center font-medium text-text-muted uppercase tracking-[0.08em] py-2 px-2">Type</th>
                    <th className="text-right font-medium text-text-muted uppercase tracking-[0.08em] py-2 px-2">Sold</th>
                    <th className="text-right font-medium text-text-muted uppercase tracking-[0.08em] py-2 pl-2">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {clubTwb.map((c, i) => (
                    <tr key={i} className="border-b border-[#F3F2EF] last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-text-primary truncate max-w-[120px]">{c.name}</td>
                      <td className="py-2.5 px-2 text-center text-text-muted">{c.clientType ?? '—'}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{c.sold}</td>
                      <td className="py-2.5 pl-2 text-right font-medium tabular-nums text-text-primary">{fmtLKR(c.totalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="md:col-span-6">
          <SectionTitle>Commission Summary</SectionTitle>
          {byManager.length === 0 ? (
            <p className="text-sm text-text-muted">No data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-text-muted uppercase tracking-[0.08em] py-2 pr-3">Manager</th>
                    <th className="text-right font-medium text-text-muted uppercase tracking-[0.08em] py-2 px-2">Sold</th>
                    <th className="text-right font-medium text-text-muted uppercase tracking-[0.08em] py-2 px-2">Sales</th>
                    <th className="text-right font-medium text-text-muted uppercase tracking-[0.08em] py-2 pl-2">Commission</th>
                    <th className="py-2 pl-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {byManager.map((m, i) => (
                    <tr key={i} className="border-b border-[#F3F2EF] last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-text-primary truncate max-w-[100px]">{m.manager}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{m.sold}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-text-secondary">{fmtLKR(m.totalSales)}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold tabular-nums text-text-primary">{fmtLKR(m.commission)}</td>
                      <td className="py-2.5 pl-3"><Sparkbar value={m.commission} max={maxMgrComm} /></td>
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
