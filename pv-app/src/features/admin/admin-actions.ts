'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await getSession()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  })
  if (user?.role?.name !== 'Admin') {
    throw new Error('Admin-Berechtigung erforderlich')
  }
  return session
}

export async function createUser(formData: FormData) {
  await requireAdmin()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const roleName = (formData.get('role') as string) ?? 'Monteur'

  if (!email || !password) throw new Error('E-Mail und Passwort erforderlich')
  if (password.length < 8) throw new Error('Passwort zu kurz (min. 8 Zeichen)')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('E-Mail bereits vergeben')

  const passwordHash = await bcrypt.hash(password, 12)

  // Ensure role exists
  const role = await prisma.role.upsert({
    where: { name: roleName },
    create: { name: roleName },
    update: {},
  })

  await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash,
      roleId: role.id,
    },
  })

  revalidatePath('/admin')
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await requireAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: active },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entity: 'User',
      entityId: userId,
      action: active ? 'ACTIVATE' : 'DEACTIVATE',
    },
  }).catch(() => {/* non-fatal */})

  revalidatePath('/admin')
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin()

  if (newPassword.length < 8) throw new Error('Passwort zu kurz (min. 8 Zeichen)')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  revalidatePath('/admin')
}
