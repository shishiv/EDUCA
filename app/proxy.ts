import { authMiddleware } from '@/lib/middleware/auth-middleware'
import type { NextRequest } from 'next/server'

/**
 * Next.js 16 request boundary.
 *
 * Locale selection is intentionally cookie-based and does not rewrite paths,
 * so the existing auth, role and Pilot Gate implementation remains the only
 * request policy enforced here.
 */
export async function proxy(request: NextRequest) {
  return authMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
