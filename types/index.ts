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

// ── Client CRM ───────────────────────────────────────────────

export interface Client {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  is_vip: boolean
  club_twb: boolean
  notes: string | null
  created_at: string
}

export interface Wishlist {
  id: string
  client_id: string
  brand: string | null
  reference: string | null
  max_budget: number | null
  currency: string
  notes: string | null
  created_at: string
}

export interface ContactLog {
  id: string
  client_id: string
  note: string
  channel: string | null
  created_at: string
}

export type ContactChannel = 'WhatsApp' | 'Instagram' | 'Phone' | 'In Person'
export const CONTACT_CHANNELS: ContactChannel[] = ['WhatsApp', 'Instagram', 'Phone', 'In Person']
