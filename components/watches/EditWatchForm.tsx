'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PhotoUpload from '@/components/watches/PhotoUpload'
import {
  WATCH_CONDITIONS,
  WATCH_SET_DETAILS,
  WATCH_STATUSES,
  INVESTOR_NAMES,
  type WatchCondition,
  type WatchSetDetails,
  type WatchStatus,
  type WatchWithInvestors,
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

export default function EditWatchForm({ watch }: { watch: WatchWithInvestors }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    watch_name:     watch.watch_name,
    reference:      watch.reference      ?? '',
    serial_number:  watch.serial_number  ?? '',
    date_on_card:   watch.date_on_card   ?? '',
    condition:      watch.condition      as WatchCondition,
    set_details:    watch.set_details    as WatchSetDetails,
    purchased_from: watch.purchased_from ?? '',
    purchase_cost:  watch.purchase_cost  != null ? String(watch.purchase_cost) : '',
    status:         watch.status         as WatchStatus,
    selling_price:  watch.selling_price  != null ? String(watch.selling_price) : '',
    comments:       watch.comments       ?? '',
  })

  const [existingUrls, setExistingUrls] = useState<string[]>(watch.photos ?? [])
  const [newFiles, setNewFiles]         = useState<File[]>([])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.watch_name.trim()) { setError('Watch name is required.'); return }
    if (!investorsValid) { setError('Investor percentages must total exactly 100%.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Upload new photos
    let newUrls: string[] = []
    if (newFiles.length > 0) {
      newUrls = await uploadPhotos(watch.id, newFiles)
    }

    const photos = [...existingUrls, ...newUrls]

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
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.purchase_cost} onChange={field('purchase_cost')} placeholder="0.00" className={inp} />
              <span className="shrink-0 flex items-center bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-4 text-sm font-medium">LKR</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sale ─────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Sale</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Status</label>
            <select value={form.status} onChange={field('status')} className={inp}>
              {WATCH_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Selling Price</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={field('selling_price')} placeholder="0.00" className={inp} />
              <span className="shrink-0 flex items-center bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-4 text-sm font-medium">LKR</span>
            </div>
          </div>
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
          type="submit" disabled={loading}
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
