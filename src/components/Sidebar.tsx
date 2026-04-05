import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Accordion } from '@base-ui/react/accordion'
import CodeMirror from '@uiw/react-codemirror'
import { mermaidFallbackLanguage } from '@/lib/mermaidHighlight'
import { mermaidAltClickExtension } from '@/lib/mermaidAltClick'
import type { TokenRef } from '@/lib/mermaidTokenLookup'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { githubLight } from '@uiw/codemirror-theme-github'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { EditorView } from '@codemirror/view'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  GearSix,
  CaretUp,
  CaretDown,
  WarningCircle,
  ArrowRight,
  CopySimple,
  Check,
} from '@phosphor-icons/react'
import { formatMermaid } from 'mermaid-formatter'

// Hoisted RegExp patterns for spacifyMermaid (rule 7.10 — hoist RegExp creation)
const RE_COMMENT = /^\s*%%/
const RE_DIAGRAM_DECL = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|xychart-beta|quadrantChart|requirementDiagram)\b/
const RE_ARROW_LABEL_PRE = /(\S)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\|)/g
const RE_PIPE_SPACE = /(\|)(\S)/g
const RE_ARROW_NODE = /(\]|\)|\}|[a-zA-Z0-9_"])(\s*)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\s*)(\[|\(|\{|[a-zA-Z0-9_"])/g
const RE_SEQ_ARROW = /(\S)(\s*)(--?>>?|--?>|--?x|--?\))([\s:])/

/** Add spaces around arrows and operators in mermaid code */
function spacifyMermaid(code: string): string {
  return code.split('\n').map(line => {
    // Skip comment lines
    if (RE_COMMENT.test(line)) return line
    // Skip lines that are just diagram declarations
    if (RE_DIAGRAM_DECL.test(line.trim())) return line

    // Add spaces around arrow operators (but not inside strings or labels)
    // Match mermaid arrows: -->, --->, -.->, -.-, ==>, ===>, --x, --o, <--, etc.
    // Careful not to break |label| or [text] or {text} or (text)
    let result = line
    // Arrows with text labels like -->|text| — space before arrow, after closing |
    result = result.replace(RE_ARROW_LABEL_PRE, '$1 $2$3')
    result = result.replace(RE_PIPE_SPACE, '$1 $2')
    // Regular arrows without labels
    result = result.replace(RE_ARROW_NODE,
      (_, before, _s1, arrow, _s2, after) => `${before} ${arrow} ${after}`)
    // Sequence diagram arrows: ->>, ->, -->, -->>, -x, --)
    result = result.replace(RE_SEQ_ARROW, (_, before, _s, arrow, after) => `${before} ${arrow}${after}`)
    return result
  }).join('\n')
}
import { cn } from '@/lib/utils'
import { pfDebug } from '@/lib/debug'
import { ConfigPanel } from '@/components/ConfigPanel'
import { TemplateGallery } from '@/components/TemplateGallery'
import type { AppMode, DiagramConfig, MermaidRenderError } from '../types'


// ── CodeMirror error line highlighting ──


const EXTENSIONS_BASE = [EditorView.lineWrapping]

type SidebarTab = 'code'

import type { Diagram } from '../types'

interface SidebarProps {
  diagram: Diagram | null
  onInsertReady?: (fn: (text: string) => void) => void
  onAltClick?: (ref: TokenRef) => void
  mode: AppMode
  diagramConfig: DiagramConfig
  renderError?: MermaidRenderError | null
  autoFormat?: boolean
  editorLigatures?: boolean
  onFocusReady?: (focusFn: () => void) => void
  onChange: (value: string) => void
  mermaidTheme: string
  onConfigChange: (config: DiagramConfig) => void
  onMermaidThemeChange: (theme: string) => void
}

