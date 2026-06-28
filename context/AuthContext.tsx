'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
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
}

const AuthContext = createContext<AuthContextType>({
  user:            null,
  profile:         null,
  role:            null,
  loading:         true,
  hasPermission:   () => false,
  signOut:         async () => {},
  refreshProfile:  async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User    | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const role = profile?.role ?? null

  function hasPermission(permission: keyof typeof PERMISSIONS): boolean {
    if (!role) return false
    return _hasPermission(role, permission)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, hasPermission, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
