import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { KeyboardHelp } from './components/KeyboardHelp'
import { ReferenceDocs, type ReferenceDocsHandle } from './components/ReferenceDocs'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useMermaidRenderer } from './hooks/useMermaidRenderer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './lib/storage'
import { decodeStateFromHash } from './lib/share'
import { DEFAULT_DIAGRAM, DEFAULT_DIAGRAM_CONFIG, createPage, resolveConfig } from './types'
import type { AppMode, AppState, MermaidTheme, DiagramPage, DiagramConfig, DiagramConfigOverrides } from './types'
import { CUSTOM_THEME_PRESETS } from './lib/themePresets'
import { useIsMobile } from './hooks/useIsMobile'

function getInitialState() {
  const fromHash = decodeStateFromHash()
  const defaultPage = createPage('Untitled Catch', DEFAULT_DIAGRAM)
  return {
    pages: fromHash?.pages ?? loadFromStorage<DiagramPage[]>(STORAGE_KEYS.pages, [defaultPage]),
    activePageId: fromHash?.activePageId ?? loadFromStorage<string>(STORAGE_KEYS.activePageId, defaultPage.id),
    mode: fromHash?.mode ?? loadFromStorage<AppMode>(STORAGE_KEYS.mode,
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
    ),
    mermaidTheme: fromHash?.mermaidTheme ?? loadFromStorage<MermaidTheme>(STORAGE_KEYS.mermaidTheme, 'default'),
    diagramConfig: fromHash?.diagramConfig ?? loadFromStorage<DiagramConfig>(STORAGE_KEYS.diagramConfig, DEFAULT_DIAGRAM_CONFIG),
    editorLigatures: loadFromStorage<boolean>(STORAGE_KEYS.editorLigatures, true),
    autoFormat: loadFromStorage<boolean>(STORAGE_KEYS.autoFormat, true),
  }
}

const initial = getInitialState()
if (initial.pages.length === 0) {
  const p = createPage('Untitled Catch', DEFAULT_DIAGRAM)
  initial.pages = [p]
  initial.activePageId = p.id
}

