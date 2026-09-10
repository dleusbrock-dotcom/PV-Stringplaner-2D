'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { generateProjectNumber } from '@/lib/utils'
import { newProjectSchema, type NewProjectInput } from './schemas'
import { ValidationError } from '@/lib/errors'
import type { ProjectStatus } from '@prisma/client'

export async function createProject(input: NewProjectInput) {
  const session = await getSession()

  const parsed = newProjectSchema.safeParse(input)
  if (!parsed.success) {
    throw new ValidationError('Ungültige Eingabedaten', parsed.error.flatten())
  }

  const data = parsed.data

  // Create customer
  const customer = await prisma.customer.create({
    data: {
      name: data.customerName,
      companyName: data.customerCompany || null,
      email: data.customerEmail || null,
      phone: data.customerPhone || null,
    },
  })

  // Create contact if provided
  let contactId: string | null = null
  if (data.contactFirstName && data.contactLastName) {
    const contact = await prisma.contact.create({
      data: {
        customerId: customer.id,
        firstName: data.contactFirstName,
        lastName: data.contactLastName,
        email: data.contactEmail || null,
        phone: data.contactPhone || null,
      },
    })
    contactId = contact.id
  }

  // Create site
  const site = await prisma.site.create({
    data: {
      street: data.street,
      houseNumber: data.houseNumber || null,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
    },
  })

  // Create project
  const project = await prisma.project.create({
    data: {
      number: generateProjectNumber(),
      name: data.name,
      description: data.description || null,
      customerId: customer.id,
      contactId,
      siteId: site.id,
      createdById: session.user.id,
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      projectId: project.id,
      userId: session.user.id,
      entity: 'Project',
      entityId: project.id,
      action: 'create',
      changes: { name: data.name },
    },
  })

  revalidatePath('/projekte')
  redirect(`/projekte/${project.id}`)
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const session = await getSession()

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Projekt nicht gefunden')

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : project.completedAt,
    },
  })

  await prisma.auditLog.create({
    data: {
      projectId,
      userId: session.user.id,
      entity: 'Project',
      entityId: projectId,
      action: 'status_change',
      changes: { from: project.status, to: status },
    },
  })

  revalidatePath(`/projekte/${projectId}`)
}
