'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLog'

// ── Palette ──────────────────────────────────────────────────────────────
const INK   = '#14140f'
const LIME  = '#d8f24a'
const CREAM = '#eceae5'
const GREEN = '#1f6f43'
const RED   = '#b23a2c'
const BLUE  = '#3f5f8a'

const CLUBS = [
  { club: 'Colombo Smash',      short: 'CS', city: 'Colombo 7',   played: 22, won: 19, lost: 3,  diff: 118, points: 57, form: 'W W W L W' },
  { club: 'Kandy Highlanders',  short: 'KH', city: 'Kandy',       played: 22, won: 17, lost: 5,  diff: 94,  points: 51, form: 'W W L W W' },
  { club: 'Galle Fort Dinks',   short: 'GF', city: 'Galle',       played: 22, won: 15, lost: 7,  diff: 61,  points: 45, form: 'L W W W L' },
  { club: 'Negombo Netters',    short: 'NN', city: 'Negombo',     played: 22, won: 13, lost: 9,  diff: 34,  points: 39, form: 'W L W L W' },
  { club: 'Nuwara Eliya Aces',  short: 'NE', city: 'Nuwara Eliya',played: 22, won: 11, lost: 11, diff: 2,   points: 33, form: 'L W L W L' },
  { club: 'Battaramulla Bounce',short: 'BB', city: 'Colombo',     played: 22, won: 9,  lost: 13, diff: -28, points: 27, form: 'L L W L W' },
  { club: 'Jaffna Paddle Club', short: 'JP', city: 'Jaffna',      played: 22, won: 6,  lost: 16, diff: -71, points: 18, form: 'L L L W L' },
  { club: 'Matara Coastal',     short: 'MC', city: 'Matara',      played: 22, won: 4,  lost: 18, diff: -96, points: 12, form: 'L L L L W' },
]

const RESULTS = [
  { home: 'Colombo Smash',      away: 'Negombo Netters',     homeScore: 11, awayScore: 6,  court: 'Court 1' },
  { home: 'Kandy Highlanders',  away: 'Galle Fort Dinks',     homeScore: 11, awayScore: 9,  court: 'Court 2' },
  { home: 'Jaffna Paddle Club', away: 'Battaramulla Bounce',  homeScore: 7,  awayScore: 11, court: 'Court 3' },
  { home: 'Nuwara Eliya Aces',  away: 'Matara Coastal',       homeScore: 11, awayScore: 4,  court: 'Court 1' },
  { home: 'Galle Fort Dinks',   away: 'Colombo Smash',        homeScore: 8,  awayScore: 11, court: 'Court 4' },
]

const FIXTURES = [
  { time: '07:00', home: 'Colombo Smash',      homeShort: 'CS', away: 'Kandy Highlanders',  awayShort: 'KH', venue: 'Otters Aquatic Club', tag: 'Top of table',            tagBg: 'rgba(216,242,74,.35)', tagFg: '#4f6b1f' },
  { time: '08:30', home: 'Galle Fort Dinks',    homeShort: 'GF', away: 'Nuwara Eliya Aces',  awayShort: 'NE', venue: 'Galle Sports Complex', tag: 'Division 1',            tagBg: 'rgba(63,95,138,.12)',  tagFg: BLUE },
  { time: '10:00', home: 'Negombo Netters',     homeShort: 'NN', away: 'Jaffna Paddle Club', awayShort: 'JP', venue: 'Negombo Beach Courts',tag: 'Division 1',            tagBg: 'rgba(63,95,138,.12)',  tagFg: BLUE },
  { time: '11:30', home: 'Battaramulla Bounce', homeShort: 'BB', away: 'Matara Coastal',     awayShort: 'MC', venue: 'Waters Edge',          tag: 'Relegation six-pointer', tagBg: 'rgba(178,58,44,.12)',  tagFg: RED },
]

const MENU = [
  { label: 'Standings', href: '#standings' },
  { label: 'Results',   href: '#results' },
  { label: 'Fixtures',  href: '#fixtures' },
  { label: 'Clubs',     href: '#standings' },
  { label: 'About',     href: '#' },
]

