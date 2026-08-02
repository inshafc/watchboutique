'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'
import ProfileEditModal from '@/components/ui/ProfileEditModal'
import type { UserRole } from '@/lib/auth'

// ── Palette (matches the League Home / Inventory design) ────────────────────
const INK   = '#14140f'
const LIME  = '#d8f24a'
const CREAM = '#eceae5'

// ── Icons — 22x22 stroke set matching the design ─────────────────────────────

function NavIcon({ kind, color }: { kind: string; color: string }) {
  const p = { width: 20, height: 20, viewBox: '0 0 22 22', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'grid':
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="2.2" /><rect x="12" y="3" width="7" height="7" rx="2.2" /><rect x="3" y="12" width="7" height="7" rx="2.2" /><rect x="12" y="12" width="7" height="7" rx="2.2" /></svg>
    case 'box':
      return <svg {...p}><path d="M3.4 7.2 11 3.2l7.6 4v7.6L11 18.8 3.4 14.8z" /><path d="M3.4 7.2 11 11.2l7.6-4M11 11.2v7.6" /></svg>
    case 'users':
      return <svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.6 18c.7-2.9 2.8-4.4 5.4-4.4S13.7 15.1 14.4 18" /><path d="M15 5.2a3 3 0 0 1 0 5.7M16.6 13.9c1.5.6 2.4 2 2.8 4.1" /></svg>
    case 'tag':
      return <svg {...p}><path d="M4 3.6h6.2l7 7-6.2 6.2-7-7z" /><circle cx="7.5" cy="7.1" r="1.4" /></svg>
    case 'invoice':
      return <svg {...p}><path d="M5 3.4h12v15.2l-2.3-1.5-2.3 1.5-2.4-1.5-2.3 1.5L5 18.6z" /><path d="M8.2 8h5.6M8.2 11.6h5.6" /></svg>
    case 'coin':
      return <svg {...p}><ellipse cx="11" cy="6.4" rx="7" ry="2.9" /><path d="M4 6.4v9.2c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6.4" /><path d="M4 11c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9" /></svg>
    case 'report':
      return <svg {...p}><rect x="3.4" y="3.4" width="15.2" height="15.2" rx="3.4" /><path d="M7.4 14.6V9.8M11 14.6V7.4M14.6 14.6v-3" /></svg>
    case 'cog':
      return <svg {...p}><circle cx="11" cy="11" r="3" /><path d="M17.6 13.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.3a1.8 1.8 0 1 1-3.6 0v-.2a1.5 1.5 0 0 0-2.6-1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.3a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.3a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 2.6 1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.3a1.8 1.8 0 1 1 0 3.6h-.2a1.5 1.5 0 0 0-1.4.9z" /></svg>
    default:
      return <svg {...p}><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z" fill={color} stroke="none" /></svg>
  }
}

