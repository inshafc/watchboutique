'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SalesManager, KPITarget, SalesManagerTarget } from '@/types'

const inp      = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all'
const lbl      = 'block text-xs font-medium text-gray-500 mb-1'
const cardCls  = 'bg-gray-50 border border-gray-100 rounded-2xl p-5'
const headCls  = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4'

const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December']

function numOrNull(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''))
  return isNaN(v) ? null : v
}
function intOrNull(s: string): number | null {
  const v = parseInt(s, 10)
  return isNaN(v) ? null : v
}
function fmtLKR(v: number | null | undefined): string {
  if (v == null) return '—'
  return 'LKR ' + Math.round(v).toLocaleString('en-LK')
}

interface SMForm { watchCount: string; revenue: string }
interface ClubForm { watchCount: string; revenue: string }

interface Bundle {
  kpi:     Partial<KPITarget>
  sm:      Record<string, SMForm>
  clubTwb: ClubForm
}

function emptyBundle(ids: string[]): Bundle {
  const sm: Record<string, SMForm> = {}
  ids.forEach(id => { sm[id] = { watchCount: '', revenue: '' } })
  return { kpi: {}, sm, clubTwb: { watchCount: '', revenue: '' } }
}

function rowsToBundle(
  kpiRow: KPITarget | null,
  smRows: SalesManagerTarget[],
  managers: SalesManager[],
): Bundle {
  const sm: Record<string, SMForm> = {}
  for (const m of managers) {
    const row = smRows.find(r => r.sales_manager_id === m.id)
    sm[m.id] = {
      watchCount: row?.watch_count_target?.toString() ?? '',
      revenue:    row?.revenue_target?.toString()     ?? '',
    }
  }
  return {
    kpi:     kpiRow ? { ...kpiRow } : {},
    sm,
    clubTwb: {
      watchCount: kpiRow?.club_twb_watches?.toString() ?? '',
      revenue:    kpiRow?.club_twb_revenue?.toString()  ?? '',
    },
  }
}

