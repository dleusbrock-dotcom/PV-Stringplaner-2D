/**
 * In-memory rate limiter for auth endpoints.
 * Uses rate-limiter-flexible with the Memory backend — no Redis required.
 *
 * Limits:
 *  - 10 attempts per IP per 15 minutes (sliding window)
 *  - 5 attempts per email per 15 minutes  ← prevents user enumeration abuse
 *
 * In a multi-instance deployment replace RateLimiterMemory with
 * RateLimiterRedis to share state across pods.
 */
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest } from 'next/server'

const WINDOW_SECONDS = 15 * 60   // 15 minutes
const MAX_BY_IP = 10
const MAX_BY_EMAIL = 5

const byIp = new RateLimiterMemory({
  points: MAX_BY_IP,
  duration: WINDOW_SECONDS,
  keyPrefix: 'auth_ip',
})

const byEmail = new RateLimiterMemory({
  points: MAX_BY_EMAIL,
  duration: WINDOW_SECONDS,
  keyPrefix: 'auth_email',
})

export interface RateLimitResult {
  allowed: boolean
  /** seconds until the rate limit resets (0 when allowed) */
  retryAfter: number
}

/**
 * Check and consume one attempt.
 * Returns `{ allowed: false, retryAfter }` when the caller should respond 429.
 */
export async function checkAuthRateLimit(
  req: NextRequest,
  email?: string,
): Promise<RateLimitResult> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  try {
    await byIp.consume(ip)
  } catch (err: unknown) {
    const msBeforeNext = (err as { msBeforeNext?: number }).msBeforeNext ?? WINDOW_SECONDS * 1000
    return { allowed: false, retryAfter: Math.ceil(msBeforeNext / 1000) }
  }

  if (email) {
    const key = email.toLowerCase()
    try {
      await byEmail.consume(key)
    } catch (err: unknown) {
      const msBeforeNext = (err as { msBeforeNext?: number }).msBeforeNext ?? WINDOW_SECONDS * 1000
      return { allowed: false, retryAfter: Math.ceil(msBeforeNext / 1000) }
    }
  }

  return { allowed: true, retryAfter: 0 }
}

/**
 * Reset all attempts for an IP and/or email (call on successful login).
 */
export async function resetAuthRateLimit(req: NextRequest, email?: string) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  await byIp.delete(ip)
  if (email) await byEmail.delete(email.toLowerCase())
}
