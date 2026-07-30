// Behavioral client badges (Hot / Dormant / New), computed at query/render time
// from deal history — no new schema. Priority when multiple would apply: Hot > Dormant > New.

const DAY_MS = 24 * 60 * 60 * 1000
const HOT_WINDOW_DAYS = 90
const DORMANT_WINDOW_DAYS = 180 // ~6 months
const NEW_WINDOW_DAYS = 30
const HOT_MIN_PURCHASES = 2

export type ClientBadgeType = 'hot' | 'dormant' | 'new'

export interface ClientBadgeDeal {
  stage: string
  deleted_at?: string | null
  closed_at?: string | null
  sale_date?: string | null
  created_at: string
  watch_is_draft?: boolean | null
  watch_deleted_at?: string | null
}

export interface ClientBadgeClient {
  created_at: string
}

const REAL_SALE_STAGES = new Set(['Delivered', 'Closed'])

function isRealSale(deal: ClientBadgeDeal): boolean {
  if (deal.deleted_at) return false
  if (!REAL_SALE_STAGES.has(deal.stage)) return false
  if (deal.watch_is_draft) return false
  if (deal.watch_deleted_at) return false
  return true
}

function purchaseTimestamp(deal: ClientBadgeDeal): number | null {
  const raw = deal.closed_at ?? deal.sale_date ?? deal.created_at
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? null : t
}

// Pure and testable: pass the client's full raw deal list (any stage, any deleted/draft
// state) and this filters internally — callers never need to pre-filter.
export function getClientBadge(
  client: ClientBadgeClient,
  deals: ClientBadgeDeal[],
  now: number = Date.now()
): ClientBadgeType | null {
  const purchaseDates = deals
    .filter(isRealSale)
    .map(purchaseTimestamp)
    .filter((t): t is number => t != null)

  const recentCount = purchaseDates.filter(t => now - t <= HOT_WINDOW_DAYS * DAY_MS).length
  if (recentCount >= HOT_MIN_PURCHASES) return 'hot'

  if (purchaseDates.length > 0) {
    const mostRecent = Math.max(...purchaseDates)
    if (now - mostRecent >= DORMANT_WINDOW_DAYS * DAY_MS) return 'dormant'
    return null
  }

  const addedAt = new Date(client.created_at).getTime()
  if (!Number.isNaN(addedAt) && now - addedAt <= NEW_WINDOW_DAYS * DAY_MS) {
    return 'new'
  }

  return null
}
