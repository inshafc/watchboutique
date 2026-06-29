export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import InvoiceList from '@/components/invoices/InvoiceList'
import type { InvoiceWithItems } from '@/types'

export default async function InvoicesPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false })

  const invoices = (data ?? []) as InvoiceWithItems[]

  return <InvoiceList initialInvoices={invoices} />
}
