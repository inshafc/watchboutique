import Link from 'next/link'

interface ExistingInvoice {
  id: string
  invoice_number: string
  status: string
}

interface Props {
  dealId:           string
  existingInvoice?: ExistingInvoice | null
  draftInvoice?:    ExistingInvoice | null
  dealStage?:       string
}

export default function GenerateInvoiceButton({ dealId, existingInvoice, draftInvoice }: Props) {
  if (existingInvoice) {
    return (
      <Link
        href={`/dashboard/invoices/${existingInvoice.id}/edit`}
        className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-emerald-200"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
        </svg>
        {existingInvoice.invoice_number}
      </Link>
    )
  }

  if (draftInvoice) {
    return (
      <Link
        href={`/dashboard/invoices/${draftInvoice.id}/edit`}
        className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-amber-200"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
        </svg>
        Continue Invoice
      </Link>
    )
  }

  return (
    <Link
      href={`/dashboard/invoices/new?deal_id=${dealId}`}
      className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
      </svg>
      Generate Invoice
    </Link>
  )
}
