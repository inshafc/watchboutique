export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoicePrintLayout from '@/components/invoices/InvoicePrintLayout'
import PrintAutoTrigger from '@/components/invoices/PrintAutoTrigger'
import type { Invoice, InvoiceItem, InvoicePayment } from '@/types'

function PrintControls({ invoiceId, pdfTitle }: { invoiceId: string; pdfTitle: string }) {
  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <a
          href={`/dashboard/invoices/${invoiceId}/edit`}
          className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
          </svg>
          Open Editor
        </a>
        <a
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href={"javascript:void((function(){var t=document.title;document.title='" + pdfTitle.replace(/'/g, "\\'") + "';window.print();document.title=t;})())"}
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
            <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
          </svg>
          Print / Save PDF
        </a>
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}

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
      photo_url:     it.photo_url,
      quantity:      it.quantity ?? 1,
      line_total:    it.line_total,
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
      <PrintControls invoiceId={params.id} pdfTitle={pdfTitle} />
      <div className="mx-auto max-w-[210mm] print:max-w-full bg-white shadow-sm print:shadow-none">
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
      </div>
    </div>
  )
}
