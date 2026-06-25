import type { InvoiceType, InvoiceStatus } from '@/types'

const TWB_LOGO_URL =
  'https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/The%20Watch%20Boutique%20Sri%20Lanka%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby9UaGUgV2F0Y2ggQm91dGlxdWUgU3JpIExhbmthIExvZ28ucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MTQ2MTQ0OSwiZXhwIjo3Mzk3NDYxNDQ5fQ.KCxDWOYjqZXZ-IFdYvW3I5EFlzA7Y-GTnZGUxITzLo8'

export interface PrintItem {
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  year:          string | null
  condition:     string | null
  photo_url:     string | null
  amount:        number | null
  amount_paid?:  number | null
}

export interface PrintBank {
  bank_name:      string
  account_name:   string | null
  account_number: string | null
  branch:         string | null
  swift_code:     string | null
}

export interface FieldVisibility {
  phone:         boolean
  address:       boolean
  sales_manager: boolean
  notes:         boolean
  terms:         boolean
  signatures:    boolean
}

export interface InvoicePrintLayoutProps {
  invoiceNumber:        string
  date:                 string
  currency:             string
  exchangeRate:         number | null
  type:                 InvoiceType
  status:               InvoiceStatus
  clientName:           string | null
  clientAddress:        string | null
  clientPhone:          string | null
  salesManager:         string | null
  paymentMethod:        string | null
  showBankDetails:      boolean
  showSignatures:       boolean
  advancePaid:          number | null
  notes:                string | null
  termsAndConditions?:  string | null
  items:                PrintItem[]
  bank?:                PrintBank | null
  logoUrl?:             string | null
  fieldVisibility?:     Partial<FieldVisibility>
}

function fmt(amount: number | null | undefined, currency: string): string {
  if (amount == null) return '—'
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  if (currency === 'LKR') return 'LKR ' + amount.toLocaleString('en-LK', opts)
  if (currency === 'USD') return '$ '   + amount.toLocaleString('en-US', opts)
  if (currency === 'AED') return 'AED ' + amount.toLocaleString('en-US', opts)
  if (currency === 'AUD') return 'A$ '  + amount.toLocaleString('en-US', opts)
  return currency + ' ' + amount.toLocaleString('en-US', opts)
}

function fmtDate(d: string): string {
  try {
    const date = new Date(d + 'T00:00:00')
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yy = String(date.getFullYear()).slice(2)
    return `${dd} ${mm} ${yy}`
  } catch {
    return d
  }
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; dotColor: string; textColor: string }> = {
  paid_in_full: { label: 'Paid in Full', dotColor: '#10b981', textColor: '#047857' },
  advance_paid: { label: 'Advance Paid', dotColor: '#f59e0b', textColor: '#b45309' },
  overdue:      { label: 'Overdue',      dotColor: '#ef4444', textColor: '#b91c1c' },
  draft:        { label: 'Draft',        dotColor: '#9ca3af', textColor: '#6b7280' },
}

const MIN_ROWS = 3

