export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NewInvoicePage() {
  const supabase = createClient()

  const year = new Date().getFullYear()
  const prefix = `TWB-${year}-`

  // Find highest existing sequence number for this year
  const { data: rows } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  let seq = 1
  if (rows && rows.length > 0) {
    const last = rows[0].invoice_number
    const num = parseInt(last.replace(prefix, ''), 10)
    if (!isNaN(num)) seq = num + 1
  }

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
