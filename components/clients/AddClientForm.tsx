'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { avatarColor, getInitials } from '@/lib/client-utils'
import { LEAD_REFERRALS, CLIENT_TYPES } from '@/types'
import type { LeadReferral, ClientType, SalesManager } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

const PHONE_COUNTRIES = [
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka',   id: 'LK' },
  { code: '+44',  flag: '🇬🇧', name: 'UK',           id: 'GB' },
  { code: '+1',   flag: '🇺🇸', name: 'US',           id: 'US' },
  { code: '+971', flag: '🇦🇪', name: 'UAE',          id: 'AE' },
  { code: '+91',  flag: '🇮🇳', name: 'India',        id: 'IN' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia',    id: 'AU' },
]

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

export default function AddClientForm({
  salesManagers = [],
  redirectTo = '/dashboard/clients',
}: {
  salesManagers?: SalesManager[]
  redirectTo?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', email: '', address: '', notes: '' })

  const [salesManagerId, setSalesManagerId] = useState<string>('')
  const [isVip,           setIsVip]          = useState(false)
  const [clubTwb,         setClubTwb]        = useState(false)
  const [labelPolitical,  setLabelPolitical] = useState(false)
  const [labelAtRisk,     setLabelAtRisk]    = useState(false)
  const [labelHighPot,    setLabelHighPot]   = useState(false)
  const [leadReferral,    setLeadReferral]   = useState<LeadReferral | ''>('')
  const [clientType,      setClientType]     = useState<ClientType | ''>('')

  // Phone
  const [phoneCountry,       setPhoneCountry]       = useState(PHONE_COUNTRIES[0])
  const [phoneNumber,        setPhoneNumber]         = useState('')
  const [phoneError,         setPhoneError]          = useState<string | null>(null)
  const [showCountryPicker,  setShowCountryPicker]   = useState(false)
  const phonePickerRef = useRef<HTMLDivElement>(null)

  // Email
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

  const previewColor = avatarColor(form.name || 'C', null)

  function validateEmail() {
    if (!form.email.trim()) { setEmailError(null); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setEmailError('Invalid email address')
    } else {
      setEmailError(null)
    }
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
      .limit(1)
    if (data && data.length > 0) {
      setPhoneError(`This number already exists (${data[0].name})`)
    } else {
      setPhoneError(null)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

    const supabase = createClient()
    const { error: err } = await supabase.from('clients').insert({
      name:          form.name.trim(),
      email:         form.email.trim()   || null,
      phone:         buildFullPhone(),
      address:       form.address.trim() || null,
      sales_manager: salesManagerName,
      profile_notes: form.notes.trim()   || null,
      is_vip:        isVip,
      club_twb:      clubTwb,
      lead_referral: leadReferral || null,
      client_type:   clientType   || null,
      avatar_color:  null,
      labels,
    })

    if (err) { setError(err.message); setLoading(false); return }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
              {getInitials(form.name || 'C')}
            </div>
            <p className="text-xs text-gray-400">Avatar colour is assigned automatically from the client&apos;s name.</p>
          </div>

          <div>
            <label className={lbl}>Name *</label>
            <input type="text" value={form.name} onChange={field('name')} placeholder="Full name" className={inp} required />
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
              <p className="text-xs text-gray-400 italic py-2">No sales managers configured.</p>
            )}
          </div>

          <div>
            <label className={lbl}>Status</label>
            <div className="flex gap-2 flex-wrap">
              <Toggle label="★ VIP"    checked={isVip}   onChange={setIsVip} />
              <Toggle label="Club TWB" checked={clubTwb} onChange={setClubTwb} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact ──────────────────────────────────────── */}
      <div className={card}>
        <p className={cardTitle}>Contact</p>
        <div className="space-y-4">
          {/* Phone with collapsible country picker */}
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
              placeholder="email@example.com"
              className={`${inp} ${emailError ? 'border-red-300 focus:ring-red-500' : ''}`}
            />
            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
          </div>

          <div>
            <label className={lbl}>Address</label>
            <input type="text" value={form.address} onChange={field('address')} placeholder="Street, City" className={inp} />
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
        <textarea value={form.notes} onChange={field('notes')} rows={3} placeholder="Any notes about this client…" className={inp} />
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <button
          type="submit" disabled={loading}
          className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Add Client'}
        </button>
        <Link href="/dashboard/clients" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
