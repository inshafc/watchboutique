export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NewInvoicePage() {
  const supabase = createClient()

  const year   = new Date().getFullYear()
  const prefix = `TWB-${year}-`

  // Count existing invoices for current year to derive next sequential number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`)

  const seq            = (count ?? 0) + 1
  const invoice_number = `${prefix}${String(seq).padStart(4, '0')}`

  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({ invoice_number, type: 'general', status: 'draft' })
    .select('id')
    .single()

  if (error || !inv) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-500">
        Failed to create invoice: {error?.message ?? 'unknown error'}
      </div>
    )
  }

  redirect(`/dashboard/invoices/${inv.id}/edit`)
}
