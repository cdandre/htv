import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Check if user is active and has proper permissions
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_active, role')
      .eq('id', user.id)
      .single()

    // Check if user is deactivated
    if (!profile || profile.is_active === false) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('error', 'account_deactivated')
      return NextResponse.redirect(url)
    }

    // Check admin routes
    if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
      if (profile.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}