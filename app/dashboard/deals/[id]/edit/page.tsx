export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EditDealForm from '@/components/deals/EditDealForm'
import type { Deal, TradeIn } from '@/types'

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [dealRes, tradeInsRes, watchesRes, clientsRes] = await Promise.all([
    supabase.from('deals').select('*').eq('id', params.id).single(),
    supabase.from('trade_ins').select('*').eq('deal_id', params.id).order('created_at'),
    supabase.from('watches').select('id, watch_name, reference, status, purchase_cost, photos').order('watch_name'),
    supabase.from('clients').select('id, name').order('name'),
  ])

  if (!dealRes.data) notFound()

  const deal        = dealRes.data as Deal
  const tradeIns    = (tradeInsRes.data ?? []) as TradeIn[]
  const watches     = (watchesRes.data ?? []) as { id: string; watch_name: string; reference: string | null; status: string; purchase_cost: number | null; photos?: string[] }[]
  const clients     = (clientsRes.data ?? []) as { id: string; name: string }[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href={`/dashboard/deals/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">Edit Sale</h2>
      </div>
      <EditDealForm deal={deal} initialTradeIns={tradeIns} watches={watches} clients={clients} />
    </div>
  )
}
