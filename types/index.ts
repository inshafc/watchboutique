// Shared domain types for WatchBoutique ERP
// Expand as sprints progress

export type UserRole = 'admin' | 'staff'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}
