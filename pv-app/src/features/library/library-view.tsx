'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Search, Zap, Battery, Sun, Settings, ToggleLeft, ToggleRight, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { createLibraryItem, toggleLibraryItem } from './library-actions'
import type { ComponentCategory } from '@prisma/client'

interface LibraryItem {
  id: string
  category: ComponentCategory
  manufacturer: string
  model: string
  version: string
  isActive: boolean
  peakPowerWp: number | null
  maxPowerW: number | null
  capacityKwh: number | null
  efficiency: number | null
  mpptCount: number | null
}

interface LibraryViewProps {
  items: LibraryItem[]
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  MODULE: 'Solarmodul',
  INVERTER: 'Wechselrichter',
  BATTERY: 'Speicher',
  OPTIMIZER: 'Optimizer',
  OTHER: 'Sonstiges',
}

const CATEGORY_ICONS: Record<ComponentCategory, React.ElementType> = {
  MODULE: Sun,
  INVERTER: Zap,
  BATTERY: Battery,
  OPTIMIZER: Settings,
  OTHER: Settings,
}

const CATEGORIES: ComponentCategory[] = ['MODULE', 'INVERTER', 'BATTERY', 'OPTIMIZER', 'OTHER']

function itemSpec(item: LibraryItem): string {
  if (item.category === 'MODULE' && item.peakPowerWp) return `${item.peakPowerWp} Wp${item.efficiency ? ` · ${item.efficiency}%` : ''}`
  if (item.category === 'INVERTER' && item.maxPowerW) return `${(item.maxPowerW / 1000).toFixed(1)} kW${item.mpptCount ? ` · ${item.mpptCount} MPPT` : ''}`
  if (item.category === 'BATTERY' && item.capacityKwh) return `${item.capacityKwh} kWh`
  return ''
}

function NewItemForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<ComponentCategory>('MODULE')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createLibraryItem(fd)
        toast({ title: 'Bauteil erstellt', variant: 'success' })
        onClose()
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--accent)] rounded-[var(--radius)] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--ink)]">Neues Bauteil</h3>
        <button onClick={onClose} className="text-[var(--ink-faint)] hover:text-[var(--ink)]"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-[var(--ink-soft)] mb-1 block">Kategorie</label>
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Hersteller *" name="manufacturer" placeholder="z. B. SMA" required />
          <Input label="Modell *" name="model" placeholder="z. B. Sunny Boy 5.0" required />
        </div>
        <Input label="Version" name="version" placeholder="1" defaultValue="1" />

        {category === 'MODULE' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Leistung (Wp)" name="peakPowerWp" type="number" step="0.01" placeholder="400" />
            <Input label="Wirkungsgrad (%)" name="efficiency" type="number" step="0.01" placeholder="21.5" />
            <Input label="Voc (V)" name="voltageVoc" type="number" step="0.01" />
            <Input label="Vmp (V)" name="voltageVmp" type="number" step="0.01" />
            <Input label="Isc (A)" name="currentIsc" type="number" step="0.01" />
            <Input label="Imp (A)" name="currentImp" type="number" step="0.01" />
            <Input label="Gewicht (kg)" name="weight" type="number" step="0.01" />
          </div>
        )}

        {category === 'INVERTER' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max. Leistung (W)" name="maxPowerW" type="number" step="1" placeholder="5000" />
            <Input label="Anzahl MPPT" name="mpptCount" type="number" step="1" placeholder="2" />
            <Input label="Strings pro MPPT" name="maxStringPerMppt" type="number" step="1" placeholder="2" />
            <Input label="Min. Spannung (V)" name="minVoltage" type="number" step="1" />
            <Input label="Max. Spannung (V)" name="maxVoltage" type="number" step="1" placeholder="1000" />
            <Input label="Max. Strom/MPPT (A)" name="maxCurrentPerMppt" type="number" step="0.1" />
          </div>
        )}

        {category === 'BATTERY' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kapazität (kWh)" name="capacityKwh" type="number" step="0.1" placeholder="10" />
            <Input label="Max. Ladeleistung (W)" name="maxChargeW" type="number" step="1" />
            <Input label="Max. Entladeleistung (W)" name="maxDischargeW" type="number" step="1" />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" size="sm" disabled={isPending}>
            {isPending ? 'Speichern…' : 'Speichern'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Abbrechen</Button>
        </div>
      </form>
    </div>
  )
}

export function LibraryView({ items }: LibraryViewProps) {
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('')
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = items.filter((item) => {
    if (!showInactive && !item.isActive) return false
    if (activeCategory !== 'ALL' && item.category !== activeCategory) return false
    const q = filter.toLowerCase()
    return (
      !q ||
      item.manufacturer.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q)
    )
  })

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      try {
        await toggleLibraryItem(id, !current)
        toast({ title: current ? 'Deaktiviert' : 'Aktiviert', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h1 className="font-bold text-[var(--ink)] text-lg">Bauteilbibliothek</h1>
          <p className="text-xs text-[var(--ink-soft)]">{items.filter((i) => i.isActive).length} aktive Bauteile</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Neues Bauteil
        </Button>
      </div>

      {showForm && <NewItemForm onClose={() => setShowForm(false)} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(['ALL', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === cat
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {cat === 'ALL' ? 'Alle' : CATEGORY_LABELS[cat]}
          </button>
        ))}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`ml-auto px-3 py-1 rounded-full text-xs transition-colors ${
            showInactive ? 'bg-[var(--warning)] text-white' : 'bg-[var(--line)] text-[var(--ink-soft)]'
          }`}
        >
          {showInactive ? 'Inkl. inaktiv' : 'Nur aktiv'}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
        <input
          type="text"
          placeholder="Hersteller oder Modell suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--ink)] placeholder-[var(--ink-faint)]"
        />
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--ink-faint)]">
          <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Bauteile gefunden</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((item) => {
            const Icon = CATEGORY_ICONS[item.category]
            const spec = itemSpec(item)
            return (
              <div
                key={item.id}
                className={`bg-[var(--panel)] border rounded-[var(--radius)] p-3 flex items-center gap-3 ${
                  item.isActive ? 'border-[var(--line)]' : 'border-[var(--line)] opacity-50'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-soft, color-mix(in srgb, var(--accent) 15%, transparent))' }}
                >
                  <Icon className="w-4.5 h-4.5 text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--ink)] truncate">{item.manufacturer} {item.model}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--ink-faint)]">{CATEGORY_LABELS[item.category]}</span>
                    {spec && <span className="text-[10px] text-[var(--accent)] font-medium">{spec}</span>}
                    {item.version !== '1' && <span className="text-[10px] text-[var(--ink-faint)]">v{item.version}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(item.id, item.isActive)}
                  disabled={isPending}
                  className="shrink-0 text-[var(--ink-faint)] hover:text-[var(--accent)] transition-colors"
                  title={item.isActive ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {item.isActive
                    ? <ToggleRight className="w-5 h-5 text-[var(--ok)]" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
