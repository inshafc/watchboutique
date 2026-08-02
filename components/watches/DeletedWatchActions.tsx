'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INK = '#14140f'
const RED = '#b23a2c'

function RestoreIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function TrashIcon()   { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }

export default function DeletedWatchActions({ watchId }: { watchId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleRestore() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').update({ deleted_at: null }).eq('id', watchId)
    router.push('/dashboard/inventory')
    router.refresh()
  }

  async function handlePermanentDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    setBusy(true)
    const supabase = createClient()
    await supabase.from('watches').delete().eq('id', watchId)
    router.push('/dashboard/inventory')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold whitespace-nowrap" style={{ background: 'rgba(178,58,44,.1)', color: RED, padding: '8px 16px', borderRadius: 999 }}>
        This watch was deleted — read only
      </span>
      <button
        type="button"
        onClick={handleRestore}
        disabled={busy}
        className="flex items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
        style={{ height: 46, padding: '0 20px', borderRadius: 999, background: '#fff', color: INK, border: '1px solid rgba(20,20,15,.1)' }}
      >
        <RestoreIcon /> Restore
      </button>
      <button
        type="button"
        onClick={handlePermanentDelete}
        disabled={busy}
        className="flex items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
        style={confirmingDelete
          ? { height: 46, padding: '0 20px', borderRadius: 999, background: RED, color: '#fff', border: `1px solid ${RED}` }
          : { height: 46, padding: '0 20px', borderRadius: 999, background: '#fff', color: RED, border: '1px solid rgba(20,20,15,.1)' }}
      >
        <TrashIcon /> {confirmingDelete ? 'Confirm delete forever?' : 'Delete Forever'}
      </button>
    </div>
  )
}
