import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return null
  return { supabase, user }
}

// GET /api/admin/users — list all users with profile + last sign-in
export async function GET() {
  const ctx = await requireSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const [{ data: profiles }, { data: { users: authUsers } }] = await Promise.all([
    ctx.supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    admin.auth.admin.listUsers({ perPage: 500 }),
  ])

  const merged = (profiles ?? []).map(p => {
    const au = authUsers.find(u => u.id === p.id)
    return { ...p, last_sign_in_at: au?.last_sign_in_at ?? null }
  })

  return NextResponse.json(merged)
}

// POST /api/admin/users — create a new user
export async function POST(req: Request) {
  const ctx = await requireSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, full_name, role, password } = await req.json()

  if (!email || !full_name || !role || !password) {
    return NextResponse.json({ error: 'email, full_name, role, and password are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Ensure profile has correct values (trigger fires async, so patch immediately)
  await admin.from('profiles').upsert(
    { id: data.user.id, email, full_name, role },
    { onConflict: 'id' },
  )

  return NextResponse.json({ success: true })
}
