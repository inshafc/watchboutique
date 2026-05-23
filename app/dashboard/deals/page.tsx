export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DealList from '@/components/deals/DealList'
import type { DealWithRelations, SalesManager, Brand } from '@/types'

export default async function DealsPage() {
  const supabase = createClient()

  const [dealsRes, smRes, brandsRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos, purchase_cost, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('sales_managers').select('*').order('name'),
    supabase.from('brands').select('id, name, color').order('name'),
  ])

  const deals         = (dealsRes.data  ?? []) as DealWithRelations[]
  const salesManagers = (smRes.data     ?? []) as SalesManager[]
  const brands        = (brandsRes.data ?? []) as Brand[]

  return <DealList initialDeals={deals} salesManagers={salesManagers} brands={brands} />
}
