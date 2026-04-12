import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { SponsorNudge } from './SponsorNudge'
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
  PlugsConnected,
  Trash,
  GithubLogo,
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
  showSponsorNudge?: boolean
  onSponsorNudgeDismiss?: () => void
  sponsorNudgeShowCount?: number
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
  onOpenMcp: () => void
  mcpConnected: boolean
  mcpSessionReady?: boolean
}

// ── MCP Button ────────────────────────────────────────────────────────────────

function McpButton({ onOpenMcp, mcpConnected, mcpSessionReady, onTripleClick }: { onOpenMcp: () => void; mcpConnected: boolean; mcpSessionReady?: boolean; onTripleClick?: () => void }) {
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = () => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0
      onTripleClick?.()
      return
    }
    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current
      clickCountRef.current = 0
      if (count === 1) { captureEvent('mcp_panel_opened'); onOpenMcp() }
    }, 300)
  }

  return (
    <div className={chromePillClass()}>
      <ChromeTextButton
        data-testid="open-mcp-button"
        aria-label={mcpConnected ? 'AI Agent Connected — click to manage' : mcpSessionReady ? 'Waiting for agent — paste the MCP URL into your AI agent' : 'Connect AI Agent'}
        title={mcpConnected ? 'AI Agent is connected and active' : mcpSessionReady ? 'Session open — paste the MCP URL into your AI agent to connect' : 'Connect a local AI agent to create diagrams via MCP'}
        onClick={handleClick}
        className={cn(mcpConnected ? chromeStatusClass('success') : mcpSessionReady ? chromeStatusClass('warning') : '')}
      >
        <PlugsConnected className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">{mcpConnected ? 'Agent Connected' : mcpSessionReady ? 'Waiting for Agent' : 'Connect AI Agent'}</span>
        {!mcpConnected && !mcpSessionReady && (
          <span className="hidden lg:inline text-[9px] font-semibold tracking-wide uppercase px-1 py-0.5 rounded bg-amber-400/20 text-amber-600 dark:text-amber-400 leading-none">beta</span>
        )}
      </ChromeTextButton>
    </div>
  )
}

// ── Main Header — floating pill layout ────────────────────────────────────────

