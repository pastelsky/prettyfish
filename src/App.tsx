import { useState, useEffect, useCallback, useRef } from 'react'

import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { InfiniteCanvas } from './components/InfiniteCanvas'
import { KeyboardHelp } from './components/KeyboardHelp'
import { ReferenceDocs, type ReferenceDocsHandle } from './components/ReferenceDocs'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMermaidRenderer } from './hooks/useMermaidRenderer'
import { loadFromStorage, saveToStorage, loadPages, migratePages, STORAGE_KEYS } from './lib/storage'
import { saveProjectFile, loadProjectFile } from './lib/file'
import {
  DEFAULT_DIAGRAM_CONFIG,
  createPage,
  createArtboard,
  nextArtboardPosition,
  resolveConfig,
} from './types'
import type {
  AppMode,
  AppState,
  MermaidTheme,
  DiagramPage,
  Artboard,
  DiagramConfig,
  DiagramConfigOverrides,
} from './types'
import { CUSTOM_THEME_PRESETS } from './lib/themePresets'
import { Copy, Plus, ShareNetwork, Trash, CopySimple } from '@phosphor-icons/react'
import { cn } from './lib/utils'
import { Button } from '@/components/ui/button'
import { useIsMobile } from './hooks/useIsMobile'
import { copyShareUrl } from './lib/share'
import { pfDebug } from './lib/debug'

// ── Initial state ─────────────────────────────────────────────────────────────

function getInitialState() {
  const defaultPage = createPage('Page 1', '')
  const pages = loadPages([defaultPage])
  const activePageId = loadFromStorage<string>(STORAGE_KEYS.activePageId, pages[0]!.id)
  return {
    pages: pages.length > 0 ? pages : [defaultPage],
    activePageId,
    mode: loadFromStorage<AppMode>(
      STORAGE_KEYS.mode,
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light',
    ),
    editorLigatures: loadFromStorage<boolean>(STORAGE_KEYS.editorLigatures, true),
    autoFormat: loadFromStorage<boolean>(STORAGE_KEYS.autoFormat, true),
  }
}

const initial = getInitialState()
const HISTORY_LIMIT = 100

