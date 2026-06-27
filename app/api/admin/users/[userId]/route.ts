import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return null
  return { supabase, callerId: profile.id }
}

// PATCH /api/admin/users/[userId]
// Body: { action: 'update_role' | 'toggle_status' | 'reset_password', ...payload }
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const ctx = await requireSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = params
  const body = await req.json()
  const admin = createAdminClient()

  if (body.action === 'update_role') {
    const { role } = body
    if (!['super_admin', 'enterer', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const { error } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle_status') {
    const { is_active } = body as { is_active: boolean }

    // Cannot deactivate yourself
    if (!is_active && userId === ctx.callerId) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    const { error: profileErr } = await admin
      .from('profiles')
      .update({ is_active })
      .eq('id', userId)
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

    // Ban / unban in auth
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: is_active ? 'none' : '876000h',
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  }

  if (body.action === 'reset_password') {
    const { password } = body
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
