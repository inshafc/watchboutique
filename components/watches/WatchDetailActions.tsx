'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import VoidSaleDialog from '@/components/watches/VoidSaleDialog'
import { displayCondition } from '@/lib/watch-condition'

const INK = '#14140f'
const RED = '#b23a2c'

function CheckIcon()   { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function EditIcon()    { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.6 3.6l2.8 2.8L7.8 15l-3.6.8.8-3.6z"/></svg> }
function SaveIcon()    { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.4 4.4h9.2l3 3v8.2H4.4z"/><path d="M7 4.4v4h6M7 16v-4h6v4"/></svg> }
function PublishIcon() { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3.5 3.5L13 5"/></svg> }
function ShareIcon()   { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="15" cy="5" r="2.2"/><circle cx="5" cy="10" r="2.2"/><circle cx="15" cy="15" r="2.2"/><path d="M7 8.9 13 6M7 11.1l6 2.9"/></svg> }
function TrashIcon()   { return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke={RED} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.6 5.8h10.8M8.2 5.8V4.2h3.6v1.6M6 5.8l.7 10h6.6l.7-10"/></svg> }

function IconBtn({
  title, onClick, href, children, danger = false, disabled = false, filled = false,
}: {
  title: string
  onClick?: () => void
  href?: string
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  filled?: boolean
}) {
  const style: React.CSSProperties = filled
    ? { width: 46, height: 46, borderRadius: '50%', border: '0', background: INK }
    : { width: 46, height: 46, borderRadius: '50%', border: `1px solid ${danger ? 'rgba(178,58,44,.25)' : 'rgba(20,20,15,.1)'}`, background: '#fff' }
  const className = `flex items-center justify-center transition-colors disabled:opacity-50 ${filled ? 'hover:opacity-90' : 'hover:bg-[#f7f6f3]'}`
  if (href) {
    return <Link href={href} title={title} className={className} style={style}>{children}</Link>
  }
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={className} style={style}>
      {children}
    </button>
  )
}

type AvailableDialog = { linkedDealId: string } | null

export default function WatchDetailActions({
  watchId,
  isDraft,
  watchStatus,
  watchName,
  reference,
  condition,
}: {
  watchId: string
  isDraft: boolean
  watchStatus?: string | null
  watchName?: string
  reference?: string | null
  condition?: string | null
}) {
  const router   = useRouter()
  const { profile } = useAuth()
  const isClerk  = profile?.role === 'inventory_clerk'
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

  function handleShare() {
    if (!watchName) return
    const segments = [watchName, condition ? displayCondition(condition) : null, reference ? `Ref: ${reference}` : null]
      .filter((s): s is string => Boolean(s && s.trim()))
    void navigator.clipboard.writeText(segments.join(' — '))
    setToast('Copied to clipboard')
    setTimeout(() => setToast(null), 2200)
  }

  async function handleMarkArrived() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').update({
      watch_status: 'Available',
      status:       'Available',
      is_draft:     false,
    }).eq('id', watchId)
    setBusy(false)
    setToast('Watch is now available in inventory')
    setTimeout(() => setToast(null), 4000)
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
      await supabase.from('watches').update({ watch_status: 'Available', status: 'Available', sold_price: null }).eq('id', watchId)
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
    await supabase.from('watches').update({ watch_status: 'Available', status: 'Available', sold_price: null }).eq('id', watchId)
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
      inventory_type: watch.inventory_type,
      consignee_name: watch.consignee_name,
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white px-5 py-3 rounded-2xl shadow-2xl select-none pointer-events-none" style={{ background: INK }}>
          <CheckIcon />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex items-center gap-2.5 flex-wrap">
        {watchStatus === 'sourced' && (
          <button
            type="button"
            onClick={handleMarkArrived}
            disabled={busy}
            className="flex items-center gap-1.5 text-white text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
            style={{ height: 46, padding: '0 20px', borderRadius: 999, background: '#4f46e5' }}
          >
            <CheckIcon /> Mark as Arrived
          </button>
        )}
        {watchStatus === 'Sold' && !isClerk && (
          <button
            type="button"
            onClick={handleMarkAvailable}
            disabled={busy}
            className="flex items-center gap-1.5 text-white text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
            style={{ height: 46, padding: '0 20px', borderRadius: 999, background: '#1f6f43' }}
          >
            <CheckIcon /> Mark as Available
          </button>
        )}

        <IconBtn title="Edit" href={`/dashboard/watches/${watchId}/edit`}><EditIcon /></IconBtn>
        {isDraft ? (
          <IconBtn title="Publish" onClick={publish} disabled={busy} filled>
            <PublishIcon />
          </IconBtn>
        ) : (
          <IconBtn title="Save as draft" onClick={saveDraft} disabled={busy}><SaveIcon /></IconBtn>
        )}
        <IconBtn title="Share" onClick={handleShare}><ShareIcon /></IconBtn>
        <IconBtn title="Delete" onClick={handleDelete} disabled={busy} danger><TrashIcon /></IconBtn>
      </div>

      {dialog && (
        <VoidSaleDialog
          acting={acting}
          onDuplicate={handleDialogDuplicate}
          onVoidSale={handleDialogRemoveSale}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}
