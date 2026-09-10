import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth/config'
import { checkAuthRateLimit } from '@/lib/rate-limit'

export const { GET } = handlers

/**
 * Wrap the NextAuth POST handler with rate limiting.
 * Only the credentials sign-in path (/api/auth/callback/credentials) is
 * subject to the limit; token refreshes and other auth callbacks pass through.
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting only to the sign-in endpoint
  if (req.nextUrl.pathname.includes('/callback/credentials')) {
    let email: string | undefined
    try {
      const body = await req.clone().json() as { email?: string }
      email = body.email
    } catch {
      // body not JSON — proceed without email key
    }

    const result = await checkAuthRateLimit(req, email)
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Anmeldeversuche. Bitte warten Sie.' },
        {
          status: 429,
          headers: { 'Retry-After': String(result.retryAfter) },
        },
      )
    }
  }

  return (handlers.POST as (req: NextRequest) => Promise<Response>)(req)
}
