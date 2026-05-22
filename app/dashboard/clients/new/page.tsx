export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddClientForm from '@/components/clients/AddClientForm'
import type { SalesManager } from '@/types'

export default async function NewClientPage() {
  const supabase = createClient()
  const { data } = await supabase.from('sales_managers').select('id, name').order('name')
  const salesManagers = (data ?? []) as SalesManager[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clients
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">Add Client</h2>
        <p className="text-sm text-gray-400 mt-1">Add a new client to the CRM.</p>
      </div>
      <AddClientForm salesManagers={salesManagers} />
    </div>
  )
}