const HERO_STATS = [
  { value: '14',  label: 'Clubs',           fg: '#fff' },
  { value: '212', label: 'Players',         fg: '#fff' },
  { value: '308', label: 'Matches played',  fg: LIME },
  { value: '11',  label: 'Rounds done',     fg: '#fff' },
]

const POTM = [
  { value: '11-2', label: 'Record' },
  { value: '94%',  label: 'Serve win' },
  { value: '38',   label: 'Aces' },
]

const LEAGUE_STATS = [
  { label: 'Longest rally',        value: '64',       note: 'shots · Smash vs Highlanders, R9' },
  { label: 'Average attendance',   value: '412',      note: 'per match day across all venues' },
  { label: 'Season prize pool',    value: 'LKR 2.4M', note: 'split across three divisions' },
  { label: 'Courts in rotation',   value: '18',        note: 'six venues, three cities' },
]

const FOOTER_LINKS = [
  { label: 'Rules',   href: '#' },
  { label: 'Venues',  href: '#' },
  { label: 'Contact', href: '#' },
]

function Logo({ size = 40, iconSize = 27 }: { size?: number; iconSize?: number }) {
  return (
    <div className="flex-none rounded-full flex items-center justify-center" style={{ width: size, height: size, background: LIME }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill={INK} />
        <circle cx="14" cy="13" r="2.3" fill={LIME} />
        <circle cx="24" cy="11.5" r="2.3" fill={LIME} />
        <circle cx="29" cy="19" r="2.3" fill={LIME} />
        <circle cx="20" cy="21" r="2.3" fill={LIME} />
        <circle cx="11" cy="22" r="2.3" fill={LIME} />
        <circle cx="25" cy="28" r="2.3" fill={LIME} />
        <circle cx="15" cy="30" r="2.3" fill={LIME} />
      </svg>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="rgba(20,20,15,.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M1.8 10S4.9 4.8 10 4.8 18.2 10 18.2 10 15.1 15.2 10 15.2 1.8 10 1.8 10z" />
          <circle cx="10" cy="10" r="2.4" />
        </>
      ) : (
        <>
          <path d="M4.2 5.6C2.7 6.9 1.8 10 1.8 10s3.1 5.2 8.2 5.2c1.5 0 2.8-.45 3.9-1.1" />
          <path d="M8.2 5.1A7.6 7.6 0 0 1 10 4.8c5.1 0 8.2 5.2 8.2 5.2s-.85 1.42-2.3 2.75" />
          <path d="M3.4 3.4l13.2 13.2" />
        </>
      )}
    </svg>
  )
}

