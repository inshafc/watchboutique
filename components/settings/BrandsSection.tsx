'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Brand } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all'
const lbl = 'block text-xs font-medium text-gray-500 mb-1'

function emptyForm() { return { name: '', color: '#111111' } }

export default function BrandsSection({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands,  setBrands]  = useState(initialBrands)
  const [adding,  setAdding]  = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form,    setForm]    = useState(emptyForm())
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function startAdd() {
    setEditing(null); setForm(emptyForm()); setAdding(true); setError(null)
  }
  function startEdit(b: Brand) {
    setAdding(false); setEditing(b.id); setForm({ name: b.name, color: b.color ?? '#111111' }); setError(null)
  }
  function cancelForm() {
    setAdding(false); setEditing(null); setForm(emptyForm()); setError(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Brand name is required'); return }
    setSaving(true); setError(null)
    const supabase = createClient()
    const payload  = { name: form.name.trim(), color: form.color }

    if (editing) {
      const { data, error: err } = await supabase.from('brands').update(payload).eq('id', editing).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setBrands(prev => prev.map(b => b.id === editing ? data as Brand : b))
    } else {
      const { data, error: err } = await supabase.from('brands').insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setBrands(prev => [...prev, data as Brand])
    }
    setSaving(false); cancelForm()
  }

  async function handleDelete(b: Brand) {
    if (!confirm(`Delete brand "${b.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('brands').delete().eq('id', b.id)
    if (err) { alert(err.message); return }
    setBrands(prev => prev.filter(x => x.id !== b.id))
    if (editing === b.id) cancelForm()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Brands</h2>
          <p className="text-sm text-gray-400 mt-0.5">Watch brands used in inventory</p>
        </div>
        {!adding && !editing && (
          <button onClick={startAdd} className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
            Add Brand
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {adding ? 'New Brand' : 'Edit Brand'}
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={lbl}>Brand Name *</label>
              <input autoFocus type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rolex" className={inp} />
            </div>
            <div>
              <label className={lbl}>Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="h-[38px] w-12 rounded-xl border border-gray-200 cursor-pointer p-1"
                />
                <span className="text-xs text-gray-400 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-black disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancelForm} className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {brands.length === 0 && !adding ? (
        <div className="text-center py-12 text-gray-400"><p className="text-sm">No brands yet</p></div>
      ) : (
        <div className="space-y-2">
          {brands.map(b => (
            <div key={b.id} className={`border rounded-2xl p-4 transition-colors ${editing === b.id ? 'border-gray-300' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: b.color ?? '#111' }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{b.color}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(b)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                      <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(b)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