export default function KPITargetsSection({ salesManagers }: { salesManagers: SalesManager[] }) {
  const now  = new Date()
  const [tab, setTab] = useState<'default' | 'override'>('default')

  // ── Default tab ──────────────────────────────────────────────
  const [defBundle,        setDefBundle]        = useState<Bundle>(emptyBundle(salesManagers.map(m => m.id)))
  const [defKpiId,         setDefKpiId]         = useState<string | null>(null)
  const [annualRevenue,    setAnnualRevenue]    = useState('')
  const [showAnnualPrompt, setShowAnnualPrompt] = useState(false)
  const [loadingDef,       setLoadingDef]       = useState(false)

  // ── Override tab ─────────────────────────────────────────────
  const initYear  = now.getFullYear() >= 2026 && now.getFullYear() <= 2027 ? now.getFullYear() : 2026
  const initMonth = now.getMonth() + 1
  const [overYear,    setOverYear]    = useState(initYear)
  const [overMonth,   setOverMonth]   = useState(initMonth)
  const [overBundle,  setOverBundle]  = useState<Bundle>(emptyBundle(salesManagers.map(m => m.id)))
  const [overExists,  setOverExists]  = useState(false)
  const [overKpiId,   setOverKpiId]   = useState<string | null>(null)
  const [loadingOver, setLoadingOver] = useState(false)

  // ── Shared ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const activeManagers = salesManagers.filter(m => m.is_active)

  // ── Load default (year IS NULL, month IS NULL) ───────────────
  const loadDefault = useCallback(async () => {
    setLoadingDef(true)
    const supabase = createClient()
    const [kpiRes, smRes] = await Promise.all([
      supabase.from('kpi_targets').select('*').is('year', null).is('month', null).maybeSingle(),
      supabase.from('sales_manager_targets').select('*').is('year', null).is('month', null),
    ])
    const kpiRow = kpiRes.data as KPITarget | null
    setDefKpiId(kpiRow?.id ?? null)
    setDefBundle(rowsToBundle(kpiRow, (smRes.data ?? []) as SalesManagerTarget[], activeManagers))
    setAnnualRevenue(kpiRow?.annual_revenue_target?.toString() ?? '')
    setLoadingDef(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load override for specific month ─────────────────────────
  const loadOverride = useCallback(async (year: number, month: number, fallback: Bundle) => {
    setLoadingOver(true)
    const supabase = createClient()
    const [kpiRes, smRes] = await Promise.all([
      supabase.from('kpi_targets').select('*').eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('sales_manager_targets').select('*').eq('year', year).eq('month', month),
    ])
    const kpiRow = kpiRes.data as KPITarget | null
    const smRows = (smRes.data ?? []) as SalesManagerTarget[]
    if (kpiRow) {
      setOverExists(true)
      setOverKpiId(kpiRow.id)
      setOverBundle(rowsToBundle(kpiRow, smRows, activeManagers))
    } else {
      setOverExists(false)
      setOverKpiId(null)
      setOverBundle(fallback)
    }
    setLoadingOver(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDefault() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'override') loadOverride(overYear, overMonth, defBundle)
  }, [tab, overYear, overMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Annual revenue helper ────────────────────────────────────
  const suggestedMonthly = (() => {
    const v = numOrNull(annualRevenue)
    return v ? Math.round(v / 12) : null
  })()

  function handleAnnualChange(val: string) {
    setAnnualRevenue(val)
    setShowAnnualPrompt(!!numOrNull(val))
  }

  function applyAnnualToMonthly() {
    if (suggestedMonthly == null) return
    setDefBundle(p => ({ ...p, kpi: { ...p.kpi, total_revenue: suggestedMonthly } }))
    setShowAnnualPrompt(false)
  }

  // ── Default field setters ────────────────────────────────────
  function setDefKpi(key: keyof KPITarget, val: string) {
    const n = numOrNull(val)
    setDefBundle(p => ({ ...p, kpi: { ...p.kpi, [key]: n !== null ? n : undefined } }))
  }
  function setDefSM(id: string, key: keyof SMForm, val: string) {
    setDefBundle(p => ({ ...p, sm: { ...p.sm, [id]: { ...p.sm[id], [key]: val } } }))
  }
  function setDefClub(key: keyof ClubForm, val: string) {
    setDefBundle(p => ({ ...p, clubTwb: { ...p.clubTwb, [key]: val } }))
  }

  // ── Override field setters ───────────────────────────────────
  function setOverKpi(key: keyof KPITarget, val: string) {
    const n = numOrNull(val)
    setOverBundle(p => ({ ...p, kpi: { ...p.kpi, [key]: n !== null ? n : undefined } }))
  }
  function setOverSM(id: string, key: keyof SMForm, val: string) {
    setOverBundle(p => ({ ...p, sm: { ...p.sm, [id]: { ...p.sm[id], [key]: val } } }))
  }
  function setOverClub(key: keyof ClubForm, val: string) {
    setOverBundle(p => ({ ...p, clubTwb: { ...p.clubTwb, [key]: val } }))
  }

  // ── Save default ─────────────────────────────────────────────
  async function saveDefault() {
    setSaving(true); setError(null); setSaved(false)
    const supabase = createClient()
    const payload = {
      year:  null as number | null,
      month: null as number | null,
      gross_profit_value:    defBundle.kpi.gross_profit_value    ?? null,
      gross_profit_pct:      defBundle.kpi.gross_profit_pct      ?? null,
      net_profit_value:      defBundle.kpi.net_profit_value      ?? null,
      net_profit_pct:        defBundle.kpi.net_profit_pct        ?? null,
      total_revenue:         defBundle.kpi.total_revenue         ?? null,
      club_twb_watches:      intOrNull(defBundle.clubTwb.watchCount),
      club_twb_revenue:      numOrNull(defBundle.clubTwb.revenue),
      annual_revenue_target: numOrNull(annualRevenue),
    }
    if (defKpiId) {
      const { error: e } = await supabase.from('kpi_targets').update(payload).eq('id', defKpiId)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { data, error: e } = await supabase.from('kpi_targets').insert(payload).select('id').single()
      if (e) { setError(e.message); setSaving(false); return }
      setDefKpiId(data.id)
    }
    for (const m of activeManagers) {
      const t = defBundle.sm[m.id]
      if (!t) continue
      const smPayload = {
        year: null as number | null, month: null as number | null,
        sales_manager_id:   m.id,
        watch_count_target: intOrNull(t.watchCount),
        revenue_target:     numOrNull(t.revenue),
      }
      const { data: ex } = await supabase
        .from('sales_manager_targets').select('id')
        .is('year', null).is('month', null).eq('sales_manager_id', m.id).maybeSingle()
      const { error: e } = ex
        ? await supabase.from('sales_manager_targets').update(smPayload).eq('id', ex.id)
        : await supabase.from('sales_manager_targets').insert(smPayload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  // ── Save override ────────────────────────────────────────────
  async function saveOverride() {
    setSaving(true); setError(null); setSaved(false)
    const supabase = createClient()
    const payload = {
      year: overYear, month: overMonth,
      gross_profit_value:    overBundle.kpi.gross_profit_value    ?? null,
      gross_profit_pct:      overBundle.kpi.gross_profit_pct      ?? null,
      net_profit_value:      overBundle.kpi.net_profit_value      ?? null,
      net_profit_pct:        overBundle.kpi.net_profit_pct        ?? null,
      total_revenue:         overBundle.kpi.total_revenue         ?? null,
      club_twb_watches:      intOrNull(overBundle.clubTwb.watchCount),
      club_twb_revenue:      numOrNull(overBundle.clubTwb.revenue),
    }
    if (overKpiId) {
      const { error: e } = await supabase.from('kpi_targets').update(payload).eq('id', overKpiId)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { data, error: e } = await supabase.from('kpi_targets').insert(payload).select('id').single()
      if (e) { setError(e.message); setSaving(false); return }
      setOverKpiId(data.id); setOverExists(true)
    }
    for (const m of activeManagers) {
      const t = overBundle.sm[m.id]
      if (!t) continue
      const smPayload = {
        year: overYear, month: overMonth,
        sales_manager_id:   m.id,
        watch_count_target: intOrNull(t.watchCount),
        revenue_target:     numOrNull(t.revenue),
      }
      const { data: ex } = await supabase
        .from('sales_manager_targets').select('id')
        .eq('year', overYear).eq('month', overMonth).eq('sales_manager_id', m.id).maybeSingle()
      const { error: e } = ex
        ? await supabase.from('sales_manager_targets').update(smPayload).eq('id', ex.id)
        : await supabase.from('sales_manager_targets').insert(smPayload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  // ── Clear override ───────────────────────────────────────────
  async function clearOverride() {
    if (!overKpiId) return
    if (!confirm(`Clear override for ${MONTHS[overMonth - 1]} ${overYear}? It will revert to monthly defaults.`)) return
    const supabase = createClient()
    await supabase.from('kpi_targets').delete().eq('id', overKpiId)
    await supabase.from('sales_manager_targets').delete().eq('year', overYear).eq('month', overMonth)
    setOverExists(false); setOverKpiId(null); setOverBundle(defBundle)
  }

  // ── Month options (Jan 2026 – Dec 2027) ─────────────────────
  const monthOptions: { label: string; year: number; month: number }[] = []
  for (let y = 2026; y <= 2027; y++) {
    for (let m = 1; m <= 12; m++) {
      monthOptions.push({ label: `${MONTHS[m - 1]} ${y}`, year: y, month: m })
    }
  }
  const selectedMonthKey = `${overYear}-${overMonth}`

  // ── Shared sub-sections ──────────────────────────────────────
  function renderSMTargets(
    bundle: Bundle,
    setSM: (id: string, key: keyof SMForm, val: string) => void,
  ) {
    if (activeManagers.length === 0) return null
    return (
      <div className={cardCls}>
        <p className={headCls}>Sales Manager Targets</p>
        <div className="space-y-5">
          {activeManagers.map(m => {
            const t = bundle.sm[m.id] ?? { watchCount: '', revenue: '' }
            return (
              <div key={m.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                <p className="text-sm font-semibold text-gray-800 mb-3">{m.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}># of Watches Target</label>
                    <input type="number" min="0" value={t.watchCount}
                      onChange={e => setSM(m.id, 'watchCount', e.target.value)}
                      placeholder="0" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Revenue Target (LKR)</label>
                    <input type="text" value={t.revenue}
                      onChange={e => setSM(m.id, 'revenue', e.target.value)}
                      placeholder="0" className={inp} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderClubTwb(
    bundle: Bundle,
    setClub: (key: keyof ClubForm, val: string) => void,
  ) {
    return (
      <div className={cardCls}>
        <p className={headCls}>Club TWB Target</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}># of Watches Target</label>
            <input type="number" min="0" value={bundle.clubTwb.watchCount}
              onChange={e => setClub('watchCount', e.target.value)}
              placeholder="0" className={inp} />
          </div>
          <div>
            <label className={lbl}>Revenue Target (LKR)</label>
            <input type="text" value={bundle.clubTwb.revenue}
              onChange={e => setClub('revenue', e.target.value)}
              placeholder="0" className={inp} />
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">KPI Targets</h2>
        <p className="text-sm text-gray-400 mt-0.5">Set monthly performance targets and annual goals</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 mb-6">
        {(['default', 'override'] as const).map(t => (
          <button key={t}
            onClick={() => { setTab(t); setSaved(false); setError(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-t-xl transition-colors ${
              tab === t
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}>
            {t === 'default' ? 'Monthly Defaults' : 'Month Override'}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: Monthly Defaults ════════════════════════════ */}
      {tab === 'default' && (
        loadingDef ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-5">

            {/* Annual target + suggestion banner */}
            <div className={cardCls}>
              <p className={headCls}>Annual Target</p>
              <div>
                <label className={lbl}>Annual Revenue Target (LKR)</label>
                <input type="text" value={annualRevenue}
                  onChange={e => handleAnnualChange(e.target.value)}
                  placeholder="0" className={inp} />
                {suggestedMonthly != null && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Suggested monthly: {fmtLKR(suggestedMonthly)}
                  </p>
                )}
                {showAnnualPrompt && suggestedMonthly != null && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <p className="text-xs text-amber-800 font-medium flex-1 pt-0.5">
                      Suggested monthly target: {fmtLKR(suggestedMonthly)} — update monthly default?
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={applyAnnualToMonthly}
                        className="text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap">
                        Yes, update monthly
                      </button>
                      <button onClick={() => setShowAnnualPrompt(false)}
                        className="text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1.5 whitespace-nowrap">
                        Keep current monthly
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly KPI fields */}
            <div className={cardCls}>
              <p className={headCls}>Monthly Targets</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Gross Profit Value (LKR)</label>
                  <input type="text"
                    value={defBundle.kpi.gross_profit_value?.toString() ?? ''}
                    onChange={e => setDefKpi('gross_profit_value', e.target.value)}
                    placeholder="0" className={inp} />
                  {defBundle.kpi.gross_profit_value != null && (
                    <p className="text-[11px] text-gray-400 mt-1">Annual: {fmtLKR(defBundle.kpi.gross_profit_value * 12)}</p>
                  )}
                </div>
                <div>
                  <label className={lbl}>Gross Profit %</label>
                  <input type="text"
                    value={defBundle.kpi.gross_profit_pct?.toString() ?? ''}
                    onChange={e => setDefKpi('gross_profit_pct', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Net Profit Value (LKR)</label>
                  <input type="text"
                    value={defBundle.kpi.net_profit_value?.toString() ?? ''}
                    onChange={e => setDefKpi('net_profit_value', e.target.value)}
                    placeholder="0" className={inp} />
                  {defBundle.kpi.net_profit_value != null && (
                    <p className="text-[11px] text-gray-400 mt-1">Annual: {fmtLKR(defBundle.kpi.net_profit_value * 12)}</p>
                  )}
                </div>
                <div>
                  <label className={lbl}>Net Profit %</label>
                  <input type="text"
                    value={defBundle.kpi.net_profit_pct?.toString() ?? ''}
                    onChange={e => setDefKpi('net_profit_pct', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Total Revenue (LKR)</label>
                  <input type="text"
                    value={defBundle.kpi.total_revenue?.toString() ?? ''}
                    onChange={e => setDefKpi('total_revenue', e.target.value)}
                    placeholder="0" className={inp} />
                  {defBundle.kpi.total_revenue != null && (
                    <p className="text-[11px] text-gray-400 mt-1">Annual: {fmtLKR(defBundle.kpi.total_revenue * 12)}</p>
                  )}
                </div>
              </div>
            </div>

            {renderSMTargets(defBundle, setDefSM)}
            {renderClubTwb(defBundle, setDefClub)}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button onClick={saveDefault} disabled={saving}
              className="bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-black disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save as Monthly Default'}
            </button>
          </div>
        )
      )}

      {/* ═══ TAB 2: Month Override ══════════════════════════════ */}
      {tab === 'override' && (
        loadingOver ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-5">

            {/* Month selector + status badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedMonthKey}
                onChange={e => {
                  const [y, m] = e.target.value.split('-').map(Number)
                  setOverYear(y); setOverMonth(m)
                }}
                className="bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                {monthOptions.map(o => (
                  <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                    {o.label}
                  </option>
                ))}
              </select>
              {overExists ? (
                <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
                  Override active
                </span>
              ) : (
                <span className="text-xs text-gray-400">Using monthly default</span>
              )}
            </div>

            {!overExists && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700">
                  Using monthly default — edit any field to create an override for this month.
                </p>
              </div>
            )}

            {/* Monthly KPI fields */}
            <div className={cardCls}>
              <p className={headCls}>Monthly Targets</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Gross Profit Value (LKR)</label>
                  <input type="text"
                    value={overBundle.kpi.gross_profit_value?.toString() ?? ''}
                    onChange={e => setOverKpi('gross_profit_value', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Gross Profit %</label>
                  <input type="text"
                    value={overBundle.kpi.gross_profit_pct?.toString() ?? ''}
                    onChange={e => setOverKpi('gross_profit_pct', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Net Profit Value (LKR)</label>
                  <input type="text"
                    value={overBundle.kpi.net_profit_value?.toString() ?? ''}
                    onChange={e => setOverKpi('net_profit_value', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Net Profit %</label>
                  <input type="text"
                    value={overBundle.kpi.net_profit_pct?.toString() ?? ''}
                    onChange={e => setOverKpi('net_profit_pct', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Total Revenue (LKR)</label>
                  <input type="text"
                    value={overBundle.kpi.total_revenue?.toString() ?? ''}
                    onChange={e => setOverKpi('total_revenue', e.target.value)}
                    placeholder="0" className={inp} />
                </div>
              </div>
            </div>

            {renderSMTargets(overBundle, setOverSM)}
            {renderClubTwb(overBundle, setOverClub)}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={saveOverride} disabled={saving}
                className="bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-black disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : saved ? '✓ Saved' : `Save Override for ${MONTHS[overMonth - 1]}`}
              </button>
              {overExists && (
                <button onClick={clearOverride} disabled={saving}
                  className="text-sm font-medium text-red-500 hover:text-red-700 px-4 py-2.5 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors border border-red-200">
                  Clear Override — use default
                </button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
