import { z } from 'zod'

export const newProjectSchema = z.object({
  name: z.string().min(2, 'Projektname muss mindestens 2 Zeichen haben').max(100),
  description: z.string().max(500).optional(),
  // Customer
  customerName: z.string().min(2, 'Kundenname erforderlich').max(100),
  customerCompany: z.string().max(100).optional(),
  customerEmail: z.string().email('Gültige E-Mail-Adresse erforderlich').optional().or(z.literal('')),
  customerPhone: z.string().max(30).optional(),
  // Contact
  contactFirstName: z.string().max(50).optional(),
  contactLastName: z.string().max(50).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(30).optional(),
  // Site
  street: z.string().min(2, 'Straße erforderlich').max(100),
  houseNumber: z.string().max(10).optional(),
  postalCode: z.string().min(4, 'PLZ erforderlich').max(10),
  city: z.string().min(2, 'Stadt erforderlich').max(100),
  country: z.string().length(2).default('DE'),
})

export type NewProjectInput = z.infer<typeof newProjectSchema>

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'PLANNING', 'CONSTRUCTION', 'INSPECTION', 'COMPLETED', 'ARCHIVED']).optional(),
})

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
