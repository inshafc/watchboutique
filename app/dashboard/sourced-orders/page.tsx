export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import SourcedOrdersList from '@/components/sourced-orders/SourcedOrdersList'
import type { SourcedOrder } from '@/types'

export default async function SourcedOrdersPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('sourced_orders')
    .select('*')
    .order('created_at', { ascending: false })

  const orders = (data ?? []) as SourcedOrder[]

  return <SourcedOrdersList initialOrders={orders} />
}
