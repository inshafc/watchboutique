'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AVATAR_COLOR_OPTIONS, avatarColor, getInitials } from '@/lib/client-utils'
import { LEAD_REFERRALS, CLIENT_TYPES } from '@/types'
import type { LeadReferral, ClientType } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'
const card = 'bg-white border border-gray-100 rounded-2xl p-5 md:p-6'
const cardTitle = 'text-sm font-semibold text-gray-800 mb-4'

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

export default function AddClientForm({ redirectTo = '/dashboard/clients' }: { redirectTo?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    name:         '',
    whatsapp:     '',
    email:        '',
    phone:        '',
    instagram:    '',
    address:      '',
    sales_manager:'',
    notes:        '',
  })
  const [isVip,        setIsVip]        = useState(false)
  const [clubTwb,      setClubTwb]      = useState(false)
  const [leadReferral, setLeadReferral] = useState<LeadReferral | ''>('')
  const [clientType,   setClientType]   = useState<ClientType | ''>('')
  const [avatarColorVal, setAvatarColorVal] = useState<string | null>(null)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  const previewColor = avatarColor(form.name || 'C', avatarColorVal)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('clients').insert({
      name:          form.name.trim(),
      whatsapp:      form.whatsapp.trim()      || null,
      email:         form.email.trim()         || null,
      phone:         form.phone.trim()         || null,
      instagram:     form.instagram.trim()     || null,
      address:       form.address.trim()       || null,
      sales_manager: form.sales_manager.trim() || null,
      profile_notes: form.notes.trim()         || null,
      is_vip:        isVip,
      club_twb:      clubTwb,
      lead_referral: leadReferral || null,
      client_type:   clientType   || null,
      avatar_color:  avatarColorVal,
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

          {/* Avatar preview + color picker */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${previewColor}`}>
              {getInitials(form.name || 'C')}
            </div>
            <div>
              <p className={lbl}>Avatar Colour</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.hex}
                    type="button"
                    onClick={() => setAvatarColorVal(v => v === opt.classes ? null : opt.classes)}
                    className="w-7 h-7 rounded-full ring-offset-2 transition-all"
                    style={{ backgroundColor: opt.hex }}
                    aria-label={opt.classes}
                  >
                    {avatarColorVal === opt.classes && (
                      <span className="flex items-center justify-center w-full h-full">
                        <svg className="w-3.5 h-3.5 text-gray-700" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
                {avatarColorVal && (
                  <button
                    type="button"
                    onClick={() => setAvatarColorVal(null)}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Name *</label>
            <input type="text" value={form.name} onChange={field('name')} placeholder="Full name" className={inp} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Client Type</label>
              <select
                value={clientType}
                onChange={e => setClientType(e.target.value as ClientType | '')}
                className={inp}
              >
                <option value="">— Select —</option>
                {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Lead Referral</label>
              <select
                value={leadReferral}
                onChange={e => setLeadReferral(e.target.value as LeadReferral | '')}
                className={inp}
              >
                <option value="">— Select —</option>
                {LEAD_REFERRALS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Sales Manager</label>
            <input type="text" value={form.sales_manager} onChange={field('sales_manager')} placeholder="Name of sales manager" className={inp} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={field('whatsapp')} placeholder="+94 77 123 4567" className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input type="text" value={form.phone} onChange={field('phone')} placeholder="+94 11 234 5678" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" className={inp} />
          </div>
          <div>
            <label className={lbl}>Instagram</label>
            <input type="text" value={form.instagram} onChange={field('instagram')} placeholder="@username" className={inp} />
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input type="text" value={form.address} onChange={field('address')} placeholder="Street, City" className={inp} />
          </div>
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
