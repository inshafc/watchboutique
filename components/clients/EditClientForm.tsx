'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'

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

export default function EditClientForm({ client }: { client: Client }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    name:      client.name,
    whatsapp:  client.whatsapp  ?? '',
    email:     client.email     ?? '',
    phone:     client.phone     ?? '',
    instagram: client.instagram ?? '',
    notes:     client.notes     ?? '',
  })
  const [isVip,   setIsVip]   = useState(client.is_vip)
  const [clubTwb, setClubTwb] = useState(client.club_twb)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase
      .from('clients')
      .update({
        name:      form.name.trim(),
        whatsapp:  form.whatsapp.trim()  || null,
        email:     form.email.trim()     || null,
        phone:     form.phone.trim()     || null,
        instagram: form.instagram.trim() || null,
        notes:     form.notes.trim()     || null,
        is_vip:    isVip,
        club_twb:  clubTwb,
      })
      .eq('id', client.id)

    if (err) { setError(err.message); setLoading(false); return }

    router.push(`/dashboard/clients/${client.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className={card}>
        <p className={cardTitle}>Profile</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Name *</label>
            <input type="text" value={form.name} onChange={field('name')} className={inp} required />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <div className="flex gap-2 flex-wrap">
              <Toggle label="⭐ VIP"   checked={isVip}   onChange={setIsVip} />
              <Toggle label="Club TWB" checked={clubTwb} onChange={setClubTwb} />
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <p className={cardTitle}>Contact</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={field('whatsapp')} className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input type="text" value={form.phone} onChange={field('phone')} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={form.email} onChange={field('email')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Instagram</label>
            <input type="text" value={form.instagram} onChange={field('instagram')} className={inp} />
          </div>
        </div>
      </div>

      <div className={card}>
        <p className={cardTitle}>Notes</p>
        <textarea value={form.notes} onChange={field('notes')} rows={3} className={inp} />
      </div>

      <div className="flex items-center gap-4 pt-2 pb-8">
        <button
          type="submit" disabled={loading}
          className="bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <Link href={`/dashboard/clients/${client.id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
