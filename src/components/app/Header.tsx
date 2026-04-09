import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  chromePillClass,
  chromeGlassPanelClass,
  chromeMenuItemClass,
  chromeDividerClass,
  chromeStatusClass,
  ChromeIconButton,
  ChromeTextButton,
} from '@/components/ui/app-chrome'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SidebarSimple,
  CodeSimple,
  ShareNetwork,
  SunHorizon,
  Moon,
  Question,
  Check,
  X,
  CaretDown,
  Books,
  Plus,
  FloppyDisk,
  FolderOpen,
  PencilSimple,
  Trash,
  Heart,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { copyShareUrl } from '@/lib/share'
import { ExportPopover } from '@/components/app/ExportPopover'
import type { AppMode, AppState, MermaidTheme, DiagramPage } from '@/types'
import { MERMAID_THEMES } from '@/types'
import { captureEvent } from '@/lib/analytics'
import { ACTIVE_THEME_PRESETS } from '@/lib/themePresets'

const THEME_SWATCHES: Record<string, [string, string, string]> = {
  // Built-in themes
  default: ['#4f46e5', '#ede9fe', '#999'],
  neutral: ['#666', '#e5e7eb', '#bbb'],
  dark: ['#cdd5e0', '#1e2a3a', '#81909f'],
  forest: ['#157520', '#d4edda', '#3d9e42'],
  base: ['#4f46e5', '#e8e6ff', '#888'],
  // Custom themes — hand-picked to be clearly visible (the raw theme colors are too light)
  wireframe: ['#555555', '#aaaaaa', '#cccccc'],
  corporate: ['#3b82f6', '#10b981', '#64b8e8'],
  blueprint: ['#1a4a9a', '#3b6fd4', '#93b4e8'],
  newsprint: ['#4a4540', '#8a7e6e', '#c8bfb0'],
  rosepine: ['#907aa9', '#d7827e', '#f2e9e1'],
}
// For any other active presets not manually specified above, fall back to theme variables
for (const [key, preset] of Object.entries(ACTIVE_THEME_PRESETS)) {
  if (key in THEME_SWATCHES) continue
  const tv = preset.themeVariables
  const primary = tv.primaryColor ?? '#4f46e5'
  const secondary = tv.secondaryColor ?? tv.mainBkg as string ?? '#eee'
  const tertiary = tv.tertiaryColor ?? tv.lineColor ?? '#888'
  THEME_SWATCHES[key] = [primary, secondary, tertiary]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HeaderProps {
  mode: AppMode
  mermaidTheme: MermaidTheme
  sidebarWidth?: number | null
  sidebarOpen: boolean
  docsOpen: boolean
  isMobile?: boolean
  svg: string
  code: string
  previewBg: string
  getShareState: () => AppState
  pages: DiagramPage[]
  activePageId: string
  activePage: DiagramPage
  onSelectPage: (id: string) => void
  onAddPage: () => string
  onRenamePage: (id: string, name: string) => void
  onDeletePage: (id: string) => void
  onSaveProject: () => void
  onLoadProject: () => void
  onResetWorkspace: () => Promise<void>
  onModeChange: (mode: AppMode) => void
  onMermaidThemeChange: (theme: MermaidTheme) => void
  onToggleSidebar: () => void
  onToggleDocs: () => void
  onOpenHelp: () => void
}

// ── Main Header — floating pill layout ────────────────────────────────────────

export function Header({
  mode,
  mermaidTheme,
  sidebarOpen,
  docsOpen,
  isMobile = false,
  svg,
  code,
  previewBg,
  getShareState,
  pages,
  activePageId,
  activePage,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onSaveProject,
  onLoadProject,
  onResetWorkspace,
  onModeChange,
  onMermaidThemeChange,
  onToggleSidebar,
  onToggleDocs,
  onOpenHelp,
  sidebarWidth,
}: HeaderProps) {
  const isDark = mode === 'dark'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleShare = useCallback(async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    try {
      await copyShareUrl(getShareState())
      captureEvent('share_link_copied')
      setCopyState('copied')
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2000)
    }
  }, [getShareState])

  const handleResetConfirm = useCallback(async () => {
    setResetting(true)
    try {
      await onResetWorkspace()
      captureEvent('workspace_reset')
      setResetOpen(false)
    } finally {
      setResetting(false)
    }
  }, [onResetWorkspace])

  const diagramById = useMemo(
    () => new Map(activePage.diagrams.map(a => [a.id, a])),
    [activePage.diagrams],
  )
  const activeDiagram = activePage.activeDiagramId ? diagramById.get(activePage.activeDiagramId) : undefined
  const exportName = activeDiagram?.name ?? activePage.name

  const pillClass = chromePillClass()

  return (
    <header className={cn(
      'absolute top-0 left-0 right-0 z-30 flex items-start pointer-events-none',
      isMobile ? 'flex-col px-2 pt-2 gap-1' : 'justify-between px-4 pt-4',
    )}>

      {/* Left pill: Logo + file actions + app label + pages */}
      <div
        className={cn(pillClass, 'gap-1', isMobile && 'w-full')}
        style={!isMobile ? (sidebarWidth ? { width: `${sidebarWidth}px` } : { width: 'clamp(320px, 34vw, 480px)' }) : undefined}
        data-testid="header-logo-pill"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 shrink-0">
          <img src="/favicon.svg" alt="" className="w-4 h-4" />
        </div>
        <span className="text-sm tracking-tight pl-0.5 shrink-0">
          <span className="font-semibold">Pretty</span><span className="font-medium text-primary ml-0.5">Fish</span>
        </span>

        <div className={cn(
          'hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0',
          isDark ? 'bg-primary/12 text-primary' : 'bg-primary/8 text-primary',
        )}>
          Mermaid Diagram Editor
        </div>

        <div className={cn('w-px h-4 mx-0.5 shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')} />

        <div className="flex items-center gap-1 shrink-0">
          <ChromeIconButton
            type="button"
            data-testid="open-project-button"
            aria-label="Open project"
            title="Open project"
            onClick={() => { captureEvent('project_loaded'); onLoadProject() }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </ChromeIconButton>
          <ChromeIconButton
            type="button"
            data-testid="save-project-button"
            aria-label="Save project"
            title="Save project"
            onClick={() => { captureEvent('project_saved'); onSaveProject() }}
          >
            <FloppyDisk className="w-3.5 h-3.5" />
          </ChromeIconButton>
          {!isMobile && (
          <ChromeIconButton
            type="button"
            data-testid="reset-workspace-button"
            aria-label="Reset workspace"
            title="Reset workspace"
            onClick={() => setResetOpen(true)}
          >
            <Trash className="w-3.5 h-3.5" />
          </ChromeIconButton>
          )}
        </div>

        <div className={cn('w-px h-4 mx-0.5 shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')} />

        <PagesDropdown
          pages={pages}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
          onAddPage={onAddPage}
          onRenamePage={onRenamePage}
          onDeletePage={onDeletePage}
          isDark={isDark}
        />

        {/* On mobile, merge toolbar items into the same pill */}
        {isMobile && (
          <>
            <div className="flex-1" />
            <ChromeIconButton
              data-testid="toggle-sidebar-button"
              aria-label={sidebarOpen ? 'Hide editor' : 'Show editor'}
              title={sidebarOpen ? 'Hide editor' : 'Show editor'}
              onClick={onToggleSidebar}
              active={sidebarOpen}
            >
              <CodeSimple className="w-3.5 h-3.5" />
            </ChromeIconButton>
            <ChromeIconButton
              data-testid="toggle-mode-button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => onModeChange(isDark ? 'light' : 'dark')}
            >
              {isDark ? <SunHorizon className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </ChromeIconButton>
            <ChromeIconButton
              data-testid="toggle-docs-button"
              aria-label={docsOpen ? 'Hide reference docs' : 'Show reference docs'}
              title={docsOpen ? 'Hide reference docs' : 'Show reference docs'}
              onClick={onToggleDocs}
              active={docsOpen}
            >
              <Books className="w-3.5 h-3.5" />
            </ChromeIconButton>
          </>
        )}
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset workspace?</DialogTitle>
            <DialogDescription>
              All pages and diagrams will be deleted and the workspace will be reset to its default state. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</Button>
            <Button data-testid="reset-workspace-confirm-button" variant="destructive" onClick={() => void handleResetConfirm()} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Center pill: Toolbar — desktop only */}
      {!isMobile && (
      <div className={pillClass}>
        {/* Sidebar toggle */}
        <ChromeIconButton
          data-testid="toggle-sidebar-button"
          aria-label={sidebarOpen ? 'Hide editor' : 'Show editor'}
          title={`${sidebarOpen ? 'Hide' : 'Show'} editor (Ctrl+\\)`}
          onClick={onToggleSidebar}
          active={sidebarOpen}
        >
          <SidebarSimple className="w-3.5 h-3.5" />
        </ChromeIconButton>

        <div className={chromeDividerClass()} />

        {/* Export */}
        <ExportPopover svg={svg} code={code} previewBg={previewBg} pageName={exportName} />

        {/* Share */}
        <ChromeTextButton
          data-testid="share-button"
          title="Copy shareable diagram link"
          onClick={handleShare}
          className={cn(
            copyState === 'copied' && chromeStatusClass('success'),
            copyState === 'error' && chromeStatusClass('danger'),
          )}
        >
          {copyState === 'copied' ? <><Check className="w-3 h-3" /> Copied!</> :
           copyState === 'error' ? <><X className="w-3 h-3" /> Failed</> :
           <><ShareNetwork className="w-3 h-3" /> Share</>}
        </ChromeTextButton>

        <div className={chromeDividerClass()} />

        <ThemeDropdown value={mermaidTheme} onChange={onMermaidThemeChange} isDark={isDark} />

        <ChromeIconButton
          data-testid="toggle-mode-button"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={`${isDark ? 'Light' : 'Dark'} mode (Ctrl+Shift+D)`}
          onClick={() => onModeChange(isDark ? 'light' : 'dark')}
        >
          {isDark ? <SunHorizon className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </ChromeIconButton>

        <div className={chromeDividerClass()} />

        {/* Docs toggle */}
        <ChromeIconButton
          data-testid="toggle-docs-button"
          aria-label={docsOpen ? 'Hide reference docs' : 'Show reference docs'}
          title="Reference docs"
          onClick={onToggleDocs}
          active={docsOpen}
        >
          <Books className="w-3.5 h-3.5" />
        </ChromeIconButton>

        {/* Help */}
        <ChromeIconButton
          data-testid="open-help-button"
          aria-label="Open keyboard shortcuts help"
          title="Shortcuts (?)"
          onClick={onOpenHelp}
        >
          <Question className="w-3.5 h-3.5" />
        </ChromeIconButton>

        <div className={chromeDividerClass()} />

        {/* Sponsor */}
        <a
          href="https://github.com/sponsors/pastelsky"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Sponsor Pretty Fish"
          title="Sponsor"
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer',
            'text-pink-500 dark:text-pink-400 hover:bg-ui-surface-hover',
          )}
        >
          <Heart className="w-3.5 h-3.5" weight="fill" />
        </a>
      </div>
      )}

      {/* Right spacer to balance logo */}
      {!isMobile && <div className="w-[100px]" />}
    </header>
  )
}

