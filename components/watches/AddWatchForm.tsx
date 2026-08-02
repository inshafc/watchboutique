'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { logActivity } from '@/lib/activityLog'
import PhotoUpload, { type PhotoItem } from '@/components/watches/PhotoUpload'
import CurrencyInput from '@/components/ui/CurrencyInput'
import InvestorsCard, { type InvestorRow } from '@/components/watches/InvestorsCard'
import { useAutosaveDraft } from '@/lib/hooks/useAutosaveDraft'
import { useIdleLock } from '@/lib/hooks/useIdleLock'
import DraftBanner from '@/components/drafts/DraftBanner'
import DraftSaveIndicator from '@/components/drafts/DraftSaveIndicator'
import IdleLockOverlay from '@/components/drafts/IdleLockOverlay'
import {
  WATCH_CONDITIONS,
  CONDITION_LABELS,
  WATCH_SET_DETAILS,
  WATCH_STATUSES,
  INVENTORY_TYPES,
  INVENTORY_TYPE_LABELS,
  type WatchCondition,
  type WatchSetDetails,
  type WatchStatus,
  type InventoryType,
  type Brand,
} from '@/types'

const inp = 'w-full bg-card border border-border text-text-primary rounded-lg px-3.5 py-2.5 text-[13px] placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition-all'
const lbl = 'block text-[11px] font-medium text-text-secondary uppercase tracking-[0.08em] mb-1.5'
const card = 'bg-card border border-border rounded-xl p-5 md:p-6'
const cardTitle = 'text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-4'

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

function num(s: string) { return parseFloat(s.replace(/,/g, '')) }

