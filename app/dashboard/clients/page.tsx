export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import ClientList from '@/components/clients/ClientList'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = createClient()

  const [clientsRes, dealsRes] = await Promise.all([
    supabase.from('clients').select('id, name, whatsapp, email, phone, instagram, is_vip, club_twb, notes, profile_notes, address, lead_referral, client_type, sales_manager, avatar_color, created_at, deleted_at, labels, is_draft, birthday, anniversary, status_tier').is('deleted_at', null).order('name', { ascending: true }),
    supabase
      .from('deals')
      .select('client_id, sale_price, stage')
      .in('stage', ['Closed', 'Delivered'])
      .not('sale_price', 'is', null),
  ])

  const clients = (clientsRes.data ?? []) as Client[]

  const clientSales: Record<string, number> = {}
  const clientDealCounts: Record<string, number> = {}
  for (const deal of dealsRes.data ?? []) {
    if (deal.client_id && deal.sale_price != null) {
      clientSales[deal.client_id] = (clientSales[deal.client_id] ?? 0) + deal.sale_price
      clientDealCounts[deal.client_id] = (clientDealCounts[deal.client_id] ?? 0) + 1
    }
  }

  return <ClientList clients={clients} clientSales={clientSales} clientDealCounts={clientDealCounts} />
}
