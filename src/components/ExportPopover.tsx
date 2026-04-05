import { useState, useRef, useEffect, useCallback } from 'react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { ChromeTextButton, chromePopoverClass } from '@/components/ui/app-chrome'
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
  pageName: string
}

export function ExportPopover({ svg, code, previewBg, pageName }: ExportPopoverProps) {
  const [open, setOpen] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const [scale, setScale] = useState(2)
  const [exporting, setExporting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Derive directly during render — toFilename is a cheap pure function, no useMemo needed (rule 5.3)
  const defaultFilename = toFilename(pageName)
  const effectiveFilename = filename ?? defaultFilename

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    // Passive listener safe for mousedown (rule 4.2)
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMmd = useCallback(() => {
    posthog.capture('diagram_exported', { format: 'mmd' })
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${effectiveFilename || 'diagram'}.mmd`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }, [code, effectiveFilename])

  const handleSvg = useCallback(async () => {
    posthog.capture('diagram_exported', { format: 'svg' })
    setExporting(true)
    try { await exportSvg(svg, effectiveFilename || 'diagram') }
    finally { setExporting(false); setOpen(false) }
  }, [svg, effectiveFilename])

  const handlePng = useCallback(async () => {
    posthog.capture('diagram_exported', { format: 'png', scale })
    setExporting(true)
    try { await exportPng(svg, previewBg, effectiveFilename || 'diagram', scale) }
    finally { setExporting(false); setOpen(false) }
  }, [svg, previewBg, effectiveFilename, scale])

  // Stable toggle handler (rule 5.11 — use functional setState updates)
  const handleToggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) setFilename(null)
      return !prev
    })
  }, [])

  return (
    <div ref={ref} className="relative" data-testid="export-popover">
      <ChromeTextButton
        data-testid="export-trigger"
        onClick={handleToggle}
        className={cn(open && 'bg-black/5 text-zinc-900 dark:bg-white/8 dark:text-zinc-100')}
        disabled={!svg}
      >
        <DownloadSimple className="w-3 h-3" /> Export
      </ChromeTextButton>

      {open && (
        <div data-testid="export-panel" className={cn(
          'absolute top-full right-0 mt-2 z-50 p-2.5 animate-fade-up',
          chromePopoverClass(),
        )} style={{ width: '270px' }}>

          {/* Filename */}
          <input
            data-testid="export-filename-input"
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
              'flex flex-1 rounded-md overflow-hidden border border-black/8 dark:border-white/10',
            )}>
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  data-testid={scale === s.value ? 'export-scale-button-active' : 'export-scale-button'}
                  data-scale={String(s.value)}
                  onClick={() => setScale(s.value)}
                  style={{ fontSize: '12px' }}
                  className={cn(
                    'flex-1 py-1 font-medium cursor-pointer transition-colors border-r last:border-r-0',
                    'border-black/8 dark:border-white/10',
                    scale === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-black/3 hover:text-foreground dark:hover:bg-white/5',
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
              data-testid="export-mmd-button"
              variant="outline"
              size="sm"
              onClick={handleMmd}
              className="flex-1 h-7 gap-1.5"
              style={{ fontSize: '12px' }}
            >
              <DownloadSimple className="w-3 h-3" /> MMD
            </Button>
            <Button
              data-testid="export-svg-button"
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
              data-testid="export-png-button"
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
