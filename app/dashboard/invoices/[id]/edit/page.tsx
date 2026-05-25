export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceEditorClient from '@/components/invoices/InvoiceEditorClient'
import type { Invoice, InvoiceItem, InvoiceWithItems, SavedBank, SalesManager } from '@/types'

export default async function InvoiceEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Fetch invoice on its own — no joins so a missing related table can't 404 this
  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (invError || !invData) notFound()

  const inv = invData as Invoice

  // Fetch related data independently — each falls back to empty if table missing
  const [itemsRes, banksRes, smRes, logoRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id)
      .order('sort_order'),
    supabase
      .from('saved_banks')
      .select('*')
      .eq('is_active', true)
      .order('bank_name'),
    supabase
      .from('sales_managers')
      .select('*')
      .order('name'),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'invoice_logo_url')
      .maybeSingle(),
  ])

  // Fetch the specific bank linked to this invoice (for the preview)
  let linkedBank: InvoiceWithItems['saved_banks'] = null
  if (inv.bank_id) {
    const { data } = await supabase
      .from('saved_banks')
      .select('bank_name, account_name, account_number, branch, swift_code')
      .eq('id', inv.bank_id)
      .single()
    linkedBank = data ?? null
  }

  const invoice: InvoiceWithItems = {
    ...inv,
    invoice_items: (itemsRes.data ?? []) as InvoiceItem[],
    saved_banks:   linkedBank,
  }

  const banks         = (banksRes.data ?? []) as SavedBank[]
  const salesManagers = (smRes.data    ?? []) as SalesManager[]
  const logoUrl       = logoRes.data?.value ?? null

  return (
    <InvoiceEditorClient
      invoice={invoice}
      banks={banks}
      salesManagers={salesManagers}
      initialLogoUrl={logoUrl}
    />
  )
}
