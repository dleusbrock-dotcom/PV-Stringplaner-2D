'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const ComponentSchema = z.object({
  category: z.enum(['MODULE', 'INVERTER', 'BATTERY', 'OPTIMIZER', 'OTHER']),
  manufacturer: z.string().min(1, 'Hersteller erforderlich'),
  model: z.string().min(1, 'Modell erforderlich'),
  version: z.string().default('1'),
  isActive: z.boolean().default(true),
  // Module
  peakPowerWp: z.number().positive().optional().nullable(),
  voltageVoc: z.number().positive().optional().nullable(),
  voltageVmp: z.number().positive().optional().nullable(),
  currentIsc: z.number().positive().optional().nullable(),
  currentImp: z.number().positive().optional().nullable(),
  efficiency: z.number().positive().max(100).optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  // Inverter
  maxPowerW: z.number().positive().optional().nullable(),
  mpptCount: z.number().int().positive().optional().nullable(),
  maxStringPerMppt: z.number().int().positive().optional().nullable(),
  minVoltage: z.number().positive().optional().nullable(),
  maxVoltage: z.number().positive().optional().nullable(),
  maxCurrentPerMppt: z.number().positive().optional().nullable(),
  // Battery
  capacityKwh: z.number().positive().optional().nullable(),
  maxChargeW: z.number().positive().optional().nullable(),
  maxDischargeW: z.number().positive().optional().nullable(),
})

function formToComponent(formData: FormData) {
  const num = (key: string) => {
    const v = formData.get(key)
    if (!v || v === '') return undefined
    const n = Number(v)
    return isNaN(n) ? undefined : n
  }

  return {
    category: formData.get('category') as string,
    manufacturer: formData.get('manufacturer') as string,
    model: formData.get('model') as string,
    version: (formData.get('version') as string) || '1',
    isActive: formData.get('isActive') !== 'false',
    peakPowerWp: num('peakPowerWp'),
    voltageVoc: num('voltageVoc'),
    voltageVmp: num('voltageVmp'),
    currentIsc: num('currentIsc'),
    currentImp: num('currentImp'),
    efficiency: num('efficiency'),
    weight: num('weight'),
    maxPowerW: num('maxPowerW'),
    mpptCount: num('mpptCount') ? Math.round(num('mpptCount')!) : undefined,
    maxStringPerMppt: num('maxStringPerMppt') ? Math.round(num('maxStringPerMppt')!) : undefined,
    minVoltage: num('minVoltage'),
    maxVoltage: num('maxVoltage'),
    maxCurrentPerMppt: num('maxCurrentPerMppt'),
    capacityKwh: num('capacityKwh'),
    maxChargeW: num('maxChargeW'),
    maxDischargeW: num('maxDischargeW'),
  }
}

export async function createLibraryItem(formData: FormData) {
  await getSession()
  const raw = formToComponent(formData)
  const validated = ComponentSchema.parse(raw)

  const item = await prisma.componentLibraryItem.create({ data: validated })
  revalidatePath('/bibliothek')
  return item
}

export async function updateLibraryItem(id: string, formData: FormData) {
  await getSession()
  const raw = formToComponent(formData)
  const validated = ComponentSchema.partial().parse(raw)

  const item = await prisma.componentLibraryItem.update({ where: { id }, data: validated })
  revalidatePath('/bibliothek')
  return item
}

export async function toggleLibraryItem(id: string, isActive: boolean) {
  await getSession()
  await prisma.componentLibraryItem.update({ where: { id }, data: { isActive } })
  revalidatePath('/bibliothek')
}

export async function deleteLibraryItem(id: string) {
  await getSession()
  // Soft-delete by deactivating
  await prisma.componentLibraryItem.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/bibliothek')
}
