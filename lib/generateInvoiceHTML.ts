const TWB_LOGO_URL =
  'https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/The%20Watch%20Boutique%20Sri%20Lanka%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby9UaGUgV2F0Y2ggQm91dGlxdWUgU3JpIExhbmthIExvZ28ucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MTQ2MTQ0OSwiZXhwIjo3Mzk3NDYxNDQ5fQ.KCxDWOYjqZXZ-IFdYvW3I5EFlzA7Y-GTnZGUxITzLo8'

export interface InvoiceHTMLItem {
  watch_name:    string
  reference:     string | null
  serial_number: string | null
  year:          string | null
  condition:     string | null
  photo_url:     string | null
  amount:        number | null
  amount_paid?:  number | null
}

export interface InvoiceHTMLBank {
  bank_name:      string
  account_name:   string | null
  account_number: string | null
  branch:         string | null
  swift_code:     string | null
}

export interface InvoiceHTMLParams {
  invoiceNumber:       string
  date:                string
  currency:            string
  type:                string
  status:              string
  clientName:          string | null
  clientPhone:         string | null
  clientAddress:       string | null
  salesManager:        string | null
  paymentMethod:       string | null
  showBankDetails:     boolean
  bank:                InvoiceHTMLBank | null
  advancePaid:         number | null
  notes:               string | null
  termsAndConditions:  string | null
  fieldVisibility: {
    phone:         boolean
    address:       boolean
    sales_manager: boolean
    notes:         boolean
    terms:         boolean
    signatures:    boolean
  }
  items: InvoiceHTMLItem[]
}

// Escape HTML entities in user-provided strings
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
    const dd   = String(date.getDate()).padStart(2, '0')
    const mm   = String(date.getMonth() + 1).padStart(2, '0')
    const yy   = String(date.getFullYear()).slice(2)
    return `${dd} ${mm} ${yy}`
  } catch {
    return d
  }
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  paid_in_full: { label: 'Paid in Full', dot: '#10b981', text: '#047857' },
  advance_paid: { label: 'Advance Paid', dot: '#f59e0b', text: '#b45309' },
  overdue:      { label: 'Overdue',      dot: '#ef4444', text: '#b91c1c' },
  draft:        { label: 'Draft',        dot: '#9ca3af', text: '#6b7280' },
}

// FIX 7: font-family added to LABEL_STYLE so every label inherits it explicitly
const LABEL_STYLE =
  "font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;"

const PLACEHOLDER_WATCH_SVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
    <circle cx="12" cy="12" r="7"/>
    <path d="M12 9v3l2 2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`

