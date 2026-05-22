export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EditWatchForm from '@/components/watches/EditWatchForm'
import type { WatchWithInvestors, Brand } from '@/types'

export default async function EditWatchPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [watchRes, brandsRes] = await Promise.all([
    supabase.from('watches').select('*, watch_investors(*)').eq('id', params.id).single(),
    supabase.from('brands').select('*').order('name'),
  ])

  if (!watchRes.data) notFound()

  const watch = watchRes.data as WatchWithInvestors
  const seen  = new Set<string>()
  const brands = (brandsRes.data ?? []).filter((b: Brand) => {
    if (seen.has(b.name)) return false
    seen.add(b.name)
    return true
  }) as Brand[]

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="mb-7">
        <Link
          href={`/dashboard/watches/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-3">Edit Watch</h2>
        <p className="text-sm text-gray-400 mt-1">{watch.watch_name}</p>
      </div>
      <EditWatchForm watch={watch} brands={brands} />
    </div>
  )
}
