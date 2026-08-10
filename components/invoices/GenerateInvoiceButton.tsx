import Link from 'next/link'
import { INK, GREEN, AMBER } from '@/lib/design-tokens'

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

const pillCls = 'inline-flex items-center gap-2.5 text-[13.5px] font-semibold transition-colors whitespace-nowrap'
const pillStyle: React.CSSProperties = { height: 46, padding: '0 22px', borderRadius: 999 }

function InvoiceIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.4 3.6h6.2l3.4 3.4v9.4H5.4z"/><path d="M8 10.4h4M8 13h4"/>
    </svg>
  )
}

export default function GenerateInvoiceButton({ dealId, existingInvoice, draftInvoice }: Props) {
  if (existingInvoice) {
    return (
      <Link
        href={`/dashboard/invoices/${existingInvoice.id}/edit`}
        className={pillCls}
        style={{ ...pillStyle, background: 'rgba(31,111,67,.1)', color: GREEN, border: '1px solid rgba(31,111,67,.2)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
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
        className={pillCls}
        style={{ ...pillStyle, background: 'rgba(181,118,26,.14)', color: AMBER, border: '1px solid rgba(181,118,26,.25)' }}
      >
        <InvoiceIcon color={AMBER} />
        Continue Invoice
      </Link>
    )
  }

  return (
    <Link
      href={`/dashboard/invoices/new?deal_id=${dealId}`}
      className={pillCls}
      style={{ ...pillStyle, background: INK, color: '#fff' }}
    >
      <InvoiceIcon color="#fff" />
      Generate Invoice
    </Link>
  )
}
