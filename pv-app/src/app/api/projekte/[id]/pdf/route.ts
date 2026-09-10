import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project, serialNumbers] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        site: true,
        createdBy: { select: { name: true, email: true } },
        roofAreas: {
          include: { _count: { select: { placements: true } } },
        },
        inverters: { select: { label: true, serialNumber: true, location: true } },
        checklists: {
          include: {
            template: { select: { name: true } },
            items: { orderBy: { templateItemId: 'asc' } },
          },
        },
        defects: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        signatures: { orderBy: { confirmedAt: 'asc' } },
        materials: {
          include: { materialItem: { select: { name: true, unit: true } } },
          orderBy: { materialItem: { name: 'asc' } },
        },
        _count: { select: { photos: true } },
      },
    }),
    prisma.serialNumber.findMany({
      where: { projectId: id },
      orderBy: { recordedAt: 'asc' },
    }),
  ])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Entwurf', PLANNING: 'Planung', CONSTRUCTION: 'Baustelle',
    INSPECTION: 'Abnahme', COMPLETED: 'Abgeschlossen', ARCHIVED: 'Archiviert',
  }
  const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Niedrig', MEDIUM: 'Mittel', HIGH: 'Hoch', CRITICAL: 'Kritisch',
  }
  const DEFECT_STATUS: Record<string, string> = {
    OPEN: 'Offen', IN_PROGRESS: 'In Bearbeitung', RESOLVED: 'Behoben', ACCEPTED: 'Akzeptiert',
  }
  const ITEM_STATUS: Record<string, string> = {
    OPEN: '☐', DONE: '☑', NOT_APPLICABLE: '—', LOCKED: '🔒',
  }

  const now = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const totalModules = project.roofAreas.reduce((s, a) => s + a._count.placements, 0)
  const openDefects = project.defects.filter((d) => d.status === 'OPEN').length

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abnahmeprotokoll – ${project.name}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a2e; line-height: 1.5; }
    h1 { font-size: 18pt; font-weight: bold; color: #0F5C8C; margin-bottom: 4px; }
    h2 { font-size: 12pt; font-weight: bold; color: #0F5C8C; border-bottom: 2px solid #0F5C8C; padding-bottom: 4px; margin: 20px 0 10px; }
    h3 { font-size: 10pt; font-weight: bold; margin: 12px 0 6px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #0F5C8C; }
    .brand-icon { width: 40px; height: 40px; background: #0F5C8C; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #E8A23D; font-size: 20px; }
    .brand-name { font-size: 14pt; font-weight: bold; color: #0F5C8C; }
    .brand-sub { font-size: 8pt; color: #666; }
    .meta { text-align: right; font-size: 9pt; color: #666; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: bold; background: #0F5C8C; color: white; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { background: #f0f4f8; text-align: left; padding: 6px 8px; font-size: 9pt; border: 1px solid #ddd; }
    td { padding: 5px 8px; font-size: 9pt; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) td { background: #fafbfc; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 9pt; }
    .info-label { color: #666; min-width: 100px; }
    .info-value { font-weight: 600; color: #1a1a2e; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
    .stat { text-align: center; background: #f0f4f8; border-radius: 6px; padding: 8px; }
    .stat-value { font-size: 20pt; font-weight: bold; color: #0F5C8C; }
    .stat-label { font-size: 8pt; color: #666; }
    .checklist-item { display: flex; gap: 8px; padding: 3px 0; font-size: 9pt; border-bottom: 1px dotted #eee; }
    .item-status { min-width: 20px; text-align: center; }
    .defect-card { border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin: 6px 0; }
    .defect-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .priority-critical { color: #dc2626; font-weight: bold; }
    .priority-high { color: #d97706; font-weight: bold; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 10px; }
    .sig-box { border: 1px solid #ccc; border-radius: 4px; padding: 12px; min-height: 80px; }
    .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 8pt; }
    .page-break { page-break-before: always; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 8pt; color: #999; }
    @media print { .no-print { display: none; } }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0F5C8C; color: white; border: none; border-radius: 6px; font-size: 12pt; cursor: pointer; z-index: 999; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Drucken / PDF</button>

  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      <div class="brand-icon">☀</div>
      <div>
        <div class="brand-name">PV-Stringplaner 2D</div>
        <div class="brand-sub">Abnahmeprotokoll</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>${project.number}</strong></div>
      <div><span class="status-badge">${STATUS_LABELS[project.status] ?? project.status}</span></div>
      <div style="margin-top:4px">Erstellt: ${now}</div>
    </div>
  </div>

  <h2>1. Projektinformationen</h2>
  <div class="grid-2">
    <div class="info-block">
      <h3>Projekt</h3>
      <div class="info-row"><span class="info-label">Bezeichnung:</span><span class="info-value">${project.name}</span></div>
      <div class="info-row"><span class="info-label">Nummer:</span><span class="info-value">${project.number}</span></div>
      ${project.description ? `<div class="info-row"><span class="info-label">Beschreibung:</span><span class="info-value">${project.description}</span></div>` : ''}
      ${project.completedAt ? `<div class="info-row"><span class="info-label">Abgeschlossen:</span><span class="info-value">${new Date(project.completedAt).toLocaleDateString('de-DE')}</span></div>` : ''}
    </div>
    <div class="info-block">
      <h3>Kunde &amp; Standort</h3>
      ${project.customer ? `<div class="info-row"><span class="info-label">Kunde:</span><span class="info-value">${project.customer.companyName ?? project.customer.name}</span></div>` : ''}
      ${project.site ? `<div class="info-row"><span class="info-label">Adresse:</span><span class="info-value">${project.site.street} ${project.site.houseNumber ?? ''}, ${project.site.postalCode} ${project.site.city}</span></div>` : ''}
      ${project.createdBy ? `<div class="info-row"><span class="info-label">Projektleiter:</span><span class="info-value">${project.createdBy.name ?? project.createdBy.email}</span></div>` : ''}
    </div>
  </div>

  <div class="stat-grid" style="margin-top:16px">
    <div class="stat"><div class="stat-value">${project.roofAreas.length}</div><div class="stat-label">Dachflächen</div></div>
    <div class="stat"><div class="stat-value">${totalModules}</div><div class="stat-label">Module</div></div>
    <div class="stat"><div class="stat-value">${project._count.photos}</div><div class="stat-label">Fotos</div></div>
    <div class="stat"><div class="stat-value" style="${openDefects > 0 ? 'color:#dc2626' : ''}">${openDefects}</div><div class="stat-label">Offene Mängel</div></div>
  </div>

  ${project.roofAreas.length > 0 ? `
  <h2>2. Dachflächen &amp; Module</h2>
  <table>
    <thead><tr><th>Dachfläche</th><th>Ausrichtung</th><th>Neigung</th><th>Raster</th><th>Module</th></tr></thead>
    <tbody>
      ${project.roofAreas.map((a) => `
      <tr>
        <td>${a.name}</td>
        <td>${a.orientation != null ? `${a.orientation}°` : '—'}</td>
        <td>${a.tiltAngle != null ? `${a.tiltAngle}°` : '—'}</td>
        <td>${a.gridRows} × ${a.gridCols}</td>
        <td>${a._count.placements}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${project.inverters.length > 0 ? `
  <h2>3. Wechselrichter</h2>
  <table>
    <thead><tr><th>Bezeichnung</th><th>Seriennummer</th><th>Standort</th></tr></thead>
    <tbody>
      ${project.inverters.map((inv) => `
      <tr>
        <td>${inv.label}</td>
        <td>${inv.serialNumber ?? '—'}</td>
        <td>${inv.location ?? '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${serialNumbers.length > 0 ? `
  <h2>4. Seriennummern</h2>
  <table>
    <thead><tr><th>Seriennummer</th><th>Position</th><th>Erfasst am</th></tr></thead>
    <tbody>
      ${serialNumbers.map((sn) => `
      <tr>
        <td style="font-family:monospace">${sn.serialNumber}</td>
        <td>${sn.position ?? '—'}</td>
        <td>${new Date(sn.recordedAt).toLocaleDateString('de-DE')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${project.checklists.length > 0 ? `
  <div class="page-break"></div>
  <h2>5. Prüfprotokolle</h2>
  ${project.checklists.map((cl) => `
  <div style="margin:8px 0">
    <h3>${cl.template.name}</h3>
    ${cl.items.map((item) => `
    <div class="checklist-item">
      <span class="item-status">${ITEM_STATUS[item.status] ?? '?'}</span>
      <span>${item.text}</span>
      ${item.comment ? `<span style="color:#666;font-size:8pt"> – ${item.comment}</span>` : ''}
    </div>`).join('')}
  </div>`).join('')}` : ''}

  ${project.materials.length > 0 ? `
  <h2>6. Material</h2>
  <table>
    <thead><tr><th>Material</th><th>Einheit</th><th>Soll</th><th>Ist</th><th>Abweichung</th></tr></thead>
    <tbody>
      ${project.materials.map((m) => {
        const diff = m.actualQty - m.plannedQty
        const diffStr = diff > 0 ? `+${diff}` : String(diff)
        const color = diff < 0 ? 'color:#dc2626' : diff > 0 ? 'color:#d97706' : ''
        return `
      <tr>
        <td>${m.materialItem.name}</td>
        <td>${m.materialItem.unit}</td>
        <td>${m.plannedQty}</td>
        <td>${m.actualQty}</td>
        <td style="${color}">${diff !== 0 ? diffStr : '✓'}</td>
      </tr>`
      }).join('')}
    </tbody>
  </table>` : ''}

  ${project.defects.length > 0 ? `
  <div class="page-break"></div>
  <h2>7. Mängel</h2>
  ${project.defects.map((d) => `
  <div class="defect-card">
    <div class="defect-header">
      <strong>${d.title}</strong>
      <span class="${d.priority === 'CRITICAL' ? 'priority-critical' : d.priority === 'HIGH' ? 'priority-high' : ''}">${PRIORITY_LABELS[d.priority]} · ${DEFECT_STATUS[d.status]}</span>
    </div>
    ${d.description ? `<div style="font-size:9pt;color:#444">${d.description}</div>` : ''}
    ${d.location ? `<div style="font-size:9pt;color:#666;margin-top:4px">📍 ${d.location}</div>` : ''}
    <div style="font-size:8pt;color:#999;margin-top:4px">Erfasst: ${new Date(d.createdAt).toLocaleDateString('de-DE')} von ${d.createdBy.name ?? '—'}</div>
  </div>`).join('')}` : ''}

  ${project.signatures.length > 0 ? `
  <div class="page-break"></div>
  <h2>8. Unterschriften</h2>
  <div class="sig-grid">
    ${project.signatures.map((sig) => `
    <div class="sig-box">
      <div style="font-size:9pt;font-weight:bold">${sig.signerName}</div>
      <div style="font-size:8pt;color:#666">${sig.signerRole}</div>
      ${sig.signatureData.startsWith('<svg') ? sig.signatureData : '<div style="font-size:7pt;color:#666">[Unterschrift vorhanden]</div>'}
      <div class="sig-line">${new Date(sig.confirmedAt).toLocaleDateString('de-DE')}</div>
    </div>`).join('')}
  </div>` : `
  <h2>8. Unterschriften</h2>
  <div class="sig-grid">
    ${['Monteur', 'Bauleiter', 'Kunde'].map((role) => `
    <div class="sig-box">
      <div style="font-size:8pt;color:#999">${role}</div>
      <div class="sig-line">Datum / Unterschrift</div>
    </div>`).join('')}
  </div>`}

  <div class="footer">
    <span>PV-Stringplaner 2D · Abnahmeprotokoll</span>
    <span>${project.number} · ${now}</span>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
