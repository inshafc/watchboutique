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

  // If deal_id provided, check for an existing invoice for this deal first
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

  // Fetch full deal + watch + client data for pre-population
  type DealRow = {
    watch_id:       string | null
    currency:       string
    sale_price:     number | null
    sales_manager:  string | null
    payment_method: string | null
    watches: {
      watch_name:    string
      reference:     string | null
      serial_number: string | null
      date_on_card:  string | null
      condition:     string | null
      set_details:   string | null
      photos:        string[] | null
    } | null
    clients: { name: string; phone: string | null; address: string | null } | null
  }
  let deal: DealRow | null = null

  if (dealId) {
    const { data } = await supabase
      .from('deals')
      .select(`
        watch_id,
        currency,
        sale_price,
        sales_manager,
        payment_method,
        watches(watch_name, reference, serial_number, date_on_card, condition, set_details, photos),
        clients(name, phone, address)
      `)
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

  // Build line items from the watch + deal data
  const w          = deal?.watches ?? null
  const salePrice  = deal?.sale_price ?? 0
  const watchYear  = w?.date_on_card
    ? String(new Date(w.date_on_card).getFullYear())
    : null

  const lineItemsArray = w?.watch_name
    ? [{
        watch_id:      deal?.watch_id      ?? null,
        watch_name:    w.watch_name,
        reference:     w.reference         ?? null,
        serial_number: w.serial_number     ?? null,
        year:          watchYear,
        condition:     w.condition         ?? null,
        set_details:   w.set_details       ?? null,
        photo_url:     w.photos?.[0]       ?? null,
        quantity:      1,
        amount:        salePrice,
        amount_paid:   salePrice,
        sort_order:    0,
      }]
    : []

  // Create the invoice record with line_items, total, and subtotal
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      deal_id:        dealId,
      type:           dealId ? 'sale' : 'general',
      status:         'draft',
      currency:       deal?.currency         ?? 'LKR',
      sales_manager:  deal?.sales_manager    ?? null,
      payment_method: deal?.payment_method   ?? null,
      client_name:    deal?.clients?.name    ?? null,
      client_phone:   deal?.clients?.phone   ?? null,
      client_address: deal?.clients?.address ?? null,
      line_items:     lineItemsArray,
      subtotal:       salePrice,
      total:          salePrice,
    })
    .select('id')
    .single()

  if (error || !inv) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-500 mb-1">Failed to create invoice</p>
          <p className="text-xs text-gray-400">
            {error?.message ?? 'Unknown error — check that the invoices table has line_items, total, and subtotal columns'}
          </p>
        </div>
      </div>
    )
  }

  // Also write to invoice_items table for backward compatibility
  if (lineItemsArray.length > 0 && w) {
    const { error: itemError } = await supabase.from('invoice_items').insert({
      invoice_id:    inv.id,
      watch_id:      deal?.watch_id    ?? null,
      watch_name:    w.watch_name,
      reference:     w.reference       ?? null,
      serial_number: w.serial_number   ?? null,
      year:          watchYear,
      condition:     w.condition       ?? null,
      photo_url:     w.photos?.[0]     ?? null,
      amount:        deal?.sale_price  ?? null,
      sort_order:    0,
    })

    if (itemError) {
      console.error('[invoice/new] invoice_items insert failed:', itemError.message)
    }
  }

  redirect(`/dashboard/invoices/${inv.id}/edit`)
}
