import { useState, useRef, useCallback } from 'react'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Minus, Plus, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { AppMode } from '../types'
import type { RefObject } from 'react'

interface CanvasProps {
  svg: string
  hasError: boolean
  mode: AppMode
  sidebarOpen: boolean
  sidebarWidth: number | null
  docsOpen?: boolean
  isMobile?: boolean
  transformRef: RefObject<ReactZoomPanPinchRef | null>
}

const SIDEBAR_GAP = 16 + 16 // left-4 margin + gap before content
const DOCS_WIDTH = 288 + 16 + 16 // w-72 + right-4 + gap
const FIT_PADDING = 48 // px padding around diagram when fitting

export function Canvas({ svg, hasError, mode, sidebarOpen, sidebarWidth, docsOpen, isMobile = false, transformRef }: CanvasProps) {
  const isDark = mode === 'dark'
  const previewBg = isDark ? '#0f1019' : '#f0f1f5'
  const [isPanning, setIsPanning] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Dot grid pattern
  const dotColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)'
  const backgroundStyle: React.CSSProperties = {
    background: previewBg,
    backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
    backgroundSize: '22px 22px',
  }

  // Calculate pixel offset of the left edge of the visible canvas area
  const getSidebarPixelWidth = useCallback((): number => {
    if (isMobile || !sidebarOpen) return 0
    if (sidebarWidth) return sidebarWidth + SIDEBAR_GAP
    // Parse clamp default — use the actual rendered sidebar width via DOM if possible
    const el = document.querySelector('[data-sidebar-panel]') as HTMLElement | null
    if (el) return el.offsetWidth + SIDEBAR_GAP
    // Fallback: 34vw clamped to 320-480
    const vwBased = window.innerWidth * 0.34
    return Math.min(480, Math.max(320, vwBased)) + SIDEBAR_GAP
  }, [sidebarOpen, sidebarWidth, isMobile])

  const fitToArea = useCallback(() => {
    const api = transformRef.current
    if (!api || !wrapperRef.current) return

    // Get SVG element dimensions
    const svgEl = wrapperRef.current.querySelector('svg')
    if (!svgEl) {
      api.resetTransform(300)
      return
    }

    const svgW = svgEl.scrollWidth || svgEl.getBoundingClientRect().width
    const svgH = svgEl.scrollHeight || svgEl.getBoundingClientRect().height
    if (!svgW || !svgH) {
      api.resetTransform(300)
      return
    }

    // Total canvas dimensions
    const canvasW = wrapperRef.current.offsetWidth
    const canvasH = wrapperRef.current.offsetHeight

    // The available area: left edge after sidebar, right edge before docs panel
    const leftOffset = getSidebarPixelWidth()
    const rightOffset = docsOpen ? DOCS_WIDTH : 0
    const availW = canvasW - leftOffset - rightOffset - FIT_PADDING * 2
    const availH = canvasH - FIT_PADDING * 2

    if (availW <= 0 || availH <= 0) {
      api.resetTransform(300)
      return
    }

    // Scale to fit
    const scale = Math.min(availW / svgW, availH / svgH, 1) // don't scale up beyond 1:1
    const scaledW = svgW * scale
    const scaledH = svgH * scale

    // Center of available area
    const centerX = leftOffset + (availW / 2) + FIT_PADDING
    const centerY = canvasH / 2

    // positionX/Y = where the top-left of the content div should be
    // The content is centered (flex items-center justify-center on the full canvas)
    // So we need to offset from the canvas center to the available center
    const canvasCenterX = canvasW / 2
    const canvasCenterY = canvasH / 2

    // SVG is centered in the content div, which is the full canvas size
    // At scale=1, SVG top-left = canvasCenter - svgSize/2
    // After transform(x, y, scale): rendered SVG top-left = x + (canvasCenter - svgW/2) * scale
    // We want rendered SVG center at (centerX, centerY):
    //   x + (canvasCenterX - svgW/2) * scale + scaledW/2 = centerX
    //   x = centerX - scaledW/2 - (canvasCenterX - svgW/2) * scale

    const x = centerX - scaledW / 2 - (canvasCenterX - svgW / 2) * scale
    const y = centerY - scaledH / 2 - (canvasCenterY - svgH / 2) * scale

    api.setTransform(x, y, scale, 300)
  }, [transformRef, getSidebarPixelWidth, docsOpen])

  // Expose fitToArea as the "fit" action on the ref for keyboard shortcuts
  // The transformRef is passed in from App; we piggyback on it by patching the Fit button only

  // Compute left offset for zoom controls
  const leftStyle = sidebarOpen
    ? (sidebarWidth ? `${sidebarWidth + 32}px` : 'calc(16px + clamp(320px, 34vw, 480px) + 16px)')
    : '0'

  return (
    <div className="w-full h-full relative" style={{ ...backgroundStyle, touchAction: 'none' }} ref={wrapperRef}>

      {/* Zoom controls — centered in visible canvas (after sidebar) */}
      <div
        className="absolute bottom-4 z-10 flex justify-center transition-[left] duration-200"
        style={isMobile
          ? { left: '0', right: '0' }
          : { left: leftStyle, right: docsOpen ? `${DOCS_WIDTH + 8}px` : '0' }
        }
      >
        <div className={cn(
          'flex items-center rounded-lg overflow-hidden border',
          isDark
            ? 'bg-[oklch(0.18_0.015_260)] border-white/8'
            : 'bg-white border-black/8',
        )}>
          <Tooltip>
            <TooltipTrigger>
              <Button
                onClick={() => transformRef.current?.zoomOut(0.4, 200)}
                variant="ghost"
                size="icon-sm"
                className="rounded-none"
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out (⌘-)</TooltipContent>
          </Tooltip>

          <div className={cn('w-px h-4', isDark ? 'bg-white/8' : 'bg-black/8')} />

          <Tooltip>
            <TooltipTrigger>
              <Button
                onClick={fitToArea}
                variant="ghost"
                size="sm"
                className="rounded-none h-7 px-2 text-xs font-mono font-medium"
              >
                Fit
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to screen (⌘0)</TooltipContent>
          </Tooltip>

          <div className={cn('w-px h-4', isDark ? 'bg-white/8' : 'bg-black/8')} />

          <Tooltip>
            <TooltipTrigger>
              <Button
                onClick={() => transformRef.current?.zoomIn(0.4, 200)}
                variant="ghost"
                size="icon-sm"
                className="rounded-none"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in (⌘+)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Warning className={cn(
            'w-8 h-8',
            isDark ? 'text-red-400/30' : 'text-red-400/40',
          )} />
          <p className={cn(
            'text-xs font-medium',
            isDark ? 'text-red-400/40' : 'text-red-400/50',
          )}>
            Fix errors in the editor
          </p>
        </div>
      ) : svg ? (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.05}
          maxScale={20}
          limitToBounds={false}
          centerOnInit={false}
          smooth
          wheel={{ step: 0.1, smoothStep: 0.005 }}
          pinch={{ step: 30 }}
          panning={{ velocityDisabled: false, excluded: [] }}
          onPanningStart={() => setIsPanning(true)}
          onPanningStop={() => setIsPanning(false)}
        >
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
              cursor: isPanning ? 'grabbing' : 'grab',
              overflow: 'visible',
            }}
            contentStyle={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full border-2 border-t-primary animate-spin',
            isDark ? 'border-white/10' : 'border-black/10',
          )} />
          <p className="text-xs text-muted-foreground font-medium tracking-wide">Rendering…</p>
        </div>
      )}
    </div>
  )
}
