'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BusyButton from '@/components/ui/BusyButton'
import type { SavedBank } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'

export default function InvoicingSettingsSection({
  initialPrefix,
  initialTerms,
  initialBankId,
  banks,
}: {
  initialPrefix: string
  initialTerms:  string
  initialBankId: string
  banks:         SavedBank[]
}) {
  const [prefix, setPrefix] = useState(initialPrefix)
  const [terms,  setTerms]  = useState(initialTerms)
  const [bankId, setBankId] = useState(initialBankId)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: upErr } = await supabase.from('app_settings').upsert([
      { key: 'invoice_number_prefix',   value: prefix.trim() || 'TWB' },
      { key: 'invoice_default_terms',   value: terms.trim() || null },
      { key: 'invoice_default_bank_id', value: bankId || null },
    ], { onConflict: 'key' })
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const year = new Date().getFullYear()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">Invoicing</h2>
        <p className="text-sm text-gray-400 mt-0.5">Numbering, default terms, and the default bank for new invoices</p>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="space-y-4 max-w-md">
        <div>
          <label className={lbl}>Invoice Number Prefix</label>
          <input type="text" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="TWB" className={inp} />
          <p className="text-[11px] text-gray-400 mt-1">
            Next invoice issued this year will look like {prefix.trim() || 'TWB'}-{year}-0001. Credit notes use {prefix.trim() || 'TWB'}-CN-{year}-0001.
          </p>
        </div>

        <div>
          <label className={lbl}>Default Terms &amp; Conditions</label>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} placeholder="e.g. All sales are final. No returns accepted…" className={inp} />
          <p className="text-[11px] text-gray-400 mt-1">Pre-filled on new invoices — each one can still be edited individually.</p>
        </div>

        <div>
          <label className={lbl}>Default Bank</label>
          <select value={bankId} onChange={e => setBankId(e.target.value)} className={inp}>
            <option value="">— None —</option>
            {banks.filter(b => b.is_active).map(b => (
              <option key={b.id} value={b.id}>{b.bank_name}{b.account_number ? ` · ${b.account_number}` : ''}</option>
            ))}
          </select>
        </div>

        <BusyButton
          onClick={handleSave}
          pending={saving}
          pendingLabel="Saving…"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
        >
          {saved ? '✓ Saved' : 'Save'}
        </BusyButton>
      </div>
    </div>
  )
}
