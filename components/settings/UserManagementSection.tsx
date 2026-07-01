'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { logActivity } from '@/lib/activityLog'
import type { UserRole } from '@/lib/auth'

interface UserRow {
  id:               string
  email:            string
  full_name:        string
  role:             UserRole
  is_active:        boolean
  created_at:       string
  last_sign_in_at:  string | null
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Admin'   },
  { value: 'enterer',     label: 'Enterer' },
  { value: 'viewer',      label: 'Viewer'  },
]

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-gray-900 text-white',
  enterer:     'bg-blue-50 text-blue-700',
  viewer:      'bg-gray-100 text-gray-500',
}

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Admin',
  enterer:     'Enterer',
  viewer:      'Viewer',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose:   () => void
  onSuccess: () => void
}) {
  const [form,    setForm]    = useState({ full_name: '', email: '', role: 'viewer' as UserRole, password: '' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function genPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.password) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create user.'); setSaving(false); return }
    void logActivity({ actionType: 'user_created', entityLabel: form.full_name, details: { email: form.email, role: form.role } })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Invite User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'John Smith' },
            { label: 'Email',     key: 'email',     type: 'email', placeholder: 'john@example.com' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
              <input
                type={type}
                value={form[key as 'full_name' | 'email']}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            >
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Temporary Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Set a temporary password"
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-black disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reset password modal ───────────────────────────────────────────────────────

function ResetPasswordModal({
  userId,
  userName,
  onClose,
}: {
  userId:   string
  userName: string
  onClose:  () => void
}) {
  const [password, setPassword] = useState('')
  const [step,     setStep]     = useState<'input' | 'confirm' | 'done'>('input')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function genPassword() {
    const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('')
    const symbols = '!@#$%^&*'
    const sym = symbols[Math.floor(Math.random() * symbols.length)]
    return `TWB${digits}${sym}`
  }

  function meetsRequirements(pw: string) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)
  }

  function handleContinue() {
    if (!password) { setError('Enter a new password.'); return }
    if (!meetsRequirements(password)) {
      setError('Password must include uppercase, a number, and a symbol')
      return
    }
    setError(null)
    setStep('confirm')
  }

  async function handleReset() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reset_password', password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed.'); setSaving(false); return }
    void logActivity({ actionType: 'password_reset_by_admin', entityLabel: userName })
    setStep('done')
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Reset Password for {userName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {step === 'input' && (
          <>
            <p className="text-sm text-gray-500 mb-4">Set a new temporary password for <strong>{userName}</strong>.</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="New temporary password"
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
              <button
                type="button"
                onClick={() => { setPassword(genPassword()); setError(null) }}
                className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Min 8 characters · one uppercase · one number · one symbol</p>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button
                onClick={handleContinue}
                disabled={!password}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-black disabled:opacity-40 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
              <p className="text-sm text-amber-800">
                This will immediately invalidate <strong>{userName}</strong>&apos;s current password.
                They&apos;ll need to log in with the new temporary password and set their own. Continue?
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-900 select-all mb-5">{password}</div>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('input')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Back</button>
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-black disabled:opacity-50 transition-colors"
              >
                {saving ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Password reset for <strong>{userName}</strong> — share this with them:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-900 select-all mb-2">{password}</div>
            <p className="text-xs text-gray-400 mb-5">This is the only place this password is shown.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-black transition-colors">Done</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function UserManagementSection() {
  const { user: currentUser } = useAuth()
  const [users,       setUsers]       = useState<UserRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [showInvite,  setShowInvite]  = useState(false)
  const [resetModal,  setResetModal]  = useState<{ userId: string; userName: string } | null>(null)
  const [toggling,    setToggling]    = useState<string | null>(null)
  const [roleChanging,setRoleChanging]= useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/users')
    if (!res.ok) { setError('Failed to load users.'); setLoading(false); return }
    const data: UserRow[] = await res.json()
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleRoleChange(userId: string, role: UserRole) {
    setRoleChanging(userId)
    const prevRole = users.find(u => u.id === userId)?.role
    const targetName = users.find(u => u.id === userId)?.full_name ?? ''
    await fetch(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'update_role', role }),
    })
    void logActivity({ actionType: 'role_changed', entityLabel: targetName, details: { from: prevRole, to: role } })
    setRoleChanging(null)
    fetchUsers()
  }

  async function handleToggleStatus(userId: string, is_active: boolean) {
    setToggling(userId)
    const targetName = users.find(u => u.id === userId)?.full_name ?? ''
    const res = await fetch(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'toggle_status', is_active }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Failed.') }
    else { void logActivity({ actionType: is_active ? 'user_activated' : 'user_deactivated', entityLabel: targetName }) }
    setToggling(null)
    fetchUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors flex items-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          Invite User
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-5 py-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Name</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Email</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Role</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Last Login</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const isSelf  = u.id === currentUser?.id
                  const isLast  = i === users.length - 1
                  return (
                    <tr key={u.id} className={`${!isLast ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{u.full_name || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={roleChanging === u.id}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(u.last_sign_in_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          {!isSelf && (
                            <button
                              onClick={() => setResetModal({ userId: u.id, userName: u.full_name || u.email })}
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Reset PW
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleStatus(u.id, !u.is_active)}
                              disabled={toggling === u.id}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                                u.is_active
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {toggling === u.id ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {users.map(u => {
              const isSelf = u.id === currentUser?.id
              return (
                <div key={u.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                      disabled={roleChanging === u.id}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {!isSelf && (
                      <button
                        onClick={() => setResetModal({ userId: u.id, userName: u.full_name || u.email })}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
                      >
                        Reset PW
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => handleToggleStatus(u.id, !u.is_active)}
                        disabled={toggling === u.id}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                          u.is_active
                            ? 'text-red-500 border-red-200 hover:bg-red-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">Last login: {formatDate(u.last_sign_in_at)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSuccess={fetchUsers} />
      )}

      {resetModal && (
        <ResetPasswordModal
          userId={resetModal.userId}
          userName={resetModal.userName}
          onClose={() => setResetModal(null)}
        />
      )}
    </div>
  )
}
