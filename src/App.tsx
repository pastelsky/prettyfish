import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CaretDown, Copy, CopySimple, Plus, ShareNetwork, Trash } from '@phosphor-icons/react'

import { Header } from './components/app/Header'
import { KeyboardHelp } from './components/app/KeyboardHelp'
import { McpPanel } from './components/app/McpPanel'
import type { ReferenceDocsHandle } from './components/docs/ReferenceDocs'
import { ErrorBoundary } from './components/app/ErrorBoundary'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useIsMobile } from './hooks/useIsMobile'
import { useAppController } from './hooks/useAppController'
import { useRemoteAgentRelay } from './hooks/useRemoteAgentRelay'
import type { MermaidTheme } from './types'
import { captureEvent } from './lib/analytics'
import { cn } from './lib/utils'
import { Button } from '@/components/ui/button'
import {
  chromeFloatingActionClass,
  chromeGlassPanelClass,
  chromeMenuItemClass,
  chromePopoverClass,
} from '@/components/ui/app-chrome'

const SIDEBAR_MIN = 300
const SIDEBAR_MAX = 600

const InfiniteCanvas = lazy(() =>
  import('./components/canvas/InfiniteCanvas').then((module) => ({ default: module.InfiniteCanvas })),
)

const Sidebar = lazy(() =>
  import('./components/editor/Sidebar').then((module) => ({ default: module.Sidebar })),
)

const ReferenceDocs = lazy(() =>
  import('./components/docs/ReferenceDocs').then((module) => ({ default: module.ReferenceDocs })),
)

