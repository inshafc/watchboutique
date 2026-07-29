'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function RestoreIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function TrashIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }

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
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <span className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full">
        This watch was deleted — read only
      </span>
      <button
        onClick={handleRestore}
        disabled={busy}
        className="flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 ml-auto"
      >
        <RestoreIcon /> Restore
      </button>
      <button
        onClick={handlePermanentDelete}
        disabled={busy}
        className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
          confirmingDelete ? 'text-white bg-red-500 border-red-500 hover:bg-red-600' : 'border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200'
        }`}
      >
        <TrashIcon /> {confirmingDelete ? 'Confirm delete forever?' : 'Delete Forever'}
      </button>
    </div>
  )
}
