'use client'

import { useState } from 'react'
import { FileText, Download, File, ExternalLink, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProjectDocument {
  id: string
  filename: string
  type: string
  storagePath: string
  sizeBytes: number | null
  generatedAt: Date
  isDraft: boolean
}

interface DocumentViewProps {
  documents: ProjectDocument[]
  projectId: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TYPE_LABELS: Record<string, string> = {
  pdf_report: 'Abnahmeprotokoll',
  plan: 'Anlagenplan',
  certificate: 'Zertifikat',
  other: 'Sonstiges',
}

export function DocumentView({ documents, projectId }: DocumentViewProps) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? documents
    : documents.filter((d) => d.type === filter)

  const types = ['all', ...Array.from(new Set(documents.map((d) => d.type)))]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Dokumente</h2>
          <p className="text-sm text-[var(--ink-soft)]">{documents.length} Dateien</p>
        </div>
      </div>

      {/* Filter chips */}
      {types.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === t
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--panel)] text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--accent)]'
              }`}
            >
              {t === 'all' ? 'Alle' : TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--ink-faint)]" />
          <p className="font-semibold text-[var(--ink)]">Keine Dokumente</p>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            Dokumente werden automatisch generiert (Abnahmeprotokoll, Anlagenübersicht).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                <File className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--ink)] truncate">{doc.filename}</p>
                <p className="text-xs text-[var(--ink-faint)]">
                  {doc.sizeBytes ? formatBytes(doc.sizeBytes) : '—'} · {new Date(doc.generatedAt).toLocaleDateString('de-DE')}
                  {doc.isDraft && ' · Entwurf'}
                </p>
              </div>
              <Badge variant="default">{TYPE_LABELS[doc.type] ?? doc.type}</Badge>
              <a
                href={doc.storagePath}
                download={doc.filename}
                className="p-2 rounded hover:bg-[var(--panel-2)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* PDF Generation */}
      <div className="rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4">
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-[var(--ink)]">Abnahmeprotokoll generieren</p>
            <p className="text-xs text-[var(--ink-soft)]">Druckbares PDF mit allen Projektdaten</p>
          </div>
          <a
            href={`/api/projekte/${projectId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Öffnen
          </a>
        </div>
      </div>
    </div>
  )
}
