export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceEditorClient from '@/components/invoices/InvoiceEditorClient'
import type { InvoiceWithItems, SavedBank, SalesManager } from '@/types'

export default async function InvoiceEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [invRes, banksRes, smRes, logoRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, invoice_items(*), saved_banks(bank_name, account_name, account_number, branch, swift_code)')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('saved_banks')
      .select('*')
      .eq('is_active', true)
      .order('bank_name'),
    supabase.from('sales_managers').select('*').order('name'),
    supabase.from('app_settings').select('value').eq('key', 'invoice_logo_url').maybeSingle(),
  ])

  if (!invRes.data) notFound()

  const invoice       = invRes.data as InvoiceWithItems
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
