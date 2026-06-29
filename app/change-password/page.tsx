'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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

export default function ChangePasswordPage() {
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('At least 8 characters')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id)
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError(String(err))
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    color: 'white',
    padding: '13px 44px 13px 16px',
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

          <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>

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
              <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: '28px', lineHeight: 1.2, color: 'white', margin: 0 }}>
                Set Your Password
              </h1>
              <p className="mt-2" style={{ color: '#666', fontSize: '13px', fontFamily: "'Poppins', sans-serif" }}>
                Please set a new password to continue
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="space-y-3">

                {/* New password */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New Password"
                    required
                    style={inputStyle}
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

                {/* Confirm password */}
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm Password"
                    required
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>

                <p style={{ color: '#555', fontSize: '11px', fontFamily: "'Poppins', sans-serif" }}>
                  At least 8 characters
                </p>

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
                      Setting password…
                    </>
                  ) : 'Set Password'}
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
