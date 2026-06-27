import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPER_ADMIN_ONLY = [
  '/dashboard/analytics',
  '/dashboard/investors',
  '/dashboard/settings',
]

const VIEWER_BLOCKED = [
  ...SUPER_ADMIN_ONLY,
  '/dashboard/deals',
  '/dashboard/invoices',
]

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

  // Unauthenticated → /login
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already authenticated → off /login
  if (user && pathname === '/login') {
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = p?.role ?? 'viewer'
    const dest  = role === 'super_admin' ? '/dashboard' : '/dashboard/inventory'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // Role-based routing for authenticated users
  if (user) {
    const isDashboardRoot = pathname === '/dashboard' || pathname === '/dashboard/'
    const needsRoleCheck  =
      isDashboardRoot ||
      SUPER_ADMIN_ONLY.some(r => pathname.startsWith(r)) ||
      ['/dashboard/deals', '/dashboard/invoices'].some(r => pathname.startsWith(r))

    if (needsRoleCheck) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = (p?.role ?? 'viewer') as string

      // Redirect away from dashboard home for non-super_admins
      if (isDashboardRoot && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }

      // Redirect super_admin-only routes
      if (SUPER_ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }

      // Redirect viewer-blocked routes
      if (VIEWER_BLOCKED.some(r => pathname.startsWith(r)) && role === 'viewer') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
