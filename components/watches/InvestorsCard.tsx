'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InvestorRow {
  investor_name: string
  percentage: string
}

interface InvestorOption {
  key: string
  display_name: string
}

const inp = 'w-full bg-card border border-border text-text-primary rounded-lg px-3.5 py-2.5 text-[13px] placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition-all'
const card = 'bg-card border border-border rounded-xl p-5 md:p-6'
const cardTitle = 'text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-4'

const NEW_INVESTOR_VALUE = '__new__'

function slugify(name: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'investor'
}

export default function InvestorsCard({
  investors,
  setInvestors,
  totalPct,
  investorsValid,
}: {
  investors: InvestorRow[]
  setInvestors: React.Dispatch<React.SetStateAction<InvestorRow[]>>
  totalPct: number
  investorsValid: boolean
}) {
  const [options, setOptions]           = useState<InvestorOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [addingForIndex, setAddingForIndex] = useState<number | null>(null)
  const [newName, setNewName]           = useState('')
  const [addSaving, setAddSaving]       = useState(false)
  const [addError, setAddError]         = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      const supabase = createClient()
      const { data } = await supabase
        .from('investor_names')
        .select('key, display_name')
        .order('created_at', { ascending: true })
      setOptions((data ?? []) as InvestorOption[])
      setOptionsLoading(false)
    }
    void loadOptions()
  }, [])

  const usedKeys = new Set(investors.map(i => i.investor_name))

  function updateInvestor(idx: number, key: keyof InvestorRow, val: string) {
    setInvestors(v => v.map((row, i) => (i === idx ? { ...row, [key]: val } : row)))
  }

  function addInvestor() {
    if (investors.length >= 4) return
    const nextOption = options.find(o => !usedKeys.has(o.key)) ?? options[0]
    setInvestors(v => [...v, { investor_name: nextOption?.key ?? '', percentage: '' }])
  }

  function removeInvestor(idx: number) {
    setInvestors(v => v.filter((_, i) => i !== idx))
    if (addingForIndex === idx) cancelAdd()
  }

  function handleSelectChange(idx: number, value: string) {
    if (value === NEW_INVESTOR_VALUE) {
      setAddingForIndex(idx)
      setNewName('')
      setAddError(null)
      return
    }
    updateInvestor(idx, 'investor_name', value)
  }

  function cancelAdd() {
    setAddingForIndex(null)
    setNewName('')
    setAddError(null)
  }

  async function handleCreateInvestor(idx: number) {
    const trimmed = newName.trim()
    if (!trimmed) { setAddError('Name is required'); return }
    setAddSaving(true)
    setAddError(null)

    const existingKeys = new Set(options.map(o => o.key.toLowerCase()))
    const base = slugify(trimmed)
    let key = base
    let n = 2
    while (existingKeys.has(key.toLowerCase())) { key = `${base}-${n}`; n++ }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('investor_names')
      .insert({ key, display_name: trimmed, amount_invested: 0, is_default: false })
      .select('key, display_name')
      .single()

    if (error || !data) {
      setAddError(error?.message ?? 'Failed to add investor')
      setAddSaving(false)
      return
    }

    setOptions(prev => [...prev, data as InvestorOption])
    updateInvestor(idx, 'investor_name', (data as InvestorOption).key)
    setAddSaving(false)
    cancelAdd()
  }

  const addRowDisabled = investors.length >= 4 || (options.length > 0 && investors.length >= options.length)

  return (
    <div className={card}>
      <p className={cardTitle}>Investors</p>
      <div className="space-y-2">
        {investors.map((inv, idx) => {
          const availableOptions = options.filter(o => o.key === inv.investor_name || !usedKeys.has(o.key))
          const isAddingHere = addingForIndex === idx
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2">
                {isAddingHere ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Investor name"
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateInvestor(idx)}
                      disabled={addSaving}
                      className="shrink-0 bg-gray-900 text-white text-[13px] font-medium px-3.5 py-2.5 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                    >
                      {addSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdd}
                      className="shrink-0 text-sm text-gray-400 hover:text-gray-700 px-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={inv.investor_name}
                    onChange={e => handleSelectChange(idx, e.target.value)}
                    disabled={optionsLoading}
                    className={inp}
                  >
                    {optionsLoading && <option value={inv.investor_name}>Loading…</option>}
                    {availableOptions.map(o => <option key={o.key} value={o.key}>{o.display_name}</option>)}
                    <option value={NEW_INVESTOR_VALUE}>+ Add new investor</option>
                  </select>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min="0.01" max="100" step="0.01"
                    value={inv.percentage}
                    onChange={e => updateInvestor(idx, 'percentage', e.target.value)}
                    placeholder="0"
                    className={`${inp} w-20 text-right`}
                  />
                  <span className="text-gray-400 text-sm w-4">%</span>
                </div>
                {investors.length > 1 && !isAddingHere && (
                  <button type="button" onClick={() => removeInvestor(idx)} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-xl w-6 leading-none">
                    ×
                  </button>
                )}
              </div>
              {isAddingHere && addError && <p className="text-xs text-red-500">{addError}</p>}
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={addInvestor}
          disabled={addRowDisabled}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-0"
        >
          + Add investor
        </button>
        <div className="text-right">
          <span className={`text-sm font-medium tabular-nums ${investorsValid ? 'text-emerald-600' : 'text-red-500'}`}>
            {totalPct % 1 === 0 ? totalPct : totalPct.toFixed(2)}% {investorsValid ? '✓' : '(must be 100%)'}
          </span>
          {!investorsValid && totalPct < 100 && (
            <p className="text-xs text-gray-400 mt-0.5">{(100 - totalPct).toFixed(totalPct % 1 === 0 ? 0 : 2)}% remaining</p>
          )}
        </div>
      </div>
    </div>
  )
}