export function generateInvoiceHTML(p: InvoiceHTMLParams): string {
  const fv            = p.fieldVisibility
  const sc            = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft
  const MIN_ROWS      = 3

  // Filter to named items only (mirrors handleSave's validItems filter)
  const items           = p.items.filter(it => it.watch_name.trim())
  const subtotal        = items.reduce((s, it) => s + (it.amount ?? 0), 0)
  const balanceDue      = p.type === 'sourcing' && p.advancePaid != null
    ? subtotal - p.advancePaid
    : null
  const hasAmountPaid   = items.some(it => it.amount_paid != null)
  // FIX 5: single total for amount paid
  const totalAmountPaid = items.reduce((s, it) => s + (it.amount_paid ?? 0), 0)

  // PDF title: INVNO-DD-MM-YY
  const dateObj = new Date(p.date + 'T00:00:00')
  const dd      = String(dateObj.getDate()).padStart(2, '0')
  const mm      = String(dateObj.getMonth() + 1).padStart(2, '0')
  const yy      = String(dateObj.getFullYear()).slice(2)
  const pdfTitle = `${p.invoiceNumber}-${dd}-${mm}-${yy}`

  // ── LINE ITEM ROWS ─────────────────────────────────────────
  const displayCount  = Math.max(items.length, MIN_ROWS)
  const itemRowsHTML  = Array.from({ length: displayCount }, (_, i) => {
    const item    = i < items.length ? items[i] : null
    const isLast  = i === displayCount - 1
    const radius  = isLast ? 'border-radius:0 0 8px 8px;' : ''

    if (!item) {
      return `<div style="display:grid;grid-template-columns:1fr 60px 140px;gap:16px;align-items:center;min-height:72px;padding:12px 16px;border-left:1px solid #f3f4f6;border-right:1px solid #f3f4f6;border-bottom:1px dashed #e5e7eb;${radius}">
        <div></div><div></div><div></div>
      </div>`
    }

    const details = [
      item.reference     ? `Ref: ${esc(item.reference)}`         : '',
      item.serial_number ? `SN: ${esc(item.serial_number)}`      : '',
      item.year          ? `Year: ${esc(item.year)}`             : '',
      item.condition     ? `Condition: ${esc(item.condition)}`   : '',
    ].filter(Boolean)

    const thumbHTML = item.photo_url
      ? `<img src="${esc(item.photo_url)}" alt="" style="width:48px;height:48px;border-radius:6px;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:48px;height:48px;border-radius:6px;background:#f9fafb;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${PLACEHOLDER_WATCH_SVG}</div>`

    return `<div style="display:grid;grid-template-columns:1fr 60px 140px;gap:16px;align-items:center;min-height:72px;padding:12px 16px;border-left:1px solid #f3f4f6;border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;${radius}">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        ${thumbHTML}
        <div style="min-width:0;">
          <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:#111111;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:uppercase;">${esc(item.watch_name) || '—'}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:3px;">
            ${details.map(d => `<span style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#9ca3af;">${d}</span>`).join('')}
          </div>
        </div>
      </div>
      <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:400;color:#6b7280;text-align:center;">1</span>
      <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:#111111;text-align:right;font-variant-numeric:tabular-nums;">${fmt(item.amount, p.currency)}</span>
    </div>`
  }).join('\n')

  // ── AMOUNT PAID (FIX 5: single total row, no per-item breakdown) ────────
  const amountPaidHTML = hasAmountPaid ? `
    <div style="padding:10px 48px 0;">
      <div style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;">
          <span style="${LABEL_STYLE}margin-bottom:0;">AMOUNT PAID</span>
          <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:#111111;font-variant-numeric:tabular-nums;">${fmt(totalAmountPaid, p.currency)}</span>
        </div>
      </div>
    </div>` : ''

  // ── SOURCING ADVANCE/BALANCE ───────────────────────────────
  const sourcingHTML = p.type === 'sourcing' && p.advancePaid != null ? `
    <div style="margin-top:8px;">
      <div style="display:flex;justify-content:space-between;padding:8px 16px;background:#f9fafb;border-radius:6px;margin-bottom:4px;">
        <span style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:400;color:#6b7280;">Advance Paid</span>
        <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:#374151;font-variant-numeric:tabular-nums;">${fmt(p.advancePaid, p.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 16px;border:1px solid #e5e7eb;border-radius:6px;">
        <span style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#111111;">Balance Due</span>
        <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;color:#111111;font-variant-numeric:tabular-nums;">${fmt(balanceDue, p.currency)}</span>
      </div>
    </div>` : ''

  // ── BANK DETAILS ───────────────────────────────────────────
  const bankHTML = p.showBankDetails && p.bank ? `
    <div style="flex:1;min-width:180px;">
      <p style="${LABEL_STYLE}">Bank Details</p>
      <p style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#111111;margin-bottom:2px;">${esc(p.bank.bank_name)}</p>
      ${p.bank.account_name   ? `<p style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#6b7280;">Account Name: ${esc(p.bank.account_name)}</p>`   : ''}
      ${p.bank.account_number ? `<p style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#6b7280;">Account No: ${esc(p.bank.account_number)}</p>`   : ''}
      ${p.bank.branch         ? `<p style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#6b7280;">Branch: ${esc(p.bank.branch)}</p>`               : ''}
      ${p.bank.swift_code     ? `<p style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#6b7280;">SWIFT: ${esc(p.bank.swift_code)}</p>`            : ''}
    </div>` : ''

  // ── META ROWS ──────────────────────────────────────────────
  const metaRows = [
    { label: 'Invoice #',     value: p.invoiceNumber },
    { label: 'Date',          value: fmtDate(p.date) },
    ...(fv.sales_manager && p.salesManager
      ? [{ label: 'Sales Manager', value: p.salesManager }]
      : []),
  ]

  // ── SIGNATURES ─────────────────────────────────────────────
  const signaturesHTML = fv.signatures ? `
    <div style="padding:48px 48px 0;display:flex;justify-content:flex-end;">
      <div style="width:50%;display:flex;gap:40px;">
        ${['Authorised By', 'Customer Signature'].map(label => `
          <div style="flex:1;">
            <div style="height:60px;"></div>
            <div style="height:1px;background:#374151;margin-bottom:10px;width:100%;"></div>
            <p style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.14em;">${label}</p>
          </div>`).join('')}
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${esc(pdfTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 0; }
    body { width: 210mm; min-height: 297mm; background: white; }
  </style>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 500); }</script>
</head>
<body>
<div style="font-family:'Poppins',sans-serif;background:#ffffff;color:#111111;width:210mm;min-height:297mm;display:flex;flex-direction:column;box-sizing:border-box;">

  <!-- HEADER -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:40px 48px 28px;">
    <h1 style="font-family:'Poppins',sans-serif;font-weight:700;font-size:48px;letter-spacing:0.28em;text-transform:uppercase;color:#111111;line-height:1;">INVOICE</h1>
    <img src="${TWB_LOGO_URL}" alt="The Watch Boutique" style="max-height:80px;object-fit:contain;display:block;margin-left:auto;" />
  </div>

  <!-- DIVIDER -->
  <div style="height:1px;background:#e5e7eb;margin:0 48px;"></div>

  <!-- META ROW: billing left, invoice meta right (FIX 2: flex row, align-items:flex-start) -->
  <div style="display:flex;align-items:flex-start;gap:32px;padding:24px 48px;">
    <div style="flex:1;">
      <p style="${LABEL_STYLE}">Billing Details</p>
      ${p.clientName
        ? `<p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:#111111;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.1em;">${esc(p.clientName)}</p>`
        : `<p style="font-family:'Poppins',sans-serif;font-size:14px;font-weight:400;color:#d1d5db;margin-bottom:4px;">—</p>`}
      ${fv.phone   && p.clientPhone   ? `<p style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:400;color:#6b7280;margin-top:2px;">${esc(p.clientPhone)}</p>`                              : ''}
      ${fv.address && p.clientAddress ? `<p style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:400;color:#6b7280;margin-top:2px;line-height:1.5;">${esc(p.clientAddress)}</p>` : ''}
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:flex-end;">
      ${metaRows.map(row => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:6px;min-width:260px;">
          <span style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap;">${esc(row.label)}</span>
          <span style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#111111;font-variant-numeric:tabular-nums;white-space:nowrap;">${esc(row.value)}</span>
        </div>`).join('')}
    </div>
  </div>

  <!-- DIVIDER -->
  <div style="height:1px;background:#e5e7eb;margin:0 48px;"></div>

  <!-- LINE ITEMS TABLE -->
  <div style="padding:24px 48px 0;">
    <div style="background:#1a1a1a;color:#ffffff;display:grid;grid-template-columns:1fr 60px 140px;padding:10px 16px;border-radius:8px 8px 0 0;">
      <span style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Item</span>
      <span style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;text-align:center;">Qty</span>
      <span style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;text-align:right;">Amount</span>
    </div>
    ${itemRowsHTML}
  </div>

  <!-- AMOUNT PAID -->
  ${amountPaidHTML}

  <!-- SUBTOTAL + TOTAL -->
  <div style="padding:12px 48px 0;">
    <div style="display:flex;justify-content:flex-end;align-items:center;gap:24px;padding:8px 16px;margin-bottom:6px;">
      <span style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">Subtotal</span>
      <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:400;color:#6b7280;min-width:140px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(subtotal, p.currency)}</span>
    </div>
    <div style="background:#1a1a1a;color:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-radius:8px;">
      <span style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Total</span>
      <span style="font-family:'Poppins',sans-serif;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;">${fmt(subtotal, p.currency)}</span>
    </div>
    ${sourcingHTML}
  </div>

  <!-- PAYMENT -->
  <div style="padding:16px 48px 0;">
    <div style="background:#f9fafb;border-radius:8px;padding:14px 20px;display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">
      ${p.paymentMethod ? `
        <div>
          <p style="${LABEL_STYLE}">Payment Method</p>
          <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:400;color:#111111;">${esc(p.paymentMethod)}</p>
        </div>` : ''}
      <div>
        <p style="${LABEL_STYLE}">Status</p>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;flex-shrink:0;"></span>
          <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:${sc.text};">${sc.label}</span>
        </div>
      </div>
      ${bankHTML}
    </div>
  </div>

  <!-- NOTES -->
  ${fv.notes ? `
  <div style="padding:16px 48px 0;">
    <p style="${LABEL_STYLE}">Notes</p>
    ${p.notes
      ? `<p style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:400;color:#6b7280;line-height:1.6;white-space:pre-wrap;">${esc(p.notes)}</p>`
      : `<div style="height:1px;background:#d1d5db;width:240px;"></div>`}
  </div>` : ''}

  <!-- TERMS & CONDITIONS -->
  ${fv.terms && p.termsAndConditions ? `
  <div style="padding:14px 48px 0;">
    <p style="${LABEL_STYLE}">Terms &amp; Conditions</p>
    <p style="font-family:'Poppins',sans-serif;font-size:11px;font-weight:400;color:#9ca3af;line-height:1.6;white-space:pre-wrap;">${esc(p.termsAndConditions)}</p>
  </div>` : ''}

  <!-- SIGNATURES -->
  ${signaturesHTML}

  <!-- SPACER -->
  <div style="flex:1;"></div>

  <!-- FOOTER (FIX 6: 0.15em on brand name, 0.08em on address/website) -->
  <div style="background:#1a1a1a;padding:14px 48px;margin-top:24px;">
    <p style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:500;color:#d1d5db;text-align:center;letter-spacing:0.15em;margin:0 0 2px;">THE WATCH BOUTIQUE SRI LANKA</p>
    <p style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:400;color:#9ca3af;text-align:center;letter-spacing:0.08em;margin:0 0 2px;">66, KYNSEY ROAD, COLOMBO 8</p>
    <p style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:400;color:#9ca3af;text-align:center;letter-spacing:0.08em;margin:0;">www.thewatchboutiquesl.com</p>
  </div>

</div>
</body>
</html>`
}
