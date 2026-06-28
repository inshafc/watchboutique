'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfileEditModal({
  initialName,
  email,
  onClose,
  onSave,
}: {
  initialName: string
  email: string
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id)

    if (profileError) {
      setError('Failed to update profile')
      setSaving(false)
      return
    }

    if (password) {
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) {
        setError('Profile saved but password update failed: ' + pwError.message)
        setSaving(false)
        onSave()
        return
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E8E6E1]">
          <h2 className="text-base font-semibold" style={{ color: '#111111' }}>Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-xl text-[13px] text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              New Password <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] transition-all"
            />
          </div>
          {password.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] transition-all"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-[#E8E6E1] text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 h-9 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
