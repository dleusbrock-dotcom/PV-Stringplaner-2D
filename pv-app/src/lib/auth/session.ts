import { auth } from '@/lib/auth/config'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'
import type { Session } from 'next-auth'

type AuthenticatedSession = Session & { user: NonNullable<Session['user']> & { id: string } }

export async function getSession(): Promise<AuthenticatedSession> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return session as unknown as AuthenticatedSession
}

export async function requireRole(role: string) {
  const session = await getSession()
  const userRole = (session.user as unknown as Record<string, unknown>).role as string
  if (userRole !== role && userRole !== 'admin') {
    throw new ForbiddenError(`Rolle "${role}" erforderlich`)
  }
  return session
}

export const ROLES = {
  ADMIN: 'admin',
  PLANER: 'planer',
  MONTEUR: 'monteur',
  BAULEITUNG: 'bauleitung',
  TECHNIKER: 'techniker',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]
