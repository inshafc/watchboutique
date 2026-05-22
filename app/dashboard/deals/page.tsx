export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DealList from '@/components/deals/DealList'
import type { DealWithRelations, SalesManager } from '@/types'

export default async function DealsPage() {
  const supabase = createClient()

  const [dealsRes, smRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, status, photos, purchase_cost), clients(name, avatar_color)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('sales_managers').select('*').order('name'),
  ])

  const deals         = (dealsRes.data ?? []) as DealWithRelations[]
  const salesManagers = (smRes.data    ?? []) as SalesManager[]

  return <DealList initialDeals={deals} salesManagers={salesManagers} />
}
