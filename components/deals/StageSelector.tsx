'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DealStage } from '@/types'

const STAGES: DealStage[] = ['Idle', 'Inquiry', 'Offer', 'Delivered']

const STAGE_STYLES: Record<string, string> = {
  Idle:        'border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-50',
  Inquiry:     'border-gray-300 text-gray-600 hover:border-gray-500 hover:bg-gray-50',
  Offer:       'border-sky-300 text-sky-700 hover:border-sky-500 hover:bg-sky-50',
  Delivered:   'border-teal-300 text-teal-700 hover:border-teal-500 hover:bg-teal-50',
  Negotiation: 'border-amber-300 text-amber-700 hover:border-amber-500 hover:bg-amber-50',
  Closed:      'border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50',
  Lost:        'border-red-300 text-red-600 hover:border-red-500 hover:bg-red-50',
}

const STAGE_ACTIVE: Record<string, string> = {
  Idle:        'bg-gray-400 border-gray-400 text-white',
  Inquiry:     'bg-gray-900 border-gray-900 text-white',
  Offer:       'bg-sky-600 border-sky-600 text-white',
  Delivered:   'bg-teal-600 border-teal-600 text-white',
  Negotiation: 'bg-amber-500 border-amber-500 text-white',
  Closed:      'bg-emerald-600 border-emerald-600 text-white',
  Lost:        'bg-red-500 border-red-500 text-white',
}

export default function StageSelector({
  dealId,
  initialStage,
  watchId,
}: {
  dealId: string
  initialStage: DealStage
  watchId?: string | null
}) {
  const [stage,   setStage]   = useState<DealStage>(initialStage)
  const [loading, setLoading] = useState(false)

  async function update(newStage: DealStage) {
    if (newStage === stage) return
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('deals')
      .update({
        stage:     newStage,
        closed_at: newStage === 'Closed' || newStage === 'Delivered' ? new Date().toISOString() : null,
      })
      .eq('id', dealId)

    if (newStage === 'Delivered' && watchId) {
      await supabase.from('watches').update({ status: 'Sold', watch_status: 'Sold' }).eq('id', watchId)
    }

    setStage(newStage)
    setLoading(false)
  }

  const displayStages = STAGES.includes(stage) ? STAGES : [...STAGES, stage]

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stage</p>
      <div className="flex flex-wrap gap-2">
        {displayStages.map(s => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => update(s)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all disabled:cursor-not-allowed ${
              stage === s
                ? (STAGE_ACTIVE[s] ?? 'bg-gray-900 border-gray-900 text-white')
                : (STAGE_STYLES[s] ?? 'border-gray-200 text-gray-500')
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
