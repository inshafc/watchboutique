export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'
import type { DealRow, Target } from '@/lib/analytics'

const AnalyticsView = nextDynamic(
  () => import('@/components/dashboard/AnalyticsView'),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-50 animate-pulse" /> }
)

export default async function AnalyticsPage() {
  const supabase = createClient()

  const [dealsRes, targetsRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_type, stage, sale_price, sale_date, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, sales_manager, client_id, watches(watch_name, reference, purchase_cost, brands(name)), clients(name, client_type, is_vip, club_twb, lead_referral, labels), trade_ins(value)')
      .is('deleted_at', null)
      .in('stage', ['Closed', 'Delivered']),
    supabase
      .from('targets')
      .select('*')
      .eq('year', new Date().getFullYear())
      .is('month', null),
  ])

  const deals   = (dealsRes.data   ?? []) as unknown as DealRow[]
  const targets = (targetsRes.data ?? []) as Target[]

  return <AnalyticsView deals={deals} targets={targets} />
}
