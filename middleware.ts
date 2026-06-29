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
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/change-password'))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user) {
    // Fetch profile once for all authenticated requests
    const { data: p } = await supabase
      .from('profiles')
      .select('role, must_change_password')
      .eq('id', user.id)
      .single()

    const mustChange = p?.must_change_password === true
    const role       = (p?.role ?? 'viewer') as string

    // Must change password → only /change-password is allowed
    if (mustChange && !pathname.startsWith('/change-password')) {
      return NextResponse.redirect(new URL('/change-password', req.url))
    }

    // Password already changed → redirect away from /change-password
    if (!mustChange && pathname.startsWith('/change-password')) {
      const dest = role === 'super_admin' ? '/dashboard' : '/dashboard/inventory'
      return NextResponse.redirect(new URL(dest, req.url))
    }

    // Already authenticated → off /login
    if (pathname === '/login') {
      const dest = role === 'super_admin' ? '/dashboard' : '/dashboard/inventory'
      return NextResponse.redirect(new URL(dest, req.url))
    }

    // Role-based routing for dashboard routes
    if (pathname.startsWith('/dashboard')) {
      const isDashboardRoot = pathname === '/dashboard' || pathname === '/dashboard/'

      if (isDashboardRoot && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }
      if (SUPER_ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }
      if (VIEWER_BLOCKED.some(r => pathname.startsWith(r)) && role === 'viewer') {
        return NextResponse.redirect(new URL('/dashboard/inventory', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/change-password'],
}
