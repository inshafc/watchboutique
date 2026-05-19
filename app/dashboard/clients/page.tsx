export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ClientList from '@/components/clients/ClientList'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = createClient()

  const [clientsRes, dealsRes] = await Promise.all([
    supabase.from('clients').select('*').is('deleted_at', null).order('name', { ascending: true }),
    supabase
      .from('deals')
      .select('client_id, sale_price')
      .in('stage', ['Closed', 'Delivered'])
      .not('sale_price', 'is', null),
  ])

  const clients = (clientsRes.data ?? []) as Client[]

  const clientSales: Record<string, number> = {}
  for (const deal of dealsRes.data ?? []) {
    if (deal.client_id && deal.sale_price != null) {
      clientSales[deal.client_id] = (clientSales[deal.client_id] ?? 0) + deal.sale_price
    }
  }

  return <ClientList clients={clients} clientSales={clientSales} />
}
