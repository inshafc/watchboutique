export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LazyImage from '@/components/ui/LazyImage'
import { avatarColor, getInitials } from '@/lib/client-utils'
import StageSelector from '@/components/deals/StageSelector'
import InstallmentTracker from '@/components/deals/InstallmentTracker'
import DealDetailActions from '@/components/deals/DealDetailActions'
import GenerateInvoiceButton from '@/components/invoices/GenerateInvoiceButton'
import { getInvestorDisplayNames } from '@/lib/investor-names'
import { dealSalePriceLKR } from '@/lib/deal-currency'
import { INK, INK_45, INK_60, CARD_BG, GREEN, RED, AMBER, AMBER_BG, BLUE, RADII, CARD_PADDING } from '@/lib/design-tokens'
import type { DealWithRelations, Installment, DealStage, TradeIn, DealExpense } from '@/types'

function formatLKR(n: number | null | undefined) {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK')
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// Purchase has no dedicated token in lib/design-tokens.ts (violet isn't part
// of the shared palette yet) — flagged here rather than silently reusing a
// near-match color; promote to the token file if a second page needs it.
const TYPE_TONE: Record<string, { bg: string; fg: string }> = {
  Sale:     { bg: 'rgba(63,95,138,.12)', fg: BLUE },
  Purchase: { bg: 'rgba(124,58,237,.12)', fg: '#7c3aed' },
  Trade:    { bg: AMBER_BG, fg: AMBER },
}

const STAGE_TONE: Record<string, { bg: string; fg: string }> = {
  Idle:      { bg: 'rgba(20,20,15,.07)', fg: INK_45 },
  Inquiry:   { bg: 'rgba(63,95,138,.14)', fg: BLUE },
  Offer:     { bg: AMBER_BG, fg: AMBER },
  Delivered: { bg: 'rgba(31,111,67,.14)', fg: GREEN },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: INK_45 }}>{children}</span>
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[24px] flex flex-col gap-4" style={{ padding: CARD_PADDING }}>
      {children}
    </section>
  )
}

