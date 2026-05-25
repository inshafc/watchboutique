export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoicePrintLayout from '@/components/invoices/InvoicePrintLayout'
import type { InvoiceWithItems } from '@/types'

function PrintButton() {
  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <a
          href="javascript:window.print()"
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
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

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), saved_banks(bank_name, account_name, account_number, branch, swift_code)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!data) notFound()

  const inv = data as InvoiceWithItems
  const items = (inv.invoice_items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(it => ({
      watch_name:    it.watch_name,
      reference:     it.reference,
      serial_number: it.serial_number,
      year:          it.year,
      condition:     it.condition,
      photo_url:     it.photo_url,
      amount:        it.amount,
    }))

  const bank = inv.show_bank_details && inv.saved_banks ? inv.saved_banks : null

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintButton />
      <div className="mx-auto max-w-[210mm] print:max-w-full bg-white shadow-sm print:shadow-none">
        <InvoicePrintLayout
          invoiceNumber={inv.invoice_number}
          date={inv.date}
          currency={inv.currency}
          exchangeRate={inv.exchange_rate}
          type={inv.type}
          status={inv.status}
          clientName={inv.client_name}
          clientAddress={inv.client_address}
          clientPhone={inv.client_phone}
          salesManager={inv.sales_manager}
          paymentMethod={inv.payment_method}
          showBankDetails={inv.show_bank_details}
          showSignatures={inv.show_signatures}
          advancePaid={inv.advance_paid}
          notes={inv.notes}
          items={items}
          bank={bank}
        />
      </div>
    </div>
  )
}
