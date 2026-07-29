'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VoidSaleDialog from '@/components/watches/VoidSaleDialog'
import type { WatchStatusNew } from '@/types'
import { WATCH_STATUS_NEW } from '@/types'

const STATUS_STYLES: Record<WatchStatusNew, string> = {
  'Available': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'On Hold':   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  'Offered':   'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  'Sold':      'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200',
}

type DialogState = {
  linkedDealId: string
} | null

export default function WatchStatusButtons({
  watchId,
  initialStatus,
}: {
  watchId: string
  initialStatus: string | null
}) {
  const router = useRouter()
  const [current,  setCurrent]  = useState<WatchStatusNew>((initialStatus as WatchStatusNew) ?? 'Available')
  const [saving,   setSaving]   = useState(false)
  const [dialog,   setDialog]   = useState<DialogState>(null)
  const [acting,   setActing]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)

  async function handleSelect(status: WatchStatusNew) {
    if (status === current || saving) return

    // Going from Sold → Available: check for a linked deal first
    if (status === 'Available' && current === 'Sold') {
      setSaving(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id')
        .eq('watch_id', watchId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      setSaving(false)

      if (data) {
        setDialog({ linkedDealId: data.id })
        return
      }
      // No linked deal — fall through to direct update
    }

    setSaving(true)
    setCurrent(status)
    const supabase = createClient()
    await supabase.from('watches').update({ watch_status: status, status }).eq('id', watchId)
    setSaving(false)
  }

  async function handleRemoveSale() {
    if (!dialog || acting) return
    setActing(true)
    const supabase = createClient()
    // Delete sale first, then update watch status
    await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', dialog.linkedDealId)
    await supabase.from('watches').update({ watch_status: 'Available', status: 'Available', sold_price: null }).eq('id', watchId)
    setCurrent('Available')
    setDialog(null)
    setActing(false)
    setToast('Sale removed — watch is now available')
    setTimeout(() => setToast(null), 4000)
    router.refresh()
  }

  async function handleDuplicate() {
    if (!dialog || acting) return
    setActing(true)
    const supabase = createClient()

    // Fetch full watch data
    const { data: watch } = await supabase
      .from('watches')
      .select('*')
      .eq('id', watchId)
      .single()

    if (!watch) { setActing(false); return }

    // Create draft copy
    const { data: newWatch } = await supabase
      .from('watches')
      .insert({
        watch_name:     watch.watch_name,
        reference:      watch.reference,
        serial_number:  watch.serial_number,
        date_on_card:   watch.date_on_card,
        condition:      watch.condition,
        set_details:    watch.set_details,
        purchased_from: watch.purchased_from,
        purchase_cost:  watch.purchase_cost,
        selling_price:  watch.selling_price,
        currency:       watch.currency,
        photos:         watch.photos,
        labels:         watch.labels,
        notes:          watch.notes,
        comments:       watch.comments,
        brand_id:       watch.brand_id,
        inventory_type: watch.inventory_type,
        consignee_name: watch.consignee_name,
        is_draft:       true,
        watch_status:   'Available',
        status:         'Available',
      })
      .select('id')
      .single()

    if (!newWatch) { setActing(false); return }

    // Copy investors
    const { data: investors } = await supabase
      .from('watch_investors')
      .select('investor_name, percentage')
      .eq('watch_id', watchId)

    if (investors && investors.length > 0) {
      await supabase.from('watch_investors').insert(
        investors.map(inv => ({ watch_id: newWatch.id, investor_name: inv.investor_name, percentage: inv.percentage }))
      )
    }

    setDialog(null)
    setActing(false)
    router.push(`/dashboard/watches/${newWatch.id}/edit`)
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl select-none pointer-events-none">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {WATCH_STATUS_NEW.map(s => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => handleSelect(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              current === s
                ? STATUS_STYLES[s]
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Mark as Available — sale conflict dialog */}
      {dialog && (
        <VoidSaleDialog
          acting={acting}
          onDuplicate={handleDuplicate}
          onVoidSale={handleRemoveSale}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}
