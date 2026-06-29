'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
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
      window.location.replace('/dashboard')
    } catch (err) {
      setError(String(err))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/twb%20Brain%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby90d2IgQnJhaW4gKDIpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI2Njg0NTcsImV4cCI6MzUxMDY2ODQ1N30.pulhV5qaPqSacgBey2Og77pQBgdh8kMoaUiIIpm_-sA" alt="TWB Brain" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 300, textAlign: 'center', marginBottom: '8px' }}>Set Your Password</h1>
        <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginBottom: '32px' }}>Please set a new password to continue</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 44px 14px 16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              {showPassword ? '👁' : '👁‍🗨'}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 44px 14px 16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              {showConfirm ? '👁' : '👁‍🗨'}
            </button>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: loading ? '#333' : '#ffffff', color: loading ? '#666' : '#0a0a0a', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
          >
            {loading ? 'Setting password...' : 'Set Password'}
          </button>
        </div>
        <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.3em', textAlign: 'center', textTransform: 'uppercase', marginTop: '48px' }}>INTERNAL SYSTEM</p>
      </div>
    </div>
  )
}
