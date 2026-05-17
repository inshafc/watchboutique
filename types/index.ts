export type UserRole = 'admin' | 'staff'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

// ── Watch enums ──────────────────────────────────────────────

export type WatchCondition  = 'Brand New' | 'Excellent' | 'Good' | 'Fair' | 'Poor'
export type WatchSetDetails = 'Box and Papers' | 'Box and Watch' | 'Watch Only'
export type WatchStatus     = 'Available' | 'On Hold' | 'Sold' | 'Consigned'

export const WATCH_CONDITIONS: WatchCondition[]   = ['Brand New', 'Excellent', 'Good', 'Fair', 'Poor']
export const WATCH_SET_DETAILS: WatchSetDetails[] = ['Box and Papers', 'Box and Watch', 'Watch Only']
export const WATCH_STATUSES: WatchStatus[]        = ['Available', 'On Hold', 'Sold', 'Consigned']
export const INVESTOR_NAMES = ['TWB', 'Investor 1', 'Investor 2', 'Investor 3'] as const
export type  InvestorName   = typeof INVESTOR_NAMES[number]

// ── Watch tables ─────────────────────────────────────────────

export interface Watch {
  id: string
  watch_name: string
  reference: string | null
  serial_number: string | null
  date_on_card: string | null
  condition: WatchCondition
  set_details: WatchSetDetails
  purchased_from: string | null
  purchase_cost: number | null
  currency: string
  status: WatchStatus
  selling_price: number | null
  comments: string | null
  photos: string[]
  created_at: string
}

export interface WatchInvestor {
  id: string
  watch_id: string
  investor_name: string
  percentage: number
}

export interface WatchWithInvestors extends Watch {
  watch_investors: WatchInvestor[]
}
