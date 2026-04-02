import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { KeyboardHelp } from './components/KeyboardHelp'
import { ReferenceDocs, type ReferenceDocsHandle } from './components/ReferenceDocs'
import { useMermaidRenderer } from './hooks/useMermaidRenderer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './lib/storage'
import { decodeStateFromHash } from './lib/share'
import { DEFAULT_DIAGRAM, createPage, DEFAULT_DIAGRAM_CONFIG } from './types'
import type { AppMode, AppState, MermaidTheme, DiagramPage, DiagramConfig } from './types'

function getInitialState() {
  const fromHash = decodeStateFromHash()
  const defaultPage = createPage('Untitled', DEFAULT_DIAGRAM)
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
  const p = createPage('Untitled', DEFAULT_DIAGRAM)
  initial.pages = [p]
  initial.activePageId = p.id
}

export default function App() {
  const [pages, setPages] = useState<DiagramPage[]>(initial.pages)
  const [activePageId, setActivePageId] = useState<string>(initial.activePageId)
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [mermaidTheme, setMermaidTheme] = useState<MermaidTheme>(initial.mermaidTheme)
  const [diagramConfig, setDiagramConfig] = useState<DiagramConfig>(initial.diagramConfig)
  const [editorLigatures, setEditorLigatures] = useState<boolean>(initial.editorLigatures)
  const [autoFormat, setAutoFormat] = useState<boolean>(initial.autoFormat)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [docsOpen, setDocsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const insertRef = useRef<((text: string) => void) | null>(null)
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
      try { sessionStorage.setItem('diagram-studio:sidebar-width', String(next)) } catch {}
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

  const isDark = mode === 'dark'
  const previewBg = isDark ? '#0f1019' : '#f0f1f5'

  // Persist
  useEffect(() => saveToStorage(STORAGE_KEYS.pages, pages), [pages])
  useEffect(() => saveToStorage(STORAGE_KEYS.activePageId, activePageId), [activePageId])
  useEffect(() => saveToStorage(STORAGE_KEYS.mode, mode), [mode])
  useEffect(() => saveToStorage(STORAGE_KEYS.mermaidTheme, mermaidTheme), [mermaidTheme])
  useEffect(() => saveToStorage(STORAGE_KEYS.diagramConfig, diagramConfig), [diagramConfig])
  useEffect(() => saveToStorage(STORAGE_KEYS.editorLigatures, editorLigatures), [editorLigatures])
  useEffect(() => saveToStorage(STORAGE_KEYS.autoFormat, autoFormat), [autoFormat])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  const updateCode = useCallback((code: string) => {
    setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, code } : p))
  }, [activePageId])

  const addPage = useCallback((): string => {
    const p = createPage(`Untitled`, '')
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

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
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
      <Canvas
        svg={svg}
        hasError={!!error}
        mode={mode}
        sidebarOpen={sidebarOpen}
        sidebarWidth={sidebarWidth}
        docsOpen={docsOpen}
        transformRef={transformRef}
      />

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
        onToggleSidebar={toggleSidebar}
        onToggleDocs={() => setDocsOpen(o => !o)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Floating sidebar */}
      {sidebarOpen && (
        <div
          data-sidebar-panel
          className="absolute top-14 bottom-4 left-4 z-20"
          style={{ width: sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)' }}
        >
          {/* Right-edge resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 bottom-0 right-0 z-30 w-2 cursor-ew-resize translate-x-1 flex items-center justify-center group"
            title="Drag to resize"
          >
            {/* Subtle grip dots */}
            <div className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-primary/40" />
          </div>
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
            insertRef={insertRef}
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
        </div>
      )}

      {/* Floating docs panel — right side */}
      {docsOpen && (
        <div
          className="absolute top-14 bottom-4 right-4 z-20 w-72 rounded-xl border overflow-hidden flex flex-col"
          style={{
            background: mode === 'dark' ? 'oklch(0.16 0.015 260 / 0.97)' : 'rgba(255,255,255,0.97)',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backdropFilter: 'none',
          }}
        >
          <ReferenceDocs
            ref={referenceDocsRef}
            currentCode={activePage.code}
            mode={mode}
            onInsert={(text) => insertRef.current?.(text)}
          />
        </div>
      )}

      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
