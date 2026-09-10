'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Grid, List, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { uploadPhoto } from './actions'
import { toast } from '@/components/ui/toaster'

const PHOTO_CATEGORIES = [
  { id: 'before_installation', label: 'Vor Montage', required: true },
  { id: 'roof_view', label: 'Dachansicht', required: true },
  { id: 'meter_cabinet', label: 'Zählerschrank', required: true },
  { id: 'house_connection', label: 'Hausanschluss' },
  { id: 'module_field', label: 'Modulfeld', required: true },
  { id: 'cable_path', label: 'Kabelweg' },
  { id: 'inverter', label: 'Wechselrichter', required: true },
  { id: 'battery', label: 'Speicher' },
  { id: 'type_plates', label: 'Typenschilder' },
  { id: 'protection', label: 'Schutzmaßnahmen' },
  { id: 'completion', label: 'Abschluss', required: true },
]

interface PhotoViewProps {
  photos: Array<{
    id: string
    filename: string
    category: string
    caption: string | null
    storagePath: string
    createdAt: Date
    user: { name: string | null }
  }>
  projectId: string
  userId: string
}

export function PhotoView({ photos, projectId, userId }: PhotoViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'category'>('category')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photosByCategory = new Map<string, typeof photos>()
  photos.forEach((p) => {
    if (!photosByCategory.has(p.category)) photosByCategory.set(p.category, [])
    photosByCategory.get(p.category)!.push(p)
  })

  const requiredCategories = PHOTO_CATEGORIES.filter((c) => c.required)
  const missingRequired = requiredCategories.filter(
    (c) => !photosByCategory.has(c.id) || photosByCategory.get(c.id)!.length === 0
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)
        formData.append('userId', userId)
        formData.append('category', activeCategory ?? 'other')
        await uploadPhoto(formData)
      }
      toast({ title: `${files.length} Foto${files.length > 1 ? 's' : ''} gespeichert`, variant: 'success' })
    } catch {
      toast({ title: 'Fehler beim Upload', variant: 'error' })
    }
    setIsUploading(false)
    e.target.value = ''
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Fotodokumentation</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            {photos.length} Fotos · {missingRequired.length} Pflichtfotos fehlen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="compact"
            onClick={() => setViewMode(viewMode === 'grid' ? 'category' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="compact"
            onClick={() => fileInputRef.current?.click()}
            loading={isUploading}
          >
            <Camera className="w-4 h-4" />
            Foto
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Missing Required Photos */}
      {missingRequired.length > 0 && (
        <div className="p-3 rounded-[var(--radius)] bg-[var(--warning-soft)] border border-[var(--warning)]">
          <p className="text-xs font-semibold text-[var(--warning)] mb-1">Pflichtfotos fehlen:</p>
          <div className="flex flex-wrap gap-1">
            {missingRequired.map((c) => (
              <Badge key={c.id} variant="warning">{c.label}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Category View */}
      {viewMode === 'category' && (
        <div className="space-y-3">
          {PHOTO_CATEGORIES.map((cat) => {
            const catPhotos = photosByCategory.get(cat.id) ?? []
            const hasPhotos = catPhotos.length > 0

            return (
              <div
                key={cat.id}
                className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => {
                    setActiveCategory(cat.id)
                    fileInputRef.current?.click()
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      hasPhotos ? 'bg-[var(--ok-soft)]' : cat.required ? 'bg-[var(--danger-soft)]' : 'bg-[var(--line)]'
                    }`}
                  >
                    <ImageIcon
                      className={`w-4 h-4 ${
                        hasPhotos ? 'text-[var(--ok)]' : cat.required ? 'text-[var(--danger)]' : 'text-[var(--ink-faint)]'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-[var(--ink)]">{cat.label}</span>
                    {cat.required && !hasPhotos && (
                      <Badge variant="danger" className="ml-2">Pflicht</Badge>
                    )}
                  </div>
                  <span className="text-xs text-[var(--ink-faint)]">
                    {catPhotos.length} Fotos
                  </span>
                </button>

                {/* Photo Thumbnails */}
                {catPhotos.length > 0 && (
                  <div className="flex gap-2 p-3 pt-0 overflow-x-auto">
                    {catPhotos.slice(0, 5).map((photo) => (
                      <div
                        key={photo.id}
                        className="w-16 h-16 rounded-lg bg-[var(--line)] shrink-0 overflow-hidden flex items-center justify-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api${photo.storagePath}`}
                          alt={photo.caption ?? photo.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const t = e.currentTarget
                            t.style.display = 'none'
                            t.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-[var(--ink-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
                          }}
                        />
                      </div>
                    ))}
                    {catPhotos.length > 5 && (
                      <div className="w-16 h-16 rounded-lg bg-[var(--panel-2)] border border-[var(--line)] shrink-0 flex items-center justify-center text-xs font-bold text-[var(--ink-soft)]">
                        +{catPhotos.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square rounded-lg bg-[var(--line)] flex items-center justify-center overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api${photo.storagePath}`}
                alt={photo.caption ?? photo.filename}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          ))}
          {photos.length === 0 && (
            <div className="col-span-full text-center py-8 text-[var(--ink-soft)]">
              <Camera className="w-8 h-8 mx-auto mb-2 text-[var(--ink-faint)]" />
              <p>Noch keine Fotos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
