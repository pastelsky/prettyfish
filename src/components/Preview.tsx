import { useRef } from 'react'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { exportSvg, exportPng } from '../lib/export'
import type { AppMode } from '../types'

interface PreviewProps {
  svg: string
  error: string | null
  mode: AppMode
}

export function Preview({ svg, error, mode }: PreviewProps) {
  const isDark = mode === 'dark'
  const previewBg = isDark ? '#1e1e2e' : '#f0f2f5'
  const transformRef = useRef<ReactZoomPanPinchRef>(null)

  const zoomBtnBase = `
    flex items-center justify-center w-8 h-8 rounded-lg transition-colors backdrop-blur-sm
  `
  const zoomBtnCls = isDark
    ? `${zoomBtnBase} bg-gray-800/80 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white`
    : `${zoomBtnBase} bg-white/80 border border-gray-200 text-gray-600 hover:bg-white hover:text-gray-900 shadow-sm`

  const svgBtnCls = isDark
    ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-700 backdrop-blur-sm transition-colors'
    : 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white/80 border-gray-200 text-gray-600 hover:bg-white shadow-sm backdrop-blur-sm transition-colors'

  return (
    // Full-bleed canvas
    <div className="w-full h-full relative" style={{ background: previewBg }}>

      {/* Zoom/export controls — floating bottom-right */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        {/* Zoom cluster */}
        <div className={`flex flex-col rounded-xl overflow-hidden border shadow-lg ${isDark ? 'border-gray-700' : 'border-gray-200 shadow-gray-200'}`}>
          <button onClick={() => transformRef.current?.zoomIn(0.4, 200)} className={zoomBtnCls} title="Zoom in" style={{borderRadius: 0}}>
            <ZoomInIcon />
          </button>
          <div className={isDark ? 'h-px bg-gray-700' : 'h-px bg-gray-200'} />
          <button onClick={() => transformRef.current?.zoomOut(0.4, 200)} className={zoomBtnCls} title="Zoom out" style={{borderRadius: 0}}>
            <ZoomOutIcon />
          </button>
          <div className={isDark ? 'h-px bg-gray-700' : 'h-px bg-gray-200'} />
          <button onClick={() => transformRef.current?.resetTransform(300)} className={zoomBtnCls} title="Fit to screen" style={{borderRadius: 0}}>
            <FitIcon />
          </button>
        </div>

        {/* Export buttons */}
        {svg && (
          <div className="flex flex-col gap-1.5">
            <button onClick={() => exportSvg(svg)} className={svgBtnCls} title="Download as SVG">
              <DownloadIcon /> SVG
            </button>
            <button
              onClick={() => exportPng(svg, previewBg)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-500 shadow-lg transition-colors backdrop-blur-sm"
              title="Download as PNG (2× retina)"
            >
              <DownloadIcon /> PNG
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className={`w-full max-w-lg rounded-xl p-4 border shadow-xl pointer-events-auto ${
            isDark ? 'bg-gray-900/95 border-red-800' : 'bg-white border-red-200'
          }`}>
            <p className="text-red-500 text-sm font-semibold mb-2">⚠ Syntax Error</p>
            <pre className="text-red-400 text-xs whitespace-pre-wrap break-words leading-relaxed">{error}</pre>
          </div>
        </div>
      ) : svg ? (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.1}
          maxScale={10}
          centerOnInit
          smooth
          wheel={{ step: 0.08, smoothStep: 0.003 }}
          panning={{ velocityDisabled: false }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Rendering…</p>
        </div>
      )}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ZoomInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
      <path d="M6.5 4.5v4M4.5 6.5h4" strokeLinecap="round" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
      <path d="M4.5 6.5h4" strokeLinecap="round" />
    </svg>
  )
}

function FitIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 5V2h3M12 2h3v3M1 11v3h3M12 14h3v-3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="4" width="8" height="8" rx="1" />
    </svg>
  )
}
