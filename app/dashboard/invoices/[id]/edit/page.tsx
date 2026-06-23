export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceEditorClient from '@/components/invoices/InvoiceEditorClient'
import type { Invoice, InvoiceItem, InvoiceWithItems, SavedBank, SalesManager } from '@/types'

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

  const [itemsRes, banksRes, smRes, watchesRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id)
      .order('created_at', { ascending: true }),
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
      .select('id, watch_name, reference, serial_number, date_on_card, condition, set_details, photos')
      .is('deleted_at', null)
      .order('watch_name'),
  ])

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

  // line_items JSONB column on invoices — primary source of truth for line items
  const lineItemsJson = (invData as Record<string, unknown>).line_items as Array<{
    watch_name: string; reference: string | null; serial_number: string | null;
    year: string | null; condition: string | null; photo_url: string | null;
    amount: number | null; amount_paid?: number | null; sort_order: number;
  }> | null

  const banks         = (banksRes.data   ?? []) as SavedBank[]
  const salesManagers = (smRes.data      ?? []) as SalesManager[]
  const watches       = (watchesRes.data ?? []) as {
    id:            string
    watch_name:    string
    reference:     string | null
    serial_number: string | null
    date_on_card:  string | null
    condition:     string | null
    set_details:   string | null
    photos:        string[] | null
  }[]

  return (
    <InvoiceEditorClient
      invoice={invoice}
      banks={banks}
      salesManagers={salesManagers}
      watches={watches}
      lineItemsJson={lineItemsJson}
    />
  )
}
