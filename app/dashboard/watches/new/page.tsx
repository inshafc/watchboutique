export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddWatchForm from '@/components/watches/AddWatchForm'
import type { Brand } from '@/types'

export default async function NewWatchPage() {
  const supabase = createClient()
  const { data: brands } = await supabase.from('brands').select('*').order('name')

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Inventory
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">Add Watch</h2>
        <p className="text-sm text-gray-400 mt-1">Add a new watch to the inventory.</p>
      </div>
      <AddWatchForm brands={(brands ?? []) as Brand[]} />
    </div>
  )
}
