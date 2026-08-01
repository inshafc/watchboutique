'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const card = 'bg-card border border-border rounded-xl p-5 md:p-6'
const cardTitle = 'text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-4'

interface InvestorRow {
  key: string
  name: string
  percentage: number
}

function formatLKR(n: number) {
  return 'LKR ' + Math.round(n).toLocaleString('en-LK')
}

// Read-only — pulls the watch's stamped watch_investors split (set at
// inventory-add time) and shows each investor's profit share for THIS sale.
// Profit = sold_price − purchase_cost, converted to LKR first via the sale's
// exchange_rate when the sale currency isn't LKR (investor books are LKR).
export default function WatchInvestorSplit({
  watchId,
  purchaseCost,
  inventoryType,
  salePrice,
  currency,
  exchangeRate,
}: {
  watchId: string | null | undefined
  purchaseCost: number | null | undefined
  inventoryType: string | null | undefined
  salePrice: number | null
  currency: string
  exchangeRate: string
}) {
  const [rows, setRows]       = useState<InvestorRow[]>([])
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    if (!watchId || inventoryType === 'consign') {
      setRows([])
      setLoaded(false)
      return
    }
    let cancelled = false
    setLoaded(false)

    async function load() {
      const supabase = createClient()
      const [{ data: wi }, { data: names }] = await Promise.all([
        supabase.from('watch_investors').select('investor_name, percentage').eq('watch_id', watchId as string),
        supabase.from('investor_names').select('key, display_name'),
      ])
      if (cancelled) return
      const nameMap = new Map((names ?? []).map(n => [n.key, n.display_name] as const))
      setRows(
        (wi ?? []).map(r => ({
          key: r.investor_name,
          name: nameMap.get(r.investor_name) ?? r.investor_name,
          percentage: r.percentage,
        }))
      )
      setLoaded(true)
    }
    void load()
    return () => { cancelled = true }
  }, [watchId, inventoryType])

  if (!watchId || inventoryType === 'consign') return null
  if (!loaded) return null
  if (rows.length === 0) return null

  const needsRate  = currency !== 'LKR'
  const rate       = parseFloat(exchangeRate)
  const hasRate    = !needsRate || (!isNaN(rate) && rate > 0)

  let profitLKR: number | null = null
  if (hasRate && salePrice != null && purchaseCost != null) {
    const salePriceLKR = needsRate ? salePrice * rate : salePrice
    profitLKR = salePriceLKR - purchaseCost
  }

  return (
    <div className={card}>
      <p className={cardTitle}>
        Investor Split <span className="normal-case text-gray-300 font-normal">— read-only, set at inventory</span>
      </p>

      {needsRate && !hasRate ? (
        <p className="text-sm text-gray-400">Enter exchange rate to see investor split</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{r.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-10 text-right tabular-nums">{r.percentage}%</span>
                <span className="font-semibold tabular-nums w-28 text-right">
                  {profitLKR != null ? formatLKR(profitLKR * (r.percentage / 100)) : '—'}
                </span>
              </div>
            </div>
          ))}
          {profitLKR == null && (
            <p className="text-[11px] text-gray-400 mt-1">Enter a sale price to see profit shares.</p>
          )}
        </div>
      )}
    </div>
  )
}
