export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { deal_id?: string }
}) {
  const supabase = createClient()
  const dealId   = searchParams?.deal_id ?? null

  // If deal_id provided, check for an existing invoice for this deal
  if (dealId) {
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('deal_id', dealId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      redirect(`/dashboard/invoices/${existing.id}/edit`)
    }
  }

  // Fetch deal data for pre-population (server-side — bypasses RLS)
  type DealRow = {
    currency: string; sale_price: number | null; sales_manager: string | null
    payment_method: string | null
    watches: { watch_name: string; reference: string | null; serial_number: string | null; photos: string[] | null } | null
    clients: { name: string; phone: string | null; address: string | null } | null
  }
  let deal: DealRow | null = null

  if (dealId) {
    const { data } = await supabase
      .from('deals')
      .select('currency, sale_price, sales_manager, payment_method, watches(watch_name, reference, serial_number, photos), clients(name, phone, address)')
      .eq('id', dealId)
      .maybeSingle()
    deal = data as DealRow | null
  }

  // Generate sequential invoice number for this year
  const year   = new Date().getFullYear()
  const prefix = `TWB-${year}-`
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`)
  const invoice_number = `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`

  // Create the invoice record
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      deal_id:        dealId,
      type:           dealId ? 'sale' : 'general',
      status:         'draft',
      currency:       deal?.currency       ?? 'LKR',
      sales_manager:  deal?.sales_manager  ?? null,
      payment_method: deal?.payment_method ?? null,
      client_name:    deal?.clients?.name    ?? null,
      client_phone:   deal?.clients?.phone   ?? null,
      client_address: deal?.clients?.address ?? null,
    })
    .select('id')
    .single()

  if (error || !inv) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-500 mb-1">Failed to create invoice</p>
          <p className="text-xs text-gray-400">{error?.message ?? 'Unknown error — check that sprint10.sql has been run in Supabase'}</p>
        </div>
      </div>
    )
  }

  // Add watch as line item if coming from a deal
  if (deal?.watches?.watch_name) {
    await supabase.from('invoice_items').insert({
      invoice_id:    inv.id,
      watch_name:    deal.watches.watch_name,
      reference:     deal.watches.reference    ?? null,
      serial_number: deal.watches.serial_number ?? null,
      photo_url:     deal.watches.photos?.[0]  ?? null,
      amount:        deal.sale_price            ?? null,
      sort_order:    0,
    })
  }

  redirect(`/dashboard/invoices/${inv.id}/edit`)
}
