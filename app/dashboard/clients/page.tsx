export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ClientList from '@/components/clients/ClientList'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  return <ClientList clients={(clients ?? []) as Client[]} />
}
