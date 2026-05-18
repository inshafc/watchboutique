export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddDealForm from '@/components/deals/AddDealForm'

export default async function NewDealPage() {
  const supabase = createClient()

  const [watchesRes, clientsRes] = await Promise.all([
    supabase.from('watches').select('id, watch_name, reference, status, purchase_cost').order('watch_name'),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const watches = (watchesRes.data ?? []) as { id: string; watch_name: string; reference: string | null; status: string; purchase_cost: number | null }[]
  const clients = (clientsRes.data ?? []) as { id: string; name: string }[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href="/dashboard/deals"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sales
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">New Sale</h2>
        <p className="text-sm text-gray-400 mt-1">Link a watch and client to track a sale.</p>
      </div>
      <AddDealForm watches={watches} clients={clients} />
    </div>
  )
}
