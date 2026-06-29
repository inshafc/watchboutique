export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'
import type { DealRow, Target } from '@/lib/analytics'

const DashboardOverview = nextDynamic(
  () => import('@/components/dashboard/DashboardOverview'),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-50 animate-pulse" /> }
)

export default async function DashboardPage() {
  const supabase = createClient()

  const [dealsRes, watchesRes, targetsRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_type, stage, sale_price, sale_date, created_at, other_costs, other_costs_amount, commission_payable, commission_amount, new_client, source, sales_manager, client_id, watches(watch_name, reference, purchase_cost, brands(name)), clients(name, client_type, is_vip, club_twb, lead_referral, labels), trade_ins(value)')
      .is('deleted_at', null)
      .in('stage', ['Closed', 'Delivered']),
    supabase
      .from('watches')
      .select('selling_price')
      .is('deleted_at', null)
      .not('selling_price', 'is', null)
      .in('status', ['Available', 'On Hold', 'Offered']),
    supabase
      .from('targets')
      .select('*')
      .eq('year', new Date().getFullYear())
      .is('month', null),
  ])

  const deals = (dealsRes.data ?? []) as unknown as DealRow[]
  const inventoryValue = (watchesRes.data ?? []).reduce((s: number, w: { selling_price: number | null }) => s + (w.selling_price ?? 0), 0)
  const targets = (targetsRes.data ?? []) as Target[]

  const delivered = deals.filter(d => d.stage === 'Delivered')
  const sourceMap = new Map<string, { count: number; revenue: number }>()
  for (const d of delivered) {
    const key = d.source ?? 'Unknown'
    const e = sourceMap.get(key) ?? { count: 0, revenue: 0 }
    sourceMap.set(key, { count: e.count + 1, revenue: e.revenue + (d.sale_price ?? 0) })
  }
  const sourceSummary = Array.from(sourceMap.entries()).map(([source, v]) => ({ source, ...v }))

  return <DashboardOverview deals={deals} inventoryValue={inventoryValue} targets={targets} sourceSummary={sourceSummary} />
}
