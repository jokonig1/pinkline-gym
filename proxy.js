import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Sin sesión → login
  if (!user && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión: verificar ROL según la ruta
  if (user && path.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = profile?.rol

    // /dashboard/admin → solo admin
    if (path.startsWith('/dashboard/admin') && rol !== 'admin') {
      const destino = rol === 'coach' ? '/dashboard/coach' : '/dashboard/alumno'
      return NextResponse.redirect(new URL(destino, request.url))
    }

    // /dashboard/coach → coach o admin
    if (path.startsWith('/dashboard/coach') && !['coach', 'admin'].includes(rol)) {
      return NextResponse.redirect(new URL('/dashboard/alumno', request.url))
    }

    // /dashboard/alumno → cualquier rol autenticado (ok)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
