export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DealList from '@/components/deals/DealList'
import type { DealWithRelations } from '@/types'

export default async function DealsPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('deals')
    .select('*, watches(watch_name, reference, status, photos), clients(name, avatar_color)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const deals = (data ?? []) as DealWithRelations[]

  return <DealList initialDeals={deals} />
}
