export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'
import { getInvestorStats } from '@/lib/investor-stats'
import type { DealRow, Target, AgeingWatch } from '@/lib/analytics'

// TWB / The Watch Boutique is the business itself, not an investor — a watch_investors
// row for TWB alone doesn't make a watch "investor-backed".
const TWB_KEYS = new Set(['twb', 'the-watch-boutique', 'the_watch_boutique'])
function isTwbInvestor(key: string): boolean {
  return TWB_KEYS.has(key.trim().toLowerCase())
}

const DashboardOverview = nextDynamic(
  () => import('@/components/dashboard/DashboardOverview'),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-50 animate-pulse" /> }
)

export default async function DashboardPage() {
  const supabase = createClient()

  const [dealsRes, watchesRes, targetsRes, ageingRes, investorWatchIdsRes, investorStats] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_type, stage, sale_price, sale_date, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, source, sales_manager, client_id, watch_id, watches(watch_name, reference, purchase_cost, brands(name)), clients(name, client_type, is_vip, club_twb, lead_referral, labels), trade_ins(value)')
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
    supabase
      .from('watches')
      .select('id, watch_name, condition, created_at, date_acquired, selling_price, brands(name)')
      .in('watch_status', ['Available', 'On Hold', 'Offered'])
      .is('deleted_at', null)
      .eq('is_draft', false)
      .order('created_at', { ascending: true }),
    supabase.from('watch_investors').select('watch_id, investor_name'),
    getInvestorStats(supabase),
  ])

  const deals = (dealsRes.data ?? []) as unknown as DealRow[]
  const targets = (targetsRes.data ?? []) as Target[]

  // A watch is "investor-backed" only if it has a real (non-TWB) investor stake.
  const investorBackedIds = new Set(
    (investorWatchIdsRes.data ?? [])
      .filter(r => !isTwbInvestor(r.investor_name as string))
      .map(r => r.watch_id as string)
  )

  const stockWatches = (watchesRes.data ?? []) as { id: string; selling_price: number | null }[]
  const inventoryValueAll = stockWatches.reduce((s, w) => s + (w.selling_price ?? 0), 0)
  const inventoryValueTwbOnly = stockWatches
    .filter(w => !investorBackedIds.has(w.id))
    .reduce((s, w) => s + (w.selling_price ?? 0), 0)

  const sixtyDaysAgoMs = Date.now() - 60 * 24 * 60 * 60 * 1000
  const ageingWatches = ((ageingRes.data ?? []) as unknown as Omit<AgeingWatch, 'hasInvestors'>[])
    .filter(w => new Date(w.date_acquired ?? w.created_at).getTime() < sixtyDaysAgoMs)
    .sort((a, b) => new Date(a.date_acquired ?? a.created_at).getTime() - new Date(b.date_acquired ?? b.created_at).getTime())
    .map(w => ({ ...w, hasInvestors: investorBackedIds.has(w.id) }))

  for (const d of deals) {
    d.hasInvestors = d.watch_id ? investorBackedIds.has(d.watch_id) : false
  }

  const delivered = deals.filter(d => d.stage === 'Delivered')
  const sourceMap = new Map<string, { count: number; revenue: number }>()
  for (const d of delivered) {
    const key = d.source ?? 'Unknown'
    const e = sourceMap.get(key) ?? { count: 0, revenue: 0 }
    sourceMap.set(key, { count: e.count + 1, revenue: e.revenue + (d.sale_price ?? 0) })
  }
  const sourceSummary = Array.from(sourceMap.entries()).map(([source, v]) => ({ source, ...v }))

  return (
    <DashboardOverview
      deals={deals}
      inventoryValueAll={inventoryValueAll}
      inventoryValueTwbOnly={inventoryValueTwbOnly}
      targets={targets}
      sourceSummary={sourceSummary}
      ageingWatches={ageingWatches}
      investorSnapshot={{
        totalAmountInvested:  investorStats.totalAmountInvested,
        totalCapitalDeployed: investorStats.totalCapitalDeployed,
        totalProfitReturned:  investorStats.totalProfitReturned,
        activeWatchCount:     investorStats.activeWatchCount,
      }}
    />
  )
}
