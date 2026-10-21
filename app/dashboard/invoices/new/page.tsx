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

  // If a non-draft invoice already exists for this deal, go straight to it.
  // If a draft already exists, continue it rather than starting another.
  if (dealId) {
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('deal_id', dealId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      redirect(`/dashboard/invoices/${existing.id}/edit`)
    }
  }

  // Fetch deal + watch + client data to pre-populate the draft
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
    clients: { id: string; name: string; phone: string | null; address: string | null; email: string | null } | null
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
        clients(id, name, phone, address, email)
      `)
      .eq('id', dealId)
      .maybeSingle()
    deal = data as DealRow | null
  }

  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['invoice_default_terms', 'invoice_default_bank_id'])
  const settings = Object.fromEntries((settingsRows ?? []).map(r => [r.key, r.value])) as Record<string, string | null>

  // Draft invoices carry no number — one is only assigned when issue_invoice()
  // is called from the editor. Create the draft row, then its line item.
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      doc_type:      'invoice',
      status:        'draft',
      deal_id:       dealId,
      type:          dealId ? 'sale' : 'general',
      currency:      deal?.currency         ?? 'LKR',
      sales_manager: deal?.sales_manager    ?? null,
      payment_method: deal?.payment_method  ?? null,
      client_id:      deal?.clients?.id     ?? null,
      bill_to_name:   deal?.clients?.name   ?? null,
      bill_to_phone:  deal?.clients?.phone  ?? null,
      bill_to_address: deal?.clients?.address ?? null,
      bill_to_email:  deal?.clients?.email  ?? null,
      terms_and_conditions: settings.invoice_default_terms ?? null,
      bank_id:              settings.invoice_default_bank_id ?? null,
    })
    .select('id')
    .single()

  if (error || !inv) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-500 mb-1">Failed to create invoice</p>
          <p className="text-xs text-gray-400">{error?.message ?? 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  const w = deal?.watches ?? null
  if (w?.watch_name) {
    const watchYear = w.date_on_card ? String(new Date(w.date_on_card).getFullYear()) : null
    await supabase.from('invoice_items').insert({
      invoice_id:    inv.id,
      watch_id:      deal?.watch_id    ?? null,
      description:   w.watch_name,
      reference:     w.reference       ?? null,
      serial_number: w.serial_number   ?? null,
      year:          watchYear,
      condition:     w.condition       ?? null,
      set_details:   w.set_details     ?? null,
      photo_url:     w.photos?.[0]     ?? null,
      quantity:      1,
      unit_price:    deal?.sale_price  ?? null,
      line_total:    deal?.sale_price  ?? null,
      sort_order:    0,
    })
  }

  redirect(`/dashboard/invoices/${inv.id}/edit`)
}
