'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import {
  type DealRow, type Target, type DateRange,
  filterDeals, getDateBounds, getPrevBounds, computeStats, computeGP,
  salesByBrand, salesByManager, salesByReferral, topClients, clubTwbDeals, newVsExisting,
  targetForPeriod, fmtLKR, fmtCompact, pctChange,
} from '@/lib/analytics'

const RANGES: { label: string; value: DateRange }[] = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3'     },
  { label: 'Last 6 Months', value: 'last_6'     },
  { label: 'This Year',     value: 'this_year'  },
]

const DONUT_COLORS = ['#111827', '#d1d5db']

const METRIC_LABELS: Record<string, string> = {
  watches_sold:   'Watches Sold Target',
  total_sales:    'Total Sales Target (LKR)',
  gross_profit:   'Gross Profit Target (LKR)',
  reseller_split: 'Reseller Split % Target',
  gp_margin:      'GP Margin % Target',
}

function Sparkbar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-gray-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function AchievedBadge({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'text-emerald-700 bg-emerald-50' : pct >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{pct.toFixed(1)}%</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-800 mb-4">{children}</h2>
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
}

function StatCard({ label, actual, target, range }: { label: string; actual: number; target: number; range: DateRange }) {
  const t = targetForPeriod(target, range)
  const pct = t > 0 ? (actual / t) * 100 : 0
  const color = pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight">
        {actual > 999 ? fmtLKR(actual) : actual.toFixed(actual % 1 === 0 ? 0 : 1)}
      </p>
      {t > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Target: {actual > 999 ? fmtLKR(t) : t.toFixed(0)}</span>
            <span className={`font-semibold ${color}`}>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
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

export default function AnalyticsView({
  deals,
  targets,
}: {
  deals: DealRow[]
  targets: Target[]
}) {
  const [range, setRange]     = useState<DateRange>('this_month')
  const [mounted, setMounted] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const currentYear = new Date().getFullYear()

  // Targets form state — init from props
  const getT = (metric: string) => targets.find(t => t.metric === metric)?.target_value ?? 0
  const [tForm, setTForm] = useState({
    watches_sold:   String(getT('watches_sold')),
    total_sales:    String(getT('total_sales')),
    gross_profit:   String(getT('gross_profit')),
    reseller_split: String(getT('reseller_split')),
    gp_margin:      String(getT('gp_margin')),
  })

  useEffect(() => setMounted(true), [])

  const [start, end] = getDateBounds(range)
  const current      = filterDeals(deals, start, end)
  const curStats     = computeStats(current)

  const getTarget     = (metric: string) => targets.find(t => t.metric === metric)?.target_value ?? 0
  const annualTargets = {
    watches_sold: getTarget('watches_sold'),
    total_sales:  getTarget('total_sales'),
    gross_profit: getTarget('gross_profit'),
  }

  const byBrand    = salesByBrand(current)
  const byManager  = salesByManager(current)
  const byReferral = salesByReferral(current)
  const top        = topClients(current)
  const club       = clubTwbDeals(current)
  const nve        = newVsExisting(current)

  const maxBrand   = Math.max(...byBrand.map(b => b.totalSales), 1)
  const maxMgr     = Math.max(...byManager.map(m => m.totalSales), 1)
  const maxRef     = Math.max(...byReferral.map(r => r.totalSales), 1)
  const maxClient  = Math.max(...top.map(c => c.totalSales), 1)
  const maxClub    = Math.max(...club.map(c => c.totalSales), 1)
  const maxMgrComm = Math.max(...byManager.map(m => m.commission), 1)

  const tSold   = targetForPeriod(annualTargets.watches_sold, range)
  const tSales  = targetForPeriod(annualTargets.total_sales, range)
  const tGP     = targetForPeriod(annualTargets.gross_profit, range)
  const tResell = getTarget('reseller_split')
  const tMargin = getTarget('gp_margin')

  const resellerPct = curStats.watchesSold > 0
    ? (current.filter(d => d.clients?.client_type === 'Reseller').length / curStats.watchesSold) * 100
    : 0
  const gpMarginPct = curStats.totalSales > 0 ? (curStats.grossProfit / curStats.totalSales) * 100 : 0

  const perfRows = [
    { label: '# Watches Sold',     actual: curStats.watchesSold,   target: tSold,   fmt: (v: number) => v.toFixed(0) },
    { label: 'Retail/Reseller Split %', actual: resellerPct,       target: tResell, fmt: (v: number) => v.toFixed(1) + '%' },
    { label: 'Gross Profit',        actual: curStats.grossProfit,  target: tGP,     fmt: (v: number) => fmtLKR(v) },
    { label: 'GP Margin %',         actual: gpMarginPct,           target: tMargin, fmt: (v: number) => v.toFixed(1) + '%' },
  ]

  async function saveTargets(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    for (const [metric, val] of Object.entries(tForm)) {
      const value = parseFloat(val)
      if (isNaN(value)) continue
      const existing = targets.find(t => t.metric === metric)
      if (existing) {
        await supabase.from('targets').update({ target_value: value }).eq('id', existing.id)
      } else {
        await supabase.from('targets').insert({ year: currentYear, month: null, metric, target_value: value })
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-8 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
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

      {/* ── SECTION 1 — Sales Overview ─────────────────────── */}
      <div>
        <SectionTitle>Sales Overview</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Sales"        actual={curStats.totalSales}   target={annualTargets.total_sales}  range={range} />
          <StatCard label="Gross Profit"        actual={curStats.grossProfit}  target={annualTargets.gross_profit} range={range} />
          <StatCard label="Avg Sale Value"      actual={curStats.watchesSold > 0 ? curStats.totalSales / curStats.watchesSold : 0} target={0} range={range} />
          <StatCard label="Watches Sold"        actual={curStats.watchesSold}  target={annualTargets.watches_sold} range={range} />
        </div>
      </div>

      {/* ── SECTION 2 — Performance vs Target ─────────────── */}
      <div>
        <SectionTitle>Performance vs Target</SectionTitle>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-400 pb-3 pr-4">Metric</th>
                <th className="text-right font-medium text-gray-400 pb-3 px-3">Actual</th>
                <th className="text-right font-medium text-gray-400 pb-3 px-3">Target</th>
                <th className="text-right font-medium text-gray-400 pb-3 pl-3">Achieved</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.map(row => {
                const pct = row.target > 0 ? (row.actual / row.target) * 100 : 0
                return (
                  <tr key={row.label} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 text-gray-700 font-medium">{row.label}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-900 font-semibold">{row.fmt(row.actual)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-400">{row.target > 0 ? row.fmt(row.target) : '—'}</td>
                    <td className="py-3 pl-3 text-right">
                      {row.target > 0 ? <AchievedBadge pct={pct} /> : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── SECTION 3 — Commission View ────────────────────── */}
      <div>
        <SectionTitle>Commission View</SectionTitle>
        <Card>
          {byManager.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-3 pr-4">Sales Lead</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Commission</th>
                  <th className="pb-3 pl-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 pr-4 font-semibold text-gray-800">Total</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{byManager.reduce((s, m) => s + m.sold, 0)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtLKR(byManager.reduce((s, m) => s + m.totalSales, 0))}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtLKR(byManager.reduce((s, m) => s + m.commission, 0))}</td>
                  <td className="py-2.5 pl-3" />
                </tr>
                {byManager.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 text-gray-700">{m.manager}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{m.sold}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmtLKR(m.totalSales)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(m.commission)}</td>
                    <td className="py-2.5 pl-3"><Sparkbar value={m.commission} max={maxMgrComm} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── SECTION 4 — Sales by Brand ─────────────────────── */}
      <div>
        <SectionTitle>Sales by Brand</SectionTitle>
        <Card>
          {byBrand.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-3 pr-4">Brand / Model</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Gross Profit</th>
                  <th className="pb-3 pl-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 pr-4 font-semibold text-gray-800">Total</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{byBrand.reduce((s, b) => s + b.sold, 0)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtLKR(byBrand.reduce((s, b) => s + b.totalSales, 0))}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtLKR(byBrand.reduce((s, b) => s + b.gp, 0))}</td>
                  <td className="py-2.5 pl-3" />
                </tr>
                {byBrand.map((b, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 text-gray-700 font-medium">{b.brand}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{b.sold}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmtLKR(b.totalSales)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(b.gp)}</td>
                    <td className="py-2.5 pl-3"><Sparkbar value={b.totalSales} max={maxBrand} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── SECTION 5 — New vs Existing ────────────────────── */}
      <div>
        <SectionTitle>New vs Existing Customers</SectionTitle>
        <Card className="flex flex-col md:flex-row gap-6">
          {mounted && nve[0].sold + nve[1].sold > 0 ? (
            <div className="shrink-0 flex items-center justify-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={nve} dataKey="sold" innerRadius={36} outerRadius={56} paddingAngle={2} startAngle={90} endAngle={-270}>
                    {nve.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : !mounted ? (
            <div className="w-32 h-32 bg-gray-50 rounded-full animate-pulse shrink-0" />
          ) : null}
          <div className="flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-3 pr-4">Type</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                  <th className="text-right font-medium text-gray-400 pb-3 pl-3">Total Profit</th>
                </tr>
              </thead>
              <tbody>
                {nve.map((row, i) => (
                  <tr key={row.type} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: DONUT_COLORS[i] }} />
                      {row.type}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{row.sold}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmtLKR(row.totalSales)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(row.gp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── SECTION 6 — Referral View ──────────────────────── */}
      <div>
        <SectionTitle>Referral View</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mounted && byReferral.length > 0 ? (
            <Card>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byReferral} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={48} />
                  <Tooltip content={<ChartTooltipLKR />} />
                  <Bar dataKey="totalSales" name="Total Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : !mounted ? (
            <Card><div className="h-48 bg-gray-50 rounded-xl animate-pulse" /></Card>
          ) : null}
          <Card>
            {byReferral.length === 0 ? (
              <p className="text-sm text-gray-400">No data for this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-400 pb-3 pr-4">Source</th>
                    <th className="text-right font-medium text-gray-400 pb-3 px-3">Watches</th>
                    <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                    <th className="text-right font-medium text-gray-400 pb-3 pl-3">Avg Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {byReferral.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 pr-4 text-gray-700 font-medium">{r.source}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{r.count}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmtLKR(r.totalSales)}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(r.avgSale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {/* ── SECTION 7 — Top Clients ────────────────────────── */}
      <div>
        <SectionTitle>Top Clients</SectionTitle>
        <Card>
          {top.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-3 pr-4">Name</th>
                  <th className="text-center font-medium text-gray-400 pb-3 px-3">Type</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                  <th className="pb-3 pl-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {top.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 px-3 text-center text-gray-400">{c.clientType ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{c.sold}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(c.totalSales)}</td>
                    <td className="py-2.5 pl-3"><Sparkbar value={c.totalSales} max={maxClient} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── SECTION 8 — Club TWB ───────────────────────────── */}
      <div>
        <SectionTitle>Club TWB Clients</SectionTitle>
        <Card>
          {club.length === 0 ? (
            <p className="text-sm text-gray-400">No Club TWB sales this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-3 pr-4">Name</th>
                  <th className="text-center font-medium text-gray-400 pb-3 px-3">Type</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right font-medium text-gray-400 pb-3 px-3">Total Sales</th>
                  <th className="pb-3 pl-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {club.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 px-3 text-center text-gray-400">{c.clientType ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{c.sold}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900">{fmtLKR(c.totalSales)}</td>
                    <td className="py-2.5 pl-3"><Sparkbar value={c.totalSales} max={maxClub} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── SECTION 9 — Targets Management ────────────────── */}
      <div>
        <SectionTitle>Annual Targets ({currentYear})</SectionTitle>
        <Card>
          <form onSubmit={saveTargets} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(METRIC_LABELS).map(([metric, label]) => (
                <div key={metric}>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tForm[metric as keyof typeof tForm]}
                    onChange={e => setTForm(f => ({ ...f, [metric]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Targets'}
              </button>
              {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
            </div>
          </form>
        </Card>
      </div>

    </div>
  )
}
