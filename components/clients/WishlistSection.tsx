'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Wishlist } from '@/types'

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'

function formatLKR(n: number | null) {
  if (n == null) return null
  return 'LKR ' + n.toLocaleString('en-LK')
}

export default function WishlistSection({
  clientId,
  initialWishlists,
}: {
  clientId: string
  initialWishlists: Wishlist[]
}) {
  const [wishlists, setWishlists] = useState(initialWishlists)
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(false)

  const [form, setForm] = useState({
    brand:      '',
    reference:  '',
    max_budget: '',
    notes:      '',
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        client_id:  clientId,
        brand:      form.brand.trim()     || null,
        reference:  form.reference.trim() || null,
        max_budget: form.max_budget ? parseFloat(form.max_budget) : null,
        currency:   'LKR',
        notes:      form.notes.trim()     || null,
      })
      .select()
      .single()

    if (!error && data) {
      setWishlists(v => [data as Wishlist, ...v])
      setForm({ brand: '', reference: '', max_budget: '', notes: '' })
      setShowForm(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('wishlists').delete().eq('id', id)
    setWishlists(v => v.filter(w => w.id !== id))
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Wishlist
          {wishlists.length > 0 && (
            <span className="ml-2 text-xs text-gray-400 font-normal tabular-nums">{wishlists.length}</span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Brand</label>
              <input type="text" value={form.brand} onChange={field('brand')} placeholder="Rolex" className={inp} />
            </div>
            <div>
              <label className={lbl}>Reference</label>
              <input type="text" value={form.reference} onChange={field('reference')} placeholder="116610LN" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Max Budget</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.max_budget} onChange={field('max_budget')} placeholder="0.00" className={inp} />
              <span className="shrink-0 flex items-center bg-white border border-gray-200 text-gray-400 rounded-xl px-4 text-sm font-medium">LKR</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input type="text" value={form.notes} onChange={field('notes')} placeholder="Prefers black dial, full set…" className={inp} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit" disabled={loading}
              className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add to Wishlist'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Wishlist items */}
      {wishlists.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 py-2">No wishlist items yet.</p>
      ) : (
        <div className="space-y-2">
          {wishlists.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 group">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.brand && <span className="text-sm font-semibold text-gray-900">{item.brand}</span>}
                  {item.reference && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Ref: {item.reference}</span>}
                </div>
                {formatLKR(item.max_budget) && (
                  <p className="text-xs text-gray-500 mt-0.5">Max: {formatLKR(item.max_budget)}</p>
                )}
                {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
