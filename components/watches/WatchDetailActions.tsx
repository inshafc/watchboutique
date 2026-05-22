'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CheckIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function DraftIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 10.5V3.5H3.5v9h7l3-3z" strokeLinejoin="round"/><path d="M13.5 10.5h-3v3" strokeLinejoin="round"/></svg> }
function EditIcon()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinejoin="round"/></svg> }
function TrashIcon()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5.5 5l.5 8h4l.5-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }

export default function WatchDetailActions({
  watchId,
  isDraft,
}: {
  watchId: string
  isDraft: boolean
}) {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <button
        onClick={publish}
        disabled={busy}
        className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
      >
        <CheckIcon /> {isDraft ? 'Publish' : 'Re-publish'}
      </button>
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
  )
}
