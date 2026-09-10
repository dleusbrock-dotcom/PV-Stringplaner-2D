import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as Record<string, unknown>).role as string,
  }

  return <AppShell user={user}>{children}</AppShell>
}
