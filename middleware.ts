import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPER_ADMIN_ONLY = [
  '/dashboard/analytics',
  '/dashboard/investors',
  '/dashboard/settings',
]

// viewer and inventory_clerk can't reach sales/invoicing, on top of the
// super-admin-only routes above.
const SALES_INVOICE_RESTRICTED = [
  ...SUPER_ADMIN_ONLY,
  '/dashboard/deals',
  '/dashboard/invoices',
]

const LIMITED_ROLES = ['viewer', 'inventory_clerk']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl

  // 1 & 2 — No session: any protected route → / (sign-in now lives on the home page)
  if (!user) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/change-password')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }

  // ── From here: session is guaranteed ──────────────────────────────────────

  const { data: p } = await supabase
    .from('profiles')
    .select('role, must_change_password')
    .eq('id', user.id)
    .single()

  const mustChange = p?.must_change_password === true
  const role       = (p?.role ?? 'viewer') as string

  // 3 — Session + must change password → /change-password
  if (mustChange && !pathname.startsWith('/change-password')) {
    return NextResponse.redirect(new URL('/change-password', req.url))
  }

  // 4 — Session + password done → redirect away from /change-password
  if (!mustChange && pathname.startsWith('/change-password')) {
    const dest = role === 'super_admin' ? '/dashboard' : '/dashboard/inventory'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // 5 — Role-based routing for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const isDashboardRoot = pathname === '/dashboard' || pathname === '/dashboard/'

    if (isDashboardRoot && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
    }
    if (SUPER_ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
    }
    if (SALES_INVOICE_RESTRICTED.some(r => pathname.startsWith(r)) && LIMITED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/change-password'],
}
