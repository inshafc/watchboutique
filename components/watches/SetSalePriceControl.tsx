'use client'

// Small inline "Sale Price" control on the watch detail page.
//
// It writes through the set_discount_price RPC, which touches ONLY
// discount_price (the trigger stamps the two audit columns server-side). That
// keeps a narrow, validated write path available to every authenticated role —
// including any role that cannot open the full edit form — without widening the
// table-level UPDATE policy on watches.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { discountPercent, validateDiscountPrice } from '@/lib/watch-price'
import { INK, INK_45, INK_08, GOLD, GREEN, RED, RADII } from '@/lib/design-tokens'

function num(s: string) { return parseFloat(s.replace(/,/g, '')) }

export default function SetSalePriceControl({
  watchId,
  sellingPrice,
  discountPrice,
}: {
  watchId:        string
  sellingPrice:   number | null
  discountPrice:  number | null
}) {
  const router = useRouter()
  const [open,   setOpen]   = useState(false)
  const [value,  setValue]  = useState(discountPrice != null ? String(discountPrice) : '')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const parsed     = value.trim() ? num(value) : null
  const validation = validateDiscountPrice(parsed, sellingPrice)
  const pct = parsed != null && validation == null && sellingPrice != null
    ? discountPercent(sellingPrice, parsed)
    : null

  async function save(next: number | null) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcErr } = await supabase.rpc('set_discount_price', {
      p_watch_id: watchId,
      p_price:    next,
    })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start transition-colors hover:bg-[#f7f6f3]"
        style={{ marginTop: 6, height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${INK_08}`, background: '#fff', color: INK, fontSize: 12, fontWeight: 600 }}
      >
        {discountPrice != null ? 'Edit Sale Price' : 'Set Sale Price'}
      </button>
    )
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{ marginTop: 8, padding: 12, borderRadius: RADII.md, border: `1px solid ${INK_08}`, background: '#fff', maxWidth: 300 }}
    >
      <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>Sale Price</span>
      <CurrencyInput value={value} onChange={setValue} />

      {validation && value.trim() !== '' && (
        <span className="text-[11.5px]" style={{ color: RED }}>{validation}</span>
      )}
      {pct != null && (
        <span className="text-[11.5px] font-semibold" style={{ color: GOLD }}>{pct}% off</span>
      )}
      {value.trim() === '' && discountPrice != null && (
        <span className="text-[11.5px]" style={{ color: INK_45 }}>Leave empty and save to remove the sale.</span>
      )}
      {error && <span className="text-[11.5px]" style={{ color: RED }}>{error}</span>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || (value.trim() !== '' && validation != null)}
          onClick={() => save(value.trim() ? parsed : null)}
          className="transition-opacity disabled:opacity-40"
          style={{ height: 32, padding: '0 14px', borderRadius: 999, border: 0, background: GREEN, color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setOpen(false); setValue(discountPrice != null ? String(discountPrice) : ''); setError(null) }}
          className="transition-colors"
          style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${INK_08}`, background: '#fff', color: INK, fontSize: 12, fontWeight: 600 }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
