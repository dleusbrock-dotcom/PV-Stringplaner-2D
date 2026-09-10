'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, Move, MousePointer, Eraser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { placeModule, removeModule } from './actions'
import { toast } from '@/components/ui/toaster'

interface RoofCanvasProps {
  roofArea: {
    id: string
    name: string
    gridRows: number
    gridCols: number
    cellWidth: number
    cellHeight: number
    obstacles: Array<{
      id: string
      type: string
      label: string | null
      col: number
      row: number
      width: number
      height: number
    }>
    placements: Array<{
      id: string
      col: number
      row: number
      isPlan: boolean
      isEnabled: boolean
      stringAssignment: {
        id: string
        sortOrder: number
        label: string
        stringPlan: { id: string; color: string; name: string }
      } | null
    }>
  }
  projectId: string
  activeStringId: string | null
  strings: Array<{ id: string; color: string; name: string }>
  isLocked: boolean
}

type Tool = 'select' | 'place' | 'erase'

const OBSTACLE_COLORS: Record<string, string> = {
  WINDOW: '#8BA5BA',
  CHIMNEY: '#8B7355',
  VENT: '#7A8B70',
  SKYLIGHT: '#6A9BB4',
  ANTENNA: '#AAAAAA',
  LIGHTNING_ROD: '#B8860B',
  OTHER: '#999',
}

const OBSTACLE_LABELS: Record<string, string> = {
  WINDOW: 'Dachfenster',
  CHIMNEY: 'Schornstein',
  VENT: 'Entlüfter',
  SKYLIGHT: 'Lichtkuppel',
  ANTENNA: 'Antenne',
  LIGHTNING_ROD: 'Blitzschutz',
  OTHER: 'Sonstiges',
}

const CELL_SIZE = 44 // px per grid cell

