export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoicePrintLayout from '@/components/invoices/InvoicePrintLayout'
import InvoicePrintControls from '@/components/invoices/InvoicePrintControls'
import InvoiceScaleWrapper from '@/components/invoices/InvoiceScaleWrapper'
import PrintAutoTrigger from '@/components/invoices/PrintAutoTrigger'
import type { Invoice, InvoiceItem, InvoicePayment } from '@/types'

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { auto?: string }
}) {
  const supabase = createClient()

  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (invError || !invData) notFound()

  const inv = invData as Invoice

  const [itemsRes, paymentsRes, logoRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', params.id),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'invoice_logo_url')
      .maybeSingle(),
  ])

  const items = ((itemsRes.data ?? []) as InvoiceItem[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(it => ({
      description:   it.description,
      reference:     it.reference,
      serial_number: it.serial_number,
      year:          it.year,
      condition:     it.condition,
      set_details:   it.set_details,
      photo_url:     it.photo_url,
      quantity:      it.quantity ?? 1,
      line_total:    it.line_total,
      field_visibility: it.field_visibility,
    }))

  const payments = (paymentsRes.data ?? []) as InvoicePayment[]
  const paidTotal = inv.status === 'draft'
    ? null
    : payments.filter(p => p.currency === inv.currency).reduce((s, p) => s + p.amount, 0)

  // bank_snapshot is frozen at issue; while still a draft, bank_id is a live
  // pointer the editor lets the enterer change — resolve it live here too.
  let bank = inv.bank_snapshot ?? null
  if (!bank && inv.show_bank_details && inv.bank_id) {
    const { data } = await supabase
      .from('saved_banks')
      .select('bank_name, account_name, account_number, branch, swift_code, address')
      .eq('id', inv.bank_id)
      .single()
    bank = data ?? null
  }

  const logoUrl = logoRes.data?.value ?? null

  const fieldVisibility = (inv as unknown as Record<string, unknown>).field_visibility as Record<string, boolean> | null ?? {}

  const d  = new Date(inv.date + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  const pdfTitle = `${inv.invoice_number ?? 'DRAFT'}-${dd}-${mm}-${yy}`

  const autoDownload = searchParams.auto === '1'

  return (
    <div className="min-h-screen bg-gray-100">
      <title>{pdfTitle}</title>
      {autoDownload && <PrintAutoTrigger />}
      <InvoicePrintControls invoiceId={params.id} pdfTitle={pdfTitle} />
      <div className="mx-auto max-w-[210mm] print:max-w-full bg-white shadow-sm print:shadow-none">
        <InvoiceScaleWrapper>
        <InvoicePrintLayout
          invoiceNumber={inv.invoice_number}
          docType={inv.doc_type}
          date={inv.date}
          currency={inv.currency}
          type={inv.type}
          status={inv.status}
          billToName={inv.bill_to_name}
          billToAddress={inv.bill_to_address}
          billToPhone={inv.bill_to_phone}
          salesManager={inv.sales_manager}
          paymentMethod={inv.payment_method}
          showBankDetails={inv.show_bank_details}
          showSignatures={inv.show_signatures}
          discount={inv.discount}
          paidTotal={paidTotal}
          notes={inv.notes}
          termsAndConditions={inv.terms_and_conditions}
          items={items}
          bank={bank}
          logoUrl={logoUrl}
          fieldVisibility={fieldVisibility}
        />
        </InvoiceScaleWrapper>
      </div>
    </div>
  )
}
