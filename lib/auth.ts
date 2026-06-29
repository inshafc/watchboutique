export type UserRole = 'super_admin' | 'enterer' | 'viewer'

export interface Profile {
  id:                   string
  email:                string
  full_name:            string
  role:                 UserRole
  is_active:            boolean
  created_at:           string
  updated_at:           string
  must_change_password?: boolean
}

export const PERMISSIONS = {
  view_dashboard:         ['super_admin'],
  view_analytics:         ['super_admin'],
  view_investors:         ['super_admin'],
  view_settings:          ['super_admin'],
  manage_users:           ['super_admin'],
  view_kpi_targets:       ['super_admin'],
  view_inventory:         ['super_admin', 'enterer', 'viewer'],
  view_financial_details: ['super_admin', 'enterer'],
  add_edit_watch:         ['super_admin', 'enterer'],
  delete_watch:           ['super_admin'],
  view_sales:             ['super_admin', 'enterer'],
  record_sale:            ['super_admin', 'enterer'],
  delete_sale:            ['super_admin'],
  view_invoices:          ['super_admin', 'enterer'],
  generate_invoice:       ['super_admin', 'enterer'],
  delete_invoice:         ['super_admin'],
  view_clients:           ['super_admin', 'enterer', 'viewer'],
  add_edit_client:        ['super_admin', 'enterer'],
  delete_client:          ['super_admin'],
} as const

export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Admin',
  enterer:     'Enterer',
  viewer:      'Viewer',
}
