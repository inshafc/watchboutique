'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import { LEAD_REFERRALS, CLIENT_TYPES } from '@/types'
import type { Client, LeadReferral, ClientType, SalesManager } from '@/types'

const inp = 'w-full bg-card border border-border text-text-primary rounded-lg px-3.5 py-2.5 text-[13px] placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition-all'
const lbl = 'block text-[11px] font-medium text-text-secondary uppercase tracking-[0.08em] mb-1.5'
const card = 'bg-card border border-border rounded-xl p-5 md:p-6'
const cardTitle = 'text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-4'

const PHONE_COUNTRIES = [
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka',   id: 'LK' },
  { code: '+44',  flag: '🇬🇧', name: 'UK',           id: 'GB' },
  { code: '+1',   flag: '🇺🇸', name: 'US',           id: 'US' },
  { code: '+971', flag: '🇦🇪', name: 'UAE',          id: 'AE' },
  { code: '+91',  flag: '🇮🇳', name: 'India',        id: 'IN' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia',    id: 'AU' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MonthDayPicker({
  month, day, onMonthChange, onDayChange,
}: {
  month: string; day: string
  onMonthChange: (m: string) => void
  onDayChange: (d: string) => void
}) {
  const daysInMonth = month ? new Date(2000, parseInt(month), 0).getDate() : 31
  return (
    <div className="flex gap-2">
      <select
        value={month}
        onChange={e => {
          onMonthChange(e.target.value)
          if (day && parseInt(day) > new Date(2000, parseInt(e.target.value), 0).getDate()) onDayChange('')
        }}
        className={`${inp} flex-1`}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      <select
        value={day}
        onChange={e => onDayChange(e.target.value)}
        disabled={!month}
        className={`${inp} w-24`}
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
        ))}
      </select>
    </div>
  )
}

function detectCountry(phone: string | null) {
  if (!phone) return PHONE_COUNTRIES[0]
  if (phone.startsWith('+94') || phone.startsWith('0')) return PHONE_COUNTRIES[0]
  for (const c of PHONE_COUNTRIES) {
    if (phone.startsWith(c.code)) return c
  }
  return PHONE_COUNTRIES[0]
}