export function RoofCanvas({
  roofArea,
  projectId,
  activeStringId,
  strings,
  isLocked,
}: RoofCanvasProps) {
  const [tool, setTool] = useState<Tool>('place')
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 20, y: 20 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [placements, setPlacements] = useState(roofArea.placements)
  const [isPointerDown, setIsPointerDown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update placements when roofArea changes
  useEffect(() => {
    setPlacements(roofArea.placements)
  }, [roofArea.placements])

  const cellPx = CELL_SIZE * zoom
  const activeString = strings.find((s) => s.id === activeStringId)

  const getGridPos = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return null
      const x = (clientX - rect.left - pan.x) / cellPx
      const y = (clientY - rect.top - pan.y) / cellPx
      const col = Math.floor(x)
      const row = Math.floor(y)
      if (col < 0 || col >= roofArea.gridCols || row < 0 || row >= roofArea.gridRows) return null
      return { col, row }
    },
    [pan, cellPx, roofArea.gridCols, roofArea.gridRows]
  )

  const handleCellAction = useCallback(
    async (col: number, row: number) => {
      if (isLocked) return

      const existing = placements.find((p) => p.col === col && p.row === row && p.isPlan)
      const isObstacle = roofArea.obstacles.some(
        (o) => col >= o.col && col < o.col + o.width && row >= o.row && row < o.row + o.height
      )
      if (isObstacle) return

      if (tool === 'place') {
        if (existing) return
        // Optimistic update
        const tempId = `temp-${col}-${row}`
        setPlacements((prev) => [
          ...prev,
          {
            id: tempId,
            col,
            row,
            isPlan: true,
            isEnabled: true,
            stringAssignment: null,
          },
        ])
        try {
          const result = await placeModule(roofArea.id, col, row)
          setPlacements((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, id: result.id } : p))
          )
        } catch {
          setPlacements((prev) => prev.filter((p) => p.id !== tempId))
          toast({ title: 'Fehler', description: 'Modul konnte nicht platziert werden.', variant: 'error' })
        }
      } else if (tool === 'erase' && existing) {
        // Optimistic remove
        setPlacements((prev) => prev.filter((p) => !(p.col === col && p.row === row && p.isPlan)))
        try {
          await removeModule(existing.id)
        } catch {
          setPlacements((prev) => [...prev, existing])
          toast({ title: 'Fehler', description: 'Modul konnte nicht entfernt werden.', variant: 'error' })
        }
      }
    },
    [isLocked, placements, roofArea.obstacles, roofArea.id, tool]
  )

  // Pan logic
  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === 'select') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } else {
      setIsPointerDown(true)
      const pos = getGridPos(e.clientX, e.clientY)
      if (pos) handleCellAction(pos.col, pos.row)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    } else if (isPointerDown && tool !== 'select') {
      const pos = getGridPos(e.clientX, e.clientY)
      if (pos) handleCellAction(pos.col, pos.row)
    }
  }

  const onPointerUp = () => {
    setIsPanning(false)
    setIsPointerDown(false)
  }

  const placementMap = new Map(
    placements.filter((p) => p.isPlan).map((p) => [`${p.col},${p.row}`, p])
  )

  const moduleCount = placements.filter((p) => p.isPlan).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--panel-2)] border-b border-[var(--line)]">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--line)] rounded-lg p-0.5">
          {(
            [
              { id: 'select' as Tool, icon: Move, label: 'Verschieben' },
              { id: 'place' as Tool, icon: MousePointer, label: 'Platzieren' },
              { id: 'erase' as Tool, icon: Eraser, label: 'Entfernen' },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={cn(
                'p-1.5 rounded text-xs transition-colors',
                tool === t.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              )}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon-sm"
            className="compact"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs font-mono w-10 text-center text-[var(--ink-soft)]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="icon-sm"
            className="compact"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Stats */}
        <div className="text-xs text-[var(--ink-soft)]">
          <span className="font-semibold text-[var(--ink)]">{moduleCount}</span>
          {' '}Module
          {' · '}
          {roofArea.gridRows}×{roofArea.gridCols} Raster
        </div>

        {/* Active String Indicator */}
        {activeString && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold text-white"
            style={{ background: activeString.color }}
          >
            <div className="w-2 h-2 rounded-full bg-white/40" />
            {activeString.name}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: tool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            position: 'absolute',
            transformOrigin: '0 0',
            userSelect: 'none',
          }}
        >
          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${roofArea.gridCols}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${roofArea.gridRows}, ${cellPx}px)`,
              gap: '1px',
              background: 'var(--line)',
              border: '1px solid var(--line-strong)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: roofArea.gridRows }).map((_, row) =>
              Array.from({ length: roofArea.gridCols }).map((_, col) => {
                const key = `${col},${row}`
                const placement = placementMap.get(key)
                const obstacle = roofArea.obstacles.find(
                  (o) =>
                    col >= o.col &&
                    col < o.col + o.width &&
                    row >= o.row &&
                    row < o.row + o.height
                )

                let bg = 'var(--bg)'
                let content = null

                if (obstacle) {
                  bg = OBSTACLE_COLORS[obstacle.type] ?? '#999'
                  if (col === Math.floor(obstacle.col) && row === Math.floor(obstacle.row)) {
                    content = (
                      <span
                        className="text-[8px] text-white font-medium leading-tight text-center"
                        style={{ fontSize: `${Math.max(8, cellPx * 0.18)}px` }}
                      >
                        {obstacle.label ?? OBSTACLE_LABELS[obstacle.type] ?? '?'}
                      </span>
                    )
                  }
                } else if (placement) {
                  const stringColor = placement.stringAssignment?.stringPlan.color
                  bg = stringColor ?? 'var(--accent-soft)'
                  content = (
                    <span
                      className="font-mono font-bold"
                      style={{
                        fontSize: `${Math.max(7, cellPx * 0.16)}px`,
                        color: stringColor ? '#fff' : 'var(--accent)',
                      }}
                    >
                      {placement.stringAssignment?.label ?? '■'}
                    </span>
                  )
                }

                return (
                  <div
                    key={key}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: placement ? '1px solid rgba(0,0,0,0.15)' : 'none',
                      transition: 'background 0.05s',
                    }}
                  >
                    {content}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