export default function App() {
  const [pages, setPages] = useState<DiagramPage[]>(initial.pages)
  const [activePageId, setActivePageId] = useState<string>(initial.activePageId)
  const [mode, setMode] = useState<AppMode>(initial.mode)
  // Legacy global state — only used as fallback for old saved pages without per-page config
  const [globalMermaidTheme] = useState<MermaidTheme>(initial.mermaidTheme)
  const [editorLigatures, setEditorLigatures] = useState<boolean>(initial.editorLigatures)
  const [autoFormat, setAutoFormat] = useState<boolean>(initial.autoFormat)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [docsOpen, setDocsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const insertRef = useRef<((text: string) => void) | null>(null)
  const handleInsertReady = useCallback((fn: (text: string) => void) => { insertRef.current = fn }, [])
  const referenceDocsRef = useRef<ReferenceDocsHandle>(null)
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem('diagram-studio:sidebar-width')
      return stored ? Number(stored) : null
    } catch { return null }
  })

  const SIDEBAR_MIN = 300
  const SIDEBAR_MAX = 600

  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const editorFocusRef = useRef<(() => void) | null>(null)
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const currentWidth = sidebarWidth ?? (window.innerWidth * 0.34)
    sidebarResizeRef.current = { startX: e.clientX, startW: currentWidth }

    const onMove = (ev: MouseEvent) => {
      if (!sidebarResizeRef.current) return
      const delta = ev.clientX - sidebarResizeRef.current.startX
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarResizeRef.current.startW + delta))
      setSidebarWidth(next)
      try { sessionStorage.setItem('diagram-studio:sidebar-width', String(next)) } catch { /* ignore */ }
    }
    const onUp = () => {
      sidebarResizeRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0]!

  // Per-page theme (fall back to global for legacy pages)
  const mermaidTheme = activePage?.mermaidTheme ?? globalMermaidTheme

  // Resolve effective config: defaults → theme preset → user overrides
  const themePreset = CUSTOM_THEME_PRESETS[mermaidTheme]
  const diagramConfig = resolveConfig(
    themePreset?.configOverrides,
    activePage?.configOverrides,
    activePage?.diagramConfig, // legacy compat
  )

  const setMermaidTheme = useCallback((theme: MermaidTheme) => {
    // When switching themes, clear user overrides so the new theme's defaults take effect
    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, mermaidTheme: theme, configOverrides: {}, diagramConfig: undefined } : p))
  }, [activePageId])

  const setDiagramConfig = useCallback((config: DiagramConfig) => {
    // Compute what the user changed vs. the theme's resolved defaults
    const baseConfig = resolveConfig(themePreset?.configOverrides)
    const overrides: DiagramConfigOverrides = {}

    // Top-level primitives
    if (config.look !== baseConfig.look) overrides.look = config.look
    if (config.fontFamily !== baseConfig.fontFamily) overrides.fontFamily = config.fontFamily
    if (config.fontSize !== baseConfig.fontSize) overrides.fontSize = config.fontSize

    // Nested objects — only store changed keys
    for (const section of ['themeVariables', 'flowchart', 'sequence', 'gantt'] as const) {
      const base = baseConfig[section] as Record<string, unknown>
      const curr = config[section] as Record<string, unknown>
      const diff: Record<string, unknown> = {}
      let hasDiff = false
      for (const key of Object.keys(curr)) {
        if (curr[key] !== base[key]) { diff[key] = curr[key]; hasDiff = true }
      }
      if (hasDiff) (overrides as Record<string, unknown>)[section] = diff
    }

    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, configOverrides: overrides, diagramConfig: undefined } : p))
  }, [activePageId, themePreset])

  const isDark = mode === 'dark'
  const previewBg = isDark ? '#0f1019' : '#f0f1f5'

  // Persist
  useEffect(() => saveToStorage(STORAGE_KEYS.pages, pages), [pages])
  useEffect(() => saveToStorage(STORAGE_KEYS.activePageId, activePageId), [activePageId])
  useEffect(() => saveToStorage(STORAGE_KEYS.mode, mode), [mode])
  useEffect(() => saveToStorage(STORAGE_KEYS.editorLigatures, editorLigatures), [editorLigatures])
  useEffect(() => saveToStorage(STORAGE_KEYS.autoFormat, autoFormat), [autoFormat])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  const updateCode = useCallback((code: string) => {
    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, code } : p))
  }, [activePageId])

  const addPage = useCallback((): string => {
    const p = createPage('Untitled Catch', '')
    setPages((prev) => [...prev, p])
    setActivePageId(p.id)
    return p.id
  }, [])

  const renamePage = useCallback((id: string, name: string) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, name } : p))
  }, [])

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const deletePage = useCallback((id: string) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((p) => p.id !== id)
      if (id === activePageId) setActivePageId(next[Math.max(0, prev.findIndex(p => p.id === id) - 1)]!.id)
      return next
    })
  }, [activePageId])

  const goToNextPage = useCallback(() => {
    const idx = pages.findIndex((p) => p.id === activePageId)
    const next = pages[(idx + 1) % pages.length]
    if (next) setActivePageId(next.id)
  }, [pages, activePageId])

  const goToPrevPage = useCallback(() => {
    const idx = pages.findIndex((p) => p.id === activePageId)
    const prev = pages[(idx - 1 + pages.length) % pages.length]
    if (prev) setActivePageId(prev.id)
  }, [pages, activePageId])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      if (!v && isMobile) setDocsOpen(false) // close docs when opening sidebar on mobile
      return !v
    })
  }, [isMobile])
  const toggleMode = useCallback(() => setMode((m) => m === 'dark' ? 'light' : 'dark'), [])
  const focusEditor = useCallback(() => {
    setSidebarOpen(true)
    setTimeout(() => editorFocusRef.current?.(), 50)
  }, [])

  useKeyboardShortcuts({
    transformRef,
    onToggleEditor: toggleSidebar,
    onNewPage: addPage,
    onNextPage: goToNextPage,
    onPrevPage: goToPrevPage,
    onOpenExport: () => {}, // Export is now inline in header
    onToggleMode: toggleMode,
    onOpenHelp: () => setHelpOpen(true),
    onFocusEditor: focusEditor,
  })

  const { svg, error } = useMermaidRenderer(activePage.code, mermaidTheme, diagramConfig)

  const getState = useCallback((): AppState => ({
    pages, activePageId, mode, mermaidTheme, diagramConfig, editorLigatures,
  }), [pages, activePageId, mode, mermaidTheme, diagramConfig, editorLigatures])

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-bleed canvas */}
      <ErrorBoundary label="Canvas rendering failed">
        <Canvas
          svg={svg}
          hasError={!!error}
          mode={mode}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
          docsOpen={docsOpen}
          isMobile={isMobile}
          transformRef={transformRef}
        />
      </ErrorBoundary>

      {/* Floating header */}
      <Header
        pageName={activePage?.name ?? 'diagram'}
        mode={mode}
        mermaidTheme={mermaidTheme}
        sidebarOpen={sidebarOpen}
        docsOpen={docsOpen}
        svg={svg}
        previewBg={previewBg}
        getState={getState}
        onModeChange={setMode}
        onMermaidThemeChange={setMermaidTheme}
        isMobile={isMobile}
        onToggleSidebar={toggleSidebar}
        onToggleDocs={() => {
          setDocsOpen(o => {
            if (!o && isMobile) setSidebarOpen(false) // close sidebar when opening docs on mobile
            return !o
          })
        }}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Mobile backdrop */}
      {isMobile && (sidebarOpen || docsOpen) && (
        <div
          className="fixed inset-0 z-20 bg-black/40 animate-fade-in"
          onClick={() => { setSidebarOpen(false); setDocsOpen(false) }}
        />
      )}

      {/* Floating sidebar */}
      {sidebarOpen && (
        <div
          data-sidebar-panel
          className={
            isMobile
              ? 'fixed left-0 right-0 bottom-0 z-30 rounded-t-2xl overflow-hidden'
              : 'absolute top-14 bottom-4 left-4 z-20'
          }
          style={
            isMobile
              ? { height: '80vh', maxHeight: '80vh' }
              : { width: sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)' }
          }
        >
          {/* Right-edge resize handle — desktop only */}
          {!isMobile && <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 bottom-0 right-0 z-30 w-2 cursor-ew-resize translate-x-1 flex items-center justify-center group"
            title="Drag to resize"
          >
            <div className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-primary/40" />
          </div>}
          <ErrorBoundary label="Editor panel failed to load">
            <Sidebar
              code={activePage.code}
              mode={mode}
              pages={pages}
              activePageId={activePageId}
              diagramConfig={diagramConfig}
              error={error}
              editorLigatures={editorLigatures}
              autoFormat={autoFormat}
              editorFocusRef={editorFocusRef}
              onInsertReady={handleInsertReady}
              onAltClick={(ref) => {
                setDocsOpen(true)
                setTimeout(() => referenceDocsRef.current?.scrollToElement(ref.diagramType, ref.elementName), 50)
              }}
              onChange={updateCode}
              onSelectPage={setActivePageId}
              onAddPage={addPage}
              onRenamePage={renamePage}
              onDeletePage={deletePage}
              onReorderPages={reorderPages}
              mermaidTheme={mermaidTheme}
              onConfigChange={setDiagramConfig}
              onMermaidThemeChange={(t) => setMermaidTheme(t as MermaidTheme)}

              onLigaturesChange={setEditorLigatures}
              onAutoFormatChange={setAutoFormat}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Floating docs panel — right side (desktop) / bottom sheet (mobile) */}
      {docsOpen && (
        <div
          className={
            isMobile
              ? 'fixed left-0 right-0 bottom-0 z-30 rounded-t-2xl border-t overflow-hidden flex flex-col'
              : 'absolute top-14 bottom-4 right-4 z-20 w-72 rounded-xl border overflow-hidden flex flex-col'
          }
          style={{
            ...(isMobile ? { height: '75vh', maxHeight: '75vh' } : {}),
            background: mode === 'dark' ? 'oklch(0.16 0.015 260 / 0.97)' : 'rgba(255,255,255,0.97)',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backdropFilter: 'none',
          }}
        >
          <ErrorBoundary label="Reference docs failed to load">
            <ReferenceDocs
              ref={referenceDocsRef}
              currentCode={activePage.code}
              mode={mode}
              onInsert={(text) => insertRef.current?.(text)}
            />
          </ErrorBoundary>
        </div>
      )}

      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
