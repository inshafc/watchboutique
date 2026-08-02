export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'
import { getInvestorStats } from '@/lib/investor-stats'
import type { DealRow, Target } from '@/lib/analytics'

const DashboardOverview = nextDynamic(
  () => import('@/components/dashboard/DashboardOverview'),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-50 animate-pulse" /> }
)

export default async function DashboardPage() {
  const supabase = createClient()

  const [dealsRes, watchesRes, targetsRes, investorStats] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_type, stage, sale_price, currency, exchange_rate, sale_date, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, source, sales_manager, client_id, watch_id, watches(watch_name, reference, purchase_cost, sold_price, brands(name)), clients(name, client_type, is_vip, club_twb, lead_referral, labels), trade_ins(value)')
      .is('deleted_at', null)
      .in('stage', ['Closed', 'Delivered']),
    supabase
      .from('watches')
      .select('id, selling_price')
      .is('deleted_at', null)
      .eq('is_draft', false)
      .not('selling_price', 'is', null)
      .in('watch_status', ['Available', 'On Hold', 'Offered']),
    supabase
      .from('targets')
      .select('*')
      .eq('year', new Date().getFullYear())
      .is('month', null),
    getInvestorStats(supabase),
  ])

  const deals = (dealsRes.data ?? []) as unknown as DealRow[]
  const targets = (targetsRes.data ?? []) as Target[]

  const stockWatches = (watchesRes.data ?? []) as { id: string; selling_price: number | null }[]
  const stockValue = stockWatches.reduce((s, w) => s + (w.selling_price ?? 0), 0)
  const stockCount = stockWatches.length

  return (
    <DashboardOverview
      deals={deals}
      stockValue={stockValue}
      stockCount={stockCount}
      targets={targets}
      investorStats={investorStats.investorStats}
    />
  )
}
