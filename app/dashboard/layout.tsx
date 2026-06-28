'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'
import ProfileEditModal from '@/components/ui/ProfileEditModal'
import type { UserRole } from '@/lib/auth'

// ── Icons ────────────────────────────────────────────────────────────────────

function GridIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z" /></svg> }
function PeopleIcon()    { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.276zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg> }
function TagIcon()       { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg> }
function HomeIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg> }
function ChartIcon()     { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/></svg> }
function ReceiptIcon()   { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M1.92.506a.5.5 0 0 1 .434.14L3 1.293l.646-.647a.5.5 0 0 1 .708 0L5 1.293l.646-.647a.5.5 0 0 1 .708 0L7 1.293l.646-.647a.5.5 0 0 1 .708 0L9 1.293l.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .801.13l.5 1A.5.5 0 0 1 15 2v12a.5.5 0 0 1-.053.224l-.5 1a.5.5 0 0 1-.8.13L13 14.707l-.646.647a.5.5 0 0 1-.708 0L11 14.707l-.646.647a.5.5 0 0 1-.708 0L9 14.707l-.646.647a.5.5 0 0 1-.708 0L7 14.707l-.646.647a.5.5 0 0 1-.708 0L5 14.707l-.646.647a.5.5 0 0 1-.708 0L3 14.707l-.646.647a.5.5 0 0 1-.801-.13l-.5-1A.5.5 0 0 1 1 14V2a.5.5 0 0 1 .053-.224l.5-1a.5.5 0 0 1 .367-.27zm.217 1.338L2 2.118v11.764l.137.274.51-.51a.5.5 0 0 1 .707 0l.646.647.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.509.509.137-.274V2.118l-.137-.274-.51.51a.5.5 0 0 1-.707 0L12 1.707l-.646.647a.5.5 0 0 1-.708 0L10 1.707l-.646.647a.5.5 0 0 1-.708 0L8 1.707l-.646.647a.5.5 0 0 1-.708 0L6 1.707l-.646.647a.5.5 0 0 1-.708 0L4 1.707l-.646.647a.5.5 0 0 1-.708 0l-.509-.51z"/><path d="M3 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5zm8-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/></svg> }
function TrendingUpIcon(){ return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07z"/></svg> }
function GearIcon()      { return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg> }
function MenuIcon()      { return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z" clipRule="evenodd" /></svg> }
function CloseIcon()     { return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> }

// ── Nav config ────────────────────────────────────────────────────────────────

type Permission = 'super_admin' | 'enterer' | 'viewer'

const NAV = [
  { label: 'Dashboard', href: '/dashboard',           Icon: HomeIcon,       exact: true,  roles: ['super_admin'] as Permission[] },
  { label: 'Inventory', href: '/dashboard/inventory', Icon: GridIcon,       exact: false, roles: ['super_admin', 'enterer', 'viewer'] as Permission[] },
  { label: 'Clients',   href: '/dashboard/clients',   Icon: PeopleIcon,     exact: false, roles: ['super_admin', 'enterer', 'viewer'] as Permission[] },
  { label: 'Sales',     href: '/dashboard/deals',     Icon: TagIcon,        exact: false, roles: ['super_admin', 'enterer'] as Permission[] },
  { label: 'Invoices',  href: '/dashboard/invoices',  Icon: ReceiptIcon,    exact: false, roles: ['super_admin', 'enterer'] as Permission[] },
  { label: 'Analytics', href: '/dashboard/analytics', Icon: ChartIcon,      exact: false, roles: ['super_admin'] as Permission[] },
  { label: 'Investors', href: '/dashboard/investors', Icon: TrendingUpIcon, exact: false, roles: ['super_admin'] as Permission[] },
]

const BOTTOM_NAV = [
  { label: 'Settings', href: '/dashboard/settings', Icon: GearIcon, exact: false, roles: ['super_admin'] as Permission[] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  super_admin: { label: 'Admin',   cls: 'bg-gold text-white' },
  enterer:     { label: 'Enterer', cls: 'bg-white/10 text-white/70' },
  viewer:      { label: 'Viewer',  cls: 'bg-white/10 text-white/70' },
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname()
  const [open, setOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [profileToast, setProfileToast] = useState<string | null>(null)
  const { profile, role, signOut, loading, refreshProfile } = useAuth()

  useEffect(() => {
    if (profileToast) {
      const t = setTimeout(() => setProfileToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [profileToast])

  const visibleNav       = loading || !role ? NAV       : NAV.filter(n => n.roles.includes(role as Permission))
  const visibleBottomNav = loading || !role ? BOTTOM_NAV : BOTTOM_NAV.filter(n => n.roles.includes(role as Permission))

  const SidebarContent = () => (
    <>
      {/* Brand header */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-white/8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/twb%20Brain%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby90d2IgQnJhaW4gKDEpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI2NjgyNzMsImV4cCI6MzUxMDY2ODI3M30.7gVCREOIzT8sL64l6JKQHEBEq0_xULtkN2czn1YEYSo"
          alt="TWB"
          style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ label, href, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors relative ${
                active ? 'text-white border-l-2 pl-[10px]' : 'hover:bg-white/5'
              }`}
              style={active
                ? { color: '#ffffff', borderLeftColor: '#C9A84C', backgroundColor: 'rgba(255,255,255,0.06)' }
                : { color: '#888888' }
              }
            >
              <Icon />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav + user */}
      <div className="px-3 pb-4 border-t border-white/8 pt-3 space-y-0.5">
        {visibleBottomNav.map(({ label, href, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? 'text-white border-l-2 pl-[10px]'
                  : 'hover:bg-white/5'
              }`}
              style={active
                ? { color: '#ffffff', borderLeftColor: '#C9A84C', backgroundColor: 'rgba(255,255,255,0.06)' }
                : { color: '#888888' }
              }
            >
              <Icon />
              {label}
            </Link>
          )
        })}

        {/* User indicator */}
        {profile && role ? (
          <div className="mt-3 pt-3 border-t border-white/8 relative">
            {showProfileMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-xl shadow-lg border border-[#E8E6E1] overflow-hidden z-50">
                <button
                  onClick={() => { setShowProfileEdit(true); setShowProfileMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  Edit Profile
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 text-left"
                >
                  Sign Out
                </button>
              </div>
            )}
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: '#C9A84C' }}>
                {initials(profile.full_name || profile.email)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-white truncate">{profile.full_name || profile.email}</p>
                <span className={`inline-block text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 mt-0.5 ${ROLE_BADGE[role].cls}`}>
                  {ROLE_BADGE[role].label}
                </span>
              </div>
              <svg className="w-3 h-3 shrink-0 text-white/30" viewBox="0 0 12 12" fill="currentColor">
                <path d={showProfileMenu ? 'M6 4L2 8h8L6 4z' : 'M6 8L2 4h8L6 8z'}/>
              </svg>
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-white/20 font-medium px-3 pt-2">TWB ERP · v1</p>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F6F3' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex print:hidden flex-col w-[220px] shrink-0"
        style={{ backgroundColor: '#111111', minHeight: '100vh' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile: overlay + drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#111111' }}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 border-b border-border md:hidden print:hidden bg-white" style={{ height: '56px' }}>
          <button
            onClick={() => setOpen(v => !v)}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-cream transition-colors"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/twb%20Brain%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby90d2IgQnJhaW4gKDEpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI2NjgyNzMsImV4cCI6MzUxMDY2ODI3M30.7gVCREOIzT8sL64l6JKQHEBEq0_xULtkN2czn1YEYSo"
            alt="TWB Brain"
            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          />
          {profile ? (
            <button
              onClick={() => setShowProfileEdit(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ backgroundColor: '#C9A84C' }}
            >
              {initials(profile.full_name || profile.email)}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F6F3' }}>
          <div>
            {children}
          </div>
        </main>
      </div>

      {/* Profile edit modal */}
      {showProfileEdit && profile && (
        <ProfileEditModal
          initialName={profile.full_name || ''}
          email={profile.email}
          onClose={() => setShowProfileEdit(false)}
          onSave={async () => {
            await refreshProfile()
            setShowProfileEdit(false)
            setProfileToast('Profile updated')
          }}
        />
      )}

      {/* Toast */}
      {profileToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg pointer-events-none">
          {profileToast}
        </div>
      )}
    </div>
  )
}