export default function LeagueHome() {
  const [role, setRole]         = useState<'Club official' | 'League staff'>('Club official')
  const [division, setDivision] = useState('Division 1')
  const [hoverRow, setHoverRow] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [focus, setFocus]       = useState<'user' | 'pass' | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: username, password })

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
      void logActivity({ actionType: 'login_failed', entityLabel: username })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    void logActivity({ actionType: 'login' })
    const userRole = profile?.role ?? 'viewer'
    router.push(userRole === 'super_admin' ? '/dashboard' : '/dashboard/inventory')
    router.refresh()
  }

  return (
    <div style={{ minWidth: 1280, background: CREAM, color: INK, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[60]" style={{ background: 'rgba(20,20,15,.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="max-w-[1240px] mx-auto flex items-center gap-[30px]" style={{ padding: '14px 28px' }}>
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col leading-[1.1]">
              <span className="text-[15px] font-bold tracking-[.02em] text-white">SCOREBOARD</span>
              <span className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: 'rgba(255,255,255,.45)' }}>Ceylon Pickleball League</span>
            </div>
          </div>
          <nav className="flex items-center gap-1.5 ml-[18px]">
            {MENU.map((m, i) => (
              <a
                key={m.label}
                href={m.href}
                className="whitespace-nowrap transition-colors"
                style={{
                  padding: '9px 15px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
                  color: i === 0 ? '#fff' : 'rgba(255,255,255,.6)',
                  background: i === 0 ? 'rgba(255,255,255,.1)' : 'transparent',
                }}
              >
                {m.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 flex-none">
            <span className="flex items-center gap-2.5 text-[12.5px] font-semibold whitespace-nowrap" style={{ color: LIME }}>
              <span className="w-2 h-2 rounded-full" style={{ background: LIME }} />
              Round 12 live
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ background: INK, color: '#fff', padding: '64px 28px 72px' }}>
        <div className="max-w-[1240px] mx-auto grid items-start gap-11" style={{ gridTemplateColumns: 'minmax(0,1.25fr) 420px' }}>

          <div className="flex flex-col gap-[30px] min-w-0">
            <span
              className="flex items-center gap-2.5 self-start whitespace-nowrap"
              style={{ height: 34, padding: '0 16px', borderRadius: 999, border: `1px solid rgba(216,242,74,.35)`, background: 'rgba(216,242,74,.09)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: LIME }}
            >
              Season 4 · 2026
            </span>
            <h1 className="m-0" style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-.045em', lineHeight: .95 }}>
              The island&apos;s<br />sharpest paddles,<br /><span style={{ color: LIME }}>one scoreboard.</span>
            </h1>
            <p className="m-0 max-w-[560px]" style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(255,255,255,.6)' }}>
              Fourteen clubs, 212 registered players, and a ladder that moves every Sunday. Live results, rankings and fixtures across Colombo, Kandy and Galle.
            </p>
            <div className="flex gap-3">
              <a href="#standings" className="flex items-center whitespace-nowrap transition-colors" style={{ height: 52, padding: '0 26px', borderRadius: 999, background: LIME, color: INK, fontSize: 14.5, fontWeight: 600 }}>
                View standings
              </a>
              <a href="#results" className="flex items-center whitespace-nowrap transition-colors" style={{ height: 52, padding: '0 26px', borderRadius: 999, border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: 14.5, fontWeight: 600 }}>
                Latest results
              </a>
            </div>

            <div className="grid grid-cols-4 gap-3.5" style={{ marginTop: 10 }}>
              {HERO_STATS.map(h => (
                <div key={h.label} className="flex flex-col gap-1.5" style={{ padding: 20, borderRadius: 20, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                  <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1, color: h.fg }}>{h.value}</span>
                  <span className="whitespace-nowrap" style={{ fontSize: 11.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>{h.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Member sign-in card */}
          <form id="member-login" onSubmit={handleSignIn} className="flex flex-col gap-5" style={{ background: '#fff', color: INK, borderRadius: 26, padding: 30, boxShadow: '0 28px 70px rgba(0,0,0,.45)' }}>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(20,20,15,.4)' }}>Member area</span>
              <span style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.025em' }}>Sign in</span>
              <span style={{ fontSize: 13, color: 'rgba(20,20,15,.5)' }}>Club officials, team captains and league staff.</span>
            </div>

            <div className="flex gap-1" style={{ padding: 4, borderRadius: 14, background: '#f2f1ed' }}>
              {(['Club official', 'League staff'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="flex-1 border-0 font-sans cursor-pointer whitespace-nowrap transition-colors"
                  style={{ height: 40, borderRadius: 11, background: role === r ? INK : 'transparent', color: role === r ? '#fff' : 'rgba(20,20,15,.55)', fontSize: 13, fontWeight: 600 }}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(20,20,15,.45)' }}>Username</span>
              <div className="flex items-center gap-2.5 transition-colors" style={{ height: 52, padding: '0 16px', border: `1px solid ${focus === 'user' ? INK : 'rgba(20,20,15,.12)'}`, borderRadius: 14, background: '#fff' }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="rgba(20,20,15,.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7.4" r="2.9" /><path d="M4.6 16.4c.7-2.7 2.7-4.2 5.4-4.2s4.7 1.5 5.4 4.2" /></svg>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="captain@club.lk"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocus('user')}
                  onBlur={() => setFocus(null)}
                  className="flex-1 min-w-0 border-0 outline-none bg-transparent"
                  style={{ fontSize: 15, color: INK }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(20,20,15,.45)' }}>Password</span>
              <div className="flex items-center gap-2.5 transition-colors" style={{ height: 52, padding: '0 16px', border: `1px solid ${focus === 'pass' ? INK : 'rgba(20,20,15,.12)'}`, borderRadius: 14, background: '#fff' }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="rgba(20,20,15,.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4.2" y="8.6" width="11.6" height="8" rx="2.2" /><path d="M7 8.6V6.8a3 3 0 0 1 6 0v1.8" /></svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocus('pass')}
                  onBlur={() => setFocus(null)}
                  className="flex-1 min-w-0 border-0 outline-none bg-transparent"
                  style={{ fontSize: 15, color: INK }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  title={showPass ? 'Hide password' : 'Show password'}
                  className="flex-none rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer p-0 transition-colors"
                  style={{ width: 30, height: 30 }}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {error && (
              <span className="text-center" style={{ fontSize: 12.5, color: RED }}>{error}</span>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2.5 whitespace-nowrap border-0 font-sans cursor-pointer transition-colors disabled:opacity-50"
              style={{ height: 54, borderRadius: 999, background: INK, color: '#fff', fontSize: 15, fontWeight: 600 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M6.5 3.5 11 8l-4.5 4.5" /></svg>
              )}
            </button>

            <span className="text-center" style={{ fontSize: 12, color: 'rgba(20,20,15,.4)' }}>Not a member? Registration for Season 5 opens 1 October.</span>
          </form>
        </div>
      </section>

      {/* ── Standings + Results/POTM ──────────────────────────────── */}
      <section id="standings" style={{ padding: '60px 28px 20px' }}>
        <div className="max-w-[1240px] mx-auto grid items-start gap-4.5" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>

          <div className="flex flex-col gap-4" style={{ background: '#fff', borderRadius: 26, padding: '26px 24px' }}>
            <div className="flex items-center gap-3.5" style={{ padding: '0 10px' }}>
              <h2 className="m-0 whitespace-nowrap" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>League standings</h2>
              <div className="ml-auto flex gap-1" style={{ padding: 4, borderRadius: 12, background: '#f2f1ed' }}>
                {['Division 1', 'Division 2', 'Mixed'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDivision(d)}
                    className="border-0 font-sans cursor-pointer whitespace-nowrap transition-colors"
                    style={{ height: 34, padding: '0 15px', borderRadius: 9, background: division === d ? INK : 'transparent', color: division === d ? '#fff' : 'rgba(20,20,15,.55)', fontSize: 12.5, fontWeight: 600 }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid items-center" style={{ gridTemplateColumns: '44px minmax(180px,1.6fr) 62px 62px 62px 74px 78px', padding: '0 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(20,20,15,.4)' }}>
              <div>#</div>
              <div>Club</div>
              <div className="text-center">P</div>
              <div className="text-center">W</div>
              <div className="text-center">L</div>
              <div className="text-center">Diff</div>
              <div className="text-right">Points</div>
            </div>

            <div className="flex flex-col">
              {CLUBS.map((c, i) => {
                const hot = hoverRow === c.short
                const top = i < 4
                const bottom = i >= CLUBS.length - 2
                const diffFg = c.diff > 0 ? GREEN : c.diff < 0 ? RED : 'rgba(20,20,15,.5)'
                return (
                  <div
                    key={c.short}
                    onMouseEnter={() => setHoverRow(c.short)}
                    onMouseLeave={() => setHoverRow(s => (s === c.short ? null : s))}
                    className="grid items-center cursor-pointer transition-colors"
                    style={{ gridTemplateColumns: '44px minmax(180px,1.6fr) 62px 62px 62px 74px 78px', padding: '15px 14px', borderRadius: 16, borderBottom: '1px solid rgba(20,20,15,.06)', background: hot ? '#f7f6f3' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-none rounded-lg flex items-center justify-center" style={{ width: 26, height: 26, background: top ? LIME : bottom ? 'rgba(178,58,44,.14)' : '#f2f1ed', color: bottom ? RED : INK, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 min-w-0" style={{ paddingRight: 12 }}>
                      <span className="flex-none rounded-[10px] flex items-center justify-center" style={{ width: 34, height: 34, background: top ? 'rgba(216,242,74,.35)' : '#f2f1ed', color: INK, fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em' }}>
                        {c.short}
                      </span>
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.015em' }}>{c.club}</span>
                        <span className="whitespace-nowrap" style={{ fontSize: 11.5, color: 'rgba(20,20,15,.42)' }}>{c.city} · {c.form}</span>
                      </span>
                    </div>
                    <div className="text-center" style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{c.played}</div>
                    <div className="text-center" style={{ fontSize: 14, fontWeight: 600, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{c.won}</div>
                    <div className="text-center" style={{ fontSize: 14, color: 'rgba(20,20,15,.55)', fontVariantNumeric: 'tabular-nums' }}>{c.lost}</div>
                    <div className="text-center" style={{ fontSize: 14, fontWeight: 600, color: diffFg, fontVariantNumeric: 'tabular-nums' }}>{c.diff > 0 ? '+' : ''}{c.diff}</div>
                    <div className="text-right" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{c.points}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4" style={{ padding: '8px 14px 0' }}>
              <span className="flex items-center gap-2 whitespace-nowrap" style={{ fontSize: 11.5, color: 'rgba(20,20,15,.45)' }}>
                <span className="rounded-[3px]" style={{ width: 9, height: 9, background: LIME }} />
                Championship playoff
              </span>
              <span className="flex items-center gap-2 whitespace-nowrap" style={{ fontSize: 11.5, color: 'rgba(20,20,15,.45)' }}>
                <span className="rounded-[3px]" style={{ width: 9, height: 9, background: 'rgba(178,58,44,.35)' }} />
                Relegation zone
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4.5">
            <div id="results" className="flex flex-col gap-3.5" style={{ background: '#fff', borderRadius: 26, padding: '24px 22px' }}>
              <div className="flex items-baseline gap-2.5" style={{ padding: '0 6px' }}>
                <h2 className="m-0 whitespace-nowrap" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.015em' }}>Round 11 results</h2>
                <span className="ml-auto whitespace-nowrap" style={{ fontSize: 12, color: 'rgba(20,20,15,.42)' }}>26 July</span>
              </div>
              {RESULTS.map((r, i) => {
                const homeWon = r.homeScore > r.awayScore
                return (
                  <div key={i} className="flex items-center gap-3" style={{ padding: '13px 12px', borderRadius: 16, background: '#f7f6f3' }}>
                    <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13.5, fontWeight: homeWon ? 600 : 500, color: homeWon ? INK : 'rgba(20,20,15,.45)' }}>{r.home}</span>
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13.5, fontWeight: homeWon ? 500 : 600, color: homeWon ? 'rgba(20,20,15,.45)' : INK }}>{r.away}</span>
                    </span>
                    <span className="flex flex-col gap-0.5 items-end flex-none">
                      <span style={{ fontSize: 14, fontWeight: homeWon ? 600 : 500, color: homeWon ? INK : 'rgba(20,20,15,.45)', fontVariantNumeric: 'tabular-nums' }}>{r.homeScore}</span>
                      <span style={{ fontSize: 14, fontWeight: homeWon ? 500 : 600, color: homeWon ? 'rgba(20,20,15,.45)' : INK, fontVariantNumeric: 'tabular-nums' }}>{r.awayScore}</span>
                    </span>
                    <span className="flex-none" style={{ width: 1, height: 34, background: 'rgba(20,20,15,.1)' }} />
                    <span className="flex-none whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(20,20,15,.4)' }}>{r.court}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-4" style={{ background: INK, color: '#fff', borderRadius: 26, padding: '24px 22px' }}>
              <div className="flex items-baseline gap-2.5" style={{ padding: '0 4px' }}>
                <h2 className="m-0 whitespace-nowrap text-white" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.015em' }}>Player of the month</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex-none rounded-full flex items-center justify-center" style={{ width: 64, height: 64, background: LIME, color: INK, fontSize: 20, fontWeight: 700 }}>TW</span>
                <span className="flex flex-col gap-1 min-w-0">
                  <span className="whitespace-nowrap" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>Tharindu Weeraman</span>
                  <span className="whitespace-nowrap" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>Colombo Smash · Men&apos;s singles</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {POTM.map(p => (
                  <div key={p.label} className="flex flex-col gap-1" style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.06)' }}>
                    <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.03em', color: LIME, fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
                    <span className="whitespace-nowrap" style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fixtures ───────────────────────────────────────────── */}
      <section id="fixtures" style={{ padding: '22px 28px 20px' }}>
        <div className="max-w-[1240px] mx-auto flex flex-col gap-4" style={{ background: '#fff', borderRadius: 26, padding: '26px 24px' }}>
          <div className="flex items-baseline gap-3" style={{ padding: '0 8px' }}>
            <h2 className="m-0 whitespace-nowrap" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>Round 12 fixtures</h2>
            <span className="whitespace-nowrap" style={{ fontSize: 13, color: 'rgba(20,20,15,.45)' }}>Sunday 9 August · 07:00 onwards</span>
            <a href="#" className="ml-auto whitespace-nowrap" style={{ fontSize: 13, fontWeight: 600, color: '#4f6b1f' }}>Full calendar</a>
          </div>
          <div className="grid grid-cols-4 gap-3.5">
            {FIXTURES.map((f, i) => (
              <div key={i} className="flex flex-col gap-3.5" style={{ border: '1px solid rgba(20,20,15,.08)', borderRadius: 20, padding: 20 }}>
                <div className="flex items-center gap-2.5">
                  <span className="whitespace-nowrap" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(20,20,15,.4)' }}>{f.time}</span>
                  <span className="ml-auto whitespace-nowrap" style={{ fontSize: 10.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: f.tagBg, color: f.tagFg }}>{f.tag}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className="flex-none rounded-[9px] flex items-center justify-center" style={{ width: 30, height: 30, background: '#f2f1ed', fontSize: 10.5, fontWeight: 700 }}>{f.homeShort}</span>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{f.home}</span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="flex-none rounded-[9px] flex items-center justify-center" style={{ width: 30, height: 30, background: '#f2f1ed', fontSize: 10.5, fontWeight: 700 }}>{f.awayShort}</span>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>{f.away}</span>
                  </span>
                </div>
                <span className="whitespace-nowrap" style={{ paddingTop: 12, borderTop: '1px solid rgba(20,20,15,.07)', fontSize: 11.5, color: 'rgba(20,20,15,.45)' }}>{f.venue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── League stats ───────────────────────────────────────── */}
      <section style={{ padding: '22px 28px 60px' }}>
        <div className="max-w-[1240px] mx-auto grid grid-cols-4 gap-3.5">
          {LEAGUE_STATS.map(s => (
            <div key={s.label} className="flex flex-col gap-2" style={{ background: '#fff', borderRadius: 22, padding: '22px 24px' }}>
              <span className="whitespace-nowrap" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(20,20,15,.4)' }}>{s.label}</span>
              <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(20,20,15,.45)' }}>{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ background: INK, color: 'rgba(255,255,255,.55)', padding: '40px 28px' }}>
        <div className="max-w-[1240px] mx-auto flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size={34} iconSize={22} />
            <span className="whitespace-nowrap text-white" style={{ fontSize: 13, fontWeight: 600 }}>Ceylon Pickleball League</span>
          </div>
          <span className="whitespace-nowrap" style={{ fontSize: 12.5 }}>© 2026 · Colombo, Sri Lanka</span>
          <div className="ml-auto flex items-center gap-5">
            {FOOTER_LINKS.map(l => (
              <a key={l.label} href={l.href} className="whitespace-nowrap" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)' }}>{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
