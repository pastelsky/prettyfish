import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Accordion } from '@base-ui/react/accordion'
import CodeMirror from '@uiw/react-codemirror'
import { mermaidFallbackLanguage } from '@/lib/mermaidHighlight'
import { mermaidAltClickExtension } from '@/lib/mermaidAltClick'
import { mermaidCompletionExtension } from '@/lib/mermaidCompletion'
import type { TokenRef } from '@/lib/mermaidTokenLookup'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { insertNewlineKeepIndent } from '@codemirror/commands'
import { tags } from '@lezer/highlight'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { EditorView, keymap, Decoration } from '@codemirror/view'
import { Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import { Button } from '@/components/ui/button'
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

const RE_COMMENT = /^\s*%%/
const RE_DIAGRAM_DECL = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|xychart-beta|quadrantChart|requirementDiagram)\b/
const RE_ARROW_LABEL_PRE = /(\S)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\|)/g
const RE_PIPE_SPACE = /(\|)(\S)/g
const RE_ARROW_NODE = /(\]|\)|\}|[a-zA-Z0-9_"])(\s*)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\s*)(\[|\(|\{|[a-zA-Z0-9_"])/g
const RE_SEQ_ARROW = /(\S)(\s*)(--?>>?|--?>|--?x|--?\))([\s:])/
const ENABLE_EDITOR_AUTO_FORMAT = false

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
import { ConfigPanel } from '@/components/editor/ConfigPanel'
import { TemplateGallery } from '@/components/editor/TemplateGallery'
import { chromeGlassPanelClass, chromeStatusClass, chromeStatusSurfaceClass } from '@/components/ui/app-chrome'
import type { AppMode, Diagram, DiagramConfig, MermaidRenderError } from '@/types'


// ── CodeMirror error line highlighting ──

const setErrorLine = StateEffect.define<number | null>()

const errorLineField = StateField.define({
  create() { return Decoration.none },
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) return Decoration.none
        const lineNum = e.value
        if (lineNum < 1 || lineNum > tr.state.doc.lines) return Decoration.none
        const line = tr.state.doc.line(lineNum)
        return Decoration.set([errorLineDeco.range(line.from)])
      }
    }
    // Remap through document changes so the decoration follows edits
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

const errorLineDeco = Decoration.line({ class: 'cm-errorLine' })

const errorLineTheme = EditorView.baseTheme({
  '&light .cm-errorLine': {
    backgroundColor: 'oklch(0.57 0.19 25 / 10%)',
    outline: '1px solid oklch(0.57 0.19 25 / 15%)',
    borderRadius: '2px',
  },
  '&dark .cm-errorLine': {
    backgroundColor: 'oklch(0.65 0.16 25 / 12%)',
    outline: '1px solid oklch(0.65 0.16 25 / 18%)',
    borderRadius: '2px',
  },
})

const errorLineExtension: Extension = [errorLineField, errorLineTheme]

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', 'Liberation Mono', 'Menlo', 'Monaco', ui-monospace, monospace"

// Override CodeMirror's built-in fontFamily: "monospace" via the theme API
const editorFontTheme = EditorView.theme({
  '&': { fontFamily: MONO_FONT },
  '.cm-content': { fontFamily: MONO_FONT, lineHeight: '1.75', fontVariantLigatures: 'common-ligatures', fontFeatureSettings: '"liga" 1, "calt" 1' },
  '.cm-gutters': { fontFamily: MONO_FONT },
})

const EXTENSIONS_BASE = [
  editorFontTheme,
  errorLineExtension,
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({
    'aria-label': 'Mermaid code editor',
  }),
  // Preserve indentation when pressing Enter — Prec.high overrides the default
  // keymap's insertNewlineAndIndent (which falls back to column 0 for Mermaid
  // since our language definition doesn't include indent rules)
  Prec.high(keymap.of([{ key: 'Enter', run: insertNewlineKeepIndent }])),
]

const lightEditorTheme = EditorView.theme({}, { dark: false })

const mermaidEditorHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#5f3dc4', fontWeight: 'bold' },
  { tag: tags.controlKeyword, color: '#7048a6', fontWeight: 'bold' },
  { tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName], color: '#173b8c' },
  { tag: [tags.literal, tags.inserted], color: '#005c41' },
  { tag: [tags.string, tags.deleted], color: '#9f1c1c' },
  { tag: tags.content, color: '#4a5568' },
  { tag: tags.variableName, color: '#1a6b5a' },
  { tag: [tags.typeName, tags.namespace], color: '#0f5c7a' },
  { tag: tags.className, color: '#0f5c7a' },
  { tag: tags.modifier, color: '#6b52a3', fontStyle: 'italic' },
  { tag: [tags.comment, tags.lineComment], color: '#8a5a00', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: '#9ca3af' },
  { tag: [tags.bracket, tags.paren, tags.squareBracket, tags.brace, tags.angleBracket], color: '#a3aab8' },
  { tag: tags.number, color: '#b35c00' },
  { tag: tags.meta, color: '#7c6f8a' },
])

interface SidebarProps {
  diagram: Diagram | null
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  onInsertReady?: (fn: (text: string) => void) => void
  onAltClick?: (ref: TokenRef) => void
  onTemplateSelect?: () => void
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
  diagram, collapsed: controlledCollapsed, onCollapsedChange, mode, diagramConfig, mermaidTheme,
  renderError = null,
  autoFormat = true,
  editorLigatures = true,
  onFocusReady,
  onChange, onConfigChange, onMermaidThemeChange, onInsertReady, onAltClick, onTemplateSelect,
}: SidebarProps) {
  const code = diagram?.code ?? ''
  const activePageId = diagram?.id ?? ''
  const error = renderError
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false)
  const collapsed = controlledCollapsed ?? uncontrolledCollapsed
  const setCollapsed = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(collapsed) : next
    if (controlledCollapsed === undefined) {
      setUncontrolledCollapsed(resolved)
    }
    onCollapsedChange?.(resolved)
  }, [collapsed, controlledCollapsed, onCollapsedChange])
  const toggleCollapsed = useCallback(() => setCollapsed(current => !current), [setCollapsed])
  const [settingsOpen, setSettingsOpen] = useState<string[]>([])
  const [codeCopied, setCodeCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const isDark = mode === 'dark'

  const langExtension = useMemo(
    () => [mermaidFallbackLanguage, syntaxHighlighting(mermaidEditorHighlightStyle)],
    [],
  )

  const altClickExt = useMemo(
    () => onAltClick ? mermaidAltClickExtension(onAltClick, isDark) : [],
    [onAltClick, isDark],
  )

  // Mermaid-aware autocompletion — stable, no deps needed
  const completionExt = useMemo(() => mermaidCompletionExtension(), [])

  const extensions = useMemo(
    () => [...EXTENSIONS_BASE, langExtension, altClickExt, completionExt],
    [langExtension, altClickExt, completionExt],
  )



  // Push error line decoration into editor when renderError changes
  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ effects: setErrorLine.of(error?.line ?? null) })
  }, [error?.line])

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
    setCollapsed(false)
  }, [onChange, setCollapsed])

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
      autoFormatEnabled: ENABLE_EDITOR_AUTO_FORMAT,
    })
    // Temporary kill switch: current auto-format behavior is buggy and should stay off
    // until it is fixed properly.
    if (ENABLE_EDITOR_AUTO_FORMAT && autoFormat) {
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
        chromeGlassPanelClass(isDark ? 'dark' : 'light'),
      )}>
        <div className={cn('text-3xl mb-1', isDark ? 'opacity-30' : 'opacity-20')}>⬡</div>
        <p className="text-sm font-medium text-ui-ink-muted">
          Select a diagram to edit
        </p>
        <p className="text-xs text-ui-ink-faint">
          Click any diagram on the canvas, or add a new one from the bottom bar.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full overflow-hidden animate-sidebar-in',
      chromeGlassPanelClass(isDark ? 'dark' : 'light'),
      collapsed && 'h-auto',
    )}>

      {/* Title bar */}
      <div data-testid="editor-header" className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 shrink-0">
        {/* Name area — truncates so action buttons never get pushed off screen */}
        <div className="min-w-0 flex-1 px-1 flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] font-semibold tracking-wide uppercase text-ui-ink-muted shrink-0">
            Editor
          </span>
          <span className="text-ui-ink-faint shrink-0">•</span>
          <span className="min-w-0 truncate text-sm font-medium text-foreground" title={diagram?.name ?? 'Diagram'}>
            {diagram?.name ?? 'Diagram'}
          </span>
        </div>

        {/* Right-side actions — always shrink-0 so they're never displaced */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Error indicator */}
          {error && (
            <WarningCircle className={cn('w-3 h-3 mr-0.5', chromeStatusClass('danger'))} />
          )}

          {/* Copy code */}
          {code.trim() !== '' && (
            <Button
              data-testid="copy-code-button"
              variant="ghost"
              size="icon-sm"
              aria-label={codeCopied ? 'Code copied' : 'Copy code'}
              title={codeCopied ? 'Copied!' : 'Copy code'}
              onClick={() => {
                navigator.clipboard.writeText(code)
                setCodeCopied(true)
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
                copyTimerRef.current = setTimeout(() => setCodeCopied(false), 1500)
              }}
              className={cn('rounded-lg', codeCopied ? chromeStatusClass('success') : 'text-muted-foreground hover:text-foreground')}
            >
              {codeCopied ? <Check className="w-3.5 h-3.5" /> : <CopySimple className="w-3.5 h-3.5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? 'Expand editor panel' : 'Collapse editor panel'}
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={toggleCollapsed}
            className="rounded-lg"
          >
            {collapsed ? <CaretUp className="w-3.5 h-3.5" /> : <CaretDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Body — editor takes all remaining space; error bar overlays it */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {code.trim() === '' ? (
              <TemplateGallery mode={mode} onSelect={(code) => {
                onChange(code)
                onTemplateSelect?.()
              }} />
            ) : (
              <CodeMirror
                key={activePageId}
                value={code}
                onChange={handleCodeChange}
                extensions={extensions}
                theme={isDark ? vscodeDark : lightEditorTheme}
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
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: false, // provided by mermaidCompletionExtension
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                }}
              />
            )}
          </div>

          {/* Error bar — absolute overlay at bottom so editor height never changes */}
          {error && (
            <div className={cn(
              'absolute bottom-0 left-0 right-0 z-10 border-t',
              chromeStatusSurfaceClass('danger'),
            )} style={{ minHeight: '110px', padding: '14px 16px 18px' }}>
              {/* Header row */}
              <div className="flex items-center gap-2 pb-2">
                <WarningCircle className={cn('w-4 h-4 shrink-0', chromeStatusClass('danger'))} />
                <span className={cn('text-xs font-semibold tracking-wide', chromeStatusClass('danger'))}>
                  Syntax Error
                </span>
                {error.line && (
                  <button
                    onClick={goToErrorLine}
                    className={cn(
                      'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                      chromeStatusSurfaceClass('danger'),
                      'hover:brightness-95 dark:hover:brightness-110',
                    )}
                  >
                    Line {error.line} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Message */}
              <p className={cn('font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap', chromeStatusClass('danger'))}>
                {error.message}
              </p>
            </div>
          )}

          {code.trim() !== '' && (
            <Accordion.Root
              value={settingsOpen}
              onValueChange={(value: string[]) => setSettingsOpen(value)}
              className="border-t shrink-0 border-ui-border-soft bg-ui-surface-soft"
            >
              <Accordion.Item value="config">
                <Accordion.Header>
                  <Accordion.Trigger
                    data-testid="configuration-trigger"
                    className={cn(
                      'group w-full flex items-center justify-between px-3 py-2 text-left font-sans transition-colors cursor-pointer',
                      'text-ui-ink-soft hover:bg-ui-surface-hover dark:text-ui-ink-strong',
                    )}
                  >
                    <span className="min-w-0 flex items-start gap-1.5">
                      <GearSix className="w-3.5 h-3.5 shrink-0 opacity-60 mt-0.5" />
                      <span className="flex flex-col">
                        <span className="text-[11px] font-semibold tracking-wide uppercase">Configuration</span>
                        <span className="text-[11px] truncate text-ui-ink-muted">
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