export function Header({
  showSponsorNudge = false,
  onSponsorNudgeDismiss,
  sponsorNudgeShowCount = 0,
  mcpSessionReady = false,
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
  onOpenMcp,
  mcpConnected,
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
        <img src="/favicon.svg" alt="" className="w-6 h-6 shrink-0" />
        <span className="text-sm tracking-tight pl-0.5 shrink-0">
          <span className="font-semibold">Pretty</span><span className="font-medium text-primary ml-0.5">Fish</span>
        </span>

        {/* App badge — hidden below 1024px to save space */}
        {!isMobile && (
        <div className={cn(
          'hidden lg:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0',
          isDark ? 'bg-primary/12 text-primary' : 'bg-primary/8 text-primary',
        )}>
          Mermaid Diagram Editor
        </div>
        )}

        {/* File actions — hidden below 1024px */}
        {!isMobile && (
          <>
            <div className={cn('hidden lg:block w-px h-4 mx-0.5 shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')} />
            <div className="hidden lg:flex items-center gap-1 shrink-0">
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
              <ChromeIconButton
                type="button"
                data-testid="reset-workspace-button"
                aria-label="Reset workspace"
                title="Reset workspace"
                onClick={() => setResetOpen(true)}
              >
                <Trash className="w-3.5 h-3.5" />
              </ChromeIconButton>
            </div>
            <div className={cn('hidden lg:block w-px h-4 mx-0.5 shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')} />
          </>
        )}

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

        {/* Share — icon+text on desktop, icon-only on tablet */}
        <ChromeTextButton
          data-testid="share-button"
          title="Copy shareable diagram link"
          onClick={handleShare}
          className={cn(
            copyState === 'copied' && chromeStatusClass('success'),
            copyState === 'error' && chromeStatusClass('danger'),
          )}
        >
          {copyState === 'copied' ? <><Check className="w-3 h-3" /><span className="hidden lg:inline"> Copied!</span></> :
           copyState === 'error' ? <><X className="w-3 h-3" /><span className="hidden lg:inline"> Failed</span></> :
           <><ShareNetwork className="w-3 h-3" /><span className="hidden lg:inline"> Share</span></>}
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

        {/* Help — hidden below 1024px */}
        <ChromeIconButton
          data-testid="open-help-button"
          aria-label="Open keyboard shortcuts help"
          title="Shortcuts (?)"
          onClick={onOpenHelp}
          className="hidden lg:inline-flex"
        >
          <Question className="w-3.5 h-3.5" />
        </ChromeIconButton>

        <div className={cn(chromeDividerClass(), 'hidden lg:block')} />

        {/* GitHub — hidden below 1024px */}
        <a
          href="https://github.com/pastelsky/prettyfish"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pretty Fish on GitHub"
          title="Star on GitHub"
          className={cn(
            'hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer',
            'text-ui-ink-muted hover:text-ui-ink-strong hover:bg-ui-surface-hover',
          )}
        >
          <GithubLogo className="w-3.5 h-3.5" />
        </a>

        {/* Sponsor — hidden below 1024px */}
        <a
          href="https://github.com/sponsors/pastelsky"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Sponsor Pretty Fish"
          title="Sponsor"
          className={cn(
            'hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer',
            'text-pink-500 dark:text-pink-400 hover:bg-ui-surface-hover',
          )}
        >
          <Heart className="w-3.5 h-3.5" weight="fill" />
        </a>
      </div>
      )}

      {!isMobile && (
        <div className="flex flex-col items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <McpButton
              onOpenMcp={onOpenMcp}
              mcpConnected={mcpConnected}
              mcpSessionReady={mcpSessionReady}
              onTripleClick={onSponsorNudgeDismiss ? () => {
                // Triple-click: reset nudge state for testing then show it
                try { localStorage.removeItem('prettyfish:sponsor-nudge') } catch { /* ignore */ }
                onSponsorNudgeDismiss()
                setTimeout(() => window.dispatchEvent(new CustomEvent('prettyfish:show-nudge')), 50)
              } : undefined}
            />
          </div>
          <SponsorNudge
            visible={showSponsorNudge}
            onDismiss={onSponsorNudgeDismiss ?? (() => {})}
            showCount={sponsorNudgeShowCount}
          />
        </div>
      )}
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const pageById = useMemo(() => new Map(pages.map(p => [p.id, p])), [pages])
  const activePage = pageById.get(activePageId)

  // Position portal below trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 8, left: rect.left })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        dropdownRef.current && !dropdownRef.current.contains(t)
      ) setOpen(false)
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

  const dropdown = open && dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      data-testid="pages-dropdown-list"
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      className={cn('w-56', chromeGlassPanelClass(isDark ? 'dark' : 'light'))}
    >
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
                'group flex items-center gap-1 px-3 py-1.5 cursor-pointer transition-colors',
                isActive
                  ? chromeMenuItemClass(isDark ? 'dark' : 'light', { active: true })
                  : chromeMenuItemClass(isDark ? 'dark' : 'light'),
              )}
              onClick={() => { if (!isRenaming) { onSelectPage(page.id); setOpen(false) } }}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKey}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-semibold"
                />
              ) : (
                <span className="flex-1 min-w-0 truncate text-xs font-semibold" title={page.name}>
                  {page.name}
                </span>
              )}
              {/* Action buttons — only shown on hover, fixed width so they don't cause layout shift */}
              {!isRenaming && (
                <span className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    data-testid="page-rename-button"
                    aria-label={`Rename ${page.name}`}
                    onClick={e => startRename(page.id, page.name, e)}
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                      'text-ui-ink-muted hover:text-ui-ink-soft hover:bg-ui-surface-hover dark:hover:text-ui-ink-strong',
                    )}
                  >
                    <PencilSimple className="w-3 h-3" />
                  </button>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      data-testid="page-delete-button"
                      aria-label={`Delete ${page.name}`}
                      onClick={e => { e.stopPropagation(); onDeletePage(page.id) }}
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                        'text-ui-ink-muted hover:text-ui-danger hover:bg-ui-surface-hover dark:hover:text-ui-danger',
                      )}
                    >
                      <X weight="bold" className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}
            </div>
          )
        })}
        <div className={cn('mx-2 my-1 h-px', isDark ? 'bg-white/8' : 'bg-black/8')} />
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
    </div>,
    document.body
  ) : null

  return (
    <div className="flex-1 min-w-0">
      <button
        ref={triggerRef}
        data-testid="pages-dropdown-trigger"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 h-6 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors w-full min-w-0',
          'hover:bg-ui-surface-hover text-ui-ink-soft dark:text-ui-ink-strong',
          open && 'bg-ui-surface-hover',
        )}
      >
        <span className="flex-1 min-w-0 truncate text-left" title={activePage?.name}>
          {activePage?.name ?? 'Untitled'}
        </span>
        <CaretDown className={cn('w-3 h-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {dropdown}
    </div>
  )
}


function ThemeDropdown({ value, onChange, isDark }: { value: MermaidTheme; onChange: (theme: MermaidTheme) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  // Position the portal dropdown below the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 8, left: rect.left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = MERMAID_THEMES.find(t => t.value === value) ?? MERMAID_THEMES[0]!
  const currentSw = THEME_SWATCHES[value]

  // Portal dropdown rendered at document.body level — escapes the header pill's
  // backdrop-filter stacking context so our own backdrop-filter blurs the real canvas.
  const dropdown = open && dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      data-testid="theme-dropdown-list"
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      className={cn('min-w-[190px]', chromeGlassPanelClass(isDark ? 'dark' : 'light'))}
    >
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
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
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
        <span className="hidden lg:inline max-w-[90px] truncate">{current.label}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {dropdown}
    </div>
  )
}
