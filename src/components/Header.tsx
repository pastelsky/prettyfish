import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { copyShareUrl } from '../lib/share'
import { ExportPopover } from './ExportPopover'
import type { AppMode, AppState, MermaidTheme, DiagramPage } from '../types'
import { MERMAID_THEMES } from '../types'
import { CUSTOM_THEME_PRESETS } from '@/lib/themePresets'

const THEME_SWATCHES: Record<string, [string, string, string]> = {
  default: ['#4f46e5', '#ede9fe', '#999'],
  neutral: ['#666', '#e5e7eb', '#bbb'],
  dark: ['#cdd5e0', '#1e2a3a', '#81909f'],
  forest: ['#157520', '#d4edda', '#3d9e42'],
  base: ['#4f46e5', '#e8e6ff', '#888'],
}
for (const [key, preset] of Object.entries(CUSTOM_THEME_PRESETS)) {
  const tv = preset.themeVariables
  const primary = (tv.primaryBorderColor && tv.primaryBorderColor !== tv.primaryColor)
    ? tv.primaryBorderColor
    : (tv.primaryColor ?? '#4f46e5')
  const secondary = tv.secondaryBorderColor ?? tv.secondaryColor ?? tv.mainBkg ?? '#eee'
  const tertiary = tv.tertiaryBorderColor ?? tv.lineColor ?? '#888'
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
  onModeChange,
  onMermaidThemeChange,
  onToggleSidebar,
  onToggleDocs,
  onOpenHelp,
  sidebarWidth,
}: HeaderProps) {
  const isDark = mode === 'dark'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleShare = async () => {
    try {
      await copyShareUrl(getShareState())
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  // Export filename: use active artboard name, fall back to page name
  const activeArtboard = activePage.artboards.find(a => a.id === activePage.activeArtboardId)
  const exportName = activeArtboard?.name ?? activePage.name

  const pillClass = cn(
    'pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-xl border backdrop-blur-sm',
    isDark
      ? 'bg-[oklch(0.16_0.015_260)]/82 border-white/8'
      : 'bg-white/82 border-black/6',
  )

  return (
    <div className={cn(
      'absolute top-0 left-0 right-0 z-30 flex items-start pointer-events-none',
      isMobile ? 'justify-between px-2 pt-2 gap-1' : 'justify-between px-4 pt-4',
    )}>

      {/* Left pill: Logo + file actions + app label + pages */}
      <div
        className={cn(pillClass, 'gap-1')}
        style={sidebarWidth ? { width: `${sidebarWidth}px` } : { width: 'clamp(320px, 34vw, 480px)' }}
        data-testid="header-logo-pill"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 shrink-0">
          <img src="/favicon.svg" alt="" className="w-4 h-4" />
        </div>
        <span className="text-sm tracking-tight pl-0.5 shrink-0">
          <span className="font-semibold">Pretty</span><span className="italic font-medium text-primary ml-0.5">Fish</span>
        </span>

        <div className={cn(
          'hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0',
          isDark ? 'bg-primary/12 text-primary' : 'bg-primary/8 text-primary',
        )}>
          Mermaid Diagram Editor
        </div>

        <div className={cn('w-px h-4 mx-0.5 shrink-0', isDark ? 'bg-white/10' : 'bg-black/10')} />

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onLoadProject}
                className={cn(isDark ? 'text-zinc-300 hover:text-zinc-100 hover:bg-white/8' : 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5')}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Open project</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onSaveProject}
                className={cn(isDark ? 'text-zinc-300 hover:text-zinc-100 hover:bg-white/8' : 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5')}
              >
                <FloppyDisk className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save project</TooltipContent>
          </Tooltip>
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
      </div>

      {/* Center pill: Toolbar */}
      <div className={pillClass}>
        {/* Sidebar toggle */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="icon-sm"
              className={cn('rounded-lg', sidebarOpen && (isDark ? 'bg-white/8' : 'bg-black/5'))}
            >
              {isMobile
                ? <CodeSimple className="w-3.5 h-3.5" />
                : <SidebarSimple className="w-3.5 h-3.5" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{sidebarOpen ? 'Hide' : 'Show'} editor{!isMobile && ' (⌘\\)'}</TooltipContent>
        </Tooltip>

        <div className={cn('w-px h-4 mx-0.5', isDark ? 'bg-white/8' : 'bg-black/6')} />

        {/* Export */}
        <ExportPopover svg={svg} code={code} previewBg={previewBg} isDark={isDark} pageName={exportName} />

        {/* Share */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={handleShare}
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 px-2 text-xs gap-1 rounded-lg font-medium',
                copyState === 'copied' && 'text-emerald-500',
                copyState === 'error' && 'text-red-500',
              )}
            >
              {copyState === 'copied' ? <><Check className="w-3 h-3" /> Hooked!</> :
               copyState === 'error' ? <><X className="w-3 h-3" /> Failed</> :
               <><ShareNetwork className="w-3 h-3" /> Share</>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy shareable diagram link</TooltipContent>
        </Tooltip>

        <div className={cn('w-px h-4 mx-0.5', isDark ? 'bg-white/8' : 'bg-black/6')} />

        <ThemeDropdown value={mermaidTheme} onChange={onMermaidThemeChange} isDark={isDark} />

        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={() => onModeChange(isDark ? 'light' : 'dark')}
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
            >
              {isDark ? <SunHorizon className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isDark ? 'Light mode' : 'Dark mode'} (Ctrl⇧D)</TooltipContent>
        </Tooltip>

        <div className={cn('w-px h-4 mx-0.5', isDark ? 'bg-white/8' : 'bg-black/6')} />

        {/* Docs toggle */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onToggleDocs}
              variant="ghost"
              size="icon-sm"
              className={cn('rounded-lg', docsOpen && (isDark ? 'bg-white/8' : 'bg-black/5'))}
            >
              <Books className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reference docs</TooltipContent>
        </Tooltip>

        {/* Help */}
        {!isMobile && <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onOpenHelp}
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
            >
              <Question className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Shortcuts (?)</TooltipContent>
        </Tooltip>}
      </div>

      {/* Right spacer to balance logo */}
      {!isMobile && <div className="w-[100px]" />}
    </div>
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
  const activePage = pages.find(p => p.id === activePageId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 h-6 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
          isDark ? 'hover:bg-white/8 text-zinc-200' : 'hover:bg-black/5 text-zinc-700',
          open && (isDark ? 'bg-white/8' : 'bg-black/5'),
        )}
      >
        <span className="max-w-[100px] truncate">{activePage?.name ?? 'Untitled'}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-2 z-50 min-w-[200px] rounded-xl border overflow-hidden',
          isDark ? 'bg-[oklch(0.17_0.018_260)] border-white/12' : 'bg-white border-black/10',
        )} style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div className="py-1">
            {pages.map((page) => {
              const isActive = page.id === activePageId
              const isRenaming = renamingId === page.id
              return (
                <div
                  key={page.id}
                  className={cn(
                    'group px-3 py-1.5 cursor-pointer transition-colors',
                    isActive
                      ? (isDark ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary')
                      : (isDark ? 'text-zinc-100 hover:bg-white/6' : 'text-zinc-700 hover:bg-black/4'),
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
                        aria-label={`Rename ${page.name}`}
                        onClick={e => startRename(page.id, page.name, e)}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 inline-flex h-5 w-5 items-center justify-center rounded-md transition-all',
                          isDark
                            ? 'text-zinc-500 hover:text-zinc-200 hover:bg-white/8'
                            : 'text-zinc-400 hover:text-zinc-700 hover:bg-black/5',
                        )}
                      >
                        <PencilSimple className="w-3 h-3" />
                      </button>
                    )}
                    {!isRenaming && pages.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Delete ${page.name}`}
                        onClick={e => { e.stopPropagation(); onDeletePage(page.id) }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 inline-flex h-5 w-5 items-center justify-center rounded-md transition-all',
                          isDark
                            ? 'text-zinc-500 hover:text-red-300 hover:bg-white/8'
                            : 'text-zinc-400 hover:text-red-600 hover:bg-black/5',
                        )}
                      >
                        <X weight="bold" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className={cn('mx-2 my-1 h-px', isDark ? 'bg-white/8' : 'bg-black/6')} />
            <button
              onClick={() => { onAddPage(); setOpen(false) }}
              className={cn(
                'flex items-center gap-1.5 w-full px-3 py-1.5 text-xs cursor-pointer transition-colors',
                isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-white/6' : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/4',
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
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = MERMAID_THEMES.find(t => t.value === value) ?? MERMAID_THEMES[0]!
  const currentSw = THEME_SWATCHES[value]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-lg border text-xs cursor-pointer transition-colors',
          isDark ? 'bg-zinc-950 border-white/10 text-zinc-100 hover:bg-white/6' : 'bg-white border-black/10 text-zinc-800 hover:bg-black/4',
          open && (isDark ? 'bg-white/8' : 'bg-black/5'),
        )}
      >
        {currentSw && (
          <span className="flex items-center gap-0.5 shrink-0">
            {currentSw.map((c, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: c }} />
            ))}
          </span>
        )}
        <span className="max-w-[90px] truncate">{current.label}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-2 z-50 min-w-[190px] rounded-xl border overflow-hidden',
          isDark ? 'bg-[oklch(0.17_0.018_260)] border-white/12' : 'bg-white border-black/10',
        )} style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div className="py-1">
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
                    onClick={() => { onChange(t.value as MermaidTheme); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors',
                      active
                        ? (isDark ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary')
                        : (isDark ? 'text-zinc-100 hover:bg-white/6' : 'text-zinc-700 hover:bg-black/4'),
                    )}
                  >
                    {sw && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        {sw.map((c, i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: c }} />
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
