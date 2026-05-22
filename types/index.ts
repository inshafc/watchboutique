export type UserRole = 'admin' | 'staff'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

// ── Brands ───────────────────────────────────────────────────

export interface Brand {
  id:    string
  name:  string
  color: string | null
}

// ── Watch enums ──────────────────────────────────────────────

export type WatchCondition  = 'Brand New' | 'Excellent' | 'Good' | 'Fair' | 'Poor'
export type WatchSetDetails = 'Full Set' | 'Box and Watch' | 'Watch Only'
export type WatchStatus     = 'Available' | 'On Hold' | 'Sold' | 'Consigned'
export type WatchStatusNew  = 'Available' | 'On Hold' | 'Offered' | 'Sold'

export const WATCH_CONDITIONS:    WatchCondition[]   = ['Brand New', 'Excellent', 'Good', 'Fair', 'Poor']
export const WATCH_SET_DETAILS:   WatchSetDetails[]  = ['Full Set', 'Box and Watch', 'Watch Only']
export const WATCH_STATUSES:      WatchStatus[]      = ['Available', 'On Hold', 'Sold', 'Consigned']
export const WATCH_STATUS_NEW:    WatchStatusNew[]   = ['Available', 'On Hold', 'Offered', 'Sold']
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
  brand_id:     string | null
  watch_status: string | null
  deleted_at?:  string | null
  watch_id?:    string | null
  sort_order?:  number
  labels?:      string[]
}

export interface WatchWithBrand extends Watch {
  brands: { name: string; color: string | null } | null
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

export type LeadReferral = 'Socials' | 'Referral' | 'Website' | 'Hotline'
export type ClientType   = 'Retail'  | 'Reseller'

export const LEAD_REFERRALS: LeadReferral[] = ['Socials', 'Referral', 'Website', 'Hotline']
export const CLIENT_TYPES:   ClientType[]   = ['Retail', 'Reseller']

export interface Client {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  is_vip: boolean
  club_twb: boolean
  notes: string | null          // original field — kept for compat
  profile_notes: string | null  // new canonical notes field
  address: string | null
  lead_referral: LeadReferral | null
  client_type: ClientType | null
  sales_manager: string | null
  avatar_color: string | null
  created_at: string
  deleted_at?: string | null
  labels?:     string[]
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

// ── Deals ────────────────────────────────────────────────────

export type DealType          = 'Sale' | 'Purchase' | 'Trade'
export type DealStage         = 'Inquiry' | 'Offer' | 'Negotiation' | 'Closed' | 'Delivered' | 'Lost'
export type PaymentMethod     = 'Cash' | 'Cash + Bank' | 'Bank Transfer' | 'Installment'
export type InstallmentStatus = 'Pending' | 'Paid' | 'Overdue'

export const DEAL_TYPES:           DealType[]          = ['Sale', 'Trade']
export const DEAL_STAGES:          DealStage[]         = ['Inquiry', 'Offer', 'Negotiation', 'Closed', 'Delivered', 'Lost']
export const PAYMENT_METHODS:      PaymentMethod[]     = ['Cash', 'Cash + Bank', 'Bank Transfer', 'Installment']
export const INSTALLMENT_STATUSES: InstallmentStatus[] = ['Pending', 'Paid', 'Overdue']

export interface Deal {
  id:                 string
  watch_id:           string | null
  client_id:          string | null
  deal_type:          DealType
  stage:              DealStage
  offered_price:      number | null
  sale_price:         number | null
  trade_value:        number | null
  adjustment:         number | null
  commission:         number | null
  payment_method:     PaymentMethod | null
  currency:           string
  notes:              string | null
  sales_manager:      string | null
  closed_at:          string | null
  created_at:         string
  other_costs:        boolean
  other_costs_amount: number | null
  commission_payable: boolean
  commission_amount:  number | null
  new_client:         boolean
  sale_date:          string | null
  delivery_status:    string | null
  bank_name:          string | null
  cash_amount:        number | null
  bank_amount:        number | null
  deleted_at?:        string | null
}

export interface Installment {
  id:         string
  deal_id:    string
  amount:     number
  due_date:   string | null
  paid_at:    string | null
  status:     InstallmentStatus
  notes:      string | null
  created_at: string
}

export interface TradeIn {
  id:               string
  deal_id:          string
  brand:            string | null
  reference:        string | null
  serial_number:    string | null
  year:             string | null
  condition:        string | null
  set_details:      string | null
  value:            number | null
  add_to_inventory: boolean
  watch_id:         string | null
  created_at:       string
}

// ── Sales Managers ───────────────────────────────────────────

export interface SalesManager {
  id:   string
  name: string
}

export interface DealWithRelations extends Deal {
  watches:      { watch_name: string; reference: string | null; status?: string; photos?: string[]; purchase_cost?: number | null } | null
  clients:      { name: string; avatar_color: string | null } | null
  installments?: Installment[]
}