export default function App() {
  const isMobile = useIsMobile()
  const controller = useAppController(isMobile)
  const referenceDocsRef = useRef<ReferenceDocsHandle>(null)
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(true)
  const [mcpOpen, setMcpOpen] = useState(false)

  const {
    state,
    activePage,
    activeDiagram,
    mermaidTheme,
    diagramConfig,
    hasCopied,
    registerFocusDiagram,
    registerInsertHandler,
    registerEditorFocusHandler,
    insertText,
    focusEditor,
    dispatch,
    addPage,
    deletePage,
    renamePage,
    addDiagram,
    createDiagramWithOptions,
    selectDiagram,
    focusDiagram,
    renameDiagram,
    updateDiagramDescription,
    copyDiagram,
    copyActiveDiagram,
    pasteDiagram,
    duplicateDiagram,
    deleteDiagram,
    moveDiagram,
    resizeDiagram,
    updateCode,
    updateDiagramCode,
    setDiagramConfig,
    setMermaidTheme,
    saveProject,
    loadProject,
    resetWorkspace,
    undo,
    redo,
    getShareState,
    copyContextShare,
  } = controller

  const {
    pages,
    activePageId,
    mode,
    editorLigatures,
    autoFormat,
    ui: { sidebarOpen, docsOpen, helpOpen, contextMenu, sidebarWidth },
  } = state

  const activeSvg = activeDiagram?.render?.svg ?? ''
  const panelSurfaceClass = chromeGlassPanelClass(mode)
  const remoteAgentRelay = useRemoteAgentRelay({
    activePageId,
    state,
    getState: controller.getState,
    createDiagramWithOptions,
    selectDiagram,
    updateDiagramCode,
  })

  const handleInsertReady = useCallback((fn: (text: string) => void) => {
    registerInsertHandler(fn)
  }, [registerInsertHandler])

  const handleFocusReady = useCallback((fn: () => void) => {
    registerEditorFocusHandler(fn)
  }, [registerEditorFocusHandler])

  const navigatePage = useCallback((direction: 1 | -1) => {
    const index = pages.findIndex(page => page.id === activePageId)
    const next = pages[index + direction]
    if (next) dispatch({ type: 'page/select', pageId: next.id })
  }, [activePageId, dispatch, pages])

  const handleDeleteActiveDiagram = useCallback(() => {
    if (!activeDiagram || activePage.diagrams.length === 0) return
    captureEvent('diagram_deleted', { source: 'keyboard' })
    deleteDiagram(activeDiagram.id)
  }, [activeDiagram, activePage.diagrams.length, deleteDiagram])

  useKeyboardShortcuts({
    onNewDiagram: addDiagram,
    onCopyDiagram: copyActiveDiagram,
    onPasteDiagram: pasteDiagram,
    onDeleteDiagram: handleDeleteActiveDiagram,
    onNewPage: addPage,
    onNextPage: () => navigatePage(1),
    onPrevPage: () => navigatePage(-1),
    onToggleSidebar: () => dispatch({ type: 'ui/toggle-sidebar' }),
    onToggleDocs: () => dispatch({ type: 'ui/set-docs-open', open: !docsOpen }),
    onFocusEditor: focusEditor,
    onToggleDarkMode: () => dispatch({ type: 'document/set-mode', mode: mode === 'dark' ? 'light' : 'dark' }),
    onUndo: undo,
    onRedo: redo,
    onSaveProject: saveProject,
    onLoadProject: loadProject,
    onOpenHelp: () => dispatch({ type: 'ui/set-help-open', open: true }),
  })

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    const currentWidth = sidebarWidth ?? (window.innerWidth * 0.34)
    const startX = event.clientX

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, currentWidth + delta))
      dispatch({ type: 'ui/set-sidebar-width', width: next })
      try {
        sessionStorage.setItem('diagram-studio:sidebar-width', String(next))
      } catch {
        // ignore
      }
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [dispatch, sidebarWidth])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    root.dataset.theme = mode
  }, [mode])

  useEffect(() => {
    if (!contextMenu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'ui/set-context-menu', menu: null })
    }
    const handleResize = () => dispatch({ type: 'ui/set-context-menu', menu: null })

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('keydown', handleKeyDown, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, dispatch])

  const handleContextMenuCopy = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    copyDiagram(contextMenu.id)
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [contextMenu, copyDiagram, dispatch])

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    const source = activePage.diagrams.find(diagram => diagram.id === contextMenu.id)
    if (!source) return
    captureEvent('diagram_duplicated', { source: 'context_menu' })
    duplicateDiagram(source)
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [activePage.diagrams, contextMenu, dispatch, duplicateDiagram])

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    captureEvent('diagram_deleted', { source: 'context_menu' })
    deleteDiagram(contextMenu.id)
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [contextMenu, deleteDiagram, dispatch])

  const handleContextMenuShare = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'diagram' || !contextMenu.id) return
    await copyContextShare(contextMenu.id)
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [contextMenu, copyContextShare, dispatch])

  const handleCanvasContextMenuPaste = useCallback(() => {
    pasteDiagram()
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [dispatch, pasteDiagram])

  const handleCanvasContextMenuNewDiagram = useCallback(() => {
    captureEvent('diagram_created', { source: 'context_menu' })
    const nextDiagramId = addDiagram()
    if (isMobile) {
      setMobileSidebarCollapsed(false)
      dispatch({ type: 'ui/set-sidebar-open', open: true })
      selectDiagram(nextDiagramId)
    }
    dispatch({ type: 'ui/set-context-menu', menu: null })
  }, [addDiagram, dispatch, isMobile, selectDiagram])

  const handleSelectDiagram = useCallback((diagramId: string) => {
    selectDiagram(diagramId)
    if (!isMobile) return
    // On mobile, tapping a diagram opens the sidebar so the user can edit it.
    dispatch({ type: 'ui/set-sidebar-open', open: true })
    // Always expand the editor so user can see/edit the diagram
    setMobileSidebarCollapsed(false)
  }, [dispatch, isMobile, selectDiagram])

  const handleToggleSidebar = useCallback(() => {
    const nextOpen = !sidebarOpen
    if (isMobile && nextOpen) {
      setMobileSidebarCollapsed(Boolean(activeDiagram?.code?.trim()))
    }
    dispatch({ type: 'ui/toggle-sidebar' })
  }, [activeDiagram?.code, dispatch, isMobile, sidebarOpen])

  const handleAddDiagram = useCallback((source: 'toolbar' | 'mobile_fab') => {
    captureEvent('diagram_created', { source })
    const nextDiagramId = addDiagram()
    if (isMobile) {
      setMobileSidebarCollapsed(false)
      dispatch({ type: 'ui/set-sidebar-open', open: true })
      selectDiagram(nextDiagramId)
    }
  }, [addDiagram, dispatch, isMobile, selectDiagram])

  const handleDiagramCodeChange = useCallback((value: string) => {
    if (isMobile && sidebarOpen && !activeDiagram?.code?.trim() && value.trim()) {
      setMobileSidebarCollapsed(true)
    }
    updateCode(value)
  }, [activeDiagram?.code, isMobile, sidebarOpen, updateCode])

  return (
    <div data-testid="app-root" className="w-screen h-screen relative bg-background text-foreground overflow-hidden">
      <main aria-label="Diagram workspace" className="absolute inset-0">
        <Suspense fallback={<div className="h-full w-full bg-background" />}>
          <InfiniteCanvas
            page={activePage}
            mode={mode}
            onSelectDiagram={handleSelectDiagram}
            onRenameDiagram={renameDiagram}
            onUpdateDiagramDescription={updateDiagramDescription}
            onDeleteDiagram={deleteDiagram}
            onOpenDiagramContextMenu={(id, x, y) => dispatch({ type: 'ui/set-context-menu', menu: { type: 'diagram', id, x, y } })}
            onOpenCanvasContextMenu={(x, y) => dispatch({ type: 'ui/set-context-menu', menu: { type: 'canvas', x, y } })}
            onMoveDiagram={moveDiagram}
            onResizeDiagram={resizeDiagram}
            onRegisterFocus={registerFocusDiagram}
          />
        </Suspense>
      </main>

      <Header
        mode={mode}
        mermaidTheme={mermaidTheme}
        sidebarOpen={sidebarOpen}
        docsOpen={docsOpen}
        svg={activeSvg}
        code={activeDiagram?.code ?? ''}
        previewBg="transparent"
        getShareState={getShareState}
        pages={pages}
        activePageId={activePageId}
        activePage={activePage}
        onSelectPage={(pageId) => dispatch({ type: 'page/select', pageId })}
        onAddPage={addPage}
        onRenamePage={renamePage}
        onDeletePage={deletePage}
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        onResetWorkspace={resetWorkspace}
        onModeChange={(nextMode) => dispatch({ type: 'document/set-mode', mode: nextMode })}
        onMermaidThemeChange={setMermaidTheme}
        isMobile={isMobile}
        onToggleSidebar={handleToggleSidebar}
        onToggleDocs={() => {
          dispatch({ type: 'ui/set-docs-open', open: !docsOpen })
          if (!docsOpen && isMobile) {
            dispatch({ type: 'ui/set-sidebar-open', open: false })
          }
        }}
        onOpenHelp={() => dispatch({ type: 'ui/set-help-open', open: true })}
        onOpenMcp={() => setMcpOpen(true)}
        mcpConnected={remoteAgentRelay.status === 'connected'}
        sidebarWidth={sidebarOpen ? sidebarWidth : null}
      />

      <McpPanel
        open={mcpOpen}
        onClose={() => setMcpOpen(false)}
        remoteRelay={remoteAgentRelay}
        isDark={mode === 'dark'}
      />

      {isMobile && (docsOpen || (sidebarOpen && !mobileSidebarCollapsed)) && (
        <div
          data-testid="mobile-overlay-backdrop"
          className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          onClick={() => {
            dispatch({ type: 'ui/set-sidebar-open', open: false })
            dispatch({ type: 'ui/set-docs-open', open: false })
          }}
        />
      )}

      {sidebarOpen && (
        <aside
          data-testid="sidebar-panel"
          data-sidebar-panel
          aria-label="Diagram editor"
          className={isMobile ? 'absolute left-0 right-0 bottom-0 z-30 rounded-t-2xl overflow-hidden' : 'absolute top-16 bottom-4 left-4 z-20'}
          style={isMobile
            ? {
                height: mobileSidebarCollapsed ? '3.5rem' : '80vh',
                maxHeight: mobileSidebarCollapsed ? '3.5rem' : '80vh',
                transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1), max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
              }
            : { width: sidebarWidth ? `${sidebarWidth}px` : 'clamp(320px, 34vw, 480px)' }}
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
            <Suspense fallback={<div className={cn('h-full rounded-xl border animate-pulse', panelSurfaceClass)} />}>
              <Sidebar
                diagram={activeDiagram}
                collapsed={isMobile ? mobileSidebarCollapsed : undefined}
              onCollapsedChange={isMobile ? setMobileSidebarCollapsed : undefined}
                mode={mode}
                diagramConfig={diagramConfig}
                renderError={activeDiagram?.render?.error ?? null}
                autoFormat={autoFormat}
                editorLigatures={editorLigatures}
                onFocusReady={handleFocusReady}
                onInsertReady={handleInsertReady}
                onAltClick={(ref) => {
                  dispatch({ type: 'ui/set-docs-open', open: true })
                  setTimeout(() => referenceDocsRef.current?.scrollToElement(ref.diagramType, ref.elementName), 50)
                }}
                onChange={handleDiagramCodeChange}
                mermaidTheme={mermaidTheme}
                onConfigChange={setDiagramConfig}
                onMermaidThemeChange={(theme) => setMermaidTheme(theme as MermaidTheme)}
                onTemplateSelect={isMobile ? () => setMobileSidebarCollapsed(true) : undefined}
              />
            </Suspense>
          </ErrorBoundary>
        </aside>
      )}

      {docsOpen && (
        <aside
          data-testid="reference-docs-panel"
          aria-label="Reference docs"
          className={cn(
            isMobile
              ? 'absolute left-0 right-0 bottom-0 z-30 rounded-t-2xl border-t overflow-hidden flex flex-col'
              : 'absolute top-14 bottom-4 right-4 z-20 w-72 rounded-xl border overflow-hidden flex flex-col',
            'bg-white/95 backdrop-blur-sm border-black/6 [box-shadow:0_4px_24px_rgba(0,0,0,0.08)]',
            'dark:bg-[oklch(0.16_0.015_260)]/95 dark:border-white/8 dark:[box-shadow:0_4px_24px_rgba(0,0,0,0.35)]',
          )}
          style={isMobile ? { height: '75vh', maxHeight: '75vh' } : undefined}
        >
          <ErrorBoundary label="Reference docs failed to load">
            <Suspense fallback={<div className={cn('h-full w-full animate-pulse', mode === 'dark' ? 'bg-white/5' : 'bg-black/3')} />}>
              <ReferenceDocs
                ref={referenceDocsRef}
                currentCode={activeDiagram?.code ?? ''}
                mode={mode}
                onInsert={insertText}
              />
            </Suspense>
          </ErrorBoundary>
        </aside>
      )}

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
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              data-testid="add-diagram-button"
              onClick={() => handleAddDiagram('toolbar')}
              variant="ghost"
              size="default"
              className={cn(
                chromeFloatingActionClass(mode),
                'text-xs font-semibold hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-primary/30',
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Diagram
            </Button>

            <DiagramDropdown
              diagrams={activePage.diagrams}
              activeDiagramId={activePage.activeDiagramId}
              onSelectDiagram={handleSelectDiagram}
              onFocusDiagram={focusDiagram}
              isDark={mode === 'dark'}
            />
          </div>
        </div>
      )}

      {isMobile && !docsOpen && (
        <div
          className="absolute right-4 z-40 pointer-events-none transition-all duration-300"
          style={{ bottom: (sidebarOpen && !mobileSidebarCollapsed) ? 'calc(80vh + 1rem)' : '1.25rem' }}
        >
          <Button
            data-testid="mobile-add-diagram-button"
            onClick={() => {
              captureEvent('diagram_created', { source: 'mobile_fab' })
              handleAddDiagram('mobile_fab')
            }}
            variant="ghost"
            size="default"
            className={cn(
              chromeFloatingActionClass(mode),
              'pointer-events-auto text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/30',
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      )}

      {contextMenu && (
        <>
          <div
            className="absolute inset-0 z-40"
            onMouseDown={() => dispatch({ type: 'ui/set-context-menu', menu: null })}
            onTouchStart={() => dispatch({ type: 'ui/set-context-menu', menu: null })}
            onContextMenu={(event) => {
              event.preventDefault()
              dispatch({ type: 'ui/set-context-menu', menu: null })
            }}
          />
          <div
            data-testid={contextMenu.type === 'diagram' ? 'diagram-context-menu' : 'canvas-context-menu'}
            className={cn(
              'absolute z-50 min-w-[160px] max-w-[200px] rounded-xl border p-1 shadow-xl',
              mode === 'dark'
                ? 'bg-[oklch(0.16_0.015_260)]/98 border-white/10 text-zinc-100'
                : 'bg-white/98 border-black/8 text-zinc-800',
            )}
            style={{
              // Clamp to screen so menu never clips off right or bottom edge
              left: Math.min(contextMenu.x, window.innerWidth - 210),
              top: Math.min(contextMenu.y, window.innerHeight - 180),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            {contextMenu.type === 'diagram' ? (
              <>
                <button data-testid="context-copy-button" type="button" onClick={handleContextMenuCopy} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', chromeMenuItemClass(mode))}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button data-testid="context-duplicate-button" type="button" onClick={handleContextMenuDuplicate} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', chromeMenuItemClass(mode))}>
                  <CopySimple className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button type="button" onClick={() => void handleContextMenuShare()} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', chromeMenuItemClass(mode))}>
                  <ShareNetwork className="w-3.5 h-3.5" /> Share link
                </button>
                <div className="my-1 h-px bg-black/8 dark:bg-white/8" />
                <button data-testid="context-delete-button" type="button" onClick={handleContextMenuDelete} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', chromeMenuItemClass(mode, { danger: true }))}>
                  <Trash className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            ) : (
              <>
                <button data-testid="context-paste-button" type="button" onClick={handleCanvasContextMenuPaste} disabled={!hasCopied} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', hasCopied ? chromeMenuItemClass(mode) : 'opacity-40 cursor-not-allowed')}>
                  <Copy className="w-3.5 h-3.5" /> Paste
                </button>
                <button data-testid="context-new-diagram-button" type="button" onClick={handleCanvasContextMenuNewDiagram} className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left', chromeMenuItemClass(mode))}>
                  <Plus className="w-3.5 h-3.5" /> New diagram
                </button>
              </>
            )}
          </div>
        </>
      )}

      <KeyboardHelp open={helpOpen} onOpenChange={(open) => dispatch({ type: 'ui/set-help-open', open })} />
    </div>
  )
}

function DiagramDropdown({
  diagrams,
  activeDiagramId,
  onSelectDiagram,
  onFocusDiagram,
  isDark,
}: {
  diagrams: { id: string; name: string }[]
  activeDiagramId: string | null
  onSelectDiagram: (diagramId: string) => void
  onFocusDiagram: (diagramId: string) => void
  isDark: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeDiagram = useMemo(
    () => diagrams.find((diagram) => diagram.id === activeDiagramId) ?? diagrams[0] ?? null,
    [activeDiagramId, diagrams],
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="diagram-selector-trigger"
        aria-label="Select active diagram"
        title="Select active diagram"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          chromeFloatingActionClass(isDark ? 'dark' : 'light'),
          'flex items-center gap-1 h-8 max-w-36 px-2 rounded-lg text-xs font-medium cursor-pointer text-ui-ink-soft dark:text-ui-ink-strong',
          open && 'bg-ui-surface-hover text-ui-ink-strong border-ui-border-strong',
        )}
      >
        <span className="truncate flex-1 text-left">
          {activeDiagram?.name?.trim() || 'Select diagram'}
        </span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          data-testid="diagram-selector-list"
          className={cn(
            'absolute right-0 bottom-full mb-2 z-50 min-w-[160px] max-w-[220px] overflow-hidden',
            chromePopoverClass(),
          )}
          style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          <div className="py-1">
            {diagrams.map((diagram, index) => {
              const active = diagram.id === activeDiagramId
              return (
                <button
                  key={diagram.id}
                  type="button"
                  data-testid={active ? 'diagram-selector-item-active' : `diagram-selector-item-${index + 1}`}
                  onClick={() => {
                    onSelectDiagram(diagram.id)
                    onFocusDiagram(diagram.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center px-3 py-1.5 text-xs cursor-pointer transition-colors',
                    active ? chromeMenuItemClass(isDark ? 'dark' : 'light', { active: true }) : chromeMenuItemClass(isDark ? 'dark' : 'light'),
                  )}
                >
                  <span className="truncate text-left font-medium">
                    {diagram.name?.trim() || `Diagram ${index + 1}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
