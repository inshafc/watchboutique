'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Installment, InstallmentStatus } from '@/types'

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

const STATUS_BADGE: Record<InstallmentStatus, string> = {
  Pending:  'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200',
  Paid:     'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Overdue:  'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
}

export default function InstallmentTracker({
  dealId,
  initialInstallments,
}: {
  dealId: string
  initialInstallments: Installment[]
}) {
  const [installments, setInstallments] = useState(initialInstallments)
  const [marking,  setMarking]  = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newRow,   setNewRow]   = useState({ amount: '', due_date: '', notes: '' })
  const [saving,   setSaving]   = useState(false)

  const total = installments.reduce((s, i) => s + i.amount, 0)
  const paid  = installments.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)
  const pct   = total > 0 ? Math.round((paid / total) * 100) : 0

  async function markPaid(id: string) {
    setMarking(id)
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('installments')
      .update({ status: 'Paid', paid_at: now })
      .eq('id', id)
    if (!error) {
      setInstallments(rows =>
        rows.map(r => r.id === id ? { ...r, status: 'Paid' as InstallmentStatus, paid_at: now } : r)
      )
    }
    setMarking(null)
  }

  async function markUnpaid(id: string) {
    setMarking(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('installments')
      .update({ status: 'Pending', paid_at: null })
      .eq('id', id)
    if (!error) {
      setInstallments(rows =>
        rows.map(r => r.id === id ? { ...r, status: 'Pending' as InstallmentStatus, paid_at: null } : r)
      )
    }
    setMarking(null)
  }

  async function addInstallment() {
    if (!newRow.amount || isNaN(parseFloat(newRow.amount))) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('installments')
      .insert({
        deal_id:  dealId,
        amount:   parseFloat(newRow.amount),
        due_date: newRow.due_date || null,
        notes:    newRow.notes.trim() || null,
        status:   'Pending',
      })
      .select()
      .single()
    if (!error && data) {
      setInstallments(rows => [...rows, data as Installment])
      setNewRow({ amount: '', due_date: '', notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const inp = 'bg-white border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Installments</p>
        <span className="text-xs text-gray-400 tabular-nums">{pct}% paid</span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 tabular-nums">
            <span>Paid {formatLKR(paid)}</span>
            <span>Total {formatLKR(total)}</span>
          </div>
        </div>
      )}

      {/* Installment rows */}
      {installments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No installments yet.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {installments.map((inst) => (
            <div key={inst.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 tabular-nums">
                    {formatLKR(inst.amount)}
                  </span>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[inst.status]}`}>
                    {inst.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {inst.due_date && (
                    <span className="text-xs text-gray-400">Due {formatDate(inst.due_date)}</span>
                  )}
                  {inst.paid_at && (
                    <span className="text-xs text-emerald-600">Paid {formatDate(inst.paid_at)}</span>
                  )}
                  {inst.notes && (
                    <span className="text-xs text-gray-400 truncate">· {inst.notes}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {inst.status !== 'Paid' ? (
                  <button
                    onClick={() => markPaid(inst.id)}
                    disabled={marking === inst.id}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {marking === inst.id ? '…' : 'Mark paid'}
                  </button>
                ) : (
                  <button
                    onClick={() => markUnpaid(inst.id)}
                    disabled={marking === inst.id}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {marking === inst.id ? '…' : 'Undo'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add installment */}
      {showForm ? (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min="0" step="0.01"
              value={newRow.amount}
              onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))}
              placeholder="Amount"
              className={inp}
            />
            <input
              type="date"
              value={newRow.due_date}
              onChange={e => setNewRow(r => ({ ...r, due_date: e.target.value }))}
              className={inp}
            />
          </div>
          <input
            type="text"
            value={newRow.notes}
            onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
            placeholder="Notes (optional)"
            className={`w-full ${inp}`}
          />
          <div className="flex gap-2">
            <button
              onClick={addInstallment}
              disabled={saving}
              className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 1v10M1 6h10" strokeLinecap="round"/>
          </svg>
          Add installment
        </button>
      )}
    </div>
  )
}
