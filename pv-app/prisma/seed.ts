import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrator' },
  })
  const planerRole = await prisma.role.upsert({
    where: { name: 'planer' },
    update: {},
    create: { name: 'planer', description: 'Projektplaner' },
  })
  const monteurRole = await prisma.role.upsert({
    where: { name: 'monteur' },
    update: {},
    create: { name: 'monteur', description: 'Monteur / Techniker' },
  })
  await prisma.role.upsert({
    where: { name: 'bauleitung' },
    update: {},
    create: { name: 'bauleitung', description: 'Bauleitung' },
  })

  // Demo Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pv-planer.de' },
    update: {},
    create: {
      email: 'admin@pv-planer.de',
      name: 'Admin',
      passwordHash: await hash('demo1234', 12),
      roleId: adminRole.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'planer@pv-planer.de' },
    update: {},
    create: {
      email: 'planer@pv-planer.de',
      name: 'Hans Müller',
      passwordHash: await hash('demo1234', 12),
      roleId: planerRole.id,
    },
  })

  const monteurUser = await prisma.user.upsert({
    where: { email: 'monteur@pv-planer.de' },
    update: {},
    create: {
      email: 'monteur@pv-planer.de',
      name: 'Klaus Schmidt',
      passwordHash: await hash('demo1234', 12),
      roleId: monteurRole.id,
    },
  })

  // Component Library
  const solarModule = await prisma.componentLibraryItem.upsert({
    where: {
      manufacturer_model_version: {
        manufacturer: 'SolarTech',
        model: 'ST-400W',
        version: '1',
      },
    },
    update: {},
    create: {
      category: 'MODULE',
      manufacturer: 'SolarTech',
      model: 'ST-400W',
      peakPowerWp: 400,
      voltageVoc: 48.5,
      voltageVmp: 40.2,
      currentIsc: 10.4,
      currentImp: 9.95,
      efficiency: 20.8,
      dimensions: JSON.stringify({ width: 1772, height: 1133, depth: 35 }),
      weight: 21.5,
    },
  })

  const inverterModel = await prisma.componentLibraryItem.upsert({
    where: {
      manufacturer_model_version: {
        manufacturer: 'SunPower',
        model: 'SP-10K',
        version: '1',
      },
    },
    update: {},
    create: {
      category: 'INVERTER',
      manufacturer: 'SunPower',
      model: 'SP-10K',
      maxPowerW: 10000,
      mpptCount: 2,
      maxStringPerMppt: 2,
      minVoltage: 180,
      maxVoltage: 600,
      maxCurrentPerMppt: 12,
    },
  })

  // Checklist Templates
  const checklistTemplates = [
    {
      name: 'Unterkonstruktion',
      category: 'installation',
      items: [
        'Dachfläche auf Schäden geprüft',
        'Befestigungspunkte markiert',
        'Tragsystem montiert und ausgerichtet',
        'Alle Schrauben angezogen',
        'Abdichtung der Durchführungen geprüft',
      ],
    },
    {
      name: 'Module',
      category: 'installation',
      items: [
        'Modulanzahl gemäß Planung',
        'Alle Module unbeschädigt',
        'Module korrekt ausgerichtet',
        'Klemmverbindungen festgezogen',
        'Seriennummern erfasst',
      ],
    },
    {
      name: 'DC-Verkabelung',
      category: 'electrical',
      items: [
        'Kabelquerschnitte gemäß Planung',
        'Kabel gegen UV geschützt',
        'Stringlängen gemäß Plan',
        'Polarität geprüft',
        'Stecker ordnungsgemäß verbunden',
        'DC-Spannung gemessen',
      ],
    },
    {
      name: 'Wechselrichter',
      category: 'electrical',
      items: [
        'WR korrekt montiert',
        'AC-Anschluss geprüft',
        'DC-Eingang angeschlossen',
        'Überspannungsschutz vorhanden',
        'Inbetriebnahme dokumentiert',
      ],
    },
    {
      name: 'Inbetriebnahme',
      category: 'commissioning',
      items: [
        'Alle Sicherungen geprüft',
        'Isolationsmessung durchgeführt',
        'Leistung gemessen',
        'Monitoring aktiviert',
        'Protokoll erstellt',
      ],
    },
    {
      name: 'Kundeneinweisung',
      category: 'handover',
      items: [
        'Bedienung erklärt',
        'Sicherheitshinweise übergeben',
        'Dokumentation übergeben',
        'Kontaktdaten für Service übergeben',
        'Unterschrift des Kunden',
      ],
    },
  ]

  for (const template of checklistTemplates) {
    const existing = await prisma.checklistTemplate.findFirst({
      where: { name: template.name },
    })
    if (!existing) {
      await prisma.checklistTemplate.create({
        data: {
          name: template.name,
          category: template.category,
          items: {
            create: template.items.map((text, i) => ({
              text,
              sortOrder: i,
            })),
          },
        },
      })
    }
  }

  // Demo Project
  const existingProject = await prisma.project.findFirst({
    where: { number: 'PV-202601-DEMO' },
  })

  if (!existingProject) {
    const customer = await prisma.customer.create({
      data: {
        name: 'Maria Musterfrau',
        companyName: null,
        email: 'maria.musterfrau@beispiel.de',
        phone: '+49 89 123456',
      },
    })

    const contact = await prisma.contact.create({
      data: {
        customerId: customer.id,
        firstName: 'Maria',
        lastName: 'Musterfrau',
        email: 'maria.musterfrau@beispiel.de',
        phone: '+49 89 123456',
        role: 'Eigentümer',
      },
    })

    const site = await prisma.site.create({
      data: {
        street: 'Musterstraße',
        houseNumber: '42',
        postalCode: '80331',
        city: 'München',
        country: 'DE',
        latitude: 48.1351,
        longitude: 11.582,
      },
    })

    const project = await prisma.project.create({
      data: {
        number: 'PV-202601-DEMO',
        name: 'Demo – Einfamilienhaus München',
        description: 'Demo-Projekt zur Vorführung aller Funktionen',
        status: 'PLANNING',
        customerId: customer.id,
        contactId: contact.id,
        siteId: site.id,
        createdById: adminUser.id,
      },
    })

    // Roof Area with modules
    const roofArea = await prisma.roofArea.create({
      data: {
        projectId: project.id,
        name: 'Süddach',
        orientation: 180,
        tiltAngle: 30,
        gridRows: 6,
        gridCols: 10,
      },
    })

    // Place 20 modules
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 10; col++) {
        await prisma.modulePlacement.create({
          data: {
            roofAreaId: roofArea.id,
            col,
            row,
            isPlan: true,
            libraryItemId: solarModule.id,
          },
        })
      }
    }

    // Inverter
    const inverter = await prisma.inverterInstance.create({
      data: {
        projectId: project.id,
        label: 'WR-1 SunPower SP-10K',
        libraryItemId: inverterModel.id,
        mpptInputs: {
          create: [
            { inputNumber: 1, label: 'MPPT 1 (Süddach)', maxStrings: 1 },
            { inputNumber: 2, label: 'MPPT 2 (Süddach)', maxStrings: 1 },
          ],
        },
      },
      include: { mpptInputs: true },
    })

    // Strings
    const mppt1 = inverter.mpptInputs.find((m) => m.inputNumber === 1)!
    const mppt2 = inverter.mpptInputs.find((m) => m.inputNumber === 2)!

    const string1 = await prisma.stringPlan.create({
      data: {
        projectId: project.id,
        name: 'String 1',
        color: '#E63946',
        mpptInputId: mppt1.id,
        inverterInstanceId: inverter.id,
      },
    })

    const string2 = await prisma.stringPlan.create({
      data: {
        projectId: project.id,
        name: 'String 2',
        color: '#2A9D8F',
        mpptInputId: mppt2.id,
        inverterInstanceId: inverter.id,
      },
    })

    // Assign modules to strings
    const placements = await prisma.modulePlacement.findMany({
      where: { roofAreaId: roofArea.id, isPlan: true },
      orderBy: [{ row: 'asc' }, { col: 'asc' }],
    })

    const half = Math.ceil(placements.length / 2)
    for (let i = 0; i < placements.length; i++) {
      const stringPlan = i < half ? string1 : string2
      const sortOrder = i < half ? i : i - half
      const sNum = i < half ? '1' : '2'
      await prisma.stringModuleAssignment.create({
        data: {
          stringPlanId: stringPlan.id,
          modulePlacementId: placements[i].id,
          sortOrder,
          label: `S${sNum}-M${String(sortOrder + 1).padStart(2, '0')}`,
        },
      })
    }

    // Demo defect
    await prisma.defect.create({
      data: {
        projectId: project.id,
        createdById: monteurUser.id,
        title: 'Kabeldurchführung nicht abgedichtet',
        description: 'Am Durchgang durch die Dachhaut fehlt die Abdichtung.',
        category: 'Abdichtung',
        priority: 'CRITICAL',
        status: 'OPEN',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        projectId: project.id,
        userId: adminUser.id,
        entity: 'Project',
        entityId: project.id,
        action: 'create',
        changes: JSON.stringify({ name: project.name }),
      },
    })

    console.log(`✅ Demo-Projekt "${project.name}" erstellt`)
  }

  console.log('✅ Seeding abgeschlossen')
  console.log('\n📋 Demo-Zugänge:')
  console.log('  Admin:   admin@pv-planer.de  / demo1234')
  console.log('  Planer:  planer@pv-planer.de / demo1234')
  console.log('  Monteur: monteur@pv-planer.de / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
