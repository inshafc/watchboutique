'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PhotoUpload from '@/components/watches/PhotoUpload'
import CurrencyInput from '@/components/ui/CurrencyInput'
import {
  WATCH_CONDITIONS,
  WATCH_SET_DETAILS,
  WATCH_STATUSES,
  INVESTOR_NAMES,
  type WatchCondition,
  type WatchSetDetails,
  type WatchStatus,
  type WatchWithInvestors,
  type Brand,
} from '@/types'

interface InvestorRow {
  investor_name: string
  percentage: string
}

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

async function uploadPhotos(watchId: string, files: File[]): Promise<string[]> {
  const supabase = createClient()
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${watchId}/edit_${Date.now()}_${i}.${ext}`
    const { error } = await supabase.storage
      .from('watch-photos')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('watch-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

function LabelToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
        checked
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${checked ? 'border-white' : 'border-gray-300'}`}>
        {checked && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  )
}

// Normalise set_details: old 'Box and Papers' / 'Brand New' become 'Full Set'
function normaliseSetDetails(v: string): WatchSetDetails {
  const valid: WatchSetDetails[] = ['Full Set', 'Box and Watch', 'Watch Only']
  return valid.includes(v as WatchSetDetails) ? (v as WatchSetDetails) : 'Full Set'
}

