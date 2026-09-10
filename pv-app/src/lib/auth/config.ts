import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/database/client'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as unknown as Record<string, unknown>).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as unknown as Record<string, unknown>).role = token.role
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAuthPage = nextUrl.pathname.startsWith('/login')
      const isApiRoute = nextUrl.pathname.startsWith('/api')
      const isPublicRoute =
        nextUrl.pathname === '/' ||
        nextUrl.pathname.startsWith('/qr/') ||
        isOnAuthPage

      if (isPublicRoute) return true
      if (isLoggedIn) return true
      if (isApiRoute) return false

      return false // Redirect to login
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { role: true },
        })

        if (!user || !user.passwordHash) return null

        // In production: use bcrypt.compare
        // For demo: simple comparison (CHANGE IN PRODUCTION)
        const { compare } = await import('bcryptjs')
        const isValid = await compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name ?? 'viewer',
        }
      },
    }),
  ],
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
