'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [step,            setStep]            = useState<Step>('phone')
  const [phone,           setPhone]           = useState('')
  const [fullPhone,       setFullPhone]       = useState('')
  const [firstName,       setFirstName]       = useState('')
  const [otp,             setOtp]             = useState(['', '', '', '', '', ''])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(30)
  const [canResend,       setCanResend]       = useState(false)

  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null))
  const router  = useRouter()

  // Countdown timer
  useEffect(() => {
    if (step !== 'otp' || canResend) return
    if (resendCountdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendCountdown(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [step, canResend, resendCountdown])

  // ── Phone submit ───────────────────────────────────────────────────────────
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError(null)

    const digits = phone.replace(/\D/g, '')
    const number = '+94' + digits
    const supabase = createClient()

    // Best-effort name lookup (may fail before auth — that's OK)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('phone', number)
      .single()

    const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: number })

    if (otpErr) {
      setError('Phone number not registered.')
      setLoading(false)
      return
    }

    setFullPhone(number)
    setFirstName(profileData?.full_name?.split(' ')[0] ?? '')
    setOtp(['', '', '', '', '', ''])
    setResendCountdown(30)
    setCanResend(false)
    setStep('otp')
    setLoading(false)
    setTimeout(() => otpRefs.current[0]?.focus(), 80)
  }

  // ── OTP verify ────────────────────────────────────────────────────────────
  async function submitOtp(digits: string[]) {
    const token = digits.join('')
    if (token.length !== 6) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token,
      type: 'sms',
    })

    if (verifyErr) {
      setError('Invalid code. Please try again.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'viewer'
    router.push(role === 'super_admin' ? '/dashboard' : '/dashboard/inventory')
    router.refresh()
  }

  // ── OTP input handlers ────────────────────────────────────────────────────
  function handleOtpChange(idx: number, value: string) {
    // Paste: distribute digits across boxes
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6)
      const next   = [...otp]
      pasted.split('').forEach((d, i) => { if (idx + i < 6) next[idx + i] = d })
      setOtp(next)
      const focus = Math.min(idx + pasted.length, 5)
      otpRefs.current[focus]?.focus()
      if (next.every(d => d !== '')) submitOtp(next)
      return
    }
    const digit = value.replace(/\D/g, '')
    const next  = [...otp]
    next[idx]   = digit
    setOtp(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
    if (next.every(d => d !== '')) submitOtp(next)
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (otp[idx]) {
        const next = [...otp]; next[idx] = ''; setOtp(next)
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus()
      }
    }
  }

  async function handleResend() {
    if (!canResend) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ phone: fullPhone })
    setOtp(['', '', '', '', '', ''])
    setResendCountdown(30)
    setCanResend(false)
    setLoading(false)
    setTimeout(() => otpRefs.current[0]?.focus(), 80)
  }

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const Spinner = () => (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-full max-w-[360px]">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header band */}
            <div className="bg-gray-900 px-8 pt-10 pb-8 text-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://sdubtvglhylztrxukyep.supabase.co/storage/v1/object/sign/TWB%20Logo/twb%20Brain%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zOWUzOWJmNC1lYmEzLTQ5ZWMtYmUzMy03YzQzMzAxNzUwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJUV0IgTG9nby90d2IgQnJhaW4gKDIpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI2Njg0NTcsImV4cCI6MzUxMDY2ODQ1N30.pulhV5qaPqSacgBey2Og77pQBgdh8kMoaUiIIpm_-sA"
                  alt="TWB Brain"
                  style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
              <h1
                className="text-white"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: '28px', lineHeight: 1.2 }}
              >
                {step === 'phone' ? 'Welcome' : `Welcome${firstName ? `, ${firstName}` : ''}`}
              </h1>
              <p className="text-gray-400 mt-2" style={{ fontSize: '13px', fontFamily: "'Poppins', sans-serif" }}>
                {step === 'phone'
                  ? 'Enter your phone number to continue'
                  : `Enter the 6-digit code sent to ${fullPhone}`}
              </p>
            </div>

            {/* ── Phone entry step ──────────────────────────────────── */}
            {step === 'phone' && (
              <div className="px-8 py-8">
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 transition-all">
                      <span
                        className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm font-medium border-r border-gray-200 select-none"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        +94
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="77 000 0000"
                        required
                        autoFocus
                        className="flex-1 px-3 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length < 9}
                    className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: '14px' }}
                  >
                    {loading ? <><Spinner /> Sending…</> : 'Send OTP'}
                  </button>
                </form>
              </div>
            )}

            {/* ── OTP entry step ────────────────────────────────────── */}
            {step === 'otp' && (
              <div className="px-8 py-8">
                <div className="space-y-5">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        style={{
                          width: '48px',
                          height: '56px',
                          textAlign: 'center',
                          fontSize: '20px',
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          backgroundColor: '#1a1a1a',
                          color: 'white',
                          border: '1px solid #2a2a2a',
                          borderRadius: '8px',
                          outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = '#555'}
                        onBlur={e  => e.target.style.borderColor = '#2a2a2a'}
                      />
                    ))}
                  </div>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <button
                    onClick={() => submitOtp(otp)}
                    disabled={loading || otp.some(d => !d)}
                    className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: '14px' }}
                  >
                    {loading ? <><Spinner /> Verifying…</> : 'Verify'}
                  </button>

                  <div className="text-center">
                    {canResend ? (
                      <button
                        onClick={handleResend}
                        className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors underline-offset-2 hover:underline"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <p className="text-[13px] text-gray-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        Resend in {resendCountdown}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          <p className="text-center text-gray-600 text-xs mt-6">TWB ERP · Authorised staff only</p>
        </div>
      </div>
    </>
  )
}
