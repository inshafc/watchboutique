'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WatchStatusNew } from '@/types'
import { WATCH_STATUS_NEW } from '@/types'

const STATUS_STYLES: Record<WatchStatusNew, string> = {
  'Available': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'On Hold':   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  'Offered':   'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  'Sold':      'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200',
}

export default function WatchStatusButtons({
  watchId,
  initialStatus,
}: {
  watchId: string
  initialStatus: string | null
}) {
  const [current, setCurrent] = useState<WatchStatusNew>(
    (initialStatus as WatchStatusNew) ?? 'Available'
  )
  const [saving, setSaving] = useState(false)

  async function handleSelect(status: WatchStatusNew) {
    if (status === current || saving) return
    setSaving(true)
    setCurrent(status)
    const supabase = createClient()
    await supabase.from('watches').update({ watch_status: status }).eq('id', watchId)
    setSaving(false)
  }

  return (
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
  )
}
