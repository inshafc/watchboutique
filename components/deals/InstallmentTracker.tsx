'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INK, INK_45, GREEN, RED, AMBER, AMBER_BG } from '@/lib/design-tokens'
import type { Installment, InstallmentStatus } from '@/types'

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

const STATUS_TONE: Record<InstallmentStatus, { bg: string; fg: string }> = {
  Pending: { bg: AMBER_BG, fg: AMBER },
  Paid:    { bg: 'rgba(31,111,67,.1)', fg: GREEN },
  Overdue: { bg: 'rgba(178,58,44,.1)', fg: RED },
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

  const inp = 'bg-white text-[13.5px] px-3 py-2.5 rounded-xl placeholder:text-[rgba(20,20,15,.35)] focus:outline-none transition-all'
  const inpStyle: React.CSSProperties = { border: '1px solid rgba(20,20,15,.12)', color: INK }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>Installments</span>
        <span className="text-xs tabular-nums" style={{ color: INK_45 }}>{pct}% paid</span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(20,20,15,.07)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: GREEN }} />
          </div>
          <div className="flex justify-between text-xs tabular-nums" style={{ color: INK_45 }}>
            <span>Paid {formatLKR(paid)}</span>
            <span>Total {formatLKR(total)}</span>
          </div>
        </div>
      )}

      {/* Installment rows */}
      {installments.length === 0 ? (
        <p className="text-sm" style={{ color: INK_45 }}>No installments yet.</p>
      ) : (
        <div className="flex flex-col">
          {installments.map((inst) => {
            const tone = STATUS_TONE[inst.status]
            return (
              <div key={inst.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(20,20,15,.05)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: INK }}>
                      {formatLKR(inst.amount)}
                    </span>
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: tone.bg, color: tone.fg }}>
                      {inst.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {inst.due_date && (
                      <span className="text-xs" style={{ color: INK_45 }}>Due {formatDate(inst.due_date)}</span>
                    )}
                    {inst.paid_at && (
                      <span className="text-xs" style={{ color: GREEN }}>Paid {formatDate(inst.paid_at)}</span>
                    )}
                    {inst.notes && (
                      <span className="text-xs truncate" style={{ color: INK_45 }}>· {inst.notes}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {inst.status !== 'Paid' ? (
                    <button
                      onClick={() => markPaid(inst.id)}
                      disabled={marking === inst.id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                      style={{ color: GREEN, background: 'rgba(31,111,67,.1)' }}
                    >
                      {marking === inst.id ? '…' : 'Mark paid'}
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnpaid(inst.id)}
                      disabled={marking === inst.id}
                      className="text-xs transition-colors disabled:opacity-50"
                      style={{ color: INK_45 }}
                    >
                      {marking === inst.id ? '…' : 'Undo'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add installment */}
      {showForm ? (
        <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: '#f7f6f3' }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min="0" step="0.01"
              value={newRow.amount}
              onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))}
              placeholder="Amount"
              className={inp}
              style={inpStyle}
            />
            <input
              type="date"
              value={newRow.due_date}
              onChange={e => setNewRow(r => ({ ...r, due_date: e.target.value }))}
              className={inp}
              style={inpStyle}
            />
          </div>
          <input
            type="text"
            value={newRow.notes}
            onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
            placeholder="Notes (optional)"
            className={`w-full ${inp}`}
            style={inpStyle}
          />
          <div className="flex gap-2">
            <button
              onClick={addInstallment}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: INK, color: '#fff' }}
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs transition-colors"
              style={{ color: INK_45 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm flex items-center gap-1.5 transition-colors w-fit"
          style={{ color: INK_45 }}
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
