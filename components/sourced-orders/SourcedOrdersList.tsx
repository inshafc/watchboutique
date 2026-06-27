'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SourcedOrder } from '@/types'

type FilterTab = 'all' | 'ordered' | 'arrived'

const CONDITIONS = ['Brand New', 'Pre-Owned', 'Excellent', 'Good', 'Fair']

const inp = 'w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
const lbl = 'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'

interface EditForm {
  watch_name:    string
  reference:     string
  serial_number: string
  year:          string
  condition:     string
  set_details:   string
  purchase_cost: string
  selling_price: string
  supplier:      string
  notes:         string
  expected_date: string
}

function emptyEditForm(o: SourcedOrder): EditForm {
  return {
    watch_name:    o.watch_name,
    reference:     o.reference     ?? '',
    serial_number: o.serial_number ?? '',
    year:          o.year          ?? '',
    condition:     o.condition     ?? '',
    set_details:   o.set_details   ?? '',
    purchase_cost: o.purchase_cost != null ? String(o.purchase_cost) : '',
    selling_price: o.selling_price != null ? String(o.selling_price) : '',
    supplier:      o.supplier      ?? '',
    notes:         o.notes         ?? '',
    expected_date: o.expected_date ?? '',
  }
}

function parseNum(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''))
  return isNaN(v) ? null : v
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ordered') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Ordered</span>
  }
  if (status === 'arrived') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Arrived</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">In Inventory</span>
}