export default function InvoicePrintLayout({
  invoiceNumber,
  date,
  currency,
  type,
  status,
  clientName,
  clientAddress,
  clientPhone,
  salesManager,
  paymentMethod,
  showBankDetails,
  showSignatures,
  advancePaid,
  notes,
  termsAndConditions,
  items,
  bank,
  logoUrl,
  fieldVisibility = {},
}: InvoicePrintLayoutProps) {
  const fv: FieldVisibility = {
    phone:         fieldVisibility.phone         ?? true,
    address:       fieldVisibility.address       ?? true,
    sales_manager: fieldVisibility.sales_manager ?? true,
    notes:         fieldVisibility.notes         ?? true,
    terms:         fieldVisibility.terms         ?? true,
    signatures:    fieldVisibility.signatures    ?? showSignatures,
  }

  const subtotal   = items.reduce((s, it) => s + (it.amount ?? 0), 0)
  const balanceDue = type === 'sourcing' && advancePaid != null ? subtotal - advancePaid : null
  const sc         = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  const effectiveLogo = logoUrl || TWB_LOGO_URL

  const displayRows: (PrintItem | null)[] = [
    ...items,
    ...Array(Math.max(0, MIN_ROWS - items.length)).fill(null),
  ]

  const hasAmountPaid   = items.some(it => it.amount_paid != null)
  const totalAmountPaid = items.reduce((s, it) => s + (it.amount_paid ?? 0), 0)

  const poppins = "'Poppins', sans-serif"

  const labelStyle = {
    fontFamily:    poppins,
    fontSize:      '10px',
    fontWeight:    600,
    color:         '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    marginBottom:  '6px',
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body  { margin: 0; }
        }
      `}</style>

      <div
        id="invoice-document"
        style={{
          fontFamily:    poppins,
          background:    '#ffffff',
          color:         '#111111',
          width:         '210mm',
          minHeight:     '297mm',
          display:       'flex',
          flexDirection: 'column',
          boxSizing:     'border-box',
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '40px 48px 28px' }}>
          <div>
            <h1 style={{
              fontFamily:    poppins,
              fontWeight:    700,
              fontSize:      '48px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color:         '#111111',
              lineHeight:    1,
              margin:        0,
            }}>
              INVOICE
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveLogo}
              alt="The Watch Boutique"
              style={{ maxHeight: '80px', objectFit: 'contain', display: 'block', marginLeft: 'auto' }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#e5e7eb', margin: '0 48px' }} />

        {/* ── META ROW ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '24px 48px 24px' }}>
          {/* Left: Billing Details */}
          <div>
            <p style={labelStyle}>Billing Details</p>
            {clientName
              ? <p style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: '#111111', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{clientName}</p>
              : <p style={{ fontFamily: poppins, fontSize: '14px', fontWeight: 400, color: '#d1d5db', marginBottom: '4px' }}>—</p>
            }
            {fv.phone   && clientPhone   && <p style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 400, color: '#6b7280', marginTop: '2px' }}>{clientPhone}</p>}
            {fv.address && clientAddress && <p style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 400, color: '#6b7280', marginTop: '2px', lineHeight: 1.5 }}>{clientAddress}</p>}
          </div>

          {/* Right: Invoice meta */}
          <div style={{ textAlign: 'right' }}>
            {[
              { label: 'Invoice #', value: invoiceNumber },
              { label: 'Date',      value: fmtDate(date) },
              ...(fv.sales_manager && salesManager ? [{ label: 'Sales Manager', value: salesManager }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '6px' }}>
                <span style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em', minWidth: '100px', textAlign: 'right' }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: poppins, fontSize: '12px', fontWeight: row.label === 'Invoice #' ? 600 : 400, color: '#111111', minWidth: '120px', textAlign: 'right' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#e5e7eb', margin: '0 48px' }} />

        {/* ── LINE ITEMS TABLE ────────────────────────────────────── */}
        <div style={{ padding: '24px 48px 0' }}>
          {/* Header row */}
          <div style={{
            background:          '#1a1a1a',
            color:               '#ffffff',
            display:             'grid',
            gridTemplateColumns: '1fr 60px 140px',
            padding:             '10px 16px',
            borderRadius:        '8px 8px 0 0',
          }}>
            <span style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Item</span>
            <span style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>Qty</span>
            <span style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'right' }}>Amount</span>
          </div>

          {/* Rows */}
          {displayRows.map((item, i) => {
            const isLast  = i === displayRows.length - 1
            const isEmpty = item === null
            return (
              <div
                key={i}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 60px 140px',
                  gap:                 '16px',
                  alignItems:          'center',
                  minHeight:           '72px',
                  padding:             '12px 16px',
                  borderLeft:          '1px solid #f3f4f6',
                  borderRight:         '1px solid #f3f4f6',
                  borderBottom:        isEmpty ? '1px dashed #e5e7eb' : '1px solid #f3f4f6',
                  borderRadius:        isLast ? '0 0 8px 8px' : undefined,
                }}
              >
                {isEmpty ? (
                  <><div /><div /><div /></>
                ) : (
                  <>
                    {/* Item description */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {item.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photo_url}
                          alt=""
                          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#f9fafb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="7" /><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9.5 3h5M9.5 21h5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {item.watch_name || '—'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '3px' }}>
                          {item.reference     && <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>Ref: {item.reference}</span>}
                          {item.serial_number && <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>SN: {item.serial_number}</span>}
                          {item.year          && <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>Year: {item.year}</span>}
                          {item.condition     && <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>Condition: {item.condition}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Qty */}
                    <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 400, color: '#6b7280', textAlign: 'center' }}>1</span>

                    {/* Amount */}
                    <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: '#111111', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(item.amount, currency)}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ── AMOUNT PAID ─────────────────────────────────────────── */}
        {hasAmountPaid && (
          <div style={{ padding: '10px 48px 0' }}>
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
              <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Amount Paid
              </span>
              <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(totalAmountPaid, currency)}
              </span>
            </div>
          </div>
        )}

        {/* ── SUBTOTAL + TOTAL ────────────────────────────────────── */}
        <div style={{ padding: '12px 48px 0' }}>
          {/* Subtotal row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px', padding: '8px 16px', marginBottom: '6px' }}>
            <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Subtotal</span>
            <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 400, color: '#6b7280', minWidth: '140px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(subtotal, currency)}
            </span>
          </div>

          {/* Total bar */}
          <div style={{
            background:     '#1a1a1a',
            color:          '#ffffff',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '14px 20px',
            borderRadius:   '8px',
          }}>
            <span style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Total</span>
            <span style={{ fontFamily: poppins, fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(subtotal, currency)}</span>
          </div>

          {/* Sourcing: advance paid + balance due */}
          {type === 'sourcing' && advancePaid != null && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#f9fafb', borderRadius: '6px', marginBottom: '4px' }}>
                <span style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>Advance Paid</span>
                <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{fmt(advancePaid, currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                <span style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 600, color: '#111111' }}>Balance Due</span>
                <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>{fmt(balanceDue, currency)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── PAYMENT SECTION ─────────────────────────────────────── */}
        <div style={{ padding: '16px 48px 0' }}>
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px 20px', display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {paymentMethod && (
              <div>
                <p style={{ ...labelStyle, marginBottom: '4px' }}>Payment Method</p>
                <p style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 400, color: '#111111' }}>{paymentMethod}</p>
              </div>
            )}
            <div>
              <p style={{ ...labelStyle, marginBottom: '4px' }}>Status</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dotColor, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: poppins, fontSize: '13px', fontWeight: 600, color: sc.textColor }}>{sc.label}</span>
              </div>
            </div>
            {showBankDetails && bank && (
              <div style={{ flex: 1, minWidth: '180px' }}>
                <p style={{ ...labelStyle, marginBottom: '4px' }}>Bank Details</p>
                <p style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 600, color: '#111111', marginBottom: '2px' }}>{bank.bank_name}</p>
                {bank.account_name   && <p style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#6b7280' }}>Account Name: {bank.account_name}</p>}
                {bank.account_number && <p style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#6b7280' }}>Account No: {bank.account_number}</p>}
                {bank.branch         && <p style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#6b7280' }}>Branch: {bank.branch}</p>}
                {bank.swift_code     && <p style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#6b7280' }}>SWIFT: {bank.swift_code}</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── NOTES ───────────────────────────────────────────────── */}
        {fv.notes && notes?.trim() && (
          <div style={{ padding: '16px 48px 0' }}>
            <p style={labelStyle}>Notes</p>
            <p style={{ fontFamily: poppins, fontSize: '12px', fontWeight: 400, color: '#6b7280', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}

        {/* ── TERMS & CONDITIONS ──────────────────────────────────── */}
        {fv.terms && termsAndConditions && (
          <div style={{ padding: '14px 48px 0' }}>
            <p style={labelStyle}>Terms &amp; Conditions</p>
            <p style={{ fontFamily: poppins, fontSize: '11px', fontWeight: 400, color: '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{termsAndConditions}</p>
          </div>
        )}

        {/* ── SIGNATURES ──────────────────────────────────────────── */}
        {fv.signatures && (
          <div style={{ padding: '48px 48px 0', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '50%', display: 'flex', gap: '40px' }}>
              {[
                { label: 'Authorised By' },
                { label: 'Customer Signature' },
              ].map(sig => (
                <div key={sig.label} style={{ flex: 1 }}>
                  <div style={{ height: '60px' }} />
                  <div style={{ height: '1px', background: '#374151', marginBottom: '10px', width: '100%' }} />
                  <p style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                    {sig.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer pushes footer to bottom */}
        <div style={{ flex: 1 }} />

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div style={{ background: '#1a1a1a', padding: '14px 48px', marginTop: '24px' }}>
          <p style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 500, color: '#d1d5db', textAlign: 'center', letterSpacing: '0.08em', margin: '0 0 2px' }}>
            THE WATCH BOUTIQUE SRI LANKA
          </p>
          <p style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 400, color: '#9ca3af', textAlign: 'center', letterSpacing: '0.08em', margin: '0 0 2px' }}>
            66, KYNSEY ROAD, COLOMBO 8
          </p>
          <p style={{ fontFamily: poppins, fontSize: '10px', fontWeight: 400, color: '#9ca3af', textAlign: 'center', letterSpacing: '0.08em', margin: 0 }}>
            www.thewatchboutiquesl.com
          </p>
        </div>
      </div>
    </>
  )
}
