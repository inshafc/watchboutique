'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a10.055 10.055 0 0 1-6.27 0l.217-.217a4.5 4.5 0 0 0 3.53-2.306zm-6.41-1.31L2.595 10.876A10.016 10.016 0 0 1 3.9 9.16l1.09 1.09a4.5 4.5 0 0 0-.653 2.37z" />
    </svg>
  )
}

export default function LoginPage() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    const role = profile?.role ?? 'viewer'
    router.push(role === 'super_admin' ? '/dashboard' : '/dashboard/inventory')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    color: 'white',
    padding: '13px 16px',
    fontSize: '14px',
    fontFamily: "'Poppins', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-full max-w-[360px]">

          <div className="rounded-3xl overflow-hidden animate-scale-in" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Logo + heading */}
            <div className="px-8 pt-10 pb-6 text-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/twb%20Brain%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby90d2IgQnJhaW4gKDIpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI2Njg0NTcsImV4cCI6MzUxMDY2ODQ1N30.pulhV5qaPqSacgBey2Og77pQBgdh8kMoaUiIIpm_-sA"
                  alt="TWB Brain"
                  style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
              {/* Brain activity animation */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 24px' }}>
                <svg width="120" height="40" viewBox="0 0 120 40" style={{ opacity: 0.8 }}>
                  <line x1="20" y1="20" x2="50" y2="10" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
                  <line x1="50" y1="10" x2="80" y2="20" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
                  <line x1="20" y1="20" x2="50" y2="30" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
                  <line x1="50" y1="30" x2="80" y2="20" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
                  <line x1="50" y1="10" x2="50" y2="30" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
                  <circle cx="20" cy="20" r="3" fill="#C9A84C" className="pulse-node" style={{ animationDelay: '0s' }} />
                  <circle cx="50" cy="10" r="3" fill="#C9A84C" className="pulse-node" style={{ animationDelay: '0.3s' }} />
                  <circle cx="50" cy="30" r="3" fill="#C9A84C" className="pulse-node" style={{ animationDelay: '0.6s' }} />
                  <circle cx="80" cy="20" r="3" fill="#C9A84C" className="pulse-node" style={{ animationDelay: '0.9s' }} />
                </svg>
              </div>

              <h1 className="animate-fade-in" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: '32px', lineHeight: 1.2, color: 'white', margin: 0, animationDelay: '0.1s', opacity: 0 }}>
                Login
              </h1>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-3" data-lpignore="true" data-form-type="other">

                <input
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  style={inputStyle}
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: 'white', color: '#111111', padding: '14px', fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: '14px', marginTop: '4px' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </>
                  ) : 'Sign In'}
                </button>

              </form>
            </div>
          </div>

          <p className="text-center mt-5 tracking-[0.12em]" style={{ color: '#444', fontSize: '11px', fontFamily: "'Poppins', sans-serif" }}>
            INTERNAL SYSTEM
          </p>
        </div>
      </div>
    </>
  )
}
