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
}

export interface InvoiceHTMLBank {
  bank_name:      string
  account_name:   string | null
  account_number: string | null
  branch:         string | null
  swift_code:     string | null
}

export interface InvoiceHTMLParams {
  invoiceNumber:      string
  date:               string
  currency:           string
  type:               string
  status:             string
  clientName:         string | null
  clientPhone:        string | null
  clientAddress:      string | null
  salesManager:       string | null
  paymentMethod:      string | null
  showBankDetails:    boolean
  bank:               InvoiceHTMLBank | null
  advancePaid:        number | null
  amountPaid:         number | null
  notes:              string | null
  termsAndConditions: string | null
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
  paid_in_full:   { label: 'Paid in Full',   dot: '#10b981', text: '#047857' },
  partially_paid: { label: 'Partially Paid', dot: '#f59e0b', text: '#b45309' },
  advance_paid:   { label: 'Advance Paid',   dot: '#f59e0b', text: '#b45309' },
  overdue:        { label: 'Overdue',        dot: '#ef4444', text: '#b91c1c' },
  draft:          { label: 'Draft',          dot: '#9ca3af', text: '#6b7280' },
}

// Prepended to every inline style= attribute to guarantee Poppins on all elements
const F = "font-family:'Poppins',sans-serif;"

export function generateInvoiceHTML(p: InvoiceHTMLParams): string {
  const fv  = p.fieldVisibility
  const MIN_ROWS = 3

  const items    = p.items.filter(it => it.watch_name?.trim())
  const subtotal = items.reduce((s, it) => s + (it.amount ?? 0), 0)

  // Derive display status from amounts
  const effectiveStatusKey: string =
    p.amountPaid != null && subtotal > 0 && p.amountPaid >= subtotal ? 'paid_in_full' :
    p.amountPaid != null && p.amountPaid > 0 && p.amountPaid < subtotal ? 'partially_paid' :
    p.status

  const sc = STATUS_CONFIG[effectiveStatusKey] ?? STATUS_CONFIG.draft

  const showAdvancePaid = p.advancePaid != null && p.advancePaid > 0
  const showAmountPaid  = p.amountPaid  != null && p.amountPaid  > 0 && p.amountPaid < subtotal
  const balanceDue      = showAmountPaid ? subtotal - p.amountPaid! : 0
  const paidInFull      = p.amountPaid  != null && subtotal > 0 && p.amountPaid >= subtotal

  const d0    = new Date(p.date + 'T00:00:00')
  const dd    = String(d0.getDate()).padStart(2, '0')
  const mm    = String(d0.getMonth() + 1).padStart(2, '0')
  const yy    = String(d0.getFullYear()).slice(2)
  const title = `${p.invoiceNumber}-${dd}-${mm}-${yy}`

  // ── LINE ITEM ROWS ─────────────────────────────────────────
  const displayCount = Math.max(items.length, MIN_ROWS)
  const itemRowsHTML = Array.from({ length: displayCount }, (_, i) => {
    const item    = i < items.length ? items[i] : null
    const isLast  = i === displayCount - 1
    const border  = isLast ? '' : item
      ? 'border-bottom:1px solid #e5e7eb;'
      : 'border-bottom:1px dashed #e5e7eb;'

    if (!item) {
      return `<tr>
        <td style="${F}height:72px;padding:12px 16px;${border}">&nbsp;</td>
        <td style="${border}"></td>
        <td style="${border}"></td>
      </tr>`
    }

    const thumb = item.photo_url
      ? `<img src="${esc(item.photo_url)}" alt="" style="width:48px;height:48px;border-radius:6px;object-fit:cover;margin-right:12px;vertical-align:middle;flex-shrink:0;">`
      : `<div style="width:48px;height:48px;border-radius:6px;background:#f3f4f6;margin-right:12px;flex-shrink:0;"></div>`

    const details = [
      item.reference     ? `Ref: ${esc(item.reference)}`       : '',
      item.serial_number ? `SN: ${esc(item.serial_number)}`    : '',
      item.year          ? `Year: ${esc(item.year)}`           : '',
      item.condition     ? `Cond: ${esc(item.condition)}`      : '',
    ].filter(Boolean).join(' &nbsp;·&nbsp; ')

    return `<tr>
      <td style="${F}padding:12px 16px;height:72px;vertical-align:middle;${border}">
        <div style="display:flex;align-items:center;">
          ${thumb}
          <div style="min-width:0;">
            <div style="${F}font-size:13px;font-weight:600;color:#111111;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.watch_name.toUpperCase()) || '—'}</div>
            ${details ? `<div style="${F}font-size:11px;color:#6b7280;margin-top:3px;">${details}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="${F}text-align:center;font-size:13px;color:#6b7280;vertical-align:middle;${border}">1</td>
      <td style="${F}text-align:right;font-size:13px;font-weight:600;color:#111111;vertical-align:middle;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:8px;${border}">${fmt(item.amount, p.currency)}</td>
    </tr>`
  }).join('\n')

  // ── META ROWS (right column) ───────────────────────────────
  const metaRows = [
    { label: 'Invoice #',    value: p.invoiceNumber },
    { label: 'Date',         value: fmtDate(p.date) },
    ...(fv.sales_manager && p.salesManager
      ? [{ label: 'Sales Manager', value: p.salesManager }]
      : []),
  ]

  // ── BANK DETAILS ───────────────────────────────────────────
  const bankHTML = p.showBankDetails && p.bank ? `
    <div style="flex:1;min-width:160px;">
      <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Bank Details</div>
      <div style="${F}font-size:12px;font-weight:600;color:#111111;margin-bottom:2px;">${esc(p.bank.bank_name)}</div>
      ${p.bank.account_name   ? `<div style="${F}font-size:11px;color:#6b7280;">Account Name: ${esc(p.bank.account_name)}</div>`   : ''}
      ${p.bank.account_number ? `<div style="${F}font-size:11px;color:#6b7280;">Account No: ${esc(p.bank.account_number)}</div>`   : ''}
      ${p.bank.branch         ? `<div style="${F}font-size:11px;color:#6b7280;">Branch: ${esc(p.bank.branch)}</div>`               : ''}
      ${p.bank.swift_code     ? `<div style="${F}font-size:11px;color:#6b7280;">SWIFT: ${esc(p.bank.swift_code)}</div>`            : ''}
    </div>` : ''

  // ── SIGNATURES ─────────────────────────────────────────────
  const signaturesHTML = fv.signatures ? `
    <div style="display:flex;gap:48px;justify-content:flex-end;margin-top:48px;">
      ${['Authorised Signature &amp; Seal', 'Customer Signature'].map(label => `
        <div style="flex:1;max-width:200px;">
          <div style="height:64px;"></div>
          <div style="height:1px;background:#374151;margin-bottom:8px;"></div>
          <div style="${F}font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">${label}</div>
        </div>`).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Poppins', sans-serif; background: #fff; }
  </style>
  <script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>
</head>
<body>

  <!-- HEADER -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:24px;">
    <h1 style="${F}font-size:48px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#111111;line-height:1;">INVOICE</h1>
    <img src="${TWB_LOGO_URL}" alt="The Watch Boutique" style="max-height:70px;object-fit:contain;display:block;">
  </div>

  <!-- DIVIDER -->
  <div style="height:1px;background:#e5e7eb;margin-bottom:24px;"></div>

  <!-- BILLING + META ROW -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">

    <!-- Left: billing details -->
    <div>
      <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Billing Details</div>
      ${p.clientName
        ? `<div style="${F}font-size:13px;font-weight:600;color:#111111;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${esc(p.clientName)}</div>`
        : `<div style="${F}font-size:13px;color:#d1d5db;margin-bottom:4px;">—</div>`}
      ${fv.phone   && p.clientPhone   ? `<div style="${F}font-size:12px;color:#374151;margin-top:2px;">${esc(p.clientPhone)}</div>`                              : ''}
      ${fv.address && p.clientAddress ? `<div style="${F}font-size:12px;color:#374151;margin-top:2px;line-height:1.5;">${esc(p.clientAddress)}</div>` : ''}
    </div>

    <!-- Right: invoice meta -->
    <div style="display:flex;flex-direction:column;align-items:flex-end;">
      ${metaRows.map(row => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:6px;min-width:220px;">
          <span style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap;">${esc(row.label)}</span>
          <span style="${F}font-size:13px;font-weight:600;color:#111111;white-space:nowrap;font-variant-numeric:tabular-nums;">${esc(row.value)}</span>
        </div>`).join('')}
    </div>

  </div>

  <!-- DIVIDER -->
  <div style="height:1px;background:#e5e7eb;margin-bottom:20px;"></div>

  <!-- LINE ITEMS TABLE -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
    <thead>
      <tr>
        <th style="${F}background:#1a1a1a;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:12px 16px;text-align:left;">ITEM</th>
        <th style="${F}background:#1a1a1a;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:12px 16px;text-align:center;width:60px;">QTY</th>
        <th style="${F}background:#1a1a1a;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:12px 16px;text-align:right;width:140px;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHTML}
    </tbody>
  </table>

  <!-- SUBTOTAL -->
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:24px;padding:6px 0;margin-bottom:8px;">
    <span style="${F}font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Subtotal</span>
    <span style="${F}font-size:12px;color:#6b7280;min-width:140px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(subtotal, p.currency)}</span>
  </div>

  <!-- ADVANCE PAID (sourcing, before total) -->
  ${showAdvancePaid ? `
  <div style="display:flex;justify-content:space-between;padding:8px 16px;background:#f9fafb;border-radius:6px;margin-bottom:8px;">
    <span style="${F}font-size:12px;color:#6b7280;">Advance Paid</span>
    <span style="${F}font-size:13px;font-weight:600;color:#374151;font-variant-numeric:tabular-nums;">${fmt(p.advancePaid, p.currency)}</span>
  </div>` : ''}

  <!-- TOTAL BAR -->
  <div style="display:flex;justify-content:space-between;align-items:center;background:#1a1a1a;padding:16px 20px;border-radius:8px;margin-bottom:6px;">
    <span style="${F}color:#fff;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Total</span>
    <span style="${F}color:#fff;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;">${fmt(subtotal, p.currency)}</span>
  </div>

  <!-- AMOUNT PAID (partial payment) -->
  ${showAmountPaid ? `
  <div style="display:flex;justify-content:space-between;padding:8px 16px;background:#f9fafb;border-radius:6px;margin-bottom:4px;">
    <span style="${F}font-size:12px;color:#6b7280;">Amount Paid</span>
    <span style="${F}font-size:13px;font-weight:600;color:#374151;font-variant-numeric:tabular-nums;">${fmt(p.amountPaid, p.currency)}</span>
  </div>` : ''}

  <!-- BALANCE DUE -->
  ${balanceDue > 0 ? `
  <div style="display:flex;justify-content:space-between;padding:10px 16px;border:1px solid #fecaca;border-radius:6px;margin-bottom:4px;">
    <span style="${F}font-size:12px;font-weight:700;color:#dc2626;">Balance Due</span>
    <span style="${F}font-size:13px;font-weight:700;color:#dc2626;font-variant-numeric:tabular-nums;">${fmt(balanceDue, p.currency)}</span>
  </div>` : ''}

  <!-- PAID IN FULL BADGE -->
  ${paidInFull ? `
  <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:999px;padding:4px 14px;display:inline-flex;align-items:center;gap:6px;">
      <span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;"></span>
      <span style="${F}font-size:11px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.1em;">Paid in Full</span>
    </div>
  </div>` : ''}

  <!-- PAYMENT METHOD + STATUS -->
  <div style="background:#f9fafb;border-radius:8px;padding:16px;display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap;margin-top:16px;">
    ${p.paymentMethod ? `
      <div>
        <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Payment Method</div>
        <div style="${F}font-size:13px;color:#111111;">${esc(p.paymentMethod)}</div>
      </div>` : ''}
    <div>
      <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Status</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;flex-shrink:0;"></span>
        <span style="${F}font-size:13px;font-weight:600;color:${sc.text};">${sc.label}</span>
      </div>
    </div>
    ${bankHTML}
  </div>

  <!-- NOTES -->
  ${fv.notes && p.notes?.trim() ? `
  <div style="margin-top:20px;">
    <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Notes</div>
    <div style="${F}font-size:12px;color:#6b7280;line-height:1.6;white-space:pre-wrap;">${esc(p.notes)}</div>
  </div>` : ''}

  <!-- TERMS & CONDITIONS -->
  ${fv.terms && p.termsAndConditions ? `
  <div style="margin-top:16px;">
    <div style="${F}font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Terms &amp; Conditions</div>
    <div style="${F}font-size:11px;color:#9ca3af;line-height:1.6;white-space:pre-wrap;">${esc(p.termsAndConditions)}</div>
  </div>` : ''}

  <!-- SIGNATURES -->
  ${signaturesHTML}

  <!-- FOOTER -->
  <div style="background:#1a1a1a;padding:24px;text-align:center;margin-top:40px;border-radius:4px;">
    <div style="${F}color:#ffffff;font-size:11px;font-weight:500;letter-spacing:0.15em;margin-bottom:4px;">THE WATCH BOUTIQUE SRI LANKA</div>
    <div style="${F}color:#9ca3af;font-size:10px;letter-spacing:0.08em;margin-bottom:2px;">66, KYNSEY ROAD, COLOMBO 8</div>
    <div style="${F}color:#9ca3af;font-size:10px;letter-spacing:0.08em;">www.thewatchboutiquesl.com</div>
  </div>

</body>
</html>`
}
