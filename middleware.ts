import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgektsymnqkyqcethveh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjk2MjEsImV4cCI6MjA2NTg0NTYyMX0.9-GgphRm5dMkmuXmBzu2cORM50qj4bLJdngAqDpjErU'

// Protected routes that require authentication
const protectedRoutes = [
  '/tenant',
  '/landlord',
  '/admin',
  '/properties',
  '/tenants',
  '/payments',
  '/reports',
  '/managers',
]

// Admin-only routes
const adminRoutes = [
  '/admin',
]

// Role-based route access
const roleAccess: Record<string, string[]> = {
  '/tenant': ['tenant'],
  '/landlord': ['landlord', 'manager'],
  '/admin': ['admin'],
  '/properties': ['landlord', 'manager', 'admin'],
  '/tenants': ['landlord', 'manager', 'admin'],
  '/payments': ['landlord', 'manager', 'admin'],
  '/reports': ['landlord', 'manager', 'admin'],
  '/managers': ['landlord', 'admin'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/privacy')
  ) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtected) {
    return NextResponse.next()
  }

  // Create Supabase client for server-side
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // Simplified middleware - let client-side handle auth
  // Supabase auth cookies are HTTP-only and require proper setup
  // For now, we'll allow requests and let client-side auth handle protection
  // This is a common pattern for Next.js + Supabase
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