// ── Pages Dropdown ────────────────────────────────────────────────────────────

function PagesDropdown({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  isDark,
}: {
  pages: DiagramPage[]
  activePageId: string
  onSelectPage: (id: string) => void
  onAddPage: () => string
  onRenamePage: (id: string, name: string) => void
  onDeletePage: (id: string) => void
  isDark: boolean
}) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const pageById = useMemo(() => new Map(pages.map(p => [p.id, p])), [pages])
  const activePage = pageById.get(activePageId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const startRename = useCallback((id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftName(name)
    setRenamingId(id)
  }, [])

  const commitRename = useCallback(() => {
    if (renamingId && draftName.trim()) onRenamePage(renamingId, draftName.trim())
    setRenamingId(null)
  }, [renamingId, draftName, onRenamePage])

  const handleRenameKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setRenamingId(null)
  }, [commitRename])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        data-testid="pages-dropdown-trigger"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 h-6 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors w-full',
          'hover:bg-ui-surface-hover text-ui-ink-soft dark:text-ui-ink-strong',
          open && 'bg-ui-surface-hover',
        )}
      >
        <span className="truncate">{activePage?.name ?? 'Untitled'}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          data-testid="pages-dropdown-list"
          className={cn(
          'absolute top-full mt-2 z-50 min-w-[200px] max-w-[calc(100vw-2rem)] overflow-hidden',
          'left-0 right-auto',
          chromeGlassPanelClass(isDark ? 'dark' : 'light'),
        )}>
          <div className="py-1">
            {pages.map((page) => {
              const isActive = page.id === activePageId
              const isRenaming = renamingId === page.id
              return (
                <div
                  key={page.id}
                  data-testid={isActive ? 'page-item-active' : 'page-item'}
                  data-page-id={page.id}
                  className={cn(
                    'group px-3 py-1.5 cursor-pointer transition-colors',
                    isActive
                      ? chromeMenuItemClass(isDark ? 'dark' : 'light', { active: true })
                      : chromeMenuItemClass(isDark ? 'dark' : 'light'),
                  )}
                  onClick={() => { if (!isRenaming) { onSelectPage(page.id); setOpen(false) } }}
                >
                  <div className="flex items-center gap-2">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKey}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-semibold min-w-0"
                      />
                    ) : (
                      <span className="flex-1 truncate text-xs font-semibold" title={page.name}>
                        {page.name}
                      </span>
                    )}
                    {!isRenaming && (
                      <button
                        type="button"
                        data-testid="page-rename-button"
                        aria-label={`Rename ${page.name}`}
                        onClick={e => startRename(page.id, page.name, e)}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 inline-flex h-5 w-5 items-center justify-center rounded-md transition-all',
                          'text-ui-ink-muted hover:text-ui-ink-soft hover:bg-ui-surface-hover dark:hover:text-ui-ink-strong',
                        )}
                      >
                        <PencilSimple className="w-3 h-3" />
                      </button>
                    )}
                    {!isRenaming && pages.length > 1 && (
                      <button
                        type="button"
                        data-testid="page-delete-button"
                        aria-label={`Delete ${page.name}`}
                        onClick={e => { e.stopPropagation(); onDeletePage(page.id) }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 inline-flex h-5 w-5 items-center justify-center rounded-md transition-all',
                          'text-ui-ink-muted hover:text-ui-danger hover:bg-ui-surface-hover dark:hover:text-ui-danger',
                        )}
                      >
                        <X weight="bold" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className={cn('mx-2 my-1 h-px', chromeDividerClass())} />
            <button
              data-testid="page-add-button"
              onClick={() => { captureEvent('page_added'); onAddPage(); setOpen(false) }}
              className={cn(
                'flex items-center gap-1.5 w-full px-3 py-1.5 text-xs cursor-pointer transition-colors',
                chromeMenuItemClass(isDark ? 'dark' : 'light', { muted: true }),
              )}
            >
              <Plus className="w-3 h-3" /> New page
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


function ThemeDropdown({ value, onChange, isDark }: { value: MermaidTheme; onChange: (theme: MermaidTheme) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = MERMAID_THEMES.find(t => t.value === value) ?? MERMAID_THEMES[0]!
  const currentSw = THEME_SWATCHES[value]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="theme-dropdown-trigger"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-lg border text-xs cursor-pointer transition-colors',
          'bg-ui-surface-elevated border-ui-border-soft text-ui-ink-strong hover:bg-ui-surface-hover',
          open && 'bg-ui-surface-hover',
        )}
      >
        {currentSw && (
          <span className="flex items-center gap-0.5 shrink-0">
            {currentSw.map((c, i) => (
              <span key={i} className={cn('w-2.5 h-2.5 rounded-full border', isDark ? 'border-white/10' : 'border-black/10')} style={{ background: c }} />
            ))}
          </span>
        )}
        <span className="max-w-[90px] truncate">{current.label}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          data-testid="theme-dropdown-list"
          className={cn(
          'absolute top-full left-0 mt-2 z-50 min-w-[190px] overflow-hidden',
          chromeGlassPanelClass(isDark ? 'dark' : 'light'),
        )}>
          <div className="py-1 max-h-[70vh] overflow-y-auto">
            {MERMAID_THEMES.map((t, idx) => {
              const sw = THEME_SWATCHES[t.value]
              const active = t.value === value
              const isCustomStart = idx === 5
              return (
                <div key={t.value}>
                  {isCustomStart && (
                    <div className={cn('mx-2 my-1 h-px', isDark ? 'bg-white/8' : 'bg-black/8')} />
                  )}
                  <button
                    type="button"
                    data-testid={active ? 'theme-option-active' : 'theme-option'}
                    data-theme-value={String(t.value)}
                    onClick={() => { captureEvent('theme_changed', { theme: t.value }); onChange(t.value as MermaidTheme); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors',
                      active
                        ? chromeMenuItemClass(isDark ? 'dark' : 'light', { active: true })
                        : chromeMenuItemClass(isDark ? 'dark' : 'light'),
                    )}
                  >
                    {sw && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        {sw.map((c, i) => (
                          <span key={i} className={cn('w-2.5 h-2.5 rounded-full border', isDark ? 'border-white/10' : 'border-black/10')} style={{ background: c }} />
                        ))}
                      </span>
                    )}
                    <span className="flex-1 text-left truncate">{t.label}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