export default function SourcedOrdersList({ initialOrders }: { initialOrders: SourcedOrder[] }) {
  const [orders,           setOrders]           = useState(initialOrders)
  const [filter,           setFilter]           = useState<FilterTab>('all')
  const [editingOrder,     setEditingOrder]     = useState<SourcedOrder | null>(null)
  const [editForm,         setEditForm]         = useState<EditForm | null>(null)
  const [editSaving,       setEditSaving]       = useState(false)
  const [addInvOrder,      setAddInvOrder]      = useState<SourcedOrder | null>(null)
  const [addingInventory,  setAddingInventory]  = useState(false)
  const [arrivingId,       setArrivingId]       = useState<string | null>(null)
  const [toast,            setToast]            = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const displayed = orders.filter(o => {
    if (filter === 'ordered') return o.status === 'ordered'
    if (filter === 'arrived') return o.status === 'arrived' || o.status === 'added_to_inventory'
    return true
  })

  const totalCount   = orders.length
  const arrivedCount = orders.filter(o => o.status === 'arrived' || o.status === 'added_to_inventory').length
  const pendingCount = orders.filter(o => o.status === 'ordered').length
  const totalValue   = orders.reduce((s, o) => s + (o.purchase_cost ?? 0), 0)

  function openEdit(order: SourcedOrder) {
    setEditingOrder(order)
    setEditForm(emptyEditForm(order))
  }

  function efChange(key: keyof EditForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)
    }
  }

  const handleMarkArrived = useCallback(async (order: SourcedOrder) => {
    setArrivingId(order.id)
    const supabase = createClient()
    const { data } = await supabase
      .from('sourced_orders')
      .update({ status: 'arrived', arrived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select()
      .single()
    setArrivingId(null)
    if (data) {
      setOrders(prev => prev.map(o => o.id === order.id ? (data as SourcedOrder) : o))
      showToast('Marked as arrived')
    }
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingOrder || !editForm) return
    setEditSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('sourced_orders')
      .update({
        watch_name:    editForm.watch_name.trim() || editingOrder.watch_name,
        reference:     editForm.reference.trim()     || null,
        serial_number: editForm.serial_number.trim() || null,
        year:          editForm.year.trim()           || null,
        condition:     editForm.condition             || null,
        set_details:   editForm.set_details.trim()   || null,
        purchase_cost: parseNum(editForm.purchase_cost),
        selling_price: parseNum(editForm.selling_price),
        supplier:      editForm.supplier.trim()       || null,
        notes:         editForm.notes.trim()          || null,
        expected_date: editForm.expected_date         || null,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', editingOrder.id)
      .select()
      .single()
    setEditSaving(false)
    if (data) {
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? (data as SourcedOrder) : o))
      setEditingOrder(null)
      setEditForm(null)
      showToast('Changes saved')
    }
  }, [editingOrder, editForm])

  const handleAddToInventory = useCallback(async () => {
    if (!addInvOrder) return
    setAddingInventory(true)
    const supabase = createClient()
    const year = addInvOrder.year
    const dateOnCard = year && /^\d{4}$/.test(year.trim()) ? `${year.trim()}-01-01` : null
    const { data: watchData, error: watchErr } = await supabase
      .from('watches')
      .insert({
        watch_name:     addInvOrder.watch_name,
        reference:      addInvOrder.reference,
        serial_number:  addInvOrder.serial_number,
        date_on_card:   dateOnCard,
        condition:      addInvOrder.condition || 'Good',
        set_details:    'Watch Only',
        purchased_from: addInvOrder.supplier,
        purchase_cost:  addInvOrder.purchase_cost,
        selling_price:  addInvOrder.selling_price,
        currency:       'LKR',
        status:         'Available',
        photos:         [],
        is_draft:       true,
      })
      .select('id')
      .single()

    if (!watchErr && watchData) {
      await supabase
        .from('sourced_orders')
        .update({
          status:                'added_to_inventory',
          watch_id:              watchData.id,
          added_to_inventory_at: new Date().toISOString(),
          updated_at:            new Date().toISOString(),
        })
        .eq('id', addInvOrder.id)
      setOrders(prev => prev.map(o => o.id === addInvOrder.id
        ? { ...o, status: 'added_to_inventory' as const, watch_id: watchData.id, added_to_inventory_at: new Date().toISOString() }
        : o
      ))
      showToast('Watch added to inventory as a draft — review and publish')
    }
    setAddingInventory(false)
    setAddInvOrder(null)
  }, [addInvOrder])

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',     label: `All (${totalCount})`      },
    { key: 'ordered', label: `Ordered (${pendingCount})` },
    { key: 'arrived', label: `Arrived (${arrivedCount})` },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sourced Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">Watches ordered but not yet in stock</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Ordered', value: String(totalCount) },
            { label: 'Arrived',       value: String(arrivedCount) },
            { label: 'Pending',       value: String(pendingCount) },
            { label: 'Total Value',   value: `LKR ${fmt(totalValue)}` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-50 border border-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {displayed.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">No sourced orders</p>
              <p className="text-xs text-gray-300 mt-1">Save a Sourcing invoice to add watches here</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Watch</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Reference</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Supplier</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Cost</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Expected</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map(order => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openEdit(order)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{order.watch_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{order.reference || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{order.supplier || '—'}</td>
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs text-right whitespace-nowrap">
                        {order.purchase_cost != null ? fmt(order.purchase_cost) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(order.expected_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          {order.status === 'ordered' && (
                            <button
                              type="button"
                              onClick={() => handleMarkArrived(order)}
                              disabled={arrivingId === order.id}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {arrivingId === order.id ? '…' : 'Mark Arrived'}
                            </button>
                          )}
                          {order.status === 'arrived' && (
                            <button
                              type="button"
                              onClick={() => setAddInvOrder(order)}
                              className="text-xs font-medium text-white bg-gray-900 hover:bg-black px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Add to Inventory
                            </button>
                          )}
                          {order.invoice_id && (
                            <Link
                              href={`/dashboard/invoices/${order.invoice_id}`}
                              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              View Invoice
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT DRAWER ──────────────────────────────────────── */}
      {editingOrder && editForm && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => { setEditingOrder(null); setEditForm(null) }}
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{editingOrder.watch_name}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => { setEditingOrder(null); setEditForm(null) }}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className={lbl}>Watch Name *</label>
                <input type="text" value={editForm.watch_name} onChange={efChange('watch_name')} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Reference</label>
                  <input type="text" value={editForm.reference} onChange={efChange('reference')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Serial No.</label>
                  <input type="text" value={editForm.serial_number} onChange={efChange('serial_number')} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Year</label>
                  <input type="text" value={editForm.year} onChange={efChange('year')} maxLength={4} placeholder="2024" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Condition</label>
                  <select value={editForm.condition} onChange={efChange('condition')} className={inp}>
                    <option value="">—</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Set Details</label>
                <input type="text" value={editForm.set_details} onChange={efChange('set_details')} placeholder="Box, papers, etc." className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Purchase Cost</label>
                  <input type="text" value={editForm.purchase_cost} onChange={efChange('purchase_cost')} placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Selling Price</label>
                  <input type="text" value={editForm.selling_price} onChange={efChange('selling_price')} placeholder="0" className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Supplier</label>
                <input type="text" value={editForm.supplier} onChange={efChange('supplier')} className={inp} />
              </div>
              <div>
                <label className={lbl}>Expected Date</label>
                <input type="date" value={editForm.expected_date} onChange={efChange('expected_date')} className={inp} />
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea value={editForm.notes} onChange={efChange('notes')} rows={3} className={inp} />
              </div>

              {/* Status & linked invoice */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Status</span>
                  <StatusBadge status={editingOrder.status} />
                </div>
                {editingOrder.invoice_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Invoice</span>
                    <Link
                      href={`/dashboard/invoices/${editingOrder.invoice_id}`}
                      className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                    >
                      View Invoice
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer footer */}
            <div className="p-5 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="w-full bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TO INVENTORY DIALOG ──────────────────────────── */}
      {addInvOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Add to Inventory?</h3>
            <p className="text-xs text-gray-400 mb-4">A draft watch record will be created. Review and publish it from Inventory.</p>

            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Watch</span>
                <span className="font-medium text-gray-900">{addInvOrder.watch_name}</span>
              </div>
              {addInvOrder.reference && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Reference</span>
                  <span className="font-mono">{addInvOrder.reference}</span>
                </div>
              )}
              {addInvOrder.condition && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Condition</span>
                  <span>{addInvOrder.condition}</span>
                </div>
              )}
              {addInvOrder.purchase_cost != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cost</span>
                  <span className="font-mono">LKR {fmt(addInvOrder.purchase_cost)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleAddToInventory}
                disabled={addingInventory}
                className="w-full bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                {addingInventory ? 'Adding…' : 'Add as Draft Watch'}
              </button>
              <button
                type="button"
                onClick={() => setAddInvOrder(null)}
                className="w-full text-sm text-gray-500 hover:text-gray-900 py-2.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
