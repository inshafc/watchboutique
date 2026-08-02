'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all'
const lbl = 'block text-xs font-medium text-gray-500 mb-1'

type Metric = 'total_sales' | 'gross_profit' | 'gp_margin' | 'watches_sold'

const METRICS: { key: Metric; label: string; kind: 'currency' | 'percent' | 'count' }[] = [
  { key: 'total_sales',  label: 'Revenue',      kind: 'currency' },
  { key: 'gross_profit', label: 'Gross Profit', kind: 'currency' },
  { key: 'gp_margin',    label: 'GP Margin',    kind: 'percent'  },
  { key: 'watches_sold', label: 'Watches Sold', kind: 'count'    },
]

function numOrNull(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''))
  return isNaN(v) ? null : v
}

export default function MonthlyTargetsSection() {
  const year = new Date().getFullYear()

  const [values,  setValues]  = useState<Record<Metric, string>>({ total_sales: '', gross_profit: '', gp_margin: '', watches_sold: '' })
  const [ids,     setIds]     = useState<Partial<Record<Metric, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('targets')
      .select('id, metric, target_value')
      .eq('year', year)
      .is('month', null)

    const nextValues: Record<Metric, string> = { total_sales: '', gross_profit: '', gp_margin: '', watches_sold: '' }
    const nextIds: Partial<Record<Metric, string>> = {}
    for (const row of (data ?? []) as { id: string; metric: string; target_value: number }[]) {
      const m = METRICS.find(x => x.key === row.metric)
      if (!m) continue
      nextIds[m.key] = row.id
      // Currency/count targets are stored as an annual figure (the rest of
      // the app divides by 12 via targetForPeriod() to get a single month,
      // then scales up for multi-month ranges) — show the monthly figure
      // here since that's what's actually being set. Percent targets
      // (gp_margin) are stored and read flat, unscaled.
      nextValues[m.key] = (m.kind === 'percent' ? row.target_value : row.target_value / 12).toString()
    }
    setValues(nextValues)
    setIds(nextIds)
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  function setVal(key: Metric, v: string) {
    setValues(p => ({ ...p, [key]: v }))
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    const supabase = createClient()
    for (const m of METRICS) {
      const raw = numOrNull(values[m.key])
      if (raw == null) continue
      const stored = m.kind === 'percent' ? raw : raw * 12
      const existingId = ids[m.key]
      if (existingId) {
        const { error: e } = await supabase.from('targets').update({ target_value: stored }).eq('id', existingId)
        if (e) { setError(e.message); setSaving(false); return }
      } else {
        const { data, error: e } = await supabase
          .from('targets')
          .insert({ year, month: null, metric: m.key, target_value: stored })
          .select('id').single()
        if (e) { setError(e.message); setSaving(false); return }
        setIds(p => ({ ...p, [m.key]: data.id }))
      }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">Monthly Targets</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Set the recurring monthly targets shown on the Dashboard and Analytics. Enter each as a single month&apos;s figure — longer ranges (Last 3/6 Months, This Year) scale up automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {METRICS.map(m => (
          <div key={m.key}>
            <label className={lbl}>
              {m.label} {m.kind === 'currency' ? '(LKR / month)' : m.kind === 'percent' ? '(%)' : '(per month)'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={values[m.key]}
              onChange={e => setVal(m.key, e.target.value)}
              placeholder="0"
              className={inp}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <button onClick={save} disabled={saving}
        className="bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-black disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Monthly Targets'}
      </button>
    </div>
  )
}