function FinRow({ label, value, first, big }: { label: string; value: string; first?: boolean; big?: boolean }) {
  return (
    <div
      className="flex items-baseline gap-3.5"
      style={{ paddingTop: first ? 0 : 12, borderTop: first ? 'none' : '1px solid rgba(20,20,15,.07)' }}
    >
      <span style={{ fontSize: big ? 15 : 14, color: big ? INK_60 : 'rgba(20,20,15,.5)', paddingLeft: big ? 0 : 14 }}>{label}</span>
      <span
        className="ml-auto tabular-nums whitespace-nowrap"
        style={{ fontSize: big ? 22 : 15, fontWeight: 600, letterSpacing: big ? '-.025em' : undefined, color: big ? INK : 'rgba(20,20,15,.7)' }}
      >
        {value}
      </span>
    </div>
  )
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [dealRes, installRes, tradeInsRes, expensesRes, invoiceRes, draftInvoiceRes, investorNames] = await Promise.all([
    supabase
      .from('deals')
      .select('*, watches(watch_name, reference, serial_number, status, photos, purchase_cost, sold_price, brand_id, brands(id, name, color)), clients(name, avatar_color, is_vip, club_twb, phone, address)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('installments')
      .select('*')
      .eq('deal_id', params.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('trade_ins')
      .select('*')
      .eq('deal_id', params.id)
      .order('created_at'),
    supabase
      .from('deal_expenses')
      .select('*')
      .eq('deal_id', params.id)
      .order('created_at'),
    supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('deal_id', params.id)
      .neq('status', 'draft')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('deal_id', params.id)
      .eq('status', 'draft')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
    getInvestorDisplayNames(supabase),
  ])

  if (!dealRes.data) notFound()
  const deal         = dealRes.data as DealWithRelations

  // Fetch investors only if stage is Delivered and there is a linked watch
  type WatchInvestorRow = { id: string; investor_name: string; percentage: number }
  let investors: WatchInvestorRow[] = []
  if (deal.stage === 'Delivered' && deal.watch_id) {
    const { data: invData } = await supabase
      .from('watch_investors')
      .select('id, investor_name, percentage')
      .eq('watch_id', deal.watch_id)
      .order('percentage', { ascending: false })
    investors = (invData ?? []) as WatchInvestorRow[]
  }

  const installments   = (installRes.data  ?? []) as Installment[]
  const tradeIns       = (tradeInsRes.data ?? []) as TradeIn[]
  const expenses       = (expensesRes.data ?? []) as DealExpense[]
  const existingInvoice = invoiceRes.data as { id: string; invoice_number: string; status: string } | null
  const draftInvoice    = draftInvoiceRes.data as { id: string; invoice_number: string; status: string } | null

  const watchCost     = deal.watches?.purchase_cost ?? 0
  const otherCostsAmt = deal.other_costs ? (deal.other_costs_amount ?? 0) : 0
  const commissionAmt = deal.commission_payable ? (deal.commission_amount ?? 0) : 0

  // sold_price (captured on the watch at the point of sale) is the source of truth;
  // fall back to the deal's own sale_price, converted to LKR, for sales recorded
  // before that column existed.
  const salePrice = deal.watches?.sold_price ?? dealSalePriceLKR(deal)
  const grossProfit = salePrice != null
    ? salePrice - watchCost - otherCostsAmt - commissionAmt
    : null

  const brandName  = deal.watches?.brands?.name ?? null
  const brandColor = deal.watches?.brands?.color ?? null
  const stageTone  = STAGE_TONE[deal.stage] ?? STAGE_TONE.Idle
  const typeTone   = TYPE_TONE[deal.deal_type] ?? { bg: 'rgba(20,20,15,.07)', fg: INK_60 }

  return (
    <div className="p-4 md:p-7" style={{ color: INK }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2 min-w-0">
            <Link href="/dashboard/deals" className="flex items-center gap-1.5 text-[12.5px] font-semibold w-fit" style={{ color: INK_45 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={INK_45} strokeWidth="1.7" strokeLinecap="round"><path d="M9.5 3.5 5 8l4.5 4.5"/></svg>
              Sales
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full" style={{ background: typeTone.bg, color: typeTone.fg }}>
                {deal.deal_type}
              </span>
              {deal.new_client && (
                <span className="text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full" style={{ background: 'rgba(63,95,138,.12)', color: BLUE }}>
                  New Client
                </span>
              )}
              {deal.sale_date && (
                <span className="text-[13px]" style={{ color: INK_45 }}>{formatDate(deal.sale_date)}</span>
              )}
            </div>
            <h1 className="m-0" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {deal.watches?.watch_name ?? 'Unnamed Watch'}
            </h1>
            {deal.watches?.reference && (
              <span className="text-[13px]" style={{ color: INK_45 }}>Ref: {deal.watches.reference}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-none">
            <GenerateInvoiceButton dealId={deal.id} existingInvoice={existingInvoice} draftInvoice={draftInvoice} />
            <DealDetailActions deal={deal} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4" style={{ maxWidth: 1120 }}>

        {/* ── Photo ──────────────────────────────────────────── */}
        {deal.watches && (
          <section className="bg-white rounded-[24px] flex flex-col gap-4" style={{ padding: 20 }}>
            <div className="relative overflow-hidden" style={{ height: 380, borderRadius: RADII.md, background: CARD_BG }}>
              {deal.watches.photos && deal.watches.photos.length > 0 ? (
                <LazyImage src={deal.watches.photos[0]} alt={deal.watches.watch_name ?? 'Watch'} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={INK_45} strokeWidth="1">
                    <circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.5 3h5M9.5 21h5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              {brandName && (
                <span className="absolute top-4 left-4 pointer-events-none flex items-center" style={{ height: 36, padding: '0 16px', background: 'rgba(255,255,255,.94)', borderRadius: 999, boxShadow: '0 2px 8px rgba(20,20,15,.12)' }}>
                  <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: brandColor ?? INK }}>{brandName}</span>
                </span>
              )}
              <span className="absolute top-4 right-4 pointer-events-none text-[11px] font-bold uppercase tracking-wide" style={{ padding: '7px 14px', borderRadius: 999, background: stageTone.bg, color: stageTone.fg }}>
                {deal.stage}
              </span>
            </div>
          </section>
        )}

        {/* ── Client + Watch + Sales manager + Source ─────────── */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {deal.clients && (
              <div className="flex flex-col gap-2.5 min-w-0">
                <SectionLabel>Client</SectionLabel>
                <Link href={`/dashboard/clients/${deal.client_id}`} className="flex items-center gap-3 min-w-0" style={{ color: INK }}>
                  <div className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${avatarColor(deal.clients.name, deal.clients.avatar_color)}`}>
                    {getInitials(deal.clients.name)}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate" style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: '-.015em' }}>{deal.clients.name}</span>
                    {deal.clients.phone && <span className="text-xs" style={{ color: INK_45 }}>{deal.clients.phone}</span>}
                  </div>
                </Link>
              </div>
            )}
            {deal.watches && (
              <div className="flex flex-col gap-2.5 min-w-0">
                <SectionLabel>Watch</SectionLabel>
                <Link href={`/dashboard/watches/${deal.watch_id}`} className="flex flex-col gap-0.5 min-w-0" style={{ color: INK }}>
                  <span className="truncate" style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: '-.015em' }}>{deal.watches.watch_name}</span>
                  {deal.watches.status && <span className="text-xs" style={{ color: INK_45 }}>{deal.watches.status}</span>}
                </Link>
              </div>
            )}
            {deal.sales_manager && (
              <div className="flex flex-col gap-1">
                <SectionLabel>Sales Manager</SectionLabel>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{deal.sales_manager}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <SectionLabel>Source</SectionLabel>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{deal.source ?? '—'}</span>
            </div>
          </div>
        </Card>

        {/* ── Stage ──────────────────────────────────────────── */}
        <Card>
          <StageSelector dealId={deal.id} initialStage={deal.stage as DealStage} watchId={deal.watch_id} salesManager={deal.sales_manager} />
          {deal.closed_at && (
            <span className="text-xs pt-3" style={{ color: INK_45, borderTop: '1px solid rgba(20,20,15,.07)' }}>
              Closed {formatDate(deal.closed_at)}
            </span>
          )}
        </Card>

        {/* ── Financials ─────────────────────────────────────── */}
        <Card>
          <SectionLabel>Financials</SectionLabel>
          <div className="flex flex-col">
            {deal.offered_price != null && <FinRow label="Offered Price" value={formatLKR(deal.offered_price)} first />}
            <FinRow label="Sale Price" value={formatLKR(dealSalePriceLKR(deal))} first={deal.offered_price == null} big />
            {watchCost > 0 && <FinRow label="Watch Cost" value={`− ${formatLKR(watchCost)}`} />}
            {deal.other_costs && expenses.length > 0 && expenses.map(exp => (
              <FinRow
                key={exp.id}
                label={exp.category === 'Other' && exp.custom_label ? `${exp.category} — ${exp.custom_label}` : exp.category}
                value={`− ${formatLKR(exp.amount)}`}
              />
            ))}
            {deal.other_costs && expenses.length === 0 && deal.other_costs_amount != null && (
              <FinRow label="Other Costs" value={`− ${formatLKR(deal.other_costs_amount)}`} />
            )}
            {deal.other_costs && expenses.length > 1 && otherCostsAmt > 0 && (
              <FinRow label="Total Other Costs" value={`− ${formatLKR(otherCostsAmt)}`} />
            )}
            {deal.commission_payable && deal.commission_amount != null && (
              <FinRow label="Commission" value={`− ${formatLKR(deal.commission_amount)}`} />
            )}
          </div>
          {grossProfit != null && (
            <div className="flex items-baseline gap-3.5 rounded-2xl" style={{ padding: '16px 18px', background: 'rgba(31,111,67,.07)', border: '1px solid rgba(31,111,67,.2)' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Gross Profit</span>
              <span
                className="ml-auto tabular-nums whitespace-nowrap"
                style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.03em', color: grossProfit >= 0 ? GREEN : RED }}
              >
                {grossProfit >= 0 ? '+ ' : ''}{formatLKR(grossProfit)}
              </span>
            </div>
          )}
        </Card>

        {/* ── Investor Returns — only when Delivered and investors exist ─ */}
        {investors.length > 0 && grossProfit != null && (
          <Card>
            <SectionLabel>Investor Returns</SectionLabel>
            <div className="flex flex-col">
              {investors.map((inv, i) => {
                const share = Math.round(grossProfit * (inv.percentage / 100))
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3"
                    style={{ paddingTop: i === 0 ? 0 : 12, paddingBottom: 12, borderTop: i === 0 ? 'none' : '1px solid rgba(20,20,15,.07)' }}
                  >
                    <span className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: '#e2ddd0' }}>
                      {getInitials(investorNames.get(inv.investor_name) ?? inv.investor_name)}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{investorNames.get(inv.investor_name) ?? inv.investor_name}</span>
                    <span className="text-[11.5px] font-semibold tabular-nums rounded-full px-2.5 py-1" style={{ background: 'rgba(20,20,15,.07)', color: 'rgba(20,20,15,.55)' }}>
                      {inv.percentage}%
                    </span>
                    <span className="ml-auto tabular-nums whitespace-nowrap" style={{ fontSize: 16, fontWeight: 600, color: share >= 0 ? GREEN : RED }}>
                      {share >= 0 ? '+ ' : '− '}{formatLKR(Math.abs(share))}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-baseline gap-3.5" style={{ paddingTop: 14, borderTop: '1px solid rgba(20,20,15,.07)' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Total Distributed</span>
              <span className="ml-auto tabular-nums whitespace-nowrap" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.02em', color: grossProfit >= 0 ? GREEN : RED }}>
                {grossProfit >= 0 ? '+ ' : '− '}{formatLKR(Math.abs(Math.round(grossProfit)))}
              </span>
            </div>
            {Math.abs(investors.reduce((s, i) => s + i.percentage, 0) - 100) > 0.01 && (
              <p className="text-xs m-0" style={{ color: AMBER }}>⚠ Investor percentages do not total 100%</p>
            )}
          </Card>
        )}

        {/* ── Details ────────────────────────────────────────── */}
        {(deal.payment_method || deal.sale_date) && (
          <Card>
            <SectionLabel>Details</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              {deal.payment_method && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Payment Method</span>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{deal.payment_method}</span>
                </div>
              )}
              {deal.sale_date && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(20,20,15,.4)' }}>Sale Date</span>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.015em' }}>{formatDate(deal.sale_date)}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Notes ──────────────────────────────────────────── */}
        {deal.notes && (
          <Card>
            <SectionLabel>Notes</SectionLabel>
            <p className="m-0" style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(20,20,15,.72)', whiteSpace: 'pre-wrap' }}>{deal.notes}</p>
          </Card>
        )}

        {/* ── Trade-ins ──────────────────────────────────────── */}
        {tradeIns.length > 0 && (
          <Card>
            <SectionLabel>Trade-In Watches</SectionLabel>
            <div className="flex flex-col gap-3">
              {tradeIns.map(ti => (
                <div key={ti.id} className="rounded-2xl" style={{ padding: 16, background: CARD_BG }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="m-0" style={{ fontSize: 15, fontWeight: 600 }}>
                        {[ti.brand, ti.reference].filter(Boolean).join(' · ') || 'Unnamed'}
                      </p>
                      <div className="flex flex-col gap-0.5 mt-1" style={{ fontSize: 12, color: INK_45 }}>
                        {ti.serial_number && <span>SN: {ti.serial_number}</span>}
                        <span>{[ti.year, ti.condition, ti.set_details].filter(Boolean).join(' · ')}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {ti.value != null && (
                        <p className="m-0 tabular-nums" style={{ fontSize: 15, fontWeight: 600 }}>{formatLKR(ti.value)}</p>
                      )}
                      {ti.add_to_inventory && (
                        <p className="m-0 mt-0.5" style={{ fontSize: 12, color: GREEN }}>
                          {ti.watch_id ? (
                            <Link href={`/dashboard/watches/${ti.watch_id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                              → Inventory
                            </Link>
                          ) : 'Added to inventory'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Installments ───────────────────────────────────── */}
        {deal.payment_method === 'Installment' && (
          <Card>
            <InstallmentTracker dealId={deal.id} initialInstallments={installments} />
          </Card>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
