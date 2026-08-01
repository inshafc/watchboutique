'use client'

import { DEAL_CURRENCIES } from '@/types'

const inp = 'w-full bg-card border border-border text-text-primary rounded-lg px-3.5 py-2.5 text-[13px] placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition-all'
const lbl = 'block text-[11px] font-medium text-text-secondary uppercase tracking-[0.08em] mb-1.5'

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

export default function CurrencyAndRateFields({
  currency,
  onCurrencyChange,
  exchangeRate,
  onExchangeRateChange,
  salePrice,
}: {
  currency: string
  onCurrencyChange: (v: string) => void
  exchangeRate: string
  onExchangeRateChange: (v: string) => void
  salePrice: number | null
}) {
  const rate = parseFloat(exchangeRate)
  const lkrEquivalent = currency !== 'LKR' && salePrice != null && !isNaN(rate) && rate > 0
    ? salePrice * rate
    : null

  return (
    <>
      <div>
        <label className={lbl}>Currency</label>
        <select value={currency} onChange={e => onCurrencyChange(e.target.value)} className={inp}>
          {DEAL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {currency !== 'LKR' && (
        <div>
          <label className={lbl}>Exchange Rate to LKR *</label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={exchangeRate}
            onChange={e => onExchangeRateChange(e.target.value)}
            placeholder="e.g. 300"
            className={inp}
          />
          <p className="text-[11px] text-gray-400 mt-1">Enter your rate — not the market rate.</p>
          {lkrEquivalent != null && (
            <p className="text-xs font-medium text-gray-600 mt-1.5">≈ {formatLKR(lkrEquivalent)}</p>
          )}
        </div>
      )}
    </>
  )
}