export function Sidebar({
  diagram, mode, diagramConfig, mermaidTheme,
  renderError = null,
  autoFormat = true,
  editorLigatures = true,
  onFocusReady,
  onChange, onConfigChange, onMermaidThemeChange, onInsertReady, onAltClick,
}: SidebarProps) {
  const code = diagram?.code ?? ''
  const activePageId = diagram?.id ?? ''
  const error = renderError
  const [activeTab, setActiveTab] = useState<SidebarTab>('code')
  const [collapsed, setCollapsed] = useState(false)
  // Stable toggle using functional updater (rule 5.11)
  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), [])
  const [settingsOpen, setSettingsOpen] = useState<string[]>([])
  const [codeCopied, setCodeCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const isDark = mode === 'dark'

  const langExtension = useMemo(
    () => [mermaidFallbackLanguage, syntaxHighlighting(defaultHighlightStyle)],
    [],
  )

  const altClickExt = useMemo(
    () => onAltClick ? mermaidAltClickExtension(onAltClick, isDark) : [],
    [onAltClick, isDark],
  )

  const extensions = useMemo(
    () => [...EXTENSIONS_BASE, langExtension, altClickExt],
    [langExtension, altClickExt],
  )



  // Stable handlers — useCallback prevents unnecessary re-renders of consumers (rule 5.8)
  const goToErrorLine = useCallback(() => {
    if (!error?.line || !editorViewRef.current) return
    const view = editorViewRef.current
    const lineNum = error.line
    if (lineNum < 1 || lineNum > view.state.doc.lines) return
    const line = view.state.doc.line(lineNum)
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
    view.focus()
  }, [error])

  const handleFormat = useCallback((src?: string) => {
    const target = src ?? code
    try {
      const formatted = spacifyMermaid(formatMermaid(target, { indentSize: 2 }))
      return formatted || target
    } catch {
      // If formatting fails, leave code as-is
      return target
    }
  }, [code])

  const insertAtCursor = useCallback((text: string) => {
    const view = editorViewRef.current
    if (!view) {
      onChange(text)
      return
    }
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    })
    view.focus()
    setActiveTab('code')
    setCollapsed(false)
  }, [onChange])

  // Register insertAtCursor with parent whenever it changes
  useEffect(() => {
    onInsertReady?.(insertAtCursor)
  }, [onInsertReady, insertAtCursor])

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view
    onFocusReady?.(() => view.focus())
  }, [editorViewRef, onFocusReady])

  const handleCodeChange = useCallback((value: string) => {
    pfDebug('editor', 'handleCodeChange', {
      diagramId: activePageId,
      incomingLength: value.length,
      autoFormat,
    })
    if (autoFormat) {
      const formatted = handleFormat(value)
      pfDebug('editor', 'handleCodeChange formatted', {
        diagramId: activePageId,
        outgoingLength: formatted.length,
        changedByFormatter: formatted !== value,
      })
      onChange(formatted)
    } else {
      onChange(value)
    }
  }, [activePageId, autoFormat, handleFormat, onChange])

  // Placeholder when no diagram is selected
  if (!diagram) {
    return (
      <div className={cn(
        'flex flex-col h-full rounded-xl border overflow-hidden items-center justify-center gap-3 text-center p-8',
        isDark
          ? 'bg-[oklch(0.16_0.015_280)] border-white/8'
          : 'bg-white/95 backdrop-blur-sm border-black/6',
      )}>
        <div className={cn('text-3xl mb-1', isDark ? 'opacity-30' : 'opacity-20')}>⬡</div>
        <p className={cn('text-sm font-medium', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Select a diagram to edit
        </p>
        <p className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
          Click any diagram on the canvas, or add a new one from the bottom bar.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full rounded-xl border overflow-hidden animate-sidebar-in',
      isDark ? '[box-shadow:0_4px_24px_rgba(0,0,0,0.35)]' : '[box-shadow:0_4px_24px_rgba(0,0,0,0.08)]',
      // testid is on the outer wrapper in App.tsx data-sidebar-panel attr
      isDark
        ? 'bg-[oklch(0.16_0.015_280)] border-white/8'
        : 'bg-white/95 border-black/6',
      collapsed && 'h-auto',
    )}>

      {/* Title bar */}
      <div data-testid="editor-header" className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 shrink-0">
        <div className="min-w-0 flex-1 px-1 flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground shrink-0">
            Editor
          </span>
          <span className="text-muted-foreground/60 shrink-0">•</span>
          <span className="text-sm font-medium text-foreground truncate">
            {diagram?.name ?? 'Diagram'}
          </span>
        </div>

        {/* Error indicator */}
        {error && (
          <div className="flex items-center gap-1 mr-0.5">
            <WarningCircle className="w-3 h-3 text-red-500" />
          </div>
        )}

        <div className="ml-auto" />

        {/* Copy code */}
        {code.trim() !== '' && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                data-testid="copy-code-button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  setCodeCopied(true)
                  // Track timer ref to avoid leaking on rapid clicks (rule 5.15)
                  if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
                  copyTimerRef.current = setTimeout(() => setCodeCopied(false), 1500)
                }}
                className={cn('shrink-0 rounded-lg', codeCopied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground')}
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <CopySimple className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{codeCopied ? 'Copied!' : 'Copy code'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon-sm" onClick={toggleCollapsed} className="shrink-0 rounded-lg">
              {collapsed ? <CaretDown className="w-3.5 h-3.5" /> : <CaretUp className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{collapsed ? 'Expand' : 'Collapse'}</TooltipContent>
        </Tooltip>
      </div>

      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Body — editor takes all remaining space; error bar overlays it */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {code.trim() === '' ? (
              <TemplateGallery mode={mode} onSelect={(code) => {
                onChange(code)
              }} />
            ) : (
              <CodeMirror
                key={activePageId}
                value={code}
                onChange={handleCodeChange}
                extensions={extensions}
                theme={isDark ? vscodeDark : githubLight}
                height="100%"
                style={{
                  height: '100%',
                  fontSize: '12.5px',
                  lineHeight: '1.7',
                  paddingTop: '6px',
                  fontVariantLigatures: editorLigatures ? 'common-ligatures' : 'none',
                  fontFeatureSettings: editorLigatures ? '"liga" 1, "calt" 1' : '"liga" 0, "calt" 0',
                }}
                onCreateEditor={handleCreateEditor}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                }}
              />
            )}
          </div>

          {/* Error bar — absolute overlay at bottom so editor height never changes */}
          {error && activeTab === 'code' && (
            <div className={cn(
              'absolute bottom-0 left-0 right-0 z-10 border-t',
              isDark
                ? 'bg-[oklch(0.15_0.02_15)] border-red-500/20'
                : 'bg-red-50 border-red-200/70',
            )} style={{ minHeight: '110px', padding: '14px 16px 18px' }}>
              {/* Header row */}
              <div className="flex items-center gap-2 pb-2">
                <WarningCircle className={cn(
                  'w-4 h-4 shrink-0',
                  isDark ? 'text-red-400' : 'text-red-500',
                )} />
                <span className={cn(
                  'text-xs font-semibold tracking-wide',
                  isDark ? 'text-red-300' : 'text-red-700',
                )}>
                  Syntax Error
                </span>
                {error.line && (
                  <button
                    onClick={goToErrorLine}
                    className={cn(
                      'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                      isDark
                        ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300'
                        : 'bg-red-100 hover:bg-red-200 text-red-600',
                    )}
                  >
                    Line {error.line} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Message */}
              <p className={cn(
                'font-mono text-[11px] leading-relaxed break-words',
                'whitespace-pre-wrap',
                isDark ? 'text-red-300/80' : 'text-red-600/90',
              )}>
                {error.message}
              </p>
            </div>
          )}

          {code.trim() !== '' && (
            <Accordion.Root
              value={settingsOpen}
              onValueChange={(value: string[]) => setSettingsOpen(value)}
              className={cn('border-t shrink-0', isDark ? 'border-white/8 bg-white/[0.05]' : 'border-black/6 bg-zinc-50')}
            >
              <Accordion.Item value="config">
                <Accordion.Header>
                  <Accordion.Trigger
                    data-testid="configuration-trigger"
                    className={cn(
                      'group w-full flex items-center justify-between px-3 py-2 text-left font-sans transition-colors cursor-pointer',
                      isDark ? 'text-zinc-200 hover:bg-white/6' : 'text-zinc-700 hover:bg-black/4',
                    )}
                  >
                    <span className="min-w-0 flex items-start gap-1.5">
                      <GearSix className="w-3.5 h-3.5 shrink-0 opacity-60 mt-0.5" />
                      <span className="flex flex-col">
                        <span className="text-[11px] font-semibold tracking-wide uppercase">Configuration</span>
                        <span className={cn('text-[11px] truncate', isDark ? 'text-zinc-400' : 'text-muted-foreground')}>
                          Theme, layout, and chart options
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center shrink-0 ml-3">
                      {settingsOpen.includes('config')
                        ? <CaretUp className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                        : <CaretDown className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />}
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel data-testid="configuration-panel" className="overflow-hidden">
                  <div className="px-3 pb-3 pt-1">
                    <div className={cn(
                      'rounded-lg border max-h-[58vh] overflow-y-auto bg-background',
                      isDark ? 'border-white/8' : 'border-black/8',
                    )}>
                      <div className="p-3">
                        <ConfigPanel
                          config={diagramConfig}
                          code={code}
                          onChange={onConfigChange}
                          mermaidTheme={mermaidTheme}
                          onMermaidThemeChange={onMermaidThemeChange}
                        />
                      </div>
                    </div>
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          )}
        </div>
      )}
    </div>
  )
}