function extractNumber(phone: string | null, country: typeof PHONE_COUNTRIES[number]) {
  if (!phone) return ''
  if (country.id === 'LK') {
    if (phone.startsWith('+94')) {
      const local = phone.slice(3)
      return local.startsWith('0') ? local : '0' + local
    }
    return phone
  }
  if (phone.startsWith(country.code)) return phone.slice(country.code.length)
  return phone
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        checked
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'border-white' : 'border-gray-300'}`}>
        {checked && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
    </button>
  )
}

function initStatusTier(client: Client): 'General' | 'VIP' | 'Club TWB' {
  if (client.status_tier === 'Club TWB' || client.club_twb) return 'Club TWB'
  if (client.status_tier === 'VIP' || client.is_vip) return 'VIP'
  return 'General'
}

function parseMonthDay(mmdd: string | null | undefined): { month: string; day: string } {
  if (!mmdd) return { month: '', day: '' }
  const parts = mmdd.split('-')
  if (parts.length !== 2) return { month: '', day: '' }
  return { month: parts[0], day: parts[1] }
}

export default function EditClientForm({
  client,
  salesManagers = [],
}: {
  client: Client
  salesManagers?: SalesManager[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    name:    client.name,
    email:   client.email    ?? '',
    address: client.address  ?? '',
    notes:   client.profile_notes ?? client.notes ?? '',
  })

  const initialSmId = salesManagers.find(sm => sm.name === client.sales_manager)?.id ?? ''
  const [salesManagerId, setSalesManagerId] = useState<string>(initialSmId)
  const [statusTier,     setStatusTier]     = useState<'General' | 'VIP' | 'Club TWB'>(initStatusTier(client))
  const existingLabels = client.labels ?? []
  const [labelPolitical, setLabelPolitical]  = useState(existingLabels.includes('political'))
  const [labelAtRisk,    setLabelAtRisk]     = useState(existingLabels.includes('at_risk'))
  const [labelHighPot,   setLabelHighPot]    = useState(existingLabels.includes('high_potential'))
  const [leadReferral,   setLeadReferral]    = useState<LeadReferral | ''>(client.lead_referral ?? '')
  const [clientType,     setClientType]      = useState<ClientType | ''>(client.client_type ?? '')

  // Birthday / Anniversary
  const initBday  = parseMonthDay(client.birthday)
  const initAnniv = parseMonthDay(client.anniversary)
  const [bdayMonth,  setBdayMonth]  = useState(initBday.month)
  const [bdayDay,    setBdayDay]    = useState(initBday.day)
  const [annivMonth, setAnnivMonth] = useState(initAnniv.month)
  const [annivDay,   setAnnivDay]   = useState(initAnniv.day)

  // Phone
  const initCountry = detectCountry(client.phone)
  const [phoneCountry,      setPhoneCountry]      = useState(initCountry)
  const [phoneNumber,       setPhoneNumber]        = useState(extractNumber(client.phone, initCountry))
  const [phoneError,        setPhoneError]         = useState<string | null>(null)
  const [showCountryPicker, setShowCountryPicker]  = useState(false)
  const phonePickerRef = useRef<HTMLDivElement>(null)

  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    if (!showCountryPicker) return
    function close(e: MouseEvent) {
      if (phonePickerRef.current && !phonePickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showCountryPicker])

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const previewColor = avatarColor(form.name || client.name, null)

  function validateEmail() {
    if (!form.email.trim()) { setEmailError(null); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setEmailError('Invalid email address')
    } else {
      setEmailError(null)
    }
  }

  function buildFullPhone(): string | null {
    if (!phoneNumber.trim()) return null
    if (phoneCountry.id === 'LK') {
      const digits = phoneNumber.replace(/\D/g, '')
      return '+94' + (digits.startsWith('0') ? digits.slice(1) : digits)
    }
    return phoneCountry.code + phoneNumber.replace(/\s/g, '')
  }

  async function validatePhone() {
    if (!phoneNumber.trim()) { setPhoneError(null); return }
    if (phoneCountry.id === 'LK') {
      const digits = phoneNumber.replace(/\D/g, '')
      if (digits.length !== 10 || !digits.startsWith('0')) {
        setPhoneError('Sri Lanka number must be 10 digits starting with 0')
        return
      }
    }
    const full = buildFullPhone()
    if (!full) return
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('phone', full)
      .is('deleted_at', null)
      .neq('id', client.id)
      .limit(1)
    if (data && data.length > 0) {
      setPhoneError(`This number already exists (${data[0].name})`)
    } else {
      setPhoneError(null)
    }
  }

  async function handleSave(isDraft: boolean) {
    if (!form.name.trim()) { setError('Client name is required.'); return }
    if (emailError) { setError('Please fix the email error before saving.'); return }
    if (phoneError) { setError('Please fix the phone error before saving.'); return }

    setLoading(true)
    setError(null)

    const salesManagerName = salesManagers.find(sm => sm.id === salesManagerId)?.name ?? null
    const labels: string[] = []
    if (labelPolitical) labels.push('political')
    if (labelAtRisk)    labels.push('at_risk')
    if (labelHighPot)   labels.push('high_potential')

    const birthday    = bdayMonth && bdayDay    ? `${bdayMonth}-${bdayDay}` : null
    const anniversary = annivMonth && annivDay  ? `${annivMonth}-${annivDay}` : null

    const supabase = createClient()
    const { error: err } = await supabase
      .from('clients')
      .update({
        name:          form.name.trim(),
        email:         form.email.trim()   || null,
        phone:         buildFullPhone(),
        address:       form.address.trim() || null,
        sales_manager: salesManagerName,
        profile_notes: form.notes.trim()   || null,
        is_vip:        statusTier === 'VIP',
        club_twb:      statusTier === 'Club TWB',
        status_tier:   statusTier,
        lead_referral: leadReferral || null,
        client_type:   clientType   || null,
        avatar_color:  null,
        labels,
        is_draft:      isDraft,
        birthday,
        anniversary,
      })
      .eq('id', client.id)

    if (err) { setError(err.message); setLoading(false); return }

    router.push(`/dashboard/clients/${client.id}`)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Delete ${client.name}? They will be moved to the deleted tab.`)) return
    const supabase = createClient()
    await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', client.id)
    router.push('/dashboard/clients')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Profile ──────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Profile</p>
        <div className="space-y-5">

          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${previewColor}`}>
              {getInitials(form.name || client.name)}
            </div>
            <p className="text-xs text-gray-400">Avatar colour is assigned automatically from the client&apos;s name.</p>
          </div>

          <div>
            <label className={lbl}>Name *</label>
            <input type="text" value={form.name} onChange={field('name')} className={inp} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Client Type</label>
              <select value={clientType} onChange={e => setClientType(e.target.value as ClientType | '')} className={inp}>
                <option value="">— Select —</option>
                {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Lead Referral</label>
              <select value={leadReferral} onChange={e => setLeadReferral(e.target.value as LeadReferral | '')} className={inp}>
                <option value="">— Select —</option>
                {LEAD_REFERRALS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Sales Manager</label>
            {salesManagers.length > 0 ? (
              <select value={salesManagerId} onChange={e => setSalesManagerId(e.target.value)} className={inp}>
                <option value="">— Select —</option>
                {salesManagers.map(sm => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic py-2">{client.sales_manager ?? 'No sales managers configured.'}</p>
            )}
          </div>

          <div>
            <label className={lbl}>Status Tier</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {(['General', 'VIP', 'Club TWB'] as const).map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setStatusTier(tier)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                    statusTier === tier
                      ? tier === 'Club TWB'
                        ? 'bg-amber-600 text-white'
                        : tier === 'VIP'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tier === 'VIP' ? '★ VIP' : tier === 'Club TWB' ? '★ Club TWB' : tier}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact ──────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Contact</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Phone</label>
            <div className="flex gap-2">
              <div ref={phonePickerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(v => !v)}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 h-full"
                >
                  <span className="text-base leading-none">{phoneCountry.flag}</span>
                  {phoneCountry.id !== 'LK' && (
                    <span className="text-gray-600 text-xs font-medium">{phoneCountry.code}</span>
                  )}
                  <svg className="w-3 h-3 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                  </svg>
                </button>
                {showCountryPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                    {PHONE_COUNTRIES.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setPhoneCountry(c); setShowCountryPicker(false); setPhoneError(null) }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${phoneCountry.id === c.id ? 'bg-gray-50' : ''}`}
                      >
                        <span className="text-base">{c.flag}</span>
                        <span className="text-gray-400 text-xs w-10 shrink-0">{c.code}</span>
                        <span className="text-gray-700">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => { setPhoneNumber(e.target.value); setPhoneError(null) }}
                onBlur={validatePhone}
                placeholder={phoneCountry.id === 'LK' ? '07XXXXXXXX' : 'Number'}
                className={inp}
              />
            </div>
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
          </div>

          <div>
            <label className={lbl}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={field('email')}
              onBlur={validateEmail}
              className={`${inp} ${emailError ? 'border-red-300 focus:ring-red-500' : ''}`}
            />
            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
          </div>

          <div>
            <label className={lbl}>Address</label>
            <input type="text" value={form.address} onChange={field('address')} className={inp} />
          </div>
        </div>
      </div>

      {/* ── Customer Relationship ────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Customer Relationship</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Birthday</label>
            <MonthDayPicker
              month={bdayMonth} day={bdayDay}
              onMonthChange={setBdayMonth} onDayChange={setBdayDay}
            />
          </div>
          <div>
            <label className={lbl}>Anniversary</label>
            <MonthDayPicker
              month={annivMonth} day={annivDay}
              onMonthChange={setAnnivMonth} onDayChange={setAnnivDay}
            />
          </div>
        </div>
      </div>

      {/* ── Labels ───────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Labels</p>
        <div className="flex gap-2 flex-wrap">
          <Toggle label="Political"      checked={labelPolitical} onChange={setLabelPolitical} />
          <Toggle label="At Risk"        checked={labelAtRisk}    onChange={setLabelAtRisk} />
          <Toggle label="High Potential" checked={labelHighPot}   onChange={setLabelHighPot} />
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.notes} onChange={field('notes')} rows={3} className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 pb-8 flex-wrap">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={loading}
          className="bg-sidebar text-white text-[13px] font-medium px-6 py-2.5 rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={loading}
          className="bg-card text-text-secondary text-[13px] font-medium px-6 py-2.5 rounded-lg border border-border hover:border-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Draft
        </button>
        <Link href={`/dashboard/clients/${client.id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="text-sm text-red-400 hover:text-red-600 transition-colors"
        >
          Delete client
        </button>
      </div>
    </div>
  )
}
