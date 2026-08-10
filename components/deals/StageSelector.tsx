'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INK_45, GREEN, RED, AMBER, AMBER_BG, BLUE } from '@/lib/design-tokens'
import type { DealStage } from '@/types'

const STAGES: DealStage[] = ['Idle', 'Inquiry', 'Offer', 'Delivered']

// Tone per stage — mirrors the Sale Detail mockup's stage pill colors.
// Falls back to a neutral tone for legacy stage values not in STAGES
// (Negotiation / Closed / Lost) that can still be on older records.
const STAGE_TONE: Record<string, { bg: string; fg: string }> = {
  Idle:        { bg: 'rgba(20,20,15,.07)', fg: INK_45 },
  Inquiry:     { bg: 'rgba(63,95,138,.14)', fg: BLUE },
  Offer:       { bg: AMBER_BG, fg: AMBER },
  Delivered:   { bg: 'rgba(31,111,67,.14)', fg: GREEN },
  Negotiation: { bg: AMBER_BG, fg: AMBER },
  Closed:      { bg: 'rgba(31,111,67,.14)', fg: GREEN },
  Lost:        { bg: 'rgba(178,58,44,.1)', fg: RED },
}
const DEFAULT_TONE = { bg: 'rgba(20,20,15,.07)', fg: INK_45 }

export default function StageSelector({
  dealId,
  initialStage,
  watchId,
  salesManager,
}: {
  dealId: string
  initialStage: DealStage
  watchId?: string | null
  salesManager?: string | null
}) {
  const [stage,   setStage]   = useState<DealStage>(initialStage)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function update(newStage: DealStage) {
    if (newStage === stage) return

    if (newStage === 'Delivered' && !salesManager?.trim()) {
      setError('Select a sales manager before delivering — required for commission. Edit the sale to set one.')
      return
    }
    setError(null)

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
    <div className="flex flex-col gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>Stage</span>
      <div className="flex flex-wrap gap-2">
        {displayStages.map(s => {
          const on = s === stage
          const tone = STAGE_TONE[s] ?? DEFAULT_TONE
          return (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => update(s)}
              className="font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                height: 44, padding: '0 22px', borderRadius: 999, fontSize: 13.5,
                border: `1px solid ${on ? tone.fg : 'rgba(20,20,15,.12)'}`,
                background: on ? tone.bg : '#fff',
                color: on ? tone.fg : 'rgba(20,20,15,.55)',
              }}
            >
              {s}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs" style={{ color: AMBER }}>{error}</p>}
    </div>
  )
}
