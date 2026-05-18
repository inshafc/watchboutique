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

      {/* Contact action buttons */}
      {(client.whatsapp || client.phone || client.email || client.instagram) && (
        <div className="flex gap-2 flex-wrap mb-6">
          {client.whatsapp && (
            <a
              href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
              </svg>
              WhatsApp
            </a>
          )}
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
          {client.instagram && (
            <a
              href={`https://instagram.com/${client.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
              </svg>
              Instagram
            </a>
          )}
        </div>
      )}

      {/* Profile details */}
      {(client.address || client.email || client.phone || client.whatsapp || client.instagram) && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Details</p>
          <div className="space-y-2.5">
            {client.whatsapp  && <InfoRow label="WhatsApp" value={client.whatsapp} />}
            {client.phone     && <InfoRow label="Phone"    value={client.phone} />}
            {client.email     && <InfoRow label="Email"    value={client.email} />}
            {client.instagram && <InfoRow label="Instagram" value={client.instagram} />}
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
