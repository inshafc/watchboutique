export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceEditorClient from '@/components/invoices/InvoiceEditorClient'
import type { Invoice, InvoiceItem, InvoicePayment, InvoiceWithItems, SavedBank, SalesManager } from '@/types'

export default async function InvoiceEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (invError || !invData) notFound()

  const inv = invData as Invoice

  const [itemsRes, paymentsRes, banksRes, smRes, watchesRes, clientsRes, logoRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', params.id)
      .order('paid_at', { ascending: true }),
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
      .from('watches')
      .select('id, watch_name, reference, serial_number, date_on_card, condition, set_details, photos, selling_price')
      .is('deleted_at', null)
      .order('watch_name'),
    supabase
      .from('clients')
      .select('id, name, phone, address, email, club_twb, avatar_color')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'invoice_logo_url')
      .maybeSingle(),
  ])

  const invoice: InvoiceWithItems = {
    ...inv,
    invoice_items:    (itemsRes.data    ?? []) as InvoiceItem[],
    invoice_payments: (paymentsRes.data ?? []) as InvoicePayment[],
  }

  const banks         = (banksRes.data    ?? []) as SavedBank[]
  const salesManagers = (smRes.data       ?? []) as SalesManager[]
  const logoUrl       = logoRes.data?.value ?? null
  const clients       = (clientsRes.data  ?? []) as {
    id: string; name: string; phone: string | null; address: string | null; email: string | null; club_twb: boolean; avatar_color: string | null
  }[]
  const watches       = (watchesRes.data  ?? []) as {
    id:            string
    watch_name:    string
    reference:     string | null
    serial_number: string | null
    date_on_card:  string | null
    condition:     string | null
    set_details:   string | null
    photos:        string[] | null
    selling_price: number | null
  }[]

  return (
    <InvoiceEditorClient
      invoice={invoice}
      banks={banks}
      salesManagers={salesManagers}
      watches={watches}
      clients={clients}
      logoUrl={logoUrl}
    />
  )
}
