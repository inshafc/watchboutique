'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SalesManager, KPITarget, SalesManagerTarget } from '@/types'

const inp    = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all'
const lbl    = 'block text-xs font-medium text-gray-500 mb-1'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function numOrNull(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''))
  return isNaN(v) ? null : v
}
function intOrNull(s: string): number | null {
  const v = parseInt(s, 10)
  return isNaN(v) ? null : v
}

interface SMTargetForm {
  watchesChecked:  boolean
  revenueChecked:  boolean
  watchCount:      string
  revenue:         string
}

interface ClubTWBForm {
  watchesChecked: boolean
  revenueChecked: boolean
  watchCount:     string
  revenue:        string
}

export default function KPITargetsSection({ salesManagers }: { salesManagers: SalesManager[] }) {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [kpi,       setKpi]       = useState<Partial<KPITarget>>({})
  const [smTargets, setSmTargets] = useState<Record<string, SMTargetForm>>({})
  const [clubTwb,   setClubTwb]   = useState<ClubTWBForm>({ watchesChecked: false, revenueChecked: false, watchCount: '', revenue: '' })
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const activeManagers = salesManagers.filter(m => m.is_active)

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [kpiRes, smRes] = await Promise.all([
      supabase.from('kpi_targets').select('*').eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('sales_manager_targets').select('*').eq('year', year).eq('month', month),
    ])

    const k = (kpiRes.data as KPITarget | null)
    setKpi(k ? {
      gross_profit_value: k.gross_profit_value,
      gross_profit_pct:   k.gross_profit_pct,
      net_profit_value:   k.net_profit_value,
      net_profit_pct:     k.net_profit_pct,
      total_revenue:      k.total_revenue,
      club_twb_watches:   k.club_twb_watches,
      club_twb_revenue:   k.club_twb_revenue,
    } : {})

    setClubTwb({
      watchesChecked: !!(k?.club_twb_watches),
      revenueChecked: !!(k?.club_twb_revenue),
      watchCount:     k?.club_twb_watches?.toString() ?? '',
      revenue:        k?.club_twb_revenue?.toString()  ?? '',
    })

    const smMap: Record<string, SMTargetForm> = {}
    const rows = (smRes.data ?? []) as SalesManagerTarget[]
    for (const m of activeManagers) {
      const row = rows.find(r => r.sales_manager_id === m.id)
      smMap[m.id] = {
        watchesChecked:  !!(row?.watch_count_target),
        revenueChecked:  !!(row?.revenue_target),
        watchCount:      row?.watch_count_target?.toString() ?? '',
        revenue:         row?.revenue_target?.toString()     ?? '',
      }
    }
    setSmTargets(smMap)
    setLoading(false)
  }, [year, month, activeManagers])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  function kpiField(key: keyof typeof kpi, value: string) {
    setKpi(p => ({ ...p, [key]: numOrNull(value) ?? undefined }))
  }

  function smField(smId: string, key: keyof SMTargetForm, value: string | boolean) {
    setSmTargets(p => ({ ...p, [smId]: { ...p[smId], [key]: value } }))
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    const supabase = createClient()

    // Upsert kpi_targets
    const kpiPayload = {
      year,
      month,
      gross_profit_value: kpi.gross_profit_value ?? null,
      gross_profit_pct:   kpi.gross_profit_pct   ?? null,
      net_profit_value:   kpi.net_profit_value    ?? null,
      net_profit_pct:     kpi.net_profit_pct      ?? null,
      total_revenue:      kpi.total_revenue       ?? null,
      club_twb_watches:   clubTwb.watchesChecked ? intOrNull(clubTwb.watchCount)  : null,
      club_twb_revenue:   clubTwb.revenueChecked  ? numOrNull(clubTwb.revenue)    : null,
    }
    const { error: kpiErr } = await supabase.from('kpi_targets').upsert(kpiPayload, { onConflict: 'year,month' })
    if (kpiErr) { setError(kpiErr.message); setSaving(false); return }

    // Upsert per-manager targets
    for (const m of activeManagers) {
      const t = smTargets[m.id]
      if (!t) continue
      const wc = t.watchesChecked ? intOrNull(t.watchCount) : null
      const rv = t.revenueChecked  ? numOrNull(t.revenue)   : null
      const smPayload = { year, month, sales_manager_id: m.id, watch_count_target: wc, revenue_target: rv }
      const { error: smErr } = await supabase.from('sales_manager_targets').upsert(smPayload, { onConflict: 'year,month,sales_manager_id' })
      if (smErr) { setError(smErr.message); setSaving(false); return }
    }

    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Build month options: current year ± 1
  const monthOptions: { label: string; year: number; month: number }[] = []
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      monthOptions.push({ label: `${MONTHS[m - 1]} ${y}`, year: y, month: m })
    }
  }
  const selectedKey = `${year}-${month}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">KPI Targets</h2>
          <p className="text-sm text-gray-400 mt-0.5">Set monthly performance targets</p>
        </div>
        <select
          value={selectedKey}
          onChange={e => { const [y, m] = e.target.value.split('-').map(Number); setYear(y); setMonth(m) }}
          className="bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
        >
          {monthOptions.map(o => (
            <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Targets */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Monthly Targets</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Gross Profit Value (LKR)</label>
                <input type="text" value={kpi.gross_profit_value?.toString() ?? ''} onChange={e => kpiField('gross_profit_value', e.target.value)} placeholder="0" className={inp} />
              </div>
              <div>
                <label className={lbl}>Gross Profit %</label>
                <input type="text" value={kpi.gross_profit_pct?.toString() ?? ''} onChange={e => kpiField('gross_profit_pct', e.target.value)} placeholder="0" className={inp} />
              </div>
              <div>
                <label className={lbl}>Net Profit Value (LKR)</label>
                <input type="text" value={kpi.net_profit_value?.toString() ?? ''} onChange={e => kpiField('net_profit_value', e.target.value)} placeholder="0" className={inp} />
              </div>
              <div>
                <label className={lbl}>Net Profit %</label>
                <input type="text" value={kpi.net_profit_pct?.toString() ?? ''} onChange={e => kpiField('net_profit_pct', e.target.value)} placeholder="0" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Total Revenue (LKR)</label>
                <input type="text" value={kpi.total_revenue?.toString() ?? ''} onChange={e => kpiField('total_revenue', e.target.value)} placeholder="0" className={inp} />
              </div>
            </div>
          </div>

          {/* Sales Manager Targets */}
          {activeManagers.length > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Sales Manager Targets</p>
              <div className="space-y-5">
                {activeManagers.map(m => {
                  const t = smTargets[m.id] ?? { watchesChecked: false, revenueChecked: false, watchCount: '', revenue: '' }
                  return (
                    <div key={m.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                      <p className="text-sm font-semibold text-gray-800 mb-3">{m.name}</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={t.watchesChecked} onChange={e => smField(m.id, 'watchesChecked', e.target.checked)} className="w-4 h-4 rounded accent-gray-900" />
                          <span className="text-sm text-gray-700"># of Watches</span>
                        </label>
                        {t.watchesChecked && (
                          <input type="number" min="0" value={t.watchCount} onChange={e => smField(m.id, 'watchCount', e.target.value)} placeholder="Watch count target" className={inp + ' ml-6 w-auto'} />
                        )}
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={t.revenueChecked} onChange={e => smField(m.id, 'revenueChecked', e.target.checked)} className="w-4 h-4 rounded accent-gray-900" />
                          <span className="text-sm text-gray-700">Revenue (LKR)</span>
                        </label>
                        {t.revenueChecked && (
                          <input type="text" value={t.revenue} onChange={e => smField(m.id, 'revenue', e.target.value)} placeholder="Revenue target" className={inp + ' ml-6 w-auto'} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Club TWB Target */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Club TWB Target</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={clubTwb.watchesChecked} onChange={e => setClubTwb(p => ({ ...p, watchesChecked: e.target.checked }))} className="w-4 h-4 rounded accent-gray-900" />
                <span className="text-sm text-gray-700"># of Watches</span>
              </label>
              {clubTwb.watchesChecked && (
                <input type="number" min="0" value={clubTwb.watchCount} onChange={e => setClubTwb(p => ({ ...p, watchCount: e.target.value }))} placeholder="Watch count target" className={inp + ' ml-6 w-auto'} />
              )}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={clubTwb.revenueChecked} onChange={e => setClubTwb(p => ({ ...p, revenueChecked: e.target.checked }))} className="w-4 h-4 rounded accent-gray-900" />
                <span className="text-sm text-gray-700">Revenue (LKR)</span>
              </label>
              {clubTwb.revenueChecked && (
                <input type="text" value={clubTwb.revenue} onChange={e => setClubTwb(p => ({ ...p, revenue: e.target.value }))} placeholder="Revenue target" className={inp + ' ml-6 w-auto'} />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Targets'}
          </button>
        </div>
      )}
    </div>
  )
}