export default function EditWatchForm({
  watch,
  brands = [],
}: {
  watch: WatchWithInvestors
  brands?: Brand[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    watch_name:     watch.watch_name,
    reference:      watch.reference      ?? '',
    serial_number:  watch.serial_number  ?? '',
    date_on_card:   watch.date_on_card   ?? '',
    condition:      watch.condition      as WatchCondition,
    set_details:    normaliseSetDetails(watch.set_details),
    purchased_from: watch.purchased_from ?? '',
    purchase_cost:  watch.purchase_cost  != null ? String(watch.purchase_cost) : '',
    status:         watch.status         as WatchStatus,
    selling_price:  watch.selling_price  != null ? String(watch.selling_price) : '',
    comments:       watch.comments       ?? '',
  })

  const [brandId,      setBrandId]      = useState<string | null>((watch as any).brand_id ?? null)
  const [newBrandName, setNewBrandName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [brandError,   setBrandError]   = useState<string | null>(null)

  const [existingUrls, setExistingUrls] = useState<string[]>(watch.photos ?? [])
  const [newFiles, setNewFiles]         = useState<File[]>([])

  const existingLabels = (watch as any).labels as string[] ?? []
  const [labelNewArrival, setLabelNewArrival] = useState(existingLabels.includes('new_arrival'))
  const [labelHotSell,    setLabelHotSell]    = useState(existingLabels.includes('hot_sell'))
  const [labelExpensive,  setLabelExpensive]  = useState(existingLabels.includes('expensive'))

  const [investors, setInvestors] = useState<InvestorRow[]>(
    watch.watch_investors?.length > 0
      ? watch.watch_investors.map(i => ({
          investor_name: i.investor_name,
          percentage:    String(i.percentage),
        }))
      : [{ investor_name: 'TWB', percentage: '100' }]
  )

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const totalPct = investors.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0)
  const investorsValid = Math.abs(totalPct - 100) < 0.01

  function addInvestor() {
    if (investors.length >= 4) return
    setInvestors(v => [...v, { investor_name: 'TWB', percentage: '' }])
  }

  function removeInvestor(idx: number) {
    setInvestors(v => v.filter((_, i) => i !== idx))
  }

  function updateInvestor(idx: number, key: keyof InvestorRow, val: string) {
    setInvestors(v => v.map((row, i) => (i === idx ? { ...row, [key]: val } : row)))
  }

  async function checkBrandDuplicate(name: string) {
    if (!name.trim()) { setBrandError(null); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('brands')
      .select('id')
      .ilike('name', name.trim())
      .limit(1)
    if (data && data.length > 0) {
      setBrandError('Brand already exists')
    } else {
      setBrandError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.watch_name.trim()) { setError('Watch name is required.'); return }
    if (!investorsValid) { setError('Investor percentages must total exactly 100%.'); return }
    if (brandError) { setError('Please fix the brand error before saving.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Create new brand if needed
    let resolvedBrandId = brandId
    if (showNewBrand && newBrandName.trim()) {
      const { data: brand } = await supabase
        .from('brands')
        .insert({ name: newBrandName.trim() })
        .select('id')
        .single()
      resolvedBrandId = brand?.id ?? null
    }

    // Upload new photos
    let newUrls: string[] = []
    if (newFiles.length > 0) {
      newUrls = await uploadPhotos(watch.id, newFiles)
    }

    const photos = [...existingUrls, ...newUrls]

    const labels: string[] = []
    if (labelNewArrival) labels.push('new_arrival')
    if (labelHotSell)    labels.push('hot_sell')
    if (labelExpensive)  labels.push('expensive')

    const { error: watchErr } = await supabase
      .from('watches')
      .update({
        watch_name:     form.watch_name.trim(),
        reference:      form.reference.trim()      || null,
        serial_number:  form.serial_number.trim()  || null,
        date_on_card:   form.date_on_card           || null,
        condition:      form.condition,
        set_details:    form.set_details,
        purchased_from: form.purchased_from.trim() || null,
        purchase_cost:  form.purchase_cost  ? parseFloat(form.purchase_cost)  : null,
        status:         form.status,
        selling_price:  form.selling_price ? parseFloat(form.selling_price) : null,
        comments:       form.comments.trim()       || null,
        photos,
        brand_id:       resolvedBrandId,
        labels,
      })
      .eq('id', watch.id)

    if (watchErr) { setError(watchErr.message); setLoading(false); return }

    // Replace investors
    await supabase.from('watch_investors').delete().eq('watch_id', watch.id)

    const investorRows = investors
      .filter(i => i.investor_name.trim())
      .map(i => ({
        watch_id:      watch.id,
        investor_name: i.investor_name,
        percentage:    parseFloat(i.percentage),
      }))

    if (investorRows.length > 0) {
      const { error: invErr } = await supabase.from('watch_investors').insert(investorRows)
      if (invErr) { setError(invErr.message); setLoading(false); return }
    }

    router.push(`/dashboard/watches/${watch.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Watch Details ─────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Watch Details</p>
        <div className="space-y-4">

          {/* Watch ID (read-only) */}
          {(watch as any).watch_id && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Watch ID</p>
                <p className="text-base font-bold text-gray-900 tracking-wide font-mono">{(watch as any).watch_id}</p>
              </div>
            </div>
          )}

          {/* Brand */}
          <div>
            <label className={lbl}>Brand</label>
            {showNewBrand ? (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={e => { setNewBrandName(e.target.value); setBrandError(null) }}
                    onBlur={() => checkBrandDuplicate(newBrandName)}
                    placeholder="Enter brand name"
                    className={inp}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setShowNewBrand(false); setNewBrandName(''); setBrandError(null) }}
                    className="shrink-0 text-sm text-gray-400 hover:text-gray-700 px-3 py-2.5 border border-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {brandError && (
                  <p className="text-xs text-red-500">{brandError}</p>
                )}
              </div>
            ) : (
              <select
                value={brandId ?? ''}
                onChange={e => {
                  if (e.target.value === '__new__') { setShowNewBrand(true); setBrandId(null) }
                  else setBrandId(e.target.value || null)
                }}
                className={inp}
              >
                <option value="">— Select brand —</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
                <option value="__new__">+ Add new brand</option>
              </select>
            )}
          </div>

          <div>
            <label className={lbl}>Watch Name *</label>
            <input type="text" value={form.watch_name} onChange={field('watch_name')} className={inp} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Reference</label>
              <input type="text" value={form.reference} onChange={field('reference')} className={inp} />
            </div>
            <div>
              <label className={lbl}>Serial Number</label>
              <input type="text" value={form.serial_number} onChange={field('serial_number')} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date on Card</label>
              <input type="date" value={form.date_on_card} onChange={field('date_on_card')} className={inp} />
            </div>
            <div>
              <label className={lbl}>Condition</label>
              <select value={form.condition} onChange={field('condition')} className={inp}>
                {WATCH_CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Set Details</label>
            <select value={form.set_details} onChange={field('set_details')} className={inp}>
              {WATCH_SET_DETAILS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Purchase ─────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Purchase</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Purchased From</label>
            <input type="text" value={form.purchased_from} onChange={field('purchased_from')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Purchase Cost</label>
            <CurrencyInput value={form.purchase_cost} onChange={v => setForm(f => ({ ...f, purchase_cost: v }))} />
          </div>
        </div>
      </div>

      {/* ── Sale ─────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Sale</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Status</label>
            <select value={form.status} onChange={field('status')} className={inp}>
              {WATCH_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Selling Price</label>
            <CurrencyInput value={form.selling_price} onChange={v => setForm(f => ({ ...f, selling_price: v }))} />
          </div>
        </div>
      </div>

      {/* ── Labels ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Labels</p>
        <div className="flex gap-2 flex-wrap">
          <LabelToggle label="New Arrival" checked={labelNewArrival} onChange={setLabelNewArrival} />
          <LabelToggle label="🔥 Hot Sell"  checked={labelHotSell}    onChange={setLabelHotSell} />
          <LabelToggle label="💰 Expensive" checked={labelExpensive}  onChange={setLabelExpensive} />
        </div>
      </div>

      {/* ── Investors ────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Investors</p>
        <div className="space-y-2">
          {investors.map((inv, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={inv.investor_name}
                onChange={e => updateInvestor(idx, 'investor_name', e.target.value)}
                className={inp}
              >
                {INVESTOR_NAMES.map(n => <option key={n}>{n}</option>)}
              </select>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" min="0.01" max="100" step="0.01"
                  value={inv.percentage}
                  onChange={e => updateInvestor(idx, 'percentage', e.target.value)}
                  placeholder="0"
                  className={`${inp} w-20 text-right`}
                />
                <span className="text-gray-400 text-sm w-4">%</span>
              </div>
              {investors.length > 1 && (
                <button type="button" onClick={() => removeInvestor(idx)} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-xl w-6 leading-none">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={addInvestor} disabled={investors.length >= 4} className="text-sm text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-0">
            + Add investor
          </button>
          <span className={`text-sm font-medium tabular-nums ${investorsValid ? 'text-emerald-600' : 'text-red-500'}`}>
            {totalPct % 1 === 0 ? totalPct : totalPct.toFixed(2)}% {investorsValid ? '✓' : '(must be 100%)'}
          </span>
        </div>
      </div>

      {/* ── Photos ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Photos</p>
        <p className="text-xs text-gray-400 mb-3">Add photos in this order: Watch Front, Watch Back, Card Front, Card Back (max 4 photos)</p>
        <PhotoUpload
          existingUrls={existingUrls}
          newFiles={newFiles}
          onExistingUrlsChange={setExistingUrls}
          onNewFilesChange={setNewFiles}
        />
      </div>

      {/* ── Notes ────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.comments} onChange={field('comments')} rows={3} placeholder="Any additional notes…" className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <button
          type="submit" disabled={loading || !!brandError}
          className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <Link href={`/dashboard/watches/${watch.id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
