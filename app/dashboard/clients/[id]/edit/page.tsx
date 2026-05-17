export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EditClientForm from '@/components/clients/EditClientForm'
import type { Client } from '@/types'

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data } = await supabase.from('clients').select('*').eq('id', params.id).single()

  if (!data) notFound()

  const client = data as Client

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href={`/dashboard/clients/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">Edit Client</h2>
        <p className="text-sm text-gray-400 mt-1">{client.name}</p>
      </div>
      <EditClientForm client={client} />
    </div>
  )
}
