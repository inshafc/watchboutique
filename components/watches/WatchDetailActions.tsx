'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CheckIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function DraftIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 10.5V3.5H3.5v9h7l3-3z" strokeLinejoin="round"/><path d="M13.5 10.5h-3v3" strokeLinejoin="round"/></svg> }
function EditIcon()    { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }

type AvailableDialog = { linkedDealId: string } | null

export default function WatchDetailActions({
  watchId,
  isDraft,
  watchStatus,
}: {
  watchId: string
  isDraft: boolean
  watchStatus?: string | null
}) {
  const router   = useRouter()
  const [busy,   setBusy]   = useState(false)
  const [dialog, setDialog] = useState<AvailableDialog>(null)
  const [acting, setActing] = useState(false)
  const [toast,  setToast]  = useState<string | null>(null)

  async function publish() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').update({ is_draft: false }).eq('id', watchId)
    router.push('/dashboard/inventory')
    router.refresh()
  }

  async function saveDraft() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').update({ is_draft: true }).eq('id', watchId)
    router.push('/dashboard/inventory')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this watch? You can restore it from the Deleted tab.')) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').update({ deleted_at: new Date().toISOString() }).eq('id', watchId)
    router.push('/dashboard/inventory')
    router.refresh()
  }

  async function handleMarkAvailable() {
    setBusy(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('id')
      .eq('watch_id', watchId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    setBusy(false)

    if (data) {
      setDialog({ linkedDealId: data.id })
    } else {
      setBusy(true)
      await supabase.from('watches').update({ watch_status: 'Available', status: 'Available' }).eq('id', watchId)
      setBusy(false)
      setToast('Watch marked as Available')
      setTimeout(() => setToast(null), 4000)
      router.refresh()
    }
  }

  async function handleDialogRemoveSale() {
    if (!dialog || acting) return
    setActing(true)
    const supabase = createClient()
    await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', dialog.linkedDealId)
    await supabase.from('watches').update({ watch_status: 'Available', status: 'Available' }).eq('id', watchId)
    setDialog(null)
    setActing(false)
    setToast('Sale removed — watch is now available')
    setTimeout(() => setToast(null), 4000)
    router.refresh()
  }

  async function handleDialogDuplicate() {
    if (!dialog || acting) return
    setActing(true)
    const supabase = createClient()

    const { data: watch } = await supabase.from('watches').select('*').eq('id', watchId).single()
    if (!watch) { setActing(false); return }

    const { data: newWatch } = await supabase.from('watches').insert({
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
      comments:       watch.comments,
      brand_id:       watch.brand_id,
      is_draft:       true,
      watch_status:   'Available',
      status:         'Available',
    }).select('id').single()

    if (!newWatch) { setActing(false); return }

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
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl select-none pointer-events-none">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {watchStatus === 'Sold' && (
          <button
            onClick={handleMarkAvailable}
            disabled={busy}
            className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <CheckIcon /> Mark as Available
          </button>
        )}
        {isDraft && (
          <button
            onClick={publish}
            disabled={busy}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
          >
            <CheckIcon /> Publish
          </button>
        )}
        {!isDraft && (
          <button
            onClick={saveDraft}
            disabled={busy}
            className="flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            <DraftIcon /> Save Draft
          </button>
        )}
        <Link
          href={`/dashboard/watches/${watchId}/edit`}
          className="flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <EditIcon /> Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 ml-auto"
        >
          <TrashIcon /> Delete
        </button>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !acting && setDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-gray-900 mb-2">This watch has a completed sale</h3>
            <p className="text-sm text-gray-500 mb-6">Choose how you&apos;d like to proceed:</p>

            <div className="space-y-2">
              <button
                onClick={handleDialogDuplicate}
                disabled={acting}
                className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Duplicate</span>
                <span className="text-xs text-gray-400 mt-0.5">Create a draft copy of this watch. Original stays as Sold.</span>
              </button>

              <button
                onClick={handleDialogRemoveSale}
                disabled={acting}
                className="w-full flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Remove Sale</span>
                <span className="text-xs text-gray-400 mt-0.5">Soft-delete the linked sale and mark watch as Available.</span>
              </button>

              <button
                onClick={() => setDialog(null)}
                disabled={acting}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>

            {acting && (
              <div className="mt-3 text-center text-xs text-gray-400">Working…</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
