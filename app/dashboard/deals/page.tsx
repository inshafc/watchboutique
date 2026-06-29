export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import DealList from '@/components/deals/DealList'
import type { DealWithRelations, SalesManager, Brand } from '@/types'

export default async function DealsPage() {
  const supabase = createClient()

  const [dealsRes, smRes, brandsRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_type, stage, offered_price, sale_price, trade_value, adjustment, commission, payment_method, currency, notes, sales_manager, closed_at, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, source, sale_date, delivery_status, bank_name, cash_amount, bank_amount, deleted_at, watch_id, client_id, watches(watch_name, reference, status, photos, purchase_cost, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('sales_managers').select('*').order('name'),
    supabase.from('brands').select('id, name, color').order('name'),
  ])

  const deals         = (dealsRes.data  ?? []) as unknown as DealWithRelations[]
  const salesManagers = (smRes.data     ?? []) as SalesManager[]
  const brands        = (brandsRes.data ?? []) as Brand[]

  return <DealList initialDeals={deals} salesManagers={salesManagers} brands={brands} />
}