type UndoableState = {
  pages: DiagramPage[]
  activePageId: string
  mode: AppMode
  editorLigatures: boolean
  autoFormat: boolean
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [pages, setPages] = useState<DiagramPage[]>(initial.pages)
  const [activePageId, setActivePageId] = useState<string>(initial.activePageId)
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [editorLigatures, setEditorLigatures] = useState<boolean>(initial.editorLigatures)
  const [autoFormat, setAutoFormat] = useState<boolean>(initial.autoFormat)

  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [docsOpen, setDocsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ type: 'diagram' | 'canvas'; id?: string; x: number; y: number } | null>(null)
  const copiedArtboardRef = useRef<Artboard | null>(null)
  const undoStackRef = useRef<UndoableState[]>([])
  const redoStackRef = useRef<UndoableState[]>([])

  // Ref to InfiniteCanvas's fitToArtboard function
  const focusArtboardRef = useRef<((id: string) => void) | null>(null)
  const registerFocusArtboard = useCallback((fn: (id: string) => void) => {
    focusArtboardRef.current = fn
  }, [])
  const focusArtboard = useCallback((id: string) => {
    focusArtboardRef.current?.(id)
  }, [])

  const insertRef = useRef<((text: string) => void) | null>(null)
  const handleInsertReady = useCallback((fn: (text: string) => void) => { insertRef.current = fn }, [])
  const referenceDocsRef = useRef<ReferenceDocsHandle>(null)
  const editorFocusRef = useRef<(() => void) | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem('diagram-studio:sidebar-width')
      return stored ? Number(stored) : null
    } catch { return null }
  })

  const pagesRef = useRef(pages)
  const activePageIdRef = useRef(activePageId)
  const modeRef = useRef(mode)
  const editorLigaturesRef = useRef(editorLigatures)
  const autoFormatRef = useRef(autoFormat)
  pagesRef.current = pages
  activePageIdRef.current = activePageId
  modeRef.current = mode
  editorLigaturesRef.current = editorLigatures
  autoFormatRef.current = autoFormat

  const SIDEBAR_MIN = 300
  const SIDEBAR_MAX = 600
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(null)

  const makeSnapshot = useCallback((): UndoableState => ({
    pages: structuredClone(pagesRef.current),
    activePageId: activePageIdRef.current,
    mode: modeRef.current,
    editorLigatures: editorLigaturesRef.current,
    autoFormat: autoFormatRef.current,
  }), [])

  const restoreSnapshot = useCallback((snapshot: UndoableState) => {
    setPages(snapshot.pages)
    setActivePageId(snapshot.activePageId)
    setMode(snapshot.mode)
    setEditorLigatures(snapshot.editorLigatures)
    setAutoFormat(snapshot.autoFormat)
    setContextMenu(null)
  }, [])

  const pushUndoSnapshot = useCallback(() => {
    undoStackRef.current.push(makeSnapshot())
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [makeSnapshot])

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

  // ── Derived active page / artboard ──────────────────────────────────────────

  const activePage = pages.find(p => p.id === activePageId) ?? pages[0]!
  const activeArtboard: Artboard | null =
    activePage.artboards.find(a => a.id === activePage.activeArtboardId) ?? null

  useEffect(() => {
    pfDebug('app', 'pages state changed', {
      pageCount: pages.length,
      activePageId,
      activeArtboardId: activeArtboard?.id ?? null,
      activePageDiagramCount: activePage?.artboards.length ?? 0,
    })
  }, [pages, activePageId, activeArtboard?.id, activePage?.artboards.length])

  const mermaidTheme: MermaidTheme = activeArtboard?.mermaidTheme ?? 'default'
  const diagramConfig = resolveConfig(
    CUSTOM_THEME_PRESETS[mermaidTheme]?.configOverrides as DiagramConfigOverrides | undefined,
    activeArtboard?.configOverrides,
  )

  // Render the active artboard's SVG for export
  const { svg: activeSvg } = useMermaidRenderer(activeArtboard?.code ?? '', mermaidTheme, diagramConfig)

  // ── Page mutations ──────────────────────────────────────────────────────────

  const updatePage = useCallback((pageId: string, updater: (p: DiagramPage) => DiagramPage) => {
    setPages(prev => prev.map(p => p.id === pageId ? updater(p) : p))
  }, [])

  const addPage = useCallback((): string => {
    pushUndoSnapshot()
    const pageNum = pagesRef.current.length + 1
    const newPage = createPage(`Page ${pageNum}`, '')
    pfDebug('app', 'addPage', { pageId: newPage.id, name: newPage.name })
    setPages(prev => [...prev, newPage])
    setActivePageId(newPage.id)
    return newPage.id
  }, [pushUndoSnapshot])

  const deletePage = useCallback((id: string) => {
    if (pagesRef.current.length === 1) return
    pushUndoSnapshot()
    setPages(prev => {
      const next = prev.filter(p => p.id !== id)
      if (activePageIdRef.current === id) {
        const idx = prev.findIndex(p => p.id === id)
        setActivePageId(next[Math.min(idx, next.length - 1)]!.id)
      }
      return next
    })
  }, [pushUndoSnapshot])

  const renamePage = useCallback((id: string, name: string) => {
    const page = pagesRef.current.find(p => p.id === id)
    if (!page || page.name === name) return
    pushUndoSnapshot()
    updatePage(id, p => ({ ...p, name }))
  }, [pushUndoSnapshot, updatePage])



  // ── Artboard mutations ──────────────────────────────────────────────────────

  const updateArtboard = useCallback((artboardId: string, updater: (a: Artboard) => Artboard) => {
    updatePage(activePageId, p => ({
      ...p,
      artboards: p.artboards.map(a => a.id === artboardId ? updater(a) : a),
    }))
  }, [activePageId, updatePage])

  const addArtboard = useCallback(() => {
    pushUndoSnapshot()
    const pos = nextArtboardPosition(activePage.artboards)
    const diagramNum = activePage.artboards.length + 1
    // Start with empty code so the template gallery opens in the sidebar
    const artboard = createArtboard(`Diagram ${diagramNum}`, '', pos)
    updatePage(activePageId, p => ({
      ...p,
      artboards: [...p.artboards, artboard],
      activeArtboardId: artboard.id,
    }))
    setSidebarOpen(true)
    // Pan canvas to the new artboard after a short delay (so RF has measured it)
    setTimeout(() => focusArtboard(artboard.id), 200)
    return artboard.id
  }, [activePage.artboards, activePageId, updatePage, focusArtboard, pushUndoSnapshot])

  const selectArtboard = useCallback((id: string) => {
    pfDebug('selection', 'selectDiagram', { pageId: activePageId, diagramId: id })
    updatePage(activePageId, p => ({ ...p, activeArtboardId: id }))
    setSidebarOpen(true)
  }, [activePageId, updatePage])

  const renameArtboard = useCallback((id: string, name: string) => {
    const artboard = activePage.artboards.find(a => a.id === id)
    if (!artboard || artboard.name === name) return
    pushUndoSnapshot()
    updateArtboard(id, a => ({ ...a, name }))
  }, [activePage.artboards, pushUndoSnapshot, updateArtboard])

  const updateArtboardDescription = useCallback((id: string, description: string) => {
    const artboard = activePage.artboards.find(a => a.id === id)
    const nextDescription = description || undefined
    if (!artboard || artboard.description === nextDescription) return
    pushUndoSnapshot()
    updateArtboard(id, a => ({ ...a, description: nextDescription }))
  }, [activePage.artboards, pushUndoSnapshot, updateArtboard])

  const buildDuplicateName = useCallback((name: string) => {
    const existingNames = new Set(activePage.artboards.map(a => a.name))
    const baseName = `${name} Copy`
    let nextName = baseName
    let suffix = 2
    while (existingNames.has(nextName)) {
      nextName = `${baseName} ${suffix}`
      suffix += 1
    }
    return nextName
  }, [activePage.artboards])

  const copyArtboard = useCallback((id: string) => {
    const target = activePage.artboards.find(a => a.id === id)
    if (!target) return
    copiedArtboardRef.current = {
      ...target,
      configOverrides: target.configOverrides ? structuredClone(target.configOverrides) : {},
    }
  }, [activePage.artboards])

  const duplicateArtboard = useCallback((source: Artboard) => {
    pushUndoSnapshot()
    const pos = nextArtboardPosition(activePage.artboards)
    const artboard: Artboard = {
      ...source,
      id: crypto.randomUUID(),
      name: buildDuplicateName(source.name),
      x: pos.x,
      y: pos.y,
      configOverrides: source.configOverrides ? structuredClone(source.configOverrides) : {},
    }

    updatePage(activePageId, p => ({
      ...p,
      artboards: [...p.artboards, artboard],
      activeArtboardId: artboard.id,
    }))
    setSidebarOpen(true)
    setTimeout(() => focusArtboard(artboard.id), 200)
    return artboard.id
  }, [activePage.artboards, activePageId, buildDuplicateName, focusArtboard, updatePage, pushUndoSnapshot])

  const copyActiveArtboard = useCallback(() => {
    if (!activeArtboard) return
    copyArtboard(activeArtboard.id)
  }, [activeArtboard, copyArtboard])

  const pasteArtboard = useCallback(() => {
    const copied = copiedArtboardRef.current
    if (!copied) return
    duplicateArtboard(copied)
  }, [duplicateArtboard])

  const deleteArtboard = useCallback((id: string) => {
    pushUndoSnapshot()
    setContextMenu(menu => (menu?.type === 'diagram' && menu.id === id ? null : menu))
    updatePage(activePageId, p => {
      const remaining = p.artboards.filter(a => a.id !== id)
      const newActive = p.activeArtboardId === id
        ? (remaining[0]?.id ?? null)
        : p.activeArtboardId
      return { ...p, artboards: remaining, activeArtboardId: newActive }
    })
  }, [activePageId, updatePage, pushUndoSnapshot])

  const moveArtboard = useCallback((id: string, x: number, y: number) => {
    const artboard = activePage.artboards.find(a => a.id === id)
    if (!artboard || (artboard.x === x && artboard.y === y)) return
    pushUndoSnapshot()
    updateArtboard(id, a => ({ ...a, x, y }))
  }, [activePage.artboards, pushUndoSnapshot, updateArtboard])

  const resizeArtboard = useCallback((id: string, width: number) => {
    const artboard = activePage.artboards.find(a => a.id === id)
    if (!artboard || artboard.width === width) return
    pushUndoSnapshot()
    updateArtboard(id, a => ({ ...a, width }))
  }, [activePage.artboards, pushUndoSnapshot, updateArtboard])

  const updateCode = useCallback((value: string) => {
    if (!activeArtboard) return
    pfDebug('editor', 'updateCode commit', {
      diagramId: activeArtboard.id,
      length: value.length,
      firstLine: value.split('\n')[0] ?? '',
    })
    updateArtboard(activeArtboard.id, a => ({ ...a, code: value }))
  }, [activeArtboard, updateArtboard])

  const setDiagramConfig = useCallback((config: DiagramConfig) => {
    if (!activeArtboard) return
    const overrides: DiagramConfigOverrides = {}
    for (const key of Object.keys(config) as (keyof DiagramConfig)[]) {
      const defaultVal = DEFAULT_DIAGRAM_CONFIG[key]
      const newVal = config[key]
      if (JSON.stringify(newVal) !== JSON.stringify(defaultVal)) {
        (overrides as Record<string, unknown>)[key] = newVal
      }
    }
    updateArtboard(activeArtboard.id, a => ({ ...a, configOverrides: overrides }))
  }, [activeArtboard, updateArtboard])

  const setMermaidTheme = useCallback((theme: MermaidTheme) => {
    if (!activeArtboard) return
    updateArtboard(activeArtboard.id, a => ({ ...a, mermaidTheme: theme }))
  }, [activeArtboard, updateArtboard])

  // ── Persistence — save to localStorage on change ───────────────────────────

  useEffect(() => saveToStorage(STORAGE_KEYS.pages, pages), [pages])
  useEffect(() => saveToStorage(STORAGE_KEYS.activePageId, activePageId), [activePageId])
  useEffect(() => saveToStorage(STORAGE_KEYS.mode, mode), [mode])
  useEffect(() => saveToStorage(STORAGE_KEYS.editorLigatures, editorLigatures), [editorLigatures])
  useEffect(() => saveToStorage(STORAGE_KEYS.autoFormat, autoFormat), [autoFormat])

  // ── Cross-tab sync — listen for storage changes from other tabs ────────────

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return
      try {
        if (e.key === STORAGE_KEYS.pages) {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setPages(migratePages(parsed))
          }
        } else if (e.key === STORAGE_KEYS.activePageId) {
          setActivePageId(JSON.parse(e.newValue))
        } else if (e.key === STORAGE_KEYS.mode) {
          setMode(JSON.parse(e.newValue))
        } else if (e.key === STORAGE_KEYS.editorLigatures) {
          setEditorLigatures(JSON.parse(e.newValue))
        } else if (e.key === STORAGE_KEYS.autoFormat) {
          setAutoFormat(JSON.parse(e.newValue))
        }
      } catch {
        // Ignore malformed storage data
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // ── App state (for export/share) ────────────────────────────────────────────

  const getState = useCallback((): AppState => ({
    version: 1,
    pages,
    activePageId,
    mode,
    editorLigatures,
  }), [pages, activePageId, mode, editorLigatures])

  const getShareStateForArtboard = useCallback((artboardId: string): AppState => {
    const source = pages.flatMap(page => page.artboards.map(artboard => ({ page, artboard }))).find(entry => entry.artboard.id === artboardId)
    if (!source) return getState()

    const sharedPage: DiagramPage = {
      id: source.page.id,
      name: source.page.name,
      artboards: [
        {
          ...source.artboard,
          configOverrides: source.artboard.configOverrides ? structuredClone(source.artboard.configOverrides) : {},
        },
      ],
      activeArtboardId: source.artboard.id,
    }

    return {
      version: 1,
      pages: [sharedPage],
      activePageId: sharedPage.id,
      mode,
      editorLigatures,
    }
  }, [editorLigatures, getState, mode, pages])

  const getShareState = useCallback((): AppState => {
    if (!activeArtboard) return getState()
    return getShareStateForArtboard(activeArtboard.id)
  }, [activeArtboard, getShareStateForArtboard, getState])

  const handleSaveProject = useCallback(() => {
    saveProjectFile(getState())
  }, [getState])

  const handleLoadProject = useCallback(async () => {
    const state = await loadProjectFile()
    if (!state) return
    setPages(state.pages)
    setActivePageId(state.activePageId)
    setMode(state.mode)
    setEditorLigatures(state.editorLigatures)
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  const navigatePage = useCallback((direction: 1 | -1) => {
    const idx = pages.findIndex(p => p.id === activePageId)
    const next = pages[idx + direction]
    if (next) setActivePageId(next.id)
  }, [pages, activePageId])

  const handleDeleteActiveArtboard = useCallback(() => {
    if (activeArtboard && activePage.artboards.length > 0) {
      deleteArtboard(activeArtboard.id)
    }
  }, [activeArtboard, activePage.artboards.length, deleteArtboard])

  const handleUndo = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(makeSnapshot())
    restoreSnapshot(previous)
  }, [makeSnapshot, restoreSnapshot])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(makeSnapshot())
    restoreSnapshot(next)
  }, [makeSnapshot, restoreSnapshot])

  useKeyboardShortcuts({
    onNewDiagram: addArtboard,
    onCopyArtboard: copyActiveArtboard,
    onPasteArtboard: pasteArtboard,
    onDeleteArtboard: handleDeleteActiveArtboard,
    onNewPage: addPage,
    onNextPage: () => navigatePage(1),
    onPrevPage: () => navigatePage(-1),
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onToggleDocs: () => setDocsOpen(prev => !prev),
    onFocusEditor: () => editorFocusRef.current?.(),
    onToggleDarkMode: () => setMode(prev => prev === 'dark' ? 'light' : 'dark'),
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSaveProject: handleSaveProject,
    onLoadProject: handleLoadProject,
    onOpenHelp: () => setHelpOpen(true),
  })

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])

  const handleContextMenuCopy = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    copyArtboard(contextMenu.id)
    setContextMenu(null)
  }, [contextMenu, copyArtboard])

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    const source = activePage.artboards.find(a => a.id === contextMenu.id)
    if (!source) return
    duplicateArtboard(source)
    setContextMenu(null)
  }, [activePage.artboards, contextMenu, duplicateArtboard])

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    deleteArtboard(contextMenu.id)
    setContextMenu(null)
  }, [contextMenu, deleteArtboard])

  const handleCanvasContextMenuPaste = useCallback(() => {
    pasteArtboard()
    setContextMenu(null)
  }, [pasteArtboard])

  const handleCanvasContextMenuNewDiagram = useCallback(() => {
    addArtboard()
    setContextMenu(null)
  }, [addArtboard])

  const handleContextMenuShare = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    await copyShareUrl(getShareStateForArtboard(contextMenu.id))
    setContextMenu(null)
  }, [contextMenu, getShareStateForArtboard])

  useEffect(() => {
    if (!contextMenu) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    const handleResize = () => setContextMenu(null)
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen relative bg-background text-foreground overflow-hidden">
      {/* Infinite canvas — fills the full screen */}
      <div className="absolute inset-0">
        <InfiniteCanvas
          page={activePage}
          mode={mode}
          onSelectArtboard={selectArtboard}
          onRenameArtboard={renameArtboard}
          onUpdateArtboardDescription={updateArtboardDescription}
          onDeleteArtboard={deleteArtboard}
          onOpenDiagramContextMenu={(id, x, y) => {
            setContextMenu({ type: 'diagram', id, x, y })
          }}
          onOpenCanvasContextMenu={(x, y) => {
            setContextMenu({ type: 'canvas', x, y })
          }}
          onMoveArtboard={moveArtboard}
          onResizeArtboard={resizeArtboard}
          onRegisterFocus={registerFocusArtboard}
        />
      </div>

      {/* Floating header (absolute, z-30) */}
      <Header
        mode={mode}
        mermaidTheme={mermaidTheme}
        sidebarOpen={sidebarOpen}
        docsOpen={docsOpen}
        svg={activeSvg}
        code={activeArtboard?.code ?? ''}
        previewBg="transparent"
        getShareState={getShareState}
        pages={pages}
        activePageId={activePageId}
        activePage={activePage}
        onSelectPage={setActivePageId}
        onAddPage={addPage}
        onRenamePage={renamePage}
        onDeletePage={deletePage}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onModeChange={setMode}
        onMermaidThemeChange={setMermaidTheme}
        isMobile={isMobile}
        onToggleSidebar={toggleSidebar}
        onToggleDocs={() => {
          setDocsOpen(o => {
            if (!o && isMobile) setSidebarOpen(false)
            return !o
          })
        }}
        onOpenHelp={() => setHelpOpen(true)}
        sidebarWidth={sidebarOpen ? sidebarWidth : null}
      />

      {/* Mobile overlay */}
      {isMobile && (sidebarOpen || docsOpen) && (
        <div
          className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          onClick={() => { setSidebarOpen(false); setDocsOpen(false) }}
        />
      )}

      {/* Sidebar panel */}
      {sidebarOpen && (
        <div
          data-sidebar-panel
          className={
            isMobile
              ? 'absolute left-0 right-0 bottom-0 z-30 rounded-t-2xl overflow-hidden'
              : 'absolute top-14 bottom-4 left-4 z-20'
          }
          style={
            isMobile
              ? { height: '80vh', maxHeight: '80vh' }
              : { width: sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)' }
          }
        >
          {!isMobile && (
            <div
              onMouseDown={handleResizeStart}
              className="absolute top-0 bottom-0 right-0 z-30 w-2 cursor-ew-resize translate-x-1 flex items-center justify-center group"
              title="Drag to resize"
            >
              <div className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-primary/40" />
            </div>
          )}
          <ErrorBoundary label="Editor panel failed to load">
            <Sidebar
              artboard={activeArtboard}
              mode={mode}
              diagramConfig={diagramConfig}
              editorFocusRef={editorFocusRef}
              onInsertReady={handleInsertReady}
              onAltClick={(ref) => {
                setDocsOpen(true)
                setTimeout(() => referenceDocsRef.current?.scrollToElement(ref.diagramType, ref.elementName), 50)
              }}
              onChange={updateCode}
              mermaidTheme={mermaidTheme}
              onConfigChange={setDiagramConfig}
              onMermaidThemeChange={(t) => setMermaidTheme(t as MermaidTheme)}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Reference docs panel */}
      {docsOpen && (
        <div
          className={cn(
            isMobile
              ? 'absolute left-0 right-0 bottom-0 z-30 rounded-t-2xl border-t overflow-hidden flex flex-col'
              : 'absolute top-14 bottom-4 right-4 z-20 w-72 rounded-xl border overflow-hidden flex flex-col',
            mode === 'dark'
              ? 'bg-[oklch(0.16_0.015_260)]/95 backdrop-blur-sm border-white/8 [box-shadow:0_4px_24px_rgba(0,0,0,0.35)]'
              : 'bg-white/95 backdrop-blur-sm border-black/6 [box-shadow:0_4px_24px_rgba(0,0,0,0.08)]',
          )}
          style={isMobile ? { height: '75vh', maxHeight: '75vh' } : undefined}
        >
          <ErrorBoundary label="Reference docs failed to load">
            <ReferenceDocs
              ref={referenceDocsRef}
              currentCode={activeArtboard?.code ?? ''}
              mode={mode}
              onInsert={(text) => insertRef.current?.(text)}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Bottom floating bar */}
      {!isMobile && (
        <div
          className="absolute bottom-6 z-30 pointer-events-none"
          style={{
            left: sidebarOpen
              ? `calc(${sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)'} + 1rem + (100vw - (${sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)'} + 1rem)) / 2)`
              : '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <Button
            onClick={addArtboard}
            variant="outline"
            size="default"
            className={cn(
              'pointer-events-auto rounded-xl text-xs font-semibold backdrop-blur-sm shadow-lg',
              mode === 'dark'
                ? 'bg-[oklch(0.16_0.015_260)]/82 border-white/10 text-zinc-100 hover:bg-[oklch(0.19_0.015_260)]/88 hover:border-white/16 hover:text-zinc-100'
                : 'bg-white/82 border-black/8 text-zinc-900 hover:bg-white/92 hover:border-black/12 hover:text-zinc-900',
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Diagram
          </Button>
        </div>
      )}

      {contextMenu && (
        <>
          <div
            className="absolute inset-0 z-40"
            onMouseDown={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className={cn(
              'absolute z-50 min-w-44 rounded-xl border p-1.5 shadow-xl',
              mode === 'dark'
                ? 'bg-[oklch(0.16_0.015_260)]/98 border-white/10 text-zinc-100'
                : 'bg-white/98 border-black/8 text-zinc-800',
            )}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {contextMenu.type === 'diagram' ? (
              <>
                <button type="button" onClick={handleContextMenuCopy} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', mode === 'dark' ? 'hover:bg-white/6' : 'hover:bg-black/4')}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button type="button" onClick={handleContextMenuDuplicate} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', mode === 'dark' ? 'hover:bg-white/6' : 'hover:bg-black/4')}>
                  <CopySimple className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button type="button" onClick={() => void handleContextMenuShare()} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', mode === 'dark' ? 'hover:bg-white/6' : 'hover:bg-black/4')}>
                  <ShareNetwork className="w-3.5 h-3.5" /> Share link
                </button>
                <div className={cn('my-1 h-px', mode === 'dark' ? 'bg-white/8' : 'bg-black/8')} />
                <button type="button" onClick={handleContextMenuDelete} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', mode === 'dark' ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}>
                  <Trash className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleCanvasContextMenuPaste} disabled={!copiedArtboardRef.current} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', copiedArtboardRef.current ? (mode === 'dark' ? 'hover:bg-white/6' : 'hover:bg-black/4') : 'opacity-40 cursor-not-allowed')}>
                  <Copy className="w-3.5 h-3.5" /> Paste
                </button>
                <button type="button" onClick={handleCanvasContextMenuNewDiagram} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors', mode === 'dark' ? 'hover:bg-white/6' : 'hover:bg-black/4')}>
                  <Plus className="w-3.5 h-3.5" /> New diagram
                </button>
              </>
            )}
          </div>
        </>
      )}

      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
