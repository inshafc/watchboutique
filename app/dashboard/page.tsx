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

  const [dealsRes, stockRes, targetsRes, clientsRes, investorStats] = await Promise.all([
    supabase
      .from('deals')
      // closed_at + deal_expenses(amount) added for the Overview cards'
      // exact revenue/gross-profit formulas — everything else on this page
      // still reads sale_date/other_costs_amount as before.
      .select('id, deal_type, stage, sale_price, currency, exchange_rate, sale_date, closed_at, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, source, sales_manager, client_id, watch_id, watches(watch_name, reference, purchase_cost, sold_price, photos, brands(name)), clients(name, client_type, is_vip, club_twb, lead_referral, labels), trade_ins(value), deal_expenses(amount)')
      .is('deleted_at', null)
      .in('stage', ['Closed', 'Delivered']),
    // Value of stock (Overview card) — cost basis of current on-hand
    // inventory only, never period-filtered.
    supabase
      .from('watches')
      .select('id, purchase_cost')
      .is('deleted_at', null)
      .eq('is_draft', false)
      .eq('watch_status', 'Available'),
    supabase
      .from('targets')
      .select('*')
      .eq('year', new Date().getFullYear())
      .is('month', null),
    // New customers (Overview card) — not previously fetched on this page.
    supabase
      .from('clients')
      .select('id, created_at, lead_referral')
      .is('deleted_at', null),
    getInvestorStats(supabase),
  ])

  const deals = (dealsRes.data ?? []) as unknown as DealRow[]
  const targets = (targetsRes.data ?? []) as Target[]
  const clients = (clientsRes.data ?? []) as { id: string; created_at: string; lead_referral: string | null }[]

  const stockWatches = (stockRes.data ?? []) as { id: string; purchase_cost: number | null }[]
  const stockValue = stockWatches.reduce((s, w) => s + (w.purchase_cost ?? 0), 0)
  const stockCount = stockWatches.length

  return (
    <DashboardOverview
      deals={deals}
      stockValue={stockValue}
      stockCount={stockCount}
      targets={targets}
      clients={clients}
      investorStats={investorStats.investorStats}
    />
  )
}
