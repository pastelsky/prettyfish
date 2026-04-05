/**
 * ReferenceDocs — right-side floating docs panel
 *
 * Organized as a composition of focused sub-components:
 *   RefTypePicker     → diagram type pill selector
 *   RefCodePreview    → per-line hoverable code block with copy
 *   RefExampleCard    → example label + insert button + code preview
 *   RefElementRow     → collapsible element (header + syntax + examples)
 *   RefElementList    → scrollable list of elements
 *   ReferenceDocs     → thin orchestrator (state + imperative handle + layout)
 */

import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react'
import { ArrowElbowDownLeft, CaretDown, CaretRight, Copy, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { highlightMermaidCode, getHighlightStyle } from '@/lib/highlightCode'
import { getRef, DIAGRAM_REFS, type RefElement as RefElementData } from '@/lib/reference'
import { detectDiagramType } from '@/lib/detectDiagram'

// ─── Public handle type ───────────────────────────────────────────────────────

export interface ReferenceDocsHandle {
  scrollToElement: (diagramType: string, elementName: string) => void
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

function useTheme(isDark: boolean) {
  return {
    border:    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    muted:     isDark ? 'text-zinc-400'          : 'text-zinc-500',
    hoverBg:   isDark ? 'hover:bg-white/4'       : 'hover:bg-black/3',
    codeBg:    isDark ? 'bg-white/5 text-zinc-300' : 'bg-black/4 text-zinc-700',
    codeText:  isDark ? 'text-zinc-300'          : 'text-zinc-700',
    keyword:   isDark ? 'text-sky-300'           : 'text-sky-700',
  }
}

const TYPE_LABELS: Record<string, string> = {
  flowchart:       'Flow',
  sequenceDiagram: 'Seq',
  classDiagram:    'Class',
  'stateDiagram-v2': 'State',
  stateDiagram:    'State',
  erDiagram:       'ER',
  gantt:           'Gantt',
  pie:             'Pie',
  gitGraph:        'Git',
  mindmap:         'Mind',
  timeline:        'Time',
  quadrantChart:   'Quad',
  'xychart-beta':  'XY',
  'architecture':  'Arch',
  'kanban':        'Kanban',
  'sankey':        'Sankey',
  'block':         'Block',
  'packet':        'Packet',
  'journey':       'Journey',
  'requirement':   'Req',
  'radar':         'Radar',
}

// ─── RefTypePicker ────────────────────────────────────────────────────────────

interface RefTypePickerProps {
  selectedType: string
  isDark: boolean
  onSelect: (type: string) => void
}

function RefTypePicker({ selectedType, isDark, onSelect }: RefTypePickerProps) {
  const { muted } = useTheme(isDark)
  return (
    <div className="px-3 pt-3 pb-2 shrink-0">
      <p className={cn('text-[10px] font-semibold uppercase tracking-widest mb-2', muted)}>
        Reference
      </p>
      <div className="flex flex-wrap gap-1">
        {Object.keys(DIAGRAM_REFS).map((key) => {
          const isActive = key === selectedType
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium cursor-pointer transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isDark
                    ? 'bg-white/6 text-zinc-300 hover:bg-white/10 hover:text-white'
                    : 'bg-black/5 text-zinc-600 hover:bg-black/8 hover:text-zinc-900',
              )}
            >
              {TYPE_LABELS[key] ?? key}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── RefCodePreview ───────────────────────────────────────────────────────────
// Per-line hoverable code block with a copy icon on each line

interface RefCodePreviewProps {
  code: string
  isDark: boolean
}

// Inject highlight CSS once per isDark mode
const injectedStyles = new Set<string>()
function useHighlightStyle(isDark: boolean) {
  useEffect(() => {
    const key = isDark ? 'dark' : 'light'
    if (injectedStyles.has(key)) return
    injectedStyles.add(key)
    const styleEl = document.getElementById(`ref-highlight-${key}`) ?? document.createElement('style')
    styleEl.id = `ref-highlight-${key}`
    styleEl.textContent = getHighlightStyle(isDark)
    if (!styleEl.parentNode) document.head.appendChild(styleEl)
  }, [isDark])
}

function RefCodePreview({ code, isDark }: RefCodePreviewProps) {
  const [copiedLine, setCopiedLine] = useState<string | null>(null)
  useHighlightStyle(isDark)

  // Compute highlighted spans per line
  const lines = useMemo(() => {
    return code.split('\n').map(line => ({
      raw: line,
      spans: line.trim() ? highlightMermaidCode(line, isDark) : [],
    }))
  }, [code, isDark])

  const copyLine = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLine(text)
      setTimeout(() => setCopiedLine(null), 1200)
    })
  }, [])

  return (
    <div className="py-1 font-mono text-[10px] leading-relaxed overflow-x-auto">
      {lines.map(({ raw, spans }, li) => {
        const isCopied = copiedLine === raw && raw.trim() !== ''
        return (
          <div
            key={li}
            className={cn(
              'group/line relative flex items-center gap-1 px-2 py-px rounded',
              isDark ? 'hover:bg-white/5' : 'hover:bg-black/4',
              raw.trim() === '' && 'pointer-events-none',
            )}
          >
            <span className="flex-1 whitespace-pre">
              {spans.length > 0
                ? spans.map((s, i) => s.className
                  ? <span key={i} className={s.className}>{s.text}</span>
                  : <span key={i}>{s.text}</span>
                )
                : (raw || '\u00A0')
              }
            </span>
            {raw.trim() !== '' && (
              <button
                onClick={(e) => { e.stopPropagation(); copyLine(raw) }}
                title="Copy line"
                className={cn(
                  'opacity-0 group-hover/line:opacity-100 transition-opacity shrink-0 p-0.5 rounded cursor-pointer',
                  isCopied
                    ? isDark ? 'text-green-400' : 'text-green-600'
                    : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-700',
                )}
              >
                {isCopied
                  ? <Check className="w-2.5 h-2.5" />
                  : <Copy className="w-2.5 h-2.5" />
                }
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── RefExampleCard ───────────────────────────────────────────────────────────
// One example: label + insert button + per-line code preview

interface RefExampleCardProps {
  label: string
  code: string
  isDark: boolean
  isInserted: boolean
  onInsert: (code: string) => void
}

function RefExampleCard({ label, code, isDark, isInserted, onInsert }: RefExampleCardProps) {
  const { muted } = useTheme(isDark)
  return (
    <div className={cn('rounded-md border overflow-hidden', isDark ? 'border-white/8' : 'border-black/8')}>
      {/* Label row + insert button */}
      <div className={cn('flex items-center justify-between px-2 py-1', isDark ? 'bg-white/4' : 'bg-black/3')}>
        <span className={cn('text-[10px] font-medium', muted)}>{label}</span>
        <button
          onClick={() => onInsert(code)}
          className={cn(
            'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer',
            isInserted
              ? 'bg-green-500/15 text-green-600'
              : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-white/8'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-black/6',
          )}
        >
          <ArrowElbowDownLeft className="w-2.5 h-2.5" />
          {isInserted ? 'done' : 'insert'}
        </button>
      </div>
      <RefCodePreview code={code} isDark={isDark} />
    </div>
  )
}

// ─── RefElementRow ────────────────────────────────────────────────────────────
// Collapsible element: name + description header, then syntax + examples

interface RefElementRowProps {
  el: RefElementData
  isDark: boolean
  isExpanded: boolean
  insertedCode: string | null
  elementRef: (node: HTMLDivElement | null) => void
  onToggle: () => void
  onInsert: (code: string) => void
}

function RefElementRow({
  el, isDark, isExpanded, insertedCode, elementRef, onToggle, onInsert,
}: RefElementRowProps) {
  const { border, muted, hoverBg, codeBg, keyword } = useTheme(isDark)
  return (
    <div ref={elementRef} style={{ borderBottom: `1px solid ${border}` }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn('w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors', hoverBg)}
      >
        <div className="shrink-0 flex items-center">
          {isExpanded
            ? <CaretDown className={cn('w-3 h-3', muted)} />
            : <CaretRight className={cn('w-3 h-3', muted)} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <code className={cn('text-[11px] font-mono font-medium', keyword)}>{el.name}</code>
          <p className={cn('text-[11px] mt-0.5 leading-snug', muted)}>{el.description}</p>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-3 pb-2.5">
          {/* Syntax signature */}
          <div className={cn('px-2 py-1.5 rounded-md mb-2 font-mono text-[10px] leading-relaxed', codeBg)}>
            {el.syntax}
          </div>
          {/* Examples */}
          <div className="flex flex-col gap-1.5">
            {el.examples.map((ex) => (
              <RefExampleCard
                key={ex.label}
                label={ex.label}
                code={ex.code}
                isDark={isDark}
                isInserted={insertedCode === ex.code}
                onInsert={onInsert}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RefElementList ───────────────────────────────────────────────────────────
// Scrollable list of elements for the current diagram type

interface RefElementListProps {
  elements: RefElementData[]
  isDark: boolean
  selectedType: string
  expandedElements: Record<string, boolean>
  insertedCode: string | null
  getElementRef: (key: string) => (node: HTMLDivElement | null) => void
  onToggleElement: (name: string) => void
  onInsert: (code: string) => void
}

function RefElementList({
  elements, isDark, selectedType, expandedElements, insertedCode,
  getElementRef, onToggleElement, onInsert,
}: RefElementListProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {elements.map((el) => (
        <RefElementRow
          key={el.name}
          el={el}
          isDark={isDark}
          isExpanded={expandedElements[el.name] ?? false}
          insertedCode={insertedCode}
          elementRef={getElementRef(`${selectedType}::${el.name}`)}
          onToggle={() => onToggleElement(el.name)}
          onInsert={onInsert}
        />
      ))}
    </div>
  )
}

// ─── ReferenceDocs (orchestrator) ─────────────────────────────────────────────

interface ReferenceDocsProps {
  currentCode?: string
  mode: string
  onInsert: (text: string) => void
}

export const ReferenceDocs = forwardRef<ReferenceDocsHandle, ReferenceDocsProps>(
  function ReferenceDocs({ currentCode = '', mode, onInsert }: ReferenceDocsProps, refHandle) {
    const isDark = mode === 'dark'
    const detectedType = detectDiagramType(currentCode)

    const [selectedType, setSelectedType] = useState<string>(detectedType)
    const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({})
    const [insertedCode, setInsertedCode] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const elementRefs = useRef<Record<string, HTMLDivElement | null>>({})

    // Auto-sync selected type when code changes diagram type (rule 5.1 — derive during render)
    // Using state-during-render pattern (React docs approved for derived sync)
    const [lastAutoType, setLastAutoType] = useState<string>(detectedType)
    if (detectedType !== lastAutoType) {
      setLastAutoType(detectedType)
      setSelectedType(detectedType)
      setExpandedElements({})
    }

    // Imperative handle for external callers (alt-click from editor)
    useImperativeHandle(refHandle, () => ({
      scrollToElement(diagramType: string, elementName: string) {
        setSelectedType(diagramType)
        setExpandedElements(prev => ({ ...prev, [elementName]: true }))
        setTimeout(() => {
          const el = elementRefs.current[`${diagramType}::${elementName}`]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.style.transition = 'background 0.4s'
            el.style.background = isDark ? 'rgba(99,179,237,0.12)' : 'rgba(59,130,246,0.08)'
            setTimeout(() => { el.style.background = '' }, 1000)
          }
        }, 80)
      },
    }))

    const getElementRef = useCallback(
      (key: string) => (node: HTMLDivElement | null) => { elementRefs.current[key] = node },
      [],
    )

    const handleToggleElement = useCallback((name: string) => {
      setExpandedElements(prev => ({ ...prev, [name]: !prev[name] }))
    }, [])

    const handleInsert = useCallback((code: string) => {
      onInsert(code)
      setInsertedCode(code)
      setTimeout(() => setInsertedCode(null), 1200)
    }, [onInsert])

    const handleSelectType = useCallback((type: string) => {
      setSelectedType(type)
      setExpandedElements({})
      setSearchQuery('')
    }, [])

    const docRef = getRef(selectedType)
    const { border } = useTheme(isDark)
    const bg = isDark ? 'oklch(0.16 0.015 260)' : '#ffffff'

    // Filter elements by search query — memoized to avoid re-filtering on every render (rule 5.6)
    const q = searchQuery.trim().toLowerCase()
    const filteredElements = useMemo(() => {
      if (!q) return docRef.elements
      return docRef.elements.filter(el =>
        el.name.toLowerCase().includes(q) ||
        el.description.toLowerCase().includes(q) ||
        el.syntax?.toLowerCase().includes(q) ||
        el.examples?.some(ex => ex.code.toLowerCase().includes(q) || ex.label.toLowerCase().includes(q))
      )
    }, [q, docRef.elements])

    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: bg }}>
        <div style={{ borderBottom: `1px solid ${border}` }}>
          <RefTypePicker
            selectedType={selectedType}
            isDark={isDark}
            onSelect={handleSelectType}
          />
          {/* Search */}
          <div className="px-3 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search elements..."
              className={cn(
                'w-full px-2.5 py-1.5 rounded-md text-xs outline-none transition-colors border',
                isDark
                  ? 'bg-white/5 border-white/8 text-zinc-200 placeholder:text-zinc-600 focus:border-primary/40'
                  : 'bg-black/3 border-black/8 text-zinc-800 placeholder:text-zinc-400 focus:border-primary/40',
              )}
            />
          </div>
        </div>
        <RefElementList
          elements={filteredElements}
          isDark={isDark}
          selectedType={selectedType}
          expandedElements={expandedElements}
          insertedCode={insertedCode}
          getElementRef={getElementRef}
          onToggleElement={handleToggleElement}
          onInsert={handleInsert}
        />
      </div>
    )
  }
)
