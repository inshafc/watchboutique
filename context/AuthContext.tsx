'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLog'
import {
  type UserRole,
  type Profile,
  PERMISSIONS,
  hasPermission as _hasPermission,
} from '@/lib/auth'

interface AuthContextType {
  user:            User    | null
  profile:         Profile | null
  role:            UserRole | null
  loading:         boolean
  hasPermission:   (permission: keyof typeof PERMISSIONS) => boolean
  signOut:         () => Promise<void>
  refreshProfile:  () => Promise<void>
  setInactivityLogoutSuspended: (suspended: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  user:            null,
  profile:         null,
  role:            null,
  loading:         true,
  hasPermission:   () => false,
  signOut:         async () => {},
  refreshProfile:  async () => {},
  setInactivityLogoutSuspended: () => {},
})

const INACTIVITY_TIMEOUT = 3 * 60 * 1000 // 3 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User    | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Suspended by new-entry forms (AddWatchForm, AddDealForm,
  // InvoiceEditorClient) while mounted, so their own longer form-idle-lock
  // timer is what governs an idle user there, not this global logout.
  const suspendedRef = useRef(false)
  const timerRef      = useRef<ReturnType<typeof setTimeout>>()
  const resetTimerRef = useRef<() => void>(() => {})

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (suspendedRef.current) return
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        window.location.replace('/')
      }, INACTIVITY_TIMEOUT)
    }
    resetTimerRef.current = resetTimer

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  function setInactivityLogoutSuspended(suspended: boolean) {
    suspendedRef.current = suspended
    if (suspended) {
      if (timerRef.current) clearTimeout(timerRef.current)
    } else {
      resetTimerRef.current()
    }
  }

  const role = profile?.role ?? null

  function hasPermission(permission: keyof typeof PERMISSIONS): boolean {
    if (!role) return false
    return _hasPermission(role, permission)
  }

  async function signOut() {
    const supabase = createClient()
    void logActivity({ actionType: 'logout' })
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, hasPermission, signOut, refreshProfile, setInactivityLogoutSuspended }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
