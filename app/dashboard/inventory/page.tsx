export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import WatchInventory from '@/components/watches/WatchInventory'
import type { WatchWithBrand, Brand } from '@/types'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { highlight?: string }
}) {
  const supabase = createClient()

  const [watchesRes, brandsRes] = await Promise.all([
    supabase.from('watches').select('*, brands(name, color)').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('brands').select('*').order('name'),
  ])

  const watches = (watchesRes.data ?? []) as unknown as WatchWithBrand[]

  const allBrands = (brandsRes.data ?? []) as Brand[]
  const seen = new Set<string>()
  const brands = allBrands.filter(b => {
    if (seen.has(b.name)) return false
    seen.add(b.name)
    return true
  })

  return <WatchInventory watches={watches} brands={brands} highlightId={searchParams.highlight} />
}
