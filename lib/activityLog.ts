import { createBrowserClient } from '@supabase/ssr'

export type ActionType =
  | 'login' | 'logout' | 'login_failed'
  | 'password_reset_self' | 'password_reset_by_admin'
  | 'role_changed' | 'user_deactivated' | 'user_activated' | 'user_created'
  | 'watch_created' | 'watch_updated' | 'watch_deleted' | 'watch_duplicated'
  | 'sale_created' | 'sale_updated' | 'sale_deleted'
  | 'client_created' | 'client_updated' | 'client_deleted'
  | 'invoice_created' | 'invoice_updated' | 'invoice_deleted'
  | 'invoice_downloaded' | 'invoice_printed'
  | 'watch_shared' | 'settings_updated'

const HIGH_SEVERITY: ActionType[] = [
  'login', 'logout', 'login_failed',
  'password_reset_self', 'password_reset_by_admin',
  'role_changed', 'user_deactivated', 'user_activated', 'user_created',
  'watch_deleted', 'sale_deleted', 'client_deleted', 'invoice_deleted',
  'invoice_downloaded', 'invoice_printed', 'watch_shared',
]

export async function logActivity(params: {
  actionType: ActionType
  entityType?: string
  entityId?: string
  entityLabel?: string
  details?: Record<string, unknown>
}) {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    await supabase.from('activity_log').insert({
      user_id:      user.id,
      user_name:    profile?.full_name ?? user.email,
      user_role:    profile?.role      ?? 'unknown',
      action_type:  params.actionType,
      severity:     HIGH_SEVERITY.includes(params.actionType) ? 'high' : 'standard',
      entity_type:  params.entityType  ?? null,
      entity_id:    params.entityId    ?? null,
      entity_label: params.entityLabel ?? null,
      details:      params.details     ?? null,
    })
  } catch {
    // Non-blocking — logging failures must never break the calling action
  }
}
