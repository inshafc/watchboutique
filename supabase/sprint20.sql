-- Sprint 20: Activity Log

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  user_role text,
  action_type text NOT NULL CHECK (action_type IN (
    'login', 'logout', 'login_failed',
    'password_reset_self', 'password_reset_by_admin',
    'role_changed', 'user_deactivated', 'user_activated', 'user_created',
    'watch_created', 'watch_updated', 'watch_deleted', 'watch_duplicated',
    'sale_created', 'sale_updated', 'sale_deleted',
    'client_created', 'client_updated', 'client_deleted',
    'invoice_created', 'invoice_updated', 'invoice_deleted',
    'invoice_downloaded', 'invoice_printed',
    'watch_shared', 'settings_updated'
  )),
  severity text NOT NULL DEFAULT 'standard' CHECK (severity IN ('high', 'standard')),
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created  ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user     ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_severity ON activity_log(severity);
CREATE INDEX IF NOT EXISTS idx_activity_log_action   ON activity_log(action_type);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read activity log" ON activity_log
  FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Authenticated users can insert activity log" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);
