export const revalidate = 60

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
    supabase.from('watches').select('id, watch_name, reference, serial_number, date_on_card, date_acquired, condition, set_details, purchased_from, purchase_cost, selling_price, currency, status, watch_status, comments, photos, labels, is_draft, deleted_at, created_at, brand_id, brands(name, color)').is('deleted_at', null).order('created_at', { ascending: false }),
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