export default function AddWatchForm({ brands = [] }: { brands?: Brand[] }) {
  const router = useRouter()
  const { profile, setInactivityLogoutSuspended } = useAuth()
  const isClerk = profile?.role === 'inventory_clerk'
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [watchId,   setWatchId]   = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState(true)

  useEffect(() => {
    async function genId() {
      const supabase = createClient()
      const year = new Date().getFullYear()
      const prefix = `TWB${year}`
      const { data } = await supabase
        .from('watches')
        .select('watch_id')
        .like('watch_id', `${prefix}%`)
        .order('watch_id', { ascending: false })
        .limit(1)
      let seq = 1
      if (data && data.length > 0 && data[0].watch_id) {
        const last = parseInt(data[0].watch_id.slice(prefix.length), 10)
        if (!isNaN(last)) seq = last + 1
      }
      setWatchId(`${prefix}${String(seq).padStart(4, '0')}`)
      setLoadingId(false)
    }
    void genId()
  }, [])

  const [form, setForm] = useState({
    watch_name:     '',
    reference:      '',
    serial_number:  '',
    date_on_card:   '',
    condition:      'Unworn' as WatchCondition,
    set_details:    'Full Set' as WatchSetDetails,
    inventory_type: 'twb' as InventoryType,
    consignee_name: '',
    purchased_from: '',
    purchase_cost:  '',
    date_acquired:  new Date().toISOString().split('T')[0],
    status:         'Available' as WatchStatus,
    selling_price:  '',
    comments:       '',
  })

  const [brandId,      setBrandId]      = useState<string | null>(null)
  const [newBrandName, setNewBrandName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [brandError,   setBrandError]   = useState<string | null>(null)

  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [investors,  setInvestors]  = useState<InvestorRow[]>([])

  const [labelNewArrival, setLabelNewArrival] = useState(true)
  const [labelHotSell,    setLabelHotSell]    = useState(false)
  const [labelExpensive,  setLabelExpensive]  = useState(false)

  // ── Draft autosave + idle lock ──────────────────────────────
  // Photos are intentionally excluded — File objects aren't serializable to
  // jsonb, so a restored draft never carries attached-but-unsaved photos;
  // the user re-attaches them after restoring.
  const draftState = useMemo(() => ({
    form, brandId, newBrandName, investors, labelNewArrival, labelHotSell, labelExpensive,
  }), [form, brandId, newBrandName, investors, labelNewArrival, labelHotSell, labelExpensive])

  const draft = useAutosaveDraft('inventory', draftState)

  useEffect(() => {
    setInactivityLogoutSuspended(true)
    return () => setInactivityLogoutSuspended(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { locked, resume } = useIdleLock(4 * 60 * 1000, () => { void draft.saveNow() })

  function applyDraft(d: typeof draftState) {
    setForm(d.form)
    setBrandId(d.brandId)
    setNewBrandName(d.newBrandName)
    setShowNewBrand(!!d.newBrandName)
    setInvestors(d.investors)
    setLabelNewArrival(d.labelNewArrival)
    setLabelHotSell(d.labelHotSell)
    setLabelExpensive(d.labelExpensive)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const totalPct = investors.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0)
  // watch_investors is RLS-denied for inventory_clerk — the investor split
  // isn't something a clerk can set, so skip the requirement and let a
  // super_admin/enterer fill it in later via edit.
  const investorsValid = form.inventory_type === 'consign' || isClerk
    ? true
    : investors.length > 0 && investors.every(i => i.investor_name.trim()) && Math.abs(totalPct - 100) < 0.01

  async function checkBrandDuplicate(name: string) {
    if (!name.trim()) { setBrandError(null); return }
    const supabase = createClient()
    const { data } = await supabase.from('brands').select('id').ilike('name', name.trim()).limit(1)
    setBrandError(data && data.length > 0 ? 'Brand already exists' : null)
  }

  async function save(isDraft: boolean) {
    if (!form.watch_name.trim()) { setError('Watch name is required.'); return }
    if (form.inventory_type === 'consign' && !form.consignee_name.trim()) { setError('Consignee name is required for a consigned watch.'); return }
    if (!investorsValid) { setError('Investor percentages must total exactly 100%.'); return }
    if (brandError) { setError('Please fix the brand error before saving.'); return }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      let resolvedBrandId = brandId
      if (showNewBrand && newBrandName.trim()) {
        const { data: brand } = await supabase
          .from('brands')
          .insert({ name: newBrandName.trim() })
          .select('id')
          .single()
        resolvedBrandId = brand?.id ?? null
      }

      const labels: string[] = []
      if (labelNewArrival) labels.push('new_arrival')
      if (labelHotSell)    labels.push('hot_sell')
      if (labelExpensive)  labels.push('expensive')

      const { data: watch, error: watchErr } = await supabase
        .from('watches')
        .insert({
          watch_id:       watchId,
          watch_name:     form.watch_name.trim(),
          reference:      form.reference.trim()      || null,
          serial_number:  form.serial_number.trim()  || null,
          date_on_card:   form.date_on_card           || null,
          condition:      form.condition,
          set_details:    form.set_details,
          inventory_type: form.inventory_type,
          consignee_name: form.inventory_type === 'consign' ? form.consignee_name.trim() : null,
          purchased_from: form.inventory_type === 'twb' ? (form.purchased_from.trim() || null) : null,
          date_acquired:  form.date_acquired || null,
          purchase_cost:  form.purchase_cost  ? num(form.purchase_cost)  : null,
          currency:       'LKR',
          status:         form.status,
          watch_status:   form.status,
          selling_price:  form.selling_price ? num(form.selling_price) : null,
          comments:       form.comments.trim()       || null,
          photos:         [],
          brand_id:       resolvedBrandId,
          labels,
          is_draft:       isDraft,
        })
        .select()
        .single()

      if (watchErr || !watch) {
        setError(watchErr?.message ?? 'Failed to save watch.')
        setLoading(false)
        return
      }

      const photoUrls: string[] = []
      for (const item of photoItems) {
        if (item.kind === 'file') {
          const ext = item.file.name.split('.').pop() ?? 'jpg'
          const path = `${watch.id}/photo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('watch-photos')
            .upload(path, item.file, { upsert: true })
          if (!upErr) {
            const { data } = supabase.storage.from('watch-photos').getPublicUrl(path)
            photoUrls.push(data.publicUrl)
          }
        }
      }
      if (photoUrls.length > 0) {
        await supabase.from('watches').update({ photos: photoUrls }).eq('id', watch.id)
      }

      const investorRows = form.inventory_type === 'twb' && !isClerk
        ? investors
            .filter(i => i.investor_name.trim())
            .map(i => ({
              watch_id:      watch.id,
              investor_name: i.investor_name,
              percentage:    parseFloat(i.percentage),
            }))
        : []

      if (investorRows.length > 0) {
        const { error: invErr } = await supabase.from('watch_investors').insert(investorRows)
        if (invErr) {
          await supabase.from('watches').delete().eq('id', watch.id)
          setError(invErr.message)
          setLoading(false)
          return
        }
      }

      void logActivity({ actionType: 'watch_created', entityType: 'watch', entityId: watch.id, entityLabel: form.watch_name.trim() })
      await draft.clearDraft()
      router.push('/dashboard/inventory?highlight=' + watch.id)
    } catch (err) {
      console.error('Watch save error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const handlePublish   = () => save(false)
  const handleSaveDraft = () => save(true)

  return (
    <div className="space-y-4">
      {locked && <IdleLockOverlay onResume={resume} />}

      {draft.status === 'prompt' && (
        <DraftBanner
          updatedAt={draft.pendingDraftUpdatedAt}
          onRestore={() => { const d = draft.restore(); if (d) applyDraft(d) }}
          onDiscard={() => void draft.discard()}
        />
      )}

      <div className="flex justify-end">
        <DraftSaveIndicator status={draft.saveStatus} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Watch Details ─────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Watch Details</p>
        <div className="space-y-4">

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Watch ID</p>
              <p className="text-base font-bold text-gray-900 tracking-wide font-mono">
                {loadingId ? '…' : (watchId ?? '—')}
              </p>
            </div>
          </div>

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
                {brandError && <p className="text-xs text-red-500">{brandError}</p>}
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
            <input type="text" value={form.watch_name} onChange={field('watch_name')} placeholder="e.g. Rolex Submariner" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Reference</label>
              <input type="text" value={form.reference} onChange={field('reference')} placeholder="116610LN" className={inp} />
            </div>
            <div>
              <label className={lbl}>Serial Number</label>
              <input type="text" value={form.serial_number} onChange={field('serial_number')} placeholder="R123456" className={inp} />
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
                {WATCH_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
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
            <label className={lbl}>Inventory Type</label>
            <select value={form.inventory_type} onChange={field('inventory_type')} className={inp}>
              {INVENTORY_TYPES.map(t => <option key={t} value={t}>{INVENTORY_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          {form.inventory_type === 'consign' && (
            <div>
              <label className={lbl}>Consignee Name *</label>
              <input type="text" value={form.consignee_name} onChange={field('consignee_name')} placeholder="Who is this watch consigned from?" className={inp} />
            </div>
          )}
          {form.inventory_type === 'twb' && (
            <div>
              <label className={lbl}>Purchased From</label>
              <input type="text" value={form.purchased_from} onChange={field('purchased_from')} placeholder="Seller name or source" className={inp} />
            </div>
          )}
          <div>
            <label className={lbl}>Date Acquired</label>
            <input type="date" value={form.date_acquired} onChange={field('date_acquired')} className={inp} />
            <p className="text-[11px] text-gray-400 mt-1">When was this watch purchased/acquired?</p>
          </div>
          <div>
            <label className={lbl}>{form.inventory_type === 'consign' ? 'Consignee Fee' : 'Purchase Cost'}</label>
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

      {/* ── Investors — hidden for inventory_clerk (watch_investors denied) ── */}
      {form.inventory_type === 'twb' && !isClerk && (
        <InvestorsCard investors={investors} setInvestors={setInvestors} totalPct={totalPct} investorsValid={investorsValid} />
      )}

      {/* ── Photos ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Photos</p>
        <PhotoUpload items={photoItems} onChange={setPhotoItems} />
      </div>

      {/* ── Notes ────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea
          value={form.comments} onChange={field('comments')}
          rows={3} placeholder="Any additional notes about this watch…"
          className={inp}
        />
      </div>

      {/* ── Action buttons ────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 pt-2 pb-1 flex-wrap">
        <button
          type="button"
          onClick={handlePublish}
          disabled={loading || !!brandError}
          className="flex items-center gap-1.5 bg-sidebar text-white text-[13px] font-medium px-5 py-2.5 rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {loading ? 'Saving…' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={loading || !!brandError}
          className="flex items-center gap-1.5 bg-card text-text-secondary text-[13px] font-medium px-5 py-2.5 rounded-lg border border-border hover:border-text-muted transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 10.5V3.5H3.5v9h7l3-3z" strokeLinejoin="round"/><path d="M13.5 10.5h-3v3" strokeLinejoin="round"/></svg>
          Save Draft
        </button>
        <Link
          href="/dashboard/inventory"
          className="flex items-center gap-1.5 text-[13px] font-medium text-negative px-5 py-2.5 rounded-lg border border-[#FEE2E2] hover:bg-[#FEE2E2] transition-colors ml-auto"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Discard
        </Link>
      </div>
    </div>
  )
}
