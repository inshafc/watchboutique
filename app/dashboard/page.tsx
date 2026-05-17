export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import WatchInventory from '@/components/watches/WatchInventory'
import type { Watch } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: watches } = await supabase
    .from('watches')
    .select('*')
    .order('created_at', { ascending: false })

  return <WatchInventory watches={(watches ?? []) as Watch[]} />
}
