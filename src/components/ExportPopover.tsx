import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DownloadSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { exportSvg, exportPng } from '@/lib/export'

const SCALES = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '4×', value: 4 },
]

function toFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '')      // trim leading/trailing hyphens
    || 'diagram'
}

interface ExportPopoverProps {
  svg: string
  code: string
  previewBg: string
  isDark: boolean
  pageName: string
}

export function ExportPopover({ svg, code, previewBg, isDark, pageName }: ExportPopoverProps) {
  const [open, setOpen] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const [scale, setScale] = useState(2)
  const [exporting, setExporting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const defaultFilename = useMemo(() => toFilename(pageName), [pageName])
  const effectiveFilename = filename ?? defaultFilename

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMmd = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${effectiveFilename || 'diagram'}.mmd`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const handleSvg = async () => {
    setExporting(true)
    try { await exportSvg(svg, effectiveFilename || 'diagram') }
    finally { setExporting(false); setOpen(false) }
  }

  const handlePng = async () => {
    setExporting(true)
    try { await exportPng(svg, previewBg, effectiveFilename || 'diagram', scale) }
    finally { setExporting(false); setOpen(false) }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        onClick={() => {
          if (!open) setFilename(null)
          setOpen(!open)
        }}
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 px-2 text-xs gap-1 rounded-lg font-medium',
          open && (isDark ? 'bg-white/8' : 'bg-black/5'),
        )}
        disabled={!svg}
      >
        <DownloadSimple className="w-3 h-3" /> Export
      </Button>

      {open && (
        <div className={cn(
          'absolute top-full right-0 mt-2 z-50 rounded-xl border p-2.5 animate-fade-up',
          isDark
            ? 'bg-[oklch(0.18_0.015_260)] border-white/10'
            : 'bg-white border-black/8',
        )} style={{ width: '270px' }}>

          {/* Filename */}
          <input
            value={effectiveFilename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="filename"
            style={{ fontSize: '12px' }}
            className={cn(
              'w-full px-2.5 py-1.5 rounded-md border mb-2',
              'border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary',
            )}
          />

          {/* PNG scale */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-muted-foreground shrink-0" style={{ fontSize: '12px' }}>Scale</span>
            <div className={cn(
              'flex flex-1 rounded-md overflow-hidden border',
              isDark ? 'border-white/10' : 'border-black/8',
            )}>
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScale(s.value)}
                  style={{ fontSize: '12px' }}
                  className={cn(
                    'flex-1 py-1 font-medium cursor-pointer transition-colors border-r last:border-r-0',
                    isDark ? 'border-white/10' : 'border-black/8',
                    scale === s.value
                      ? 'bg-primary text-primary-foreground'
                      : (isDark ? 'text-muted-foreground hover:bg-white/5 hover:text-foreground' : 'text-muted-foreground hover:bg-black/3 hover:text-foreground'),
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export buttons — identical style */}
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMmd}
              className="flex-1 h-7 gap-1.5"
              style={{ fontSize: '12px' }}
            >
              <DownloadSimple className="w-3 h-3" /> MMD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSvg}
              disabled={exporting}
              className="flex-1 h-7 gap-1.5"
              style={{ fontSize: '12px' }}
            >
              <DownloadSimple className="w-3 h-3" /> SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePng}
              disabled={exporting}
              className="flex-1 h-7 gap-1.5"
              style={{ fontSize: '12px' }}
            >
              <DownloadSimple className="w-3 h-3" /> {exporting ? '…' : 'PNG'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
