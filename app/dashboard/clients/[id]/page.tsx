export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WishlistSection from '@/components/clients/WishlistSection'
import ContactLogSection from '@/components/clients/ContactLogSection'
import { avatarColor, getInitials } from '@/lib/client-utils'
import type { Client, Wishlist, ContactLog, DealWithRelations } from '@/types'

function VIPBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
      ★ VIP
    </span>
  )
}

function ClubBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-900 text-white">
      Club TWB
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {type}
    </span>
  )
}

function LeadBadge({ lead }: { lead: string }) {
  const colors: Record<string, string> = {
    Socials:  'bg-violet-50 text-violet-600 ring-violet-200',
    Referral: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    Website:  'bg-sky-50 text-sky-600 ring-sky-200',
    Hotline:  'bg-rose-50 text-rose-600 ring-rose-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colors[lead] ?? 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
      {lead}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  )
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function RatingGauge({ value, max = 10 }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1)
  const r   = 26
  const cx  = 34
  const cy  = 30
  const trackS = polarToCartesian(cx, cy, r, 180)
  const trackE = polarToCartesian(cx, cy, r, 0)
  const valEnd = polarToCartesian(cx, cy, r, 180 - pct * 180)
  const lg     = pct > 0.5 ? 1 : 0
  return (
    <svg width="68" height="36" viewBox="0 0 68 36">
      <path d={`M ${trackS.x} ${trackS.y} A ${r} ${r} 0 0 1 ${trackE.x} ${trackE.y}`} fill="none" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round"/>
      {pct > 0 && (
        <path d={`M ${trackS.x} ${trackS.y} A ${r} ${r} 0 ${lg} 1 ${valEnd.x} ${valEnd.y}`} fill="none" stroke="#111827" strokeWidth="5" strokeLinecap="round"/>
      )}
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">
        {value}
        <tspan fontSize="7" fill="#9ca3af">/10</tspan>
      </text>
    </svg>
  )
}

function clientRating(dealCount: number, isClubTwb: boolean): number {
  if (dealCount >= 10) return 10
  if (dealCount >= 5 || isClubTwb) return 9
  if (dealCount >= 3) return 7
  if (dealCount >= 2) return 5
  if (dealCount >= 1) return 3
  return 0
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [clientRes, wishlistRes, logRes, dealsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('wishlists').select('*').eq('client_id', params.id).order('created_at', { ascending: false }),
    supabase.from('contact_log').select('*').eq('client_id', params.id).order('created_at', { ascending: false }),
    supabase.from('deals').select('*, watches(watch_name, reference)').eq('client_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!clientRes.data) notFound()

  const client    = clientRes.data  as Client
  const wishlists = (wishlistRes.data ?? []) as Wishlist[]
  const logs      = (logRes.data     ?? []) as ContactLog[]
  const deals     = (dealsRes.data   ?? []) as DealWithRelations[]

  const notes = client.profile_notes ?? client.notes

  const closedDeals     = deals.filter(d => ['Closed', 'Delivered'].includes(d.stage))
  const totalSalesValue = closedDeals.reduce((sum, d) => sum + (d.sale_price ?? 0), 0)
  const watchesSold     = closedDeals.length
  const rating          = clientRating(watchesSold, client.club_twb)

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Back */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Clients
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${avatarColor(client.name, client.avatar_color)}`}>
          {getInitials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {client.is_vip   && <VIPBadge />}
            {client.club_twb && <ClubBadge />}
            {client.client_type   && <TypeBadge type={client.client_type} />}
            {client.lead_referral && <LeadBadge lead={client.lead_referral} />}
            {client.labels?.includes('political') && (
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 ring-1 ring-inset ring-red-200">Political</span>
            )}
            {client.labels?.includes('at_risk') && (
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200">At Risk</span>
            )}
            {client.labels?.includes('high_potential') && (
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">High Potential</span>
            )}
          </div>
          {client.sales_manager && (
            <p className="text-xs text-gray-400 mt-1.5">Sales: {client.sales_manager}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Stats chips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Total Sales</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">LKR {totalSalesValue.toLocaleString('en-LK')}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Watches Sold</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">{watchesSold}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Rating</p>
          <div className="flex justify-center"><RatingGauge value={rating} max={10} /></div>
        </div>
      </div>

      {/* Contact action buttons */}
      {(client.phone || client.email) && (
        <div className="flex gap-2 flex-wrap mb-6">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
              </svg>
              Call
            </a>
          )}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-900 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741Z"/>
              </svg>
              Email
            </a>
          )}
        </div>
      )}

      {/* Profile details */}
      {(client.address || client.email || client.phone) && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Details</p>
          <div className="space-y-2.5">
            {client.phone     && <InfoRow label="Phone"    value={client.phone} />}
            {client.email     && <InfoRow label="Email"    value={client.email} />}
            {client.address   && <InfoRow label="Address"  value={client.address} />}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Wishlist */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <WishlistSection clientId={client.id} initialWishlists={wishlists} />
      </div>

      {/* Contact log */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <ContactLogSection clientId={client.id} initialLogs={logs} />
      </div>

      {/* Sales History */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sales History</p>
        {deals.length === 0 ? (
          <p className="text-sm text-gray-400">No deals yet.</p>
        ) : (
          <div className="space-y-2">
            {deals.map(deal => {
              const stageColors: Record<string, string> = {
                Inquiry:     'bg-gray-100 text-gray-600',
                Offer:       'bg-sky-50 text-sky-700',
                Negotiation: 'bg-amber-50 text-amber-700',
                Closed:      'bg-emerald-50 text-emerald-700',
                Lost:        'bg-red-50 text-red-600',
              }
              const gp = deal.sale_price != null
                ? deal.sale_price - (deal.trade_value ?? 0) - (deal.adjustment ?? 0) - (deal.commission ?? 0)
                : null
              return (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {deal.watches?.watch_name ?? 'Unknown Watch'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stageColors[deal.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {deal.stage}
                      </span>
                      <span className="text-xs text-gray-400">{deal.deal_type}</span>
                      <span className="text-xs text-gray-300">
                        {new Date(deal.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {deal.sale_price != null && (
                      <p className="text-sm font-medium text-gray-900 tabular-nums">
                        LKR {deal.sale_price.toLocaleString('en-LK')}
                      </p>
                    )}
                    {gp != null && (
                      <p className={`text-xs tabular-nums ${gp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gp >= 0 ? '+' : ''}LKR {gp.toLocaleString('en-LK')}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
