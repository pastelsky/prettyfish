import { useState, useRef, useEffect } from 'react'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { copyShareUrl } from '../lib/share'
import { ExportPopover } from './ExportPopover'
import { PagesDropdown } from './PagesDropdown'
import type { AppMode, AppState, MermaidTheme, DiagramPage, DiagramFolder } from '../types'
import { MERMAID_THEMES } from '../types'
import { CUSTOM_THEME_PRESETS } from '@/lib/themePresets'

/** Color swatches for theme preview — [primary, secondary, accent/line] */
const THEME_SWATCHES: Record<string, [string, string, string]> = {
  default: ['#4f46e5', '#eef2ff', '#6b7280'],
  neutral: ['#6b7280', '#f3f4f6', '#9ca3af'],
  dark: ['#1f2937', '#374151', '#9ca3af'],
  forest: ['#228b22', '#e6f4e6', '#2d8f2d'],
  base: ['#4f46e5', '#ffffff', '#6b7280'],
}
// Derive custom theme swatches from their themeVariables
for (const [key, preset] of Object.entries(CUSTOM_THEME_PRESETS)) {
  const tv = preset.themeVariables
  // For themes like Blueprint where primaryColor is a light fill, use the border color as the swatch
  const primary = (tv.primaryBorderColor && tv.primaryBorderColor !== tv.primaryColor)
    ? tv.primaryBorderColor
    : (tv.primaryColor ?? '#4f46e5')
  const secondary = tv.secondaryBorderColor ?? tv.secondaryColor ?? tv.mainBkg ?? '#eee'
  const tertiary = tv.tertiaryBorderColor ?? tv.lineColor ?? '#888'
  THEME_SWATCHES[key] = [primary, secondary, tertiary]
}

interface HeaderProps {
  mode: AppMode
  mermaidTheme: MermaidTheme
  sidebarOpen: boolean
  docsOpen: boolean
  isMobile?: boolean
  svg: string
  code: string
  previewBg: string
  pageName: string
  getState: () => AppState
  pages: DiagramPage[]
  folders: DiagramFolder[]
  activePageId: string
  onSelectPage: (id: string) => void
  onAddPage: () => string
  onRenamePage: (id: string, name: string) => void
  onDeletePage: (id: string) => void
  onReorderPages: (from: number, to: number) => void
  onAddFolder: (name: string) => string
  onDeleteFolder: (id: string) => void
  onRenameFolder: (id: string, name: string) => void
  onToggleFolderCollapsed: (id: string) => void
  onMovePageToFolder: (pageId: string, folderId: string | null) => void
  onModeChange: (mode: AppMode) => void
  onMermaidThemeChange: (theme: MermaidTheme) => void
  onToggleSidebar: () => void
  onToggleDocs: () => void
  onOpenHelp: () => void
}

