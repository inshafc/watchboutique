export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WatchStatusButtons from '@/components/watches/WatchStatusButtons'
import WatchDetailActions from '@/components/watches/WatchDetailActions'
import DeletedWatchActions from '@/components/watches/DeletedWatchActions'
import { avatarColor, getInitials } from '@/lib/client-utils'
import { getInvestorDisplayNames } from '@/lib/investor-names'
import { displayCondition } from '@/lib/watch-condition'
import { dealSalePriceLKR } from '@/lib/deal-currency'
import type { WatchWithInvestors } from '@/types'

const INK    = '#14140f'
const INK_45 = 'rgba(20,20,15,.45)'
const INK_60 = 'rgba(20,20,15,.6)'
const CARD_BG = '#f7f6f3'
const GREEN  = '#1f6f43'
const RED    = '#b23a2c'
const GOLD   = '#8a6f2e'

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  'Available': { bg: 'rgba(31,111,67,.1)',   fg: GREEN },
  'On Hold':   { bg: 'rgba(181,118,26,.14)', fg: '#8a5c15' },
  'Offered':   { bg: 'rgba(63,95,138,.12)',  fg: '#3f5f8a' },
  'Sold':      { bg: 'rgba(20,20,15,.08)',   fg: INK_60 },
}

function formatLKR(n: number | null) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function extractYear(d: string | null) {
  if (!d) return '—'
  return new Date(d).getFullYear().toString()
}