function MenuIcon()  { return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z" clipRule="evenodd" /></svg> }
function CloseIcon() { return <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> }

function Logo({ size = 40, iconSize = 26 }: { size?: number; iconSize?: number }) {
  return (
    <div className="flex-none rounded-full flex items-center justify-center" style={{ width: size, height: size, background: INK }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill={LIME} />
        <circle cx="14" cy="13" r="2.3" fill={INK} />
        <circle cx="24" cy="11.5" r="2.3" fill={INK} />
        <circle cx="29" cy="19" r="2.3" fill={INK} />
        <circle cx="20" cy="21" r="2.3" fill={INK} />
        <circle cx="11" cy="22" r="2.3" fill={INK} />
        <circle cx="25" cy="28" r="2.3" fill={INK} />
        <circle cx="15" cy="30" r="2.3" fill={INK} />
      </svg>
    </div>
  )
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Dashboard', href: '/dashboard',           icon: 'grid',    exact: true,  roles: ['super_admin'] as UserRole[] },
  { label: 'Inventory', href: '/dashboard/inventory', icon: 'box',     exact: false, roles: ['super_admin', 'enterer', 'viewer', 'inventory_clerk'] as UserRole[] },
  { label: 'Clients',   href: '/dashboard/clients',   icon: 'users',   exact: false, roles: ['super_admin', 'enterer', 'viewer', 'inventory_clerk'] as UserRole[] },
  { label: 'Sales',     href: '/dashboard/deals',     icon: 'tag',     exact: false, roles: ['super_admin', 'enterer'] as UserRole[] },
  { label: 'Invoices',  href: '/dashboard/invoices',  icon: 'invoice', exact: false, roles: ['super_admin', 'enterer'] as UserRole[] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'report',  exact: false, roles: ['super_admin'] as UserRole[] },
  { label: 'Investors', href: '/dashboard/investors', icon: 'coin',    exact: false, roles: ['super_admin'] as UserRole[] },
]

const BOTTOM_NAV = [
  { label: 'Settings', href: '/dashboard/settings', icon: 'cog', exact: false, roles: ['super_admin'] as UserRole[] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  super_admin:     { label: 'Admin',            cls: 'bg-[#d8f24a] text-[#14140f]' },
  enterer:         { label: 'Enterer',          cls: 'bg-[rgba(20,20,15,.06)] text-[rgba(20,20,15,.5)]' },
  viewer:          { label: 'Viewer',           cls: 'bg-[rgba(20,20,15,.06)] text-[rgba(20,20,15,.5)]' },
  inventory_clerk: { label: 'Inventory Clerk',  cls: 'bg-[rgba(20,20,15,.06)] text-[rgba(20,20,15,.5)]' },
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname()
  const [open, setOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(true)
  const [hoverNav, setHoverNav] = useState<string | null>(null)
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

  const visibleNav       = loading || !role ? NAV       : NAV.filter(n => n.roles.includes(role))
  const visibleBottomNav = loading || !role ? BOTTOM_NAV : BOTTOM_NAV.filter(n => n.roles.includes(role))

  function SidebarContent({ collapsible }: { collapsible: boolean }) {
    const isOpen = collapsible ? navOpen : true
    return (
      <>
        {/* Brand header */}
        <div className={`flex items-center gap-2.5 px-2 flex-wrap ${isOpen ? 'justify-start' : 'justify-center'}`}>
          <Logo size={40} iconSize={26} />
          {isOpen && (
            <div className="flex flex-col leading-[1.15] min-w-0">
              <span className="text-[14px] font-semibold tracking-tight" style={{ color: INK }}>SCOREBOARD</span>
              <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(20,20,15,.45)' }}>Pickleball League</span>
            </div>
          )}
          {collapsible && (
            <button
              onClick={() => setNavOpen(v => !v)}
              title="Toggle sidebar"
              className={`hidden md:flex w-[30px] h-[30px] flex-none rounded-[9px] items-center justify-center cursor-pointer transition-colors ${isOpen ? 'ml-auto' : ''}`}
              style={{ border: '1px solid rgba(20,20,15,.1)', background: '#fff' }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2.8" width="12" height="10.4" rx="2.4" /><path d="M6.4 2.8v10.4" />
              </svg>
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 flex flex-col gap-0.5 mt-6 overflow-y-auto">
          {visibleNav.map(({ label, href, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={() => { setOpen(false) }}
                onMouseEnter={() => setHoverNav(label)}
                onMouseLeave={() => setHoverNav(v => (v === label ? null : v))}
                className={`flex items-center gap-3 rounded-xl text-[13.5px] whitespace-nowrap overflow-hidden transition-colors ${isOpen ? 'justify-start px-3.5 py-2.5' : 'justify-center py-3'}`}
                style={{
                  fontWeight: active ? 600 : 500,
                  background: active ? '#fff' : 'transparent',
                  color: active ? INK : 'rgba(20,20,15,.6)',
                  boxShadow: active ? '0 1px 2px rgba(20,20,15,.06)' : 'none',
                }}
              >
                <span
                  className="w-[22px] h-[22px] flex-none flex items-center justify-center"
                  style={{ transform: hoverNav === label ? 'scale(1.16) rotate(-7deg)' : 'none', transition: 'transform .28s cubic-bezier(.34,1.56,.64,1)' }}
                >
                  <NavIcon kind={icon} color={active ? INK : 'rgba(20,20,15,.62)'} />
                </span>
                {isOpen && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav + user */}
        <div className="flex flex-col gap-0.5 pt-3 mt-3" style={{ borderTop: '1px solid rgba(20,20,15,.08)' }}>
          {visibleBottomNav.map(({ label, href, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl text-[13.5px] whitespace-nowrap overflow-hidden transition-colors ${isOpen ? 'justify-start px-3.5 py-2.5' : 'justify-center py-3'}`}
                style={{
                  fontWeight: active ? 600 : 500,
                  background: active ? '#fff' : 'transparent',
                  color: active ? INK : 'rgba(20,20,15,.6)',
                  boxShadow: active ? '0 1px 2px rgba(20,20,15,.06)' : 'none',
                }}
              >
                <span className="w-[22px] h-[22px] flex-none flex items-center justify-center">
                  <NavIcon kind={icon} color={active ? INK : 'rgba(20,20,15,.62)'} />
                </span>
                {isOpen && <span>{label}</span>}
              </Link>
            )
          })}

          {/* User indicator */}
          {profile && role ? (
            <div className="mt-2 pt-3 relative" style={{ borderTop: '1px solid rgba(20,20,15,.08)' }}>
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-lg border border-[#E8E6E1] overflow-hidden z-50 animate-scale-in">
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
                title={profile.full_name || profile.email}
                className={`w-full flex items-center gap-2.5 rounded-xl transition-colors hover:bg-[rgba(20,20,15,.04)] ${isOpen ? 'px-2 py-2' : 'justify-center py-2'}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: LIME, color: INK }}>
                  {initials(profile.full_name || profile.email)}
                </div>
                {isOpen && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate" style={{ color: INK }}>{profile.full_name || profile.email}</p>
                      {(() => {
                        const badge = ROLE_BADGE[role] ?? ROLE_BADGE.viewer
                        return (
                          <span className={`inline-block text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 mt-0.5 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </div>
                    <svg className="w-3 h-3 shrink-0" style={{ color: 'rgba(20,20,15,.3)' }} viewBox="0 0 12 12" fill="currentColor">
                      <path d={showProfileMenu ? 'M6 4L2 8h8L6 4z' : 'M6 8L2 4h8L6 8z'}/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            isOpen && <p className="text-[10px] font-medium px-2 pt-2" style={{ color: 'rgba(20,20,15,.3)' }}>Pickleball League · v1</p>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: CREAM }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex print:hidden flex-col shrink-0 transition-[width] duration-200"
        style={{ width: navOpen ? '224px' : '92px', padding: '18px 12px 18px 18px' }}
      >
        <SidebarContent collapsible />
      </aside>

      {/* Mobile: overlay + drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[260px] p-4 transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: CREAM }}
      >
        <SidebarContent collapsible={false} />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ padding: '18px 18px 18px 0' }}>
        <header className="flex items-center justify-between px-4 md:hidden print:hidden bg-white rounded-2xl mb-3" style={{ height: '56px', border: '1px solid rgba(20,20,15,.07)' }}>
          <button
            onClick={() => setOpen(v => !v)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(20,20,15,.05)]"
            style={{ color: INK }}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <div className="flex items-center gap-1.5">
            <Logo size={26} iconSize={17} />
            <span className="text-[13px] font-semibold" style={{ color: INK }}>SCOREBOARD</span>
          </div>
          {profile ? (
            <button
              onClick={() => setShowProfileEdit(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: LIME, color: INK }}
            >
              {initials(profile.full_name || profile.email)}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </header>

        <main className="flex-1 overflow-auto md:ml-0">
          {/* animate-fade-in-fast (opacity only, no transform) — animate-fade-in's
              translateY, even at rest via its forwards fill, establishes a new
              containing block for any position:fixed descendant (dialogs, toasts,
              the bulk action bar, the mobile FAB), pushing them off-screen on any
              page taller than the viewport. */}
          <div key={pathname} className="animate-fade-in-fast">
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
