export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WishlistSection from '@/components/clients/WishlistSection'
import ContactLogSection from '@/components/clients/ContactLogSection'
import { avatarColor, getInitials } from '@/components/clients/ClientList'
import type { Client, Wishlist, ContactLog } from '@/types'

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

function ContactRow({ icon, value, href }: { icon: React.ReactNode; value: string | null; href?: string }) {
  if (!value) return null
  const content = (
    <span className="text-sm text-gray-700">{value}</span>
  )
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-gray-400 w-4 flex-shrink-0">{icon}</span>
      {href ? (
        <a href={href} className="text-sm text-gray-700 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 transition-colors">
          {value}
        </a>
      ) : content}
    </div>
  )
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [clientRes, wishlistRes, logRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('wishlists').select('*').eq('client_id', params.id).order('created_at', { ascending: false }),
    supabase.from('contact_log').select('*').eq('client_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!clientRes.data) notFound()

  const client    = clientRes.data  as Client
  const wishlists = (wishlistRes.data ?? []) as Wishlist[]
  const logs      = (logRes.data     ?? []) as ContactLog[]

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
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(client.name)}`}>
          {getInitials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {client.is_vip   && <VIPBadge />}
            {client.club_twb && <ClubBadge />}
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${client.id}/edit`}
          className="shrink-0 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Contact details */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
        <ContactRow
          icon={<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/></svg>}
          value={client.whatsapp}
          href={client.whatsapp ? `https://wa.me/${client.whatsapp.replace(/\D/g, '')}` : undefined}
        />
        <ContactRow
          icon={<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741Z"/></svg>}
          value={client.email}
          href={client.email ? `mailto:${client.email}` : undefined}
        />
        <ContactRow
          icon={<svg viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>}
          value={client.phone}
          href={client.phone ? `tel:${client.phone}` : undefined}
        />
        <ContactRow
          icon={<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>}
          value={client.instagram}
          href={client.instagram ? `https://instagram.com/${client.instagram.replace('@', '')}` : undefined}
        />
        {!client.whatsapp && !client.email && !client.phone && !client.instagram && (
          <p className="text-sm text-gray-400">No contact details added.</p>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Wishlist */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-4">
        <WishlistSection clientId={client.id} initialWishlists={wishlists} />
      </div>

      {/* Contact log */}
      <div className="border border-gray-100 rounded-2xl p-5 mb-8">
        <ContactLogSection clientId={client.id} initialLogs={logs} />
      </div>
    </div>
  )
}
