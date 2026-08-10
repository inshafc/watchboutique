export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddWatchForm from '@/components/watches/AddWatchForm'
import { INK, INK_45 } from '@/lib/design-tokens'
import type { Brand } from '@/types'

// rgba(20,20,15,.5) is Add Watch.dc.html's back-link color — distinct from
// INK_45's .45, not currently in lib/design-tokens.ts. Flagged, not rounded.
const BACK_INK = 'rgba(20,20,15,.5)'

export default async function NewWatchPage() {
  const supabase = createClient()
  const { data: rawBrands } = await supabase.from('brands').select('*').order('name')
  const seen = new Set<string>()
  const brands = (rawBrands ?? []).filter((b: Brand) => {
    if (seen.has(b.name)) return false
    seen.add(b.name)
    return true
  })

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>
      <div className="flex flex-col gap-1.5 mb-5">
        <Link href="/dashboard/inventory" className="flex items-center gap-1.5 text-[12.5px] font-semibold w-fit" style={{ color: BACK_INK }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={BACK_INK} strokeWidth="1.7" strokeLinecap="round"><path d="M9.5 3.5 5 8l4.5 4.5"/></svg>
          Inventory
        </Link>
        <h1 className="m-0" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.05 }}>Add watch</h1>
        <span className="text-[13px]" style={{ color: INK_45 }}>Add a new piece to the inventory</span>
      </div>
      <div style={{ maxWidth: 1000 }}>
        <AddWatchForm brands={(brands ?? []) as Brand[]} />
      </div>
    </div>
  )
}
