import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    try {
        const res = NextResponse.next()
        const supabase = createMiddlewareClient({ req, res })

        // Get the current pathname
        const path = req.nextUrl.pathname

        // Always allow access to auth-related paths and static assets
        if (path.startsWith('/auth/') ||
            path.startsWith('/_next') ||
            path.startsWith('/api') ||
            path === '/') {
            return res
        }

        // For all other routes, check session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
            console.error('Session check error:', error)
            const redirectUrl = new URL('/auth/signin', req.url)
            redirectUrl.searchParams.set('error', 'Session error. Please sign in again.')
            return NextResponse.redirect(redirectUrl)
        }

        // If no session and trying to access protected route, redirect to signin
        if (!session && !path.startsWith('/auth/')) {
            const redirectUrl = new URL('/auth/signin', req.url)
            redirectUrl.searchParams.set('redirectedFrom', path)
            redirectUrl.searchParams.set('error', 'Please sign in to access this page.')
            return NextResponse.redirect(redirectUrl)
        }

        return res
    } catch (error) {
        console.error('Middleware error:', error)
        const redirectUrl = new URL('/auth/signin', req.url)
        redirectUrl.searchParams.set('error', 'An unexpected error occurred. Please sign in again.')
        return NextResponse.redirect(redirectUrl)
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
} 