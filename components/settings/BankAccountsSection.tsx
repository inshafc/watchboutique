'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SavedBank } from '@/types'

const inp  = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all'
const lbl  = 'block text-xs font-medium text-gray-500 mb-1'

function emptyForm() {
  return { bank_name: '', account_name: '', account_number: '', branch: '', swift_code: '' }
}

export default function BankAccountsSection({ initialBanks }: { initialBanks: SavedBank[] }) {
  const [banks, setBanks]   = useState(initialBanks)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm]     = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function startAdd() {
    setEditing(null)
    setForm(emptyForm())
    setAdding(true)
    setError(null)
  }

  function startEdit(bank: SavedBank) {
    setAdding(false)
    setEditing(bank.id)
    setForm({
      bank_name:      bank.bank_name,
      account_name:   bank.account_name   ?? '',
      account_number: bank.account_number ?? '',
      branch:         bank.branch         ?? '',
      swift_code:     bank.swift_code     ?? '',
    })
    setError(null)
  }

  function cancelForm() {
    setAdding(false)
    setEditing(null)
    setForm(emptyForm())
    setError(null)
  }

  async function handleSave() {
    if (!form.bank_name.trim()) { setError('Bank name is required'); return }
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const payload = {
      bank_name:      form.bank_name.trim(),
      account_name:   form.account_name.trim()   || null,
      account_number: form.account_number.trim() || null,
      branch:         form.branch.trim()         || null,
      swift_code:     form.swift_code.trim()     || null,
    }

    if (editing) {
      const { data, error: err } = await supabase
        .from('saved_banks')
        .update(payload)
        .eq('id', editing)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      setBanks(prev => prev.map(b => b.id === editing ? data as SavedBank : b))
    } else {
      const { data, error: err } = await supabase
        .from('saved_banks')
        .insert(payload)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      setBanks(prev => [...prev, data as SavedBank])
    }

    setSaving(false)
    cancelForm()
  }

  async function toggleActive(bank: SavedBank) {
    const supabase = createClient()
    const { data } = await supabase
      .from('saved_banks')
      .update({ is_active: !bank.is_active })
      .eq('id', bank.id)
      .select()
      .single()
    if (data) setBanks(prev => prev.map(b => b.id === bank.id ? data as SavedBank : b))
  }

  async function handleDelete(bank: SavedBank) {
    if (!confirm(`Delete "${bank.bank_name}"? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('saved_banks').delete().eq('id', bank.id)
    setBanks(prev => prev.filter(b => b.id !== bank.id))
    if (editing === bank.id) cancelForm()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Bank Accounts</h2>
          <p className="text-sm text-gray-400 mt-0.5">Saved accounts for invoice bank details</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={startAdd}
            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
            </svg>
            Add Bank
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(adding || editing) && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {adding ? 'New Bank Account' : 'Edit Bank Account'}
          </p>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Bank Name *</label>
              <input type="text" value={form.bank_name} onChange={f('bank_name')} placeholder="e.g. Sampath Bank" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Account Name</label>
                <input type="text" value={form.account_name} onChange={f('account_name')} placeholder="The Watch Boutique" className={inp} />
              </div>
              <div>
                <label className={lbl}>Account Number</label>
                <input type="text" value={form.account_number} onChange={f('account_number')} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Branch</label>
                <input type="text" value={form.branch} onChange={f('branch')} className={inp} />
              </div>
              <div>
                <label className={lbl}>SWIFT Code</label>
                <input type="text" value={form.swift_code} onChange={f('swift_code')} className={inp} />
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelForm}
              className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Banks list */}
      {banks.length === 0 && !adding ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No bank accounts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banks.map(bank => (
            <div
              key={bank.id}
              className={`border rounded-2xl p-4 transition-colors ${editing === bank.id ? 'border-gray-300 bg-white' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{bank.bank_name}</p>
                    {!bank.is_active && (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                    {bank.account_name   && <p>{bank.account_name}</p>}
                    {bank.account_number && <p>A/C: {bank.account_number}</p>}
                    <p className="flex gap-3">
                      {bank.branch     && <span>Branch: {bank.branch}</span>}
                      {bank.swift_code && <span>SWIFT: {bank.swift_code}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(bank)}
                    className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${bank.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={bank.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      {bank.is_active
                        ? <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        : <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      }
                    </svg>
                  </button>
                  <button
                    onClick={() => startEdit(bank)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                      <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(bank)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