function daysBetween(from: string, to: Date) {
  const ms = to.getTime() - new Date(from).getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function Fact({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-2xl flex flex-col gap-1" style={{ background: CARD_BG, border: '1px solid rgba(20,20,15,.05)', padding: '14px 16px' }}>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>{label}</span>
      <span className="text-[16px] font-semibold whitespace-nowrap" style={{ letterSpacing: '-.015em', color: color ?? INK }}>{value || '—'}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>{children}</span>
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[24px] flex flex-col gap-4" style={{ padding: 26 }}>
      {children}
    </section>
  )
}

export default async function WatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: myProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isClerk = myProfile?.role === 'inventory_clerk'

  const [watchRes, dealsRes, investorNames] = await Promise.all([
    supabase.from('watches').select('*, watch_investors(*), brands(name, color)').eq('id', params.id).single(),
    // deals is RLS-denied for inventory_clerk — skip the query rather than
    // rely on an empty RLS-filtered result, and hide everything downstream.
    isClerk
      ? Promise.resolve({ data: [] as unknown[] })
      : supabase.from('deals').select('id, deal_type, stage, sale_price, currency, exchange_rate, offered_price, closed_at, other_costs, other_costs_amount, commission_payable, commission_amount, clients(name, avatar_color)').eq('watch_id', params.id).order('created_at', { ascending: false }),
    // investor_names is also RLS-denied for inventory_clerk; the embedded
    // watch_investors(*) join above already comes back empty for them
    // (watch_investors is denied too), so the Investors section never
    // renders — skip this lookup rather than fetch data nothing will use.
    isClerk ? Promise.resolve(new Map<string, string>()) : getInvestorDisplayNames(supabase),
  ])

  if (!watchRes.data) notFound()

  const watch = watchRes.data as WatchWithInvestors & { brands: { name: string; color: string | null } | null }
  const isDeleted = !!watch.deleted_at
  const brandName = watch.brands?.name ?? null
  const brandColor = watch.brands?.color ?? null

  type WatchDeal = {
    id: string
    deal_type: string
    stage: string
    sale_price: number | null
    currency: string | null
    exchange_rate: number | null
    offered_price: number | null
    closed_at: string | null
    other_costs: boolean
    other_costs_amount: number | null
    commission_payable: boolean
    commission_amount: number | null
    clients: { name: string; avatar_color: string | null } | null
  }
  const deals = (dealsRes.data ?? []) as unknown as WatchDeal[]

  type WatchInvoice = {
    id: string
    invoice_number: string
    date: string | null
    client_name: string | null
    amount_paid: number | null
    status: string
    deal_id: string
  }
  let invoice: WatchInvoice | null = null
  if (deals.length > 0) {
    const dealIds = deals.map(d => d.id)
    const { data: invData } = await supabase
      .from('invoices')
      .select('id, invoice_number, date, client_name, amount_paid, status, deal_id')
      .in('deal_id', dealIds)
      .is('deleted_at', null)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    invoice = invData as WatchInvoice | null
  }

  const deliveredDeal = deals.find(d => d.stage === 'Delivered' && d.sale_price != null)
  // sold_price (captured on the watch at the point of sale) is the source of truth;
  // fall back to the deal's own sale_price, converted to LKR, for sales recorded
  // before that column existed.
  const salePrice  = deliveredDeal ? (watch.sold_price ?? dealSalePriceLKR(deliveredDeal)) : null
  const otherCosts = deliveredDeal?.other_costs ? (deliveredDeal.other_costs_amount ?? 0) : 0
  const commission = deliveredDeal?.commission_payable ? (deliveredDeal.commission_amount ?? 0) : 0
  const cost       = watch.purchase_cost ?? 0
  const netProfit  = salePrice != null ? salePrice - cost - otherCosts - commission : null

  const acquiredDate = watch.date_acquired ?? watch.created_at
  const daysInStock  = watch.watch_status === 'Sold' && deliveredDeal?.closed_at
    ? daysBetween(acquiredDate, new Date(deliveredDeal.closed_at))
    : daysBetween(acquiredDate, new Date())

  const expectedMarginLKR = watch.selling_price != null ? watch.selling_price - cost : null
  const expectedMarginPct = expectedMarginLKR != null && cost > 0 ? Math.round((expectedMarginLKR / cost) * 100) : null

  const statusStyle = STATUS_STYLE[watch.watch_status ?? watch.status] ?? STATUS_STYLE.Sold

  const stageColors: Record<string, string> = {
    Inquiry:     'bg-gray-100 text-gray-600',
    Offer:       'bg-sky-50 text-sky-700',
    Negotiation: 'bg-amber-50 text-amber-700',
    Closed:      'bg-emerald-50 text-emerald-700',
    Lost:        'bg-red-50 text-red-600',
  }

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5 min-w-0">
            <Link href="/dashboard/inventory" className="flex items-center gap-1.5 text-[12.5px] font-semibold w-fit" style={{ color: INK_45 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M9.5 3.5 5 8l4.5 4.5"/></svg>
              Back to inventory
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="m-0" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1 }}>{watch.watch_name}</h1>
              {watch.is_draft && (
                <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 leading-none" style={{ background: '#b5761a' }}>DRAFT</span>
              )}
            </div>
          </div>
          {isDeleted ? (
            <DeletedWatchActions watchId={watch.id} />
          ) : (
            <WatchDetailActions
              watchId={watch.id}
              isDraft={watch.is_draft ?? false}
              watchStatus={watch.watch_status}
              watchName={watch.watch_name}
              reference={watch.reference}
              condition={watch.condition}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4" style={{ maxWidth: 1120 }}>

        {/* ── Photos ─────────────────────────────────────────── */}
        <Card>
          <div className="relative overflow-hidden" style={{ height: 380, borderRadius: 18, background: CARD_BG }}>
            {watch.photos && watch.photos.length > 0 ? (
              <Image src={watch.photos[0]} alt={watch.watch_name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK_45} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
            {brandName && (
              <span className="absolute top-4 left-4 pointer-events-none flex items-center" style={{ height: 36, padding: '0 16px', background: 'rgba(255,255,255,.94)', borderRadius: 999, boxShadow: '0 2px 8px rgba(20,20,15,.12)' }}>
                <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: brandColor ?? INK }}>{brandName}</span>
              </span>
            )}
            <span className="absolute top-4 right-4 pointer-events-none text-[11px] font-bold uppercase tracking-wide" style={{ padding: '7px 14px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.fg }}>
              {watch.is_draft ? 'Draft' : (watch.watch_status ?? watch.status)}
            </span>
          </div>
          {watch.photos && watch.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5">
              {watch.photos.slice(1).map((url, i) => (
                <div key={i} className="relative overflow-hidden" style={{ height: 100, borderRadius: 14, background: CARD_BG }}>
                  <Image src={url} alt={`Photo ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Reference + facts + status + record sale ─────────── */}
        <Card>
          <div className="flex flex-col gap-1">
            <SectionLabel>Reference</SectionLabel>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}>{watch.reference || '—'}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Fact label="Acquired" value={watch.date_acquired ? new Date(watch.date_acquired + 'T00:00:00').toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '—'} />
            <Fact label="Condition" value={displayCondition(watch.condition)} />
            <Fact label="Set" value={watch.set_details} />
            <Fact label="Year" value={extractYear(watch.date_on_card)} />
          </div>

          {!isDeleted && (
            <div className="flex flex-col gap-2.5">
              <SectionLabel>Watch status</SectionLabel>
              <WatchStatusButtons watchId={watch.id} initialStatus={watch.watch_status} />
            </div>
          )}

          {!isDeleted && !isClerk && watch.watch_status !== 'Sold' && watch.watch_status !== 'sourced' && (
            <Link
              href={`/dashboard/deals/new?watch_id=${watch.id}`}
              className="flex items-center justify-center gap-2.5 transition-colors"
              style={{ height: 54, borderRadius: 18, background: INK, color: '#fff', fontSize: 15, fontWeight: 600 }}
            >
              Record sale
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3.6 10h12.8M11.4 5l5 5-5 5"/></svg>
            </Link>
          )}
        </Card>

        {/* ── Sale ───────────────────────────────────────────── */}
        <Card>
          <SectionLabel>Sale</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Status</span>
              <span className="self-start text-[12px] font-bold uppercase tracking-wide" style={{ padding: '7px 14px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.fg }}>
                {watch.is_draft ? 'Draft' : (watch.watch_status ?? watch.status)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Selling price</span>
              <span className="whitespace-nowrap tabular-nums" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.03em', color: GOLD }}>{formatLKR(watch.selling_price)}</span>
            </div>
            {watch.status === 'Sold' && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Sold price</span>
                <span className="whitespace-nowrap tabular-nums" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.015em' }}>{formatLKR(watch.sold_price ?? null)}</span>
              </div>
            )}
            {expectedMarginLKR != null && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Expected margin</span>
                <span className="whitespace-nowrap" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em', color: expectedMarginLKR >= 0 ? GREEN : RED }}>
                  {expectedMarginLKR >= 0 ? '+ ' : '− '}{formatLKR(Math.abs(expectedMarginLKR))}{expectedMarginPct != null ? ` (${expectedMarginPct}%)` : ''}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Days in stock</span>
              <span className="whitespace-nowrap" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{daysInStock} days</span>
            </div>
          </div>
        </Card>

        {/* ── Purchase ───────────────────────────────────────── */}
        <Card>
          <SectionLabel>Purchase</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Inventory type</span>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{watch.inventory_type === 'consign' ? 'Consign' : 'TWB'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>{watch.inventory_type === 'consign' ? 'Consignee' : 'Purchased from'}</span>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{(watch.inventory_type === 'consign' ? watch.consignee_name : watch.purchased_from) || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>{watch.inventory_type === 'consign' ? 'Consignee fee' : 'Purchase cost'}</span>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{formatLKR(watch.purchase_cost)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Serial number</span>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{watch.serial_number || '—'}</span>
            </div>
          </div>
        </Card>

        {/* ── Investors ──────────────────────────────────────── */}
        {watch.watch_investors && watch.watch_investors.length > 0 && (
          <Card>
            <SectionLabel>Investor{watch.watch_investors.length > 1 ? 's' : ''}</SectionLabel>
            <div className="flex flex-col gap-4">
              {watch.watch_investors.map(inv => {
                const capitalEmployed = cost * (inv.percentage / 100)
                const payout = netProfit != null ? netProfit * (inv.percentage / 100) : null
                return (
                  <div key={inv.id} className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3" style={{ paddingBottom: 12, borderBottom: '1px solid rgba(20,20,15,.06)' }}>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Investor</span>
                      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{investorNames.get(inv.investor_name) ?? inv.investor_name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Capital employed</span>
                      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{formatLKR(capitalEmployed)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Split</span>
                      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{inv.percentage}% / {(100 - inv.percentage).toFixed(inv.percentage % 1 === 0 ? 0 : 1)}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Payout on sale</span>
                      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em', color: payout == null ? INK : payout >= 0 ? GREEN : RED }}>
                        {payout == null ? 'Pending sale' : `${payout >= 0 ? '' : '− '}${formatLKR(Math.abs(payout))}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── Notes ──────────────────────────────────────────── */}
        {watch.comments && (
          <Card>
            <SectionLabel>Notes</SectionLabel>
            <p className="m-0" style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(20,20,15,.72)' }}>{watch.comments}</p>
            <span className="text-[12px]" style={{ color: INK_45, paddingTop: 6, borderTop: '1px solid rgba(20,20,15,.07)' }}>
              Added {new Date(watch.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
            </span>
          </Card>
        )}

        {/* ── Deals (real sale history) ──────────────────────── */}
        {deals.length > 0 ? (
          <Card>
            <SectionLabel>Deals</SectionLabel>
            <div className="flex flex-col">
              {deals.map(deal => (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="flex items-center justify-between transition-colors hover:bg-[#f7f6f3] rounded-xl"
                  style={{ padding: '10px 8px', borderBottom: '1px solid rgba(20,20,15,.05)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {deal.clients && (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10.5px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                        {getInitials(deal.clients.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: INK }}>{deal.clients?.name ?? 'Unknown Client'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stageColors[deal.stage] ?? 'bg-gray-100 text-gray-600'}`}>{deal.stage}</span>
                        <span className="text-xs" style={{ color: INK_45 }}>{deal.deal_type}</span>
                      </div>
                    </div>
                  </div>
                  {(dealSalePriceLKR(deal) ?? deal.offered_price) != null && (
                    <p className="text-sm font-medium tabular-nums shrink-0 ml-3" style={{ color: INK }}>
                      {formatLKR(dealSalePriceLKR(deal) ?? deal.offered_price)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <section className="rounded-[24px] flex flex-col gap-2.5" style={{ padding: 26, border: '1px dashed rgba(20,20,15,.16)' }}>
            <SectionLabel>Sale history</SectionLabel>
            <span className="text-[14px]" style={{ color: INK_45 }}>Ownership and price history will appear here once sales are recorded.</span>
          </section>
        )}

        {/* ── Invoice ────────────────────────────────────────── */}
        {invoice && (
          <Card>
            <SectionLabel>Invoice</SectionLabel>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <Link href={`/dashboard/invoices/${invoice.id}/edit`} className="text-sm font-semibold transition-colors" style={{ color: INK }}>
                  {invoice.invoice_number}
                </Link>
                {invoice.client_name && <p className="text-xs mt-0.5" style={{ color: INK_45 }}>{invoice.client_name}</p>}
                {invoice.date && <p className="text-xs mt-0.5" style={{ color: INK_45 }}>{new Date(invoice.date).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {invoice.amount_paid != null && (
                  <span className="text-sm font-semibold tabular-nums" style={{ color: INK }}>{formatLKR(invoice.amount_paid)}</span>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  invoice.status === 'paid'    ? 'bg-emerald-50 text-emerald-700' :
                  invoice.status === 'sent'    ? 'bg-sky-50 text-sky-700' :
                  invoice.status === 'overdue' ? 'bg-red-50 text-red-600' :
                                                 'bg-gray-100 text-gray-600'
                }`}>
                  {invoice.status}
                </span>
                <Link href={`/dashboard/invoices/${invoice.id}/edit`} className="text-xs transition-colors" style={{ color: INK_45 }}>
                  View →
                </Link>
              </div>
            </div>
          </Card>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