export function Header({ pageName,
  mode,
  mermaidTheme,
  sidebarOpen,
  docsOpen,
  isMobile = false,
  svg,
  code,
  previewBg,
  getState,
  pages,
  folders,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onReorderPages,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  onToggleFolderCollapsed,
  onMovePageToFolder,
  onModeChange,
  onMermaidThemeChange,
  onToggleSidebar,
  onToggleDocs,
  onOpenHelp,
}: HeaderProps) {
  const isDark = mode === 'dark'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleShare = async () => {
    try {
      await copyShareUrl(getState())
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const pillClass = cn(
    'pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-xl border',
    isDark
      ? 'bg-[oklch(0.16_0.015_260)]/95 border-white/8'
      : 'bg-white/95 border-black/6',
  )

  return (
    <div className={cn(
      'absolute top-0 left-0 right-0 z-30 flex items-start pointer-events-none',
      isMobile ? 'justify-between px-2 pt-2 gap-1' : 'justify-between px-4 pt-3',
    )}>

      {/* Left: Logo pill */}
      <div className={pillClass}>
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15">
          <img src="/favicon.svg" alt="" className="w-4 h-4" />
        </div>
        <span className="text-sm tracking-tight pl-0.5">
          <span className="font-semibold">Pretty</span><span className="font-serif italic text-primary ml-0.5">Fish</span>
        </span>
        <span className={cn(
          'text-[10px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded-full ml-0.5 hidden sm:inline',
          isDark ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary',
        )}>
          Mermaid Diagram Editor
        </span>
      </div>

      {/* Pages dropdown — separate pill after logo */}
      <div className={pillClass}>
        <PagesDropdown
          pages={pages}
          folders={folders}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
          onAddPage={onAddPage}
          onRenamePage={onRenamePage}
          onDeletePage={onDeletePage}
          onReorderPages={onReorderPages}
          onAddFolder={onAddFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
          onToggleFolderCollapsed={onToggleFolderCollapsed}
          onMovePageToFolder={onMovePageToFolder}
          isDark={isDark}
        />
      </div>

      {/* Center: Toolbar pill */}
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

        {/* Theme selector — hidden on mobile */}
        <ThemeDropdown
          value={mermaidTheme}
          onChange={onMermaidThemeChange}
          isDark={isDark}
        />

        <div className={cn('w-px h-4 mx-0.5', isDark ? 'bg-white/8' : 'bg-black/6')} />

        {/* Export — inline popover */}
        <ExportPopover svg={svg} code={code} previewBg={previewBg} isDark={isDark} pageName={pageName} />

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
          <TooltipContent side="bottom">Copy shareable link</TooltipContent>
        </Tooltip>

        <div className={cn('w-px h-4 mx-0.5', isDark ? 'bg-white/8' : 'bg-black/6')} />

        {/* Dark/light mode */}
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
          <TooltipContent side="bottom">{isDark ? 'Light mode' : 'Dark mode'} (⌘⇧D)</TooltipContent>
        </Tooltip>

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
          <TooltipContent side="bottom">Reference docs (⌘⇧R)</TooltipContent>
        </Tooltip>

        {/* Help — hidden on mobile */}
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

      {/* Right: spacer to balance logo — hidden on mobile */}
      {!isMobile && <div className="w-[100px]" />}
    </div>
  )
}


// ── Theme Dropdown ────────────────────────────────────────────────────────────

function ThemeDropdown({
  value,
  onChange,
  isDark,
}: {
  value: MermaidTheme
  onChange: (t: MermaidTheme) => void
  isDark: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = MERMAID_THEMES.find(t => t.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <span className={cn('text-xs font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        Theme
      </span>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium cursor-pointer transition-colors',
          isDark
            ? 'bg-white/5 hover:bg-white/10 text-zinc-200'
            : 'bg-black/4 hover:bg-black/7 text-zinc-700',
          open && (isDark ? 'bg-white/10' : 'bg-black/7'),
        )}
      >
        {(() => { const sw = THEME_SWATCHES[value]; return sw ? (
          <span className="flex gap-px shrink-0">
            <span className="w-2 h-2 rounded-full border border-black/10" style={{ background: sw[0] }} />
            <span className="w-2 h-2 rounded-full border border-black/10" style={{ background: sw[1] }} />
          </span>
        ) : null })()}
        {current?.label ?? value}
        <CaretDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1.5 z-50 min-w-[120px] rounded-lg border overflow-hidden',
          isDark
            ? 'bg-[oklch(0.17_0.018_260)] border-white/12'
            : 'bg-white border-black/10',
        )}
        style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div className="py-1">
            {/* Built-in themes */}
            <div className={cn('px-3 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-widest', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Built-in</div>
            {MERMAID_THEMES.filter(t => t.group === 'builtin').map((t) => {
              const isActive = t.value === value
              const sw = THEME_SWATCHES[t.value]
              return (
                <button
                  key={t.value}
                  onClick={() => { onChange(t.value); setOpen(false) }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-xs cursor-pointer transition-colors text-left',
                    isActive
                      ? (isDark ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary')
                      : (isDark ? 'text-zinc-100 hover:bg-white/6' : 'text-zinc-700 hover:bg-black/4'),
                  )}
                >
                  {sw && <span className="flex gap-0.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[0] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[1] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[2] }} />
                  </span>}
                  <span className="flex-1">{t.label}</span>
                  {isActive && <Check className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
            {/* Separator */}
            <div className={cn('mx-2 my-1 h-px', isDark ? 'bg-white/8' : 'bg-black/6')} />
            {/* Custom themes */}
            <div className={cn('px-3 pt-0.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Custom</div>
            {MERMAID_THEMES.filter(t => t.group === 'custom').map((t) => {
              const isActive = t.value === value
              const sw = THEME_SWATCHES[t.value]
              return (
                <button
                  key={t.value}
                  onClick={() => { onChange(t.value); setOpen(false) }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-xs cursor-pointer transition-colors text-left',
                    isActive
                      ? (isDark ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary')
                      : (isDark ? 'text-zinc-100 hover:bg-white/6' : 'text-zinc-700 hover:bg-black/4'),
                  )}
                >
                  {sw && <span className="flex gap-0.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[0] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[1] }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: sw[2] }} />
                  </span>}
                  <span className="flex-1">{t.label}</span>
                  {isActive && <Check className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
