export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import ClientList from '@/components/clients/ClientList'
import { getClientBadge, type ClientBadgeDeal, type ClientBadgeType } from '@/lib/client-badges'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = createClient()

  const [clientsRes, dealsRes] = await Promise.all([
    supabase.from('clients').select('id, name, whatsapp, email, phone, instagram, is_vip, club_twb, notes, profile_notes, address, lead_referral, client_type, sales_manager, avatar_color, created_at, deleted_at, labels, is_draft, birthday, anniversary, status_tier').is('deleted_at', null).order('name', { ascending: true }),
    supabase
      .from('deals')
      .select('client_id, sale_price, stage, closed_at, sale_date, created_at, watch_id, watches(is_draft, deleted_at)')
      .is('deleted_at', null),
  ])

  const clients = (clientsRes.data ?? []) as Client[]

  type DealRow = {
    client_id: string | null
    sale_price: number | null
    stage: string
    closed_at: string | null
    sale_date: string | null
    created_at: string
    watch_id: string | null
    watches: { is_draft: boolean | null; deleted_at: string | null } | { is_draft: boolean | null; deleted_at: string | null }[] | null
  }

  const dealsByClient: Record<string, ClientBadgeDeal[]> = {}
  const clientSales: Record<string, number> = {}
  const clientDealCounts: Record<string, number> = {}

  for (const raw of (dealsRes.data ?? []) as DealRow[]) {
    if (!raw.client_id) continue
    const watch = Array.isArray(raw.watches) ? raw.watches[0] : raw.watches
    const deal: ClientBadgeDeal = {
      stage:            raw.stage,
      closed_at:        raw.closed_at,
      sale_date:        raw.sale_date,
      created_at:       raw.created_at,
      watch_is_draft:   watch?.is_draft ?? false,
      watch_deleted_at: watch?.deleted_at ?? null,
    }
    ;(dealsByClient[raw.client_id] ??= []).push(deal)

    if (
      (raw.stage === 'Closed' || raw.stage === 'Delivered') &&
      raw.sale_price != null &&
      !watch?.is_draft &&
      !watch?.deleted_at
    ) {
      clientSales[raw.client_id] = (clientSales[raw.client_id] ?? 0) + raw.sale_price
      clientDealCounts[raw.client_id] = (clientDealCounts[raw.client_id] ?? 0) + 1
    }
  }

  const clientBadges: Record<string, ClientBadgeType> = {}

  for (const client of clients) {
    const badge = getClientBadge(client, dealsByClient[client.id] ?? [])
    if (badge) clientBadges[client.id] = badge
  }

  return (
    <ClientList
      clients={clients}
      clientSales={clientSales}
      clientDealCounts={clientDealCounts}
      clientBadges={clientBadges}
    />
  )
}
