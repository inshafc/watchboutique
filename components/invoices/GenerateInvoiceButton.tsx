import Link from 'next/link'

export default function GenerateInvoiceButton({ dealId }: { dealId: string }) {
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
