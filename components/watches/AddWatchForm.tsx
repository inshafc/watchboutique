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
import { INK, INK_45, INK_60, CARD_BG, GREEN, RED, AMBER, BLUE, RADII, CARD_PADDING } from '@/lib/design-tokens'
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

// Values pulled from Add Watch.dc.html that don't match anything in
// lib/design-tokens.ts. Flagged here rather than rounded to an existing
// token (e.g. .42 is NOT INK_45's .45; 52px is NOT CONTROL_HEIGHT_LG's 54px)
// — see the PR description for the full list of candidates to promote.
const LABEL_INK    = 'rgba(20,20,15,.42)' // section eyebrow labels
const FIELD_BORDER = 'rgba(20,20,15,.12)' // default input/select/segment border
const CHIP_BORDER  = 'rgba(20,20,15,.05)' // Watch ID chip border
const FIELD_H      = 52                    // input/select/segment height
const SEGMENT_H    = 44                    // pill-segment height
const CHIP_RADIUS  = 16                    // Watch ID chip / notes textarea radius

const fieldStyle: React.CSSProperties = {
  height: FIELD_H, padding: '0 18px', border: `1px solid ${FIELD_BORDER}`,
  borderRadius: RADII.sm, background: '#fff', fontSize: 15, color: INK, outline: 'none', width: '100%',
}

function Section({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white flex flex-col gap-5" style={{ borderRadius: RADII.lg, padding: CARD_PADDING }}>
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: LABEL_INK }}>{label}</span>
        {right && <span className="ml-auto text-[12px]" style={{ color: LABEL_INK }}>{right}</span>}
      </div>
      {children}
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '.08em', color: INK_45 }}>{children}</span>
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function Segment<T extends string>({
  options, labels, value, onChange, tone, pill,
}: {
  options: readonly T[]
  labels?: Record<T, string>
  value: T
  onChange: (v: T) => void
  tone?: Partial<Record<T, { bg: string; fg: string }>>
  pill?: boolean
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const active = value === opt
        const t = tone?.[opt]
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`font-semibold transition-colors ${pill ? '' : 'flex-1'}`}
            style={{
              height: pill ? SEGMENT_H : FIELD_H,
              padding: pill ? '0 20px' : '0 12px',
              borderRadius: pill ? RADII.pill : RADII.sm,
              border: `1px solid ${active ? (t?.fg ?? INK) : FIELD_BORDER}`,
              background: active ? (t?.bg ?? INK) : '#fff',
              color: active ? (t?.fg ?? '#fff') : 'rgba(20,20,15,.6)',
              fontSize: pill ? 13.5 : 14,
            }}
          >
            {labels?.[opt] ?? opt}
          </button>
        )
      })}
    </div>
  )
}

function LabelToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 font-semibold transition-colors"
      style={{
        height: SEGMENT_H, padding: '0 18px', borderRadius: RADII.pill,
        border: `1px solid ${checked ? INK : FIELD_BORDER}`,
        background: checked ? INK : '#fff',
        color: checked ? '#fff' : 'rgba(20,20,15,.6)',
        fontSize: 13.5,
      }}
    >
      <span
        className="rounded-full flex items-center justify-center shrink-0"
        style={{ width: 14, height: 14, border: `2px solid ${checked ? '#fff' : 'rgba(20,20,15,.25)'}` }}
      >
        {checked && <span className="rounded-full" style={{ width: 6, height: 6, background: '#fff' }} />}
      </span>
      {label}
    </button>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm" style={{ background: 'rgba(178,58,44,.07)', border: `1px solid rgba(178,58,44,.25)`, color: RED, borderRadius: RADII.sm, padding: '12px 16px' }}>
      {children}
    </div>
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

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const totalPct = investors.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0)
  // watch_investors is RLS-denied for inventory_clerk — the investor split
  // isn't something a clerk can set, so skip the requirement and let a
  // super_admin/enterer fill it in later via edit.
  const investorsValid = form.inventory_type === 'consign' || isClerk
    ? true
    : investors.length > 0 && investors.every(i => i.investor_name.trim()) && Math.abs(totalPct - 100) < 0.01

  // Expected-margin preview — purely derived from cost/price already in
  // state, mirrors the formula used on the watch detail page. Add Watch.dc.html
  // also shows a generic "Investor payout" figure computed as margin * 0.6,
  // which doesn't correspond to the real per-investor percentages entered
  // below; that tile is dropped rather than shown with a fabricated number
  // (see PR description).
  const margin = useMemo(() => {
    const c = form.purchase_cost ? num(form.purchase_cost) : 0
    const p = form.selling_price ? num(form.selling_price) : 0
    if (!(c > 0) || !(p > 0)) return null
    const amount = p - c
    return { amount, pct: (amount / p) * 100 }
  }, [form.purchase_cost, form.selling_price])

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
    <div className="flex flex-col gap-4" style={{ color: INK }}>
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

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {/* ── Watch details ──────────────────────────────────── */}
      <Section label="Watch details">
        <div className="flex items-center gap-4" style={{ borderRadius: CHIP_RADIUS, background: CARD_BG, border: `1px solid ${CHIP_BORDER}`, padding: '16px 20px' }}>
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Watch ID</span>
            <span className="text-[20px] font-semibold tabular-nums" style={{ letterSpacing: '.01em' }}>{loadingId ? '…' : (watchId ?? '—')}</span>
          </div>
          <span className="ml-auto text-[12px]" style={{ color: LABEL_INK }}>Generated automatically</span>
        </div>

        {/* Brand — kept as a native select (unchanged interaction/validation);
            the mockup's custom dropdown renders a per-brand logo image, which
            our Brand type doesn't carry (id/name/color only, no logo asset) —
            flagged rather than faked. */}
        <Field label="Brand">
          {showNewBrand ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={e => { setNewBrandName(e.target.value); setBrandError(null) }}
                  onBlur={() => checkBrandDuplicate(newBrandName)}
                  placeholder="Enter brand name"
                  style={fieldStyle}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setShowNewBrand(false); setNewBrandName(''); setBrandError(null) }}
                  className="shrink-0 font-semibold"
                  style={{ height: FIELD_H, padding: '0 18px', borderRadius: RADII.sm, border: `1px solid ${FIELD_BORDER}`, background: '#fff', color: INK_60, fontSize: 13.5 }}
                >
                  Cancel
                </button>
              </div>
              {brandError && <p className="text-xs" style={{ color: RED }}>{brandError}</p>}
            </div>
          ) : (
            <select
              value={brandId ?? ''}
              onChange={e => {
                if (e.target.value === '__new__') { setShowNewBrand(true); setBrandId(null) }
                else setBrandId(e.target.value || null)
              }}
              style={{ ...fieldStyle, padding: '0 18px' }}
            >
              <option value="">— Select brand —</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              <option value="__new__">+ Add new brand</option>
            </select>
          )}
        </Field>

        <Field label={<>Watch name <span style={{ color: RED }}>*</span></>}>
          <input type="text" value={form.watch_name} onChange={field('watch_name')} placeholder="e.g. Rolex Submariner Date" style={fieldStyle} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Reference">
            <input type="text" value={form.reference} onChange={field('reference')} placeholder="116610LN" style={fieldStyle} />
          </Field>
          <Field label="Serial number">
            <input type="text" value={form.serial_number} onChange={field('serial_number')} placeholder="R123456" style={fieldStyle} />
          </Field>
          <Field label="Date on card">
            <input type="date" value={form.date_on_card} onChange={field('date_on_card')} style={fieldStyle} />
          </Field>
          <Field label="Condition">
            <Segment options={WATCH_CONDITIONS} labels={CONDITION_LABELS} value={form.condition} onChange={v => setField('condition', v)} />
          </Field>
        </div>

        <Field label="Set details">
          <Segment options={WATCH_SET_DETAILS} value={form.set_details} onChange={v => setField('set_details', v)} pill />
        </Field>
      </Section>

      {/* ── Purchase ───────────────────────────────────────── */}
      <Section label="Purchase">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inventory type">
            <Segment
              options={INVENTORY_TYPES}
              labels={INVENTORY_TYPE_LABELS}
              value={form.inventory_type}
              onChange={v => setField('inventory_type', v)}
              tone={{ consign: { bg: 'rgba(63,95,138,.14)', fg: BLUE } }}
            />
          </Field>
          {form.inventory_type === 'consign' ? (
            <Field label={<>Consignee name <span style={{ color: RED }}>*</span></>}>
              <input type="text" value={form.consignee_name} onChange={field('consignee_name')} placeholder="Who is this watch consigned from?" style={fieldStyle} />
            </Field>
          ) : (
            <Field label="Purchased from">
              <input type="text" value={form.purchased_from} onChange={field('purchased_from')} placeholder="Seller name or source" style={fieldStyle} />
            </Field>
          )}
          <Field label="Date acquired">
            <input type="date" value={form.date_acquired} onChange={field('date_acquired')} style={fieldStyle} />
          </Field>
          <Field label={form.inventory_type === 'consign' ? 'Consignee fee' : 'Purchase cost'}>
            <CurrencyInput value={form.purchase_cost} onChange={v => setForm(f => ({ ...f, purchase_cost: v }))} />
          </Field>
        </div>
      </Section>

      {/* ── Sale ───────────────────────────────────────────── */}
      <Section label="Sale">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Segment
              options={WATCH_STATUSES}
              value={form.status}
              onChange={v => setField('status', v)}
              pill
              tone={{
                'Available': { bg: 'rgba(31,111,67,.12)', fg: GREEN },
                'On Hold':   { bg: 'rgba(181,118,26,.16)', fg: AMBER },
                'Sold':      { bg: 'rgba(20,20,15,.09)',   fg: INK_60 },
              }}
            />
          </Field>
          <Field label="Selling price">
            <CurrencyInput value={form.selling_price} onChange={v => setForm(f => ({ ...f, selling_price: v }))} />
          </Field>
        </div>

        <div
          className="flex items-center gap-6"
          style={{
            borderRadius: RADII.md, padding: '18px 22px',
            background: margin == null ? CARD_BG : margin.amount >= 0 ? 'rgba(31,111,67,.07)' : 'rgba(178,58,44,.07)',
            border: `1px solid ${margin == null ? 'rgba(20,20,15,.06)' : margin.amount >= 0 ? 'rgba(31,111,67,.2)' : 'rgba(178,58,44,.2)'}`,
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Expected margin</span>
            <span className="text-[26px] font-semibold tabular-nums" style={{ letterSpacing: '-.03em', lineHeight: 1, color: margin == null ? 'rgba(20,20,15,.35)' : margin.amount >= 0 ? GREEN : RED }}>
              {margin == null ? '—' : `${margin.amount >= 0 ? '+ ' : '− '}LKR ${Math.abs(margin.amount).toLocaleString('en-LK')}`}
            </span>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: '.09em', color: LABEL_INK }}>Margin %</span>
            <span className="text-[20px] font-semibold tabular-nums" style={{ letterSpacing: '-.02em', color: margin == null ? 'rgba(20,20,15,.35)' : margin.amount >= 0 ? GREEN : RED }}>
              {margin == null ? '—' : `${margin.pct >= 0 ? '+' : '−'}${Math.abs(margin.pct).toFixed(1)}%`}
            </span>
          </div>
        </div>
      </Section>

      {/* ── Labels — no mockup reference; styled to match the segmented-pill
             language used throughout the rest of this design ──────────── */}
      <Section label="Labels">
        <div className="flex gap-2 flex-wrap">
          <LabelToggle label="New Arrival" checked={labelNewArrival} onChange={setLabelNewArrival} />
          <LabelToggle label="🔥 Hot Sell"  checked={labelHotSell}    onChange={setLabelHotSell} />
          <LabelToggle label="💰 Expensive" checked={labelExpensive}  onChange={setLabelExpensive} />
        </div>
      </Section>

      {/* ── Investors — hidden for inventory_clerk (watch_investors denied).
             InvestorsCard is shared with Edit Watch; left unrestyled so this
             change doesn't silently ripple into that page. ─────────────── */}
      {form.inventory_type === 'twb' && !isClerk && (
        <InvestorsCard investors={investors} setInvestors={setInvestors} totalPct={totalPct} investorsValid={investorsValid} />
      )}

      {/* ── Photos — PhotoUpload is shared with Edit Watch; left unrestyled
             for the same reason. ───────────────────────────────────────── */}
      <Section label="Photos">
        <PhotoUpload items={photoItems} onChange={setPhotoItems} />
      </Section>

      {/* ── Notes ──────────────────────────────────────────── */}
      <Section label="Notes">
        <textarea
          value={form.comments} onChange={field('comments')}
          rows={4} placeholder="Any additional notes about this watch…"
          className="resize-y"
          style={{ padding: '16px 18px', border: `1px solid ${FIELD_BORDER}`, borderRadius: CHIP_RADIUS, background: '#fff', fontSize: 15, lineHeight: 1.5, color: INK, outline: 'none', minHeight: 130, width: '100%' }}
        />
      </Section>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap" style={{ padding: '4px 0 40px' }}>
        <button
          type="button"
          onClick={handlePublish}
          disabled={loading || !!brandError}
          className="flex items-center gap-2.5 font-semibold transition-colors disabled:opacity-50"
          style={{ height: FIELD_H, padding: '0 26px', border: 0, borderRadius: RADII.pill, background: INK, color: '#fff', fontSize: 14.5 }}
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4.4 10.4 8.2 14l7.4-8"/></svg>
          {loading ? 'Saving…' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={loading || !!brandError}
          className="flex items-center gap-2.5 font-semibold transition-colors disabled:opacity-50"
          style={{ height: FIELD_H, padding: '0 24px', border: `1px solid ${FIELD_BORDER}`, borderRadius: RADII.pill, background: '#fff', color: INK, fontSize: 14.5 }}
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.4 4.4h9.2l3 3v8.2H4.4z"/><path d="M7 4.4v4h6M7 16v-4h6v4"/></svg>
          Save draft
        </button>
        <Link
          href="/dashboard/inventory"
          className="flex items-center gap-2.5 font-semibold transition-colors ml-auto"
          style={{ height: FIELD_H, padding: '0 24px', border: `1px solid rgba(178,58,44,.25)`, borderRadius: RADII.pill, background: '#fff', color: RED, fontSize: 14.5 }}
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={RED} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.6 5.8h10.8M8.2 5.8V4.2h3.6v1.6M6 5.8l.7 10h6.6l.7-10"/></svg>
          Discard
        </Link>
      </div>
    </div>
  )
}
