import React, { useState, useRef, useEffect, useMemo, useCallback, type RefObject } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { mermaid as mermaidLang } from 'codemirror-lang-mermaid'
import { mermaidFallbackLanguage } from '@/lib/mermaidHighlight'
import { mermaidAltClickExtension } from '@/lib/mermaidAltClick'
import type { TokenRef } from '@/lib/mermaidTokenLookup'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { EditorView, Decoration, type DecorationSet, GutterMarker, gutter, gutterLineClass } from '@codemirror/view'
import { StateField, StateEffect, RangeSetBuilder, RangeSet } from '@codemirror/state'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  CodeSimple,
  GearSix,
  Plus,
  CaretUp,
  CaretDown,
  WarningCircle,
  ArrowRight,
  CaretUpDown,
  PencilSimple,
  TrashSimple,
  TextAa,
  Code,
  CopySimple,
  Check,
} from '@phosphor-icons/react'
import { formatMermaid } from 'mermaid-formatter'

/** Add spaces around arrows and operators in mermaid code */
function spacifyMermaid(code: string): string {
  return code.split('\n').map(line => {
    // Skip comment lines
    if (line.trim().startsWith('%%')) return line
    // Skip lines that are just diagram declarations
    if (/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|xychart-beta|quadrantChart|requirementDiagram)\b/.test(line.trim())) return line

    // Add spaces around arrow operators (but not inside strings or labels)
    // Match mermaid arrows: -->, --->, -.->, -.-, ==>, ===>, --x, --o, <--, etc.
    // Careful not to break |label| or [text] or {text} or (text)
    let result = line
    // Arrows with text labels like -->|text| — space before arrow, after closing |
    result = result.replace(/(\S)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\|)/g, '$1 $2$3')
    result = result.replace(/(\|)(\S)/g, '$1 $2')
    // Regular arrows without labels
    result = result.replace(/(\]|\)|\}|[a-zA-Z0-9_"])(\s*)(--+>|--+x|--+o|==+>|-\.+-?>|<--+|<==+|<-\.+-?)(\s*)(\[|\(|\{|[a-zA-Z0-9_"])/g,
      (_, before, _s1, arrow, _s2, after) => `${before} ${arrow} ${after}`)
    // Sequence diagram arrows: ->>, ->, -->, -->>, -x, --)
    result = result.replace(/(\S)(\s*)(--?>>?|--?>|--?x|--?\))([\s:])/, (_, before, _s, arrow, after) => `${before} ${arrow}${after}`)
    return result
  }).join('\n')
}
import { cn } from '@/lib/utils'
import { detectDiagramType, type DiagramType } from '@/lib/detectDiagram'

// ── Diagram-aware icon — mini SVGs matching the TemplateGallery style ──────────
// All drawn on 24×24 viewBox, stroke-based, simplified for small sizes

function DiagramIcon({ type, className }: { type: DiagramType; className?: string }) {
  const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (type) {
    case 'flowchart': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="7" y="1.5" width="10" height="6" rx="1.5" strokeWidth="1.4"/>
        <line x1="12" y1="7.5" x2="12" y2="10.5" strokeWidth="1.4"/>
        <polygon points="12,10.5 7,16 17,16" strokeWidth="1.4" fill="none"/>
        <line x1="7" y1="16" x2="4" y2="16" strokeWidth="1.3"/>
        <line x1="17" y1="16" x2="20" y2="16" strokeWidth="1.3"/>
        <rect x="1" y="16" width="6" height="5.5" rx="1.2" strokeWidth="1.3"/>
        <rect x="17" y="16" width="6" height="5.5" rx="1.2" strokeWidth="1.3"/>
      </svg>
    )
    case 'sequence': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="1" width="5" height="4" rx="1" strokeWidth="1.4"/>
        <rect x="17" y="1" width="5" height="4" rx="1" strokeWidth="1.4"/>
        <line x1="4.5" y1="5" x2="4.5" y2="23" strokeWidth="1.1" strokeDasharray="2 1.5"/>
        <line x1="19.5" y1="5" x2="19.5" y2="23" strokeWidth="1.1" strokeDasharray="2 1.5"/>
        <line x1="4.5" y1="9" x2="19.5" y2="9" strokeWidth="1.4"/>
        <polyline points="16.5,7.5 19.5,9 16.5,10.5" strokeWidth="1.3"/>
        <line x1="19.5" y1="14" x2="4.5" y2="14" strokeWidth="1.3" strokeDasharray="2.5 1.5"/>
        <polyline points="7.5,12.5 4.5,14 7.5,15.5" strokeWidth="1.3"/>
      </svg>
    )
    case 'classDiagram': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="1" y="2" width="10" height="11" rx="1.2" strokeWidth="1.4"/>
        <line x1="1" y1="6" x2="11" y2="6" strokeWidth="1.2"/>
        <line x1="1" y1="9.5" x2="11" y2="9.5" strokeWidth="1.2"/>
        <rect x="13" y="11" width="10" height="11" rx="1.2" strokeWidth="1.4"/>
        <line x1="13" y1="15" x2="23" y2="15" strokeWidth="1.2"/>
        <line x1="13" y1="18.5" x2="23" y2="18.5" strokeWidth="1.2"/>
        <line x1="11" y1="7.5" x2="13" y2="7.5" strokeWidth="1.2"/>
        <polygon points="11,6 9,7.5 11,9" strokeWidth="1.2" fill="white"/>
      </svg>
    )
    case 'stateDiagram': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <circle cx="5" cy="5" r="3" strokeWidth="1.4"/>
        <circle cx="19" cy="5" r="3" strokeWidth="1.4"/>
        <circle cx="12" cy="15" r="3.5" strokeWidth="1.4"/>
        <circle cx="12" cy="22.5" r="1.5" strokeWidth="1.4"/>
        <circle cx="12" cy="22.5" r="2.5" strokeWidth="1.1"/>
        <path d="M7.5 6.5 Q11 10 9 12.5" strokeWidth="1.2"/>
        <path d="M16.5 6.5 Q13 10 15 12.5" strokeWidth="1.2"/>
        <line x1="12" y1="18.5" x2="12" y2="20" strokeWidth="1.2"/>
      </svg>
    )
    case 'erDiagram': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="1" y="6" width="8" height="12" rx="1.2" strokeWidth="1.4"/>
        <line x1="1" y1="10.5" x2="9" y2="10.5" strokeWidth="1.1"/>
        <rect x="15" y="6" width="8" height="12" rx="1.2" strokeWidth="1.4"/>
        <line x1="15" y1="10.5" x2="23" y2="10.5" strokeWidth="1.1"/>
        <line x1="9" y1="12" x2="15" y2="12" strokeWidth="1.4"/>
        <line x1="9" y1="10.5" x2="11" y2="12" strokeWidth="1.2"/>
        <line x1="9" y1="13.5" x2="11" y2="12" strokeWidth="1.2"/>
      </svg>
    )
    case 'gantt': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <line x1="2" y1="2" x2="2" y2="22" strokeWidth="1.3"/>
        <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.3"/>
        <rect x="4" y="4" width="10" height="3.5" rx="1" strokeWidth="1.3" fillOpacity="0.2" fill="currentColor"/>
        <rect x="8" y="9.5" width="12" height="3.5" rx="1" strokeWidth="1.3" fillOpacity="0.2" fill="currentColor"/>
        <rect x="4" y="15" width="7" height="3.5" rx="1" strokeWidth="1.3" fillOpacity="0.2" fill="currentColor"/>
      </svg>
    )
    case 'pie': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <circle cx="12" cy="13" r="9.5" strokeWidth="1.4"/>
        <line x1="12" y1="13" x2="12" y2="3.5" strokeWidth="1.3"/>
        <line x1="12" y1="13" x2="20.7" y2="18" strokeWidth="1.3"/>
        <line x1="12" y1="13" x2="4" y2="9.5" strokeWidth="1.3"/>
        <line x1="12" y1="13" x2="4" y2="18" strokeWidth="1.3"/>
      </svg>
    )
    case 'gitgraph': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <line x1="2" y1="13" x2="22" y2="13" strokeWidth="1.4"/>
        <path d="M7 13 Q9 7 14 7" strokeWidth="1.3" fill="none"/>
        <line x1="14" y1="7" x2="19" y2="7" strokeWidth="1.3"/>
        <path d="M19 7 Q21 10 21 13" strokeWidth="1.3" fill="none"/>
        <circle cx="4" cy="13" r="2" strokeWidth="1.3" fill="white"/>
        <circle cx="10" cy="13" r="2" strokeWidth="1.3" fill="white"/>
        <circle cx="16" cy="13" r="2" strokeWidth="1.3" fill="white"/>
        <circle cx="14" cy="7" r="2" strokeWidth="1.3" fill="white"/>
        <circle cx="19" cy="7" r="2" strokeWidth="1.3" fill="white"/>
      </svg>
    )
    case 'mindmap': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <circle cx="12" cy="12" r="3" strokeWidth="1.4"/>
        <line x1="12" y1="9" x2="12" y2="3.5" strokeWidth="1.3"/>
        <circle cx="12" cy="2.5" r="1.5" strokeWidth="1.3"/>
        <line x1="9.5" y1="10.5" x2="4.5" y2="7.5" strokeWidth="1.3"/>
        <circle cx="3.5" cy="7" r="1.5" strokeWidth="1.3"/>
        <line x1="9.5" y1="13.5" x2="4.5" y2="16.5" strokeWidth="1.3"/>
        <circle cx="3.5" cy="17" r="1.5" strokeWidth="1.3"/>
        <line x1="14.5" y1="10.5" x2="19.5" y2="7.5" strokeWidth="1.3"/>
        <circle cx="20.5" cy="7" r="1.5" strokeWidth="1.3"/>
        <line x1="14.5" y1="13.5" x2="19.5" y2="16.5" strokeWidth="1.3"/>
        <circle cx="20.5" cy="17" r="1.5" strokeWidth="1.3"/>
        <line x1="12" y1="15" x2="12" y2="20.5" strokeWidth="1.3"/>
        <circle cx="12" cy="21.5" r="1.5" strokeWidth="1.3"/>
      </svg>
    )
    case 'timeline': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5"/>
        <polyline points="20,10.5 22,12 20,13.5" strokeWidth="1.3"/>
        <circle cx="6" cy="12" r="2" strokeWidth="1.3" fill="white"/>
        <line x1="6" y1="10" x2="6" y2="6.5" strokeWidth="1.2"/>
        <rect x="3" y="4" width="6" height="2.5" rx="0.8" strokeWidth="1.2"/>
        <circle cx="14" cy="12" r="2" strokeWidth="1.3" fill="white"/>
        <line x1="14" y1="14" x2="14" y2="17.5" strokeWidth="1.2"/>
        <rect x="11" y="17.5" width="6" height="2.5" rx="0.8" strokeWidth="1.2"/>
      </svg>
    )
    case 'quadrant': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <line x1="2" y1="22" x2="2" y2="2" strokeWidth="1.4"/>
        <line x1="2" y1="22" x2="22" y2="22" strokeWidth="1.4"/>
        <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" strokeDasharray="2 1.5"/>
        <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1" strokeDasharray="2 1.5"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor" fillOpacity="0.7" strokeWidth="0"/>
        <circle cx="17" cy="6" r="1.5" fill="currentColor" fillOpacity="0.7" strokeWidth="0"/>
        <circle cx="16" cy="17" r="1.5" fill="currentColor" fillOpacity="0.7" strokeWidth="0"/>
        <circle cx="6" cy="18" r="1.5" fill="currentColor" fillOpacity="0.7" strokeWidth="0"/>
      </svg>
    )
    case 'xychart': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <line x1="2" y1="21" x2="2" y2="3" strokeWidth="1.4"/>
        <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.4"/>
        <polyline points="4,17 8,12 13,14 18,7 22,9" strokeWidth="1.5" fill="none"/>
        <circle cx="4" cy="17" r="1.2" fill="currentColor" strokeWidth="0"/>
        <circle cx="8" cy="12" r="1.2" fill="currentColor" strokeWidth="0"/>
        <circle cx="13" cy="14" r="1.2" fill="currentColor" strokeWidth="0"/>
        <circle cx="18" cy="7" r="1.2" fill="currentColor" strokeWidth="0"/>
      </svg>
    )
    case 'kanban': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="6" height="18" rx="1" strokeWidth="1.3"/>
        <rect x="9" y="2" width="6" height="12" rx="1" strokeWidth="1.3"/>
        <rect x="16" y="2" width="6" height="8" rx="1" strokeWidth="1.3"/>
      </svg>
    )
    case 'sankey': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <path d="M2 4c4 0 6 2 10 6s6 6 10 6" strokeWidth="3" opacity="0.4"/>
        <path d="M2 8c4 0 8 4 10 6s6 4 10 4" strokeWidth="2" opacity="0.6"/>
        <path d="M2 14c6 0 8-4 10-6s6-2 10-2" strokeWidth="2" opacity="0.5"/>
      </svg>
    )
    case 'block': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="20" height="6" rx="1" strokeWidth="1.3"/>
        <rect x="2" y="10" width="9.5" height="5" rx="1" strokeWidth="1.3"/>
        <rect x="12.5" y="10" width="9.5" height="5" rx="1" strokeWidth="1.3"/>
        <rect x="2" y="17" width="20" height="5" rx="1" strokeWidth="1.3"/>
      </svg>
    )
    case 'packet': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="20" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="2" y="7" width="10" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="12" y="7" width="10" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="2" y="12" width="20" height="4" rx="0.5" strokeWidth="1.2"/>
      </svg>
    )
    case 'journey': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <path d="M3 18c3-4 5-12 9-12s6 8 9 12" strokeWidth="1.4"/>
        <circle cx="6" cy="14" r="1.5" fill="currentColor" strokeWidth="0"/>
        <circle cx="12" cy="6" r="1.5" fill="currentColor" strokeWidth="0"/>
        <circle cx="18" cy="14" r="1.5" fill="currentColor" strokeWidth="0"/>
      </svg>
    )
    case 'requirement': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <rect x="13" y="2" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <rect x="7.5" y="15" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <line x1="6.5" y1="9" x2="10" y2="15" strokeWidth="1.2"/>
        <line x1="17.5" y1="9" x2="14" y2="15" strokeWidth="1.2"/>
      </svg>
    )
    case 'radar': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <polygon points="12,2 21,9 18,20 6,20 3,9" strokeWidth="1" opacity="0.3"/>
        <polygon points="12,8 15,12 14,16 10,16 9,12" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15"/>
        <line x1="12" y1="2" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="3" y1="9" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="21" y1="9" x2="12" y2="12" strokeWidth="0.8"/>
      </svg>
    )
    case 'architecture': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <path d="M5 9 C5 7 6.5 6 8 6.5 C8.5 5 10 4 12 4 C14 4 15.5 5 16 6.5 C17.5 6 19 7 19 9 C19 10.5 17.8 11 16.5 11 L7.5 11 C6.2 11 5 10.5 5 9Z" strokeWidth="1.2"/>
        <line x1="12" y1="11" x2="12" y2="14" strokeWidth="1.2"/>
        <rect x="8" y="14" width="8" height="4" rx="1" strokeWidth="1.2"/>
        <line x1="9.5" y1="15.5" x2="14.5" y2="15.5" strokeWidth="0.7"/>
        <line x1="12" y1="18" x2="12" y2="19.5" strokeWidth="1.2"/>
        <ellipse cx="12" cy="20" rx="4" ry="1.2" strokeWidth="1.1"/>
        <line x1="8" y1="20" x2="8" y2="22" strokeWidth="1.1"/>
        <line x1="16" y1="20" x2="16" y2="22" strokeWidth="1.1"/>
        <path d="M8 22 Q12 23 16 22" strokeWidth="1.1" fill="none"/>
      </svg>
    )
    case 'kanban': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="6" height="18" rx="1" strokeWidth="1.3"/>
        <rect x="9" y="2" width="6" height="12" rx="1" strokeWidth="1.3"/>
        <rect x="16" y="2" width="6" height="8" rx="1" strokeWidth="1.3"/>
        <line x1="4" y1="6" x2="6" y2="6" strokeWidth="0.9"/>
        <line x1="4" y1="9" x2="6" y2="9" strokeWidth="0.9"/>
        <line x1="11" y1="6" x2="13" y2="6" strokeWidth="0.9"/>
        <line x1="18" y1="6" x2="20" y2="6" strokeWidth="0.9"/>
      </svg>
    )
    case 'sankey': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="1" y="3" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.6" stroke="none"/>
        <rect x="1" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4" stroke="none"/>
        <rect x="1" y="15" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.5" stroke="none"/>
        <rect x="20" y="2" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" stroke="none"/>
        <rect x="20" y="12" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.4" stroke="none"/>
        <path d="M4 4 C10 4 14 3 20 3" strokeWidth="2.5" strokeOpacity="0.4" fill="none"/>
        <path d="M4 8 C10 8 14 10 20 10" strokeWidth="2.5" strokeOpacity="0.4" fill="none"/>
        <path d="M4 16 C10 16 14 18 20 18" strokeWidth="3.5" strokeOpacity="0.35" fill="none"/>
      </svg>
    )
    case 'block': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="20" height="6" rx="1" strokeWidth="1.3"/>
        <rect x="2" y="10" width="9.5" height="5" rx="1" strokeWidth="1.3"/>
        <rect x="12.5" y="10" width="9.5" height="5" rx="1" strokeWidth="1.3"/>
        <rect x="2" y="17" width="20" height="5" rx="1" strokeWidth="1.3"/>
      </svg>
    )
    case 'packet': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="20" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="2" y="7" width="10" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="12" y="7" width="10" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="2" y="12" width="20" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="2" y="17" width="7" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="9" y="17" width="6" height="4" rx="0.5" strokeWidth="1.2"/>
        <rect x="15" y="17" width="7" height="4" rx="0.5" strokeWidth="1.2"/>
      </svg>
    )
    case 'journey': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <circle cx="12" cy="4" r="2" strokeWidth="1.2"/>
        <path d="M9 8h6" strokeWidth="1.2"/>
        <line x1="2" y1="14" x2="22" y2="14" strokeWidth="1" strokeDasharray="1.5 1"/>
        <line x1="9" y1="11" x2="9" y2="21" strokeWidth="0.8" opacity="0.4"/>
        <line x1="16" y1="11" x2="16" y2="21" strokeWidth="0.8" opacity="0.4"/>
        <circle cx="4" cy="14" r="1.5" fill="currentColor" opacity="0.8" stroke="none"/>
        <line x1="4" y1="11" x2="4" y2="12.5" strokeWidth="1.5"/>
        <circle cx="12.5" cy="14" r="1.5" fill="currentColor" opacity="0.8" stroke="none"/>
        <line x1="12.5" y1="15.5" x2="12.5" y2="18" strokeWidth="1.5"/>
        <circle cx="19.5" cy="14" r="1.5" fill="currentColor" opacity="0.8" stroke="none"/>
        <line x1="19.5" y1="11" x2="19.5" y2="12.5" strokeWidth="1.5"/>
      </svg>
    )
    case 'requirement': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="2" y="2" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <rect x="13" y="2" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <rect x="7.5" y="15" width="9" height="7" rx="1" strokeWidth="1.3"/>
        <line x1="6.5" y1="9" x2="10" y2="15" strokeWidth="1.2"/>
        <line x1="17.5" y1="9" x2="14" y2="15" strokeWidth="1.2"/>
        <line x1="4" y1="5" x2="9" y2="5" strokeWidth="0.8"/>
        <line x1="4" y1="7" x2="7" y2="7" strokeWidth="0.8"/>
      </svg>
    )
    case 'radar': return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <polygon points="12,2 21,9 18,20 6,20 3,9" strokeWidth="1" opacity="0.3"/>
        <polygon points="12,6 17.5,10.5 16,17 8,17 6.5,10.5" strokeWidth="1" opacity="0.35"/>
        <polygon points="12,8 15,12 14,16 10,16 9,12" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15"/>
        <line x1="12" y1="2" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="3" y1="9" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="21" y1="9" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="6" y1="20" x2="12" y2="12" strokeWidth="0.8"/>
        <line x1="18" y1="20" x2="12" y2="12" strokeWidth="0.8"/>
      </svg>
    )
    default: return (
      <svg viewBox="0 0 24 24" className={className} {...base}>
        <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth="1.4"/>
        <line x1="8" y1="8" x2="16" y2="8" strokeWidth="1.3"/>
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.3"/>
        <line x1="8" y1="16" x2="13" y2="16" strokeWidth="1.3"/>
      </svg>
    )
  }
}
import { ConfigPanel } from '@/components/ConfigPanel'
import { TemplateGallery } from '@/components/TemplateGallery'
import type { AppMode, DiagramPage, DiagramConfig } from '../types'
import type { MermaidError } from '../hooks/useMermaidRenderer'

// ── CodeMirror error line highlighting ──

const setErrorLine = StateEffect.define<number | null>()

// Stores the current error line number (1-based, or null)
const errorLineState = StateField.define<number | null>({
  create: () => null,
  update(val, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) return e.value
    }
    return val
  },
})

// Full-line background decoration
const errorLineDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) return Decoration.none
        const lineNum = e.value
        if (lineNum < 1 || lineNum > tr.state.doc.lines) return Decoration.none
        const line = tr.state.doc.line(lineNum)
        return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(line.from)])
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

// Gutter marker class — red bar in the line number gutter
class ErrorGutterMarker extends GutterMarker {
  elementClass = 'cm-error-gutter'
}
const errorGutterMarker = new ErrorGutterMarker()

// Gutter that shows error marker on the error line
const errorGutter = gutter({
  class: 'cm-error-gutter-col',
  markers(view) {
    const lineNum = view.state.field(errorLineState)
    if (!lineNum || lineNum < 1 || lineNum > view.state.doc.lines) return RangeSet.empty as RangeSet<GutterMarker>
    const line = view.state.doc.line(lineNum)
    const builder = new RangeSetBuilder<GutterMarker>()
    builder.add(line.from, line.from, errorGutterMarker)
    return builder.finish()
  },
})

// Gutter line class singleton (adds class to the existing line number gutter cell)
class ErrorLineGutterMarker extends GutterMarker {
  elementClass = 'cm-error-gutter-line'
}
const errorLineGutterMarker = new ErrorLineGutterMarker()

const errorGutterLineClass = gutterLineClass.compute([errorLineState], state => {
  const lineNum = state.field(errorLineState)
  if (!lineNum || lineNum < 1 || lineNum > state.doc.lines) return RangeSet.empty as RangeSet<GutterMarker>
  const line = state.doc.line(lineNum)
  const builder = new RangeSetBuilder<GutterMarker>()
  builder.add(line.from, line.from, errorLineGutterMarker)
  return builder.finish()
})

const errorLineTheme = EditorView.baseTheme({
  // Full line background — extends across entire width
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.10) !important',
  },
  '&dark .cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.14) !important',
  },
  // Gutter cell on the error line — red accent bar
  '.cm-error-gutter-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRight: '2px solid rgba(239, 68, 68, 0.7)',
    color: 'rgba(239, 68, 68, 0.9) !important',
  },
  '&dark .cm-error-gutter-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRight: '2px solid rgba(239, 68, 68, 0.6)',
    color: 'rgba(239, 68, 68, 0.8) !important',
  },
})

const EXTENSIONS_BASE = [EditorView.lineWrapping]

type SidebarTab = 'code' | 'config'

interface SidebarProps {
  code: string
  onInsertReady?: (fn: (text: string) => void) => void
  onAltClick?: (ref: TokenRef) => void
  mode: AppMode
  pages: DiagramPage[]
  activePageId: string
  diagramConfig: DiagramConfig
  error: MermaidError | null
  editorLigatures: boolean
  autoFormat: boolean
  editorFocusRef: RefObject<(() => void) | null>
  onChange: (value: string) => void
  onSelectPage: (id: string) => void
  onAddPage: () => string
  onRenamePage: (id: string, name: string) => void
  onDeletePage: (id: string) => void
  onReorderPages: (from: number, to: number) => void
  mermaidTheme: string
  onConfigChange: (config: DiagramConfig) => void
  onMermaidThemeChange: (theme: string) => void
  onLigaturesChange: (v: boolean) => void
  onAutoFormatChange: (v: boolean) => void
}

export function Sidebar({
  code, mode, pages, activePageId, diagramConfig, error, editorLigatures, autoFormat, mermaidTheme,
  editorFocusRef,
  onChange, onSelectPage, onAddPage, onRenamePage, onDeletePage, onReorderPages, onConfigChange, onMermaidThemeChange, onLigaturesChange, onAutoFormatChange, onInsertReady, onAltClick,
}: SidebarProps) {
  'use no memo'
  const [activeTab, setActiveTab] = useState<SidebarTab>('code')
  const [collapsed, setCollapsed] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const isDark = mode === 'dark'

  const activePage = pages.find(p => p.id === activePageId)

  // Determine which language extension to use
  // codemirror-lang-mermaid only supports: flowchart/graph, sequenceDiagram, pie, mindmap, gantt, journey, requirementDiagram
  const NATIVE_LANG_TYPES = ['flowchart', 'graph', 'sequenceDiagram', 'pie', 'mindmap', 'gantt', 'journey', 'requirementDiagram']
  const firstWord = code.trim().split(/\s/)[0]?.toLowerCase() ?? ''
  const useNativeLang = NATIVE_LANG_TYPES.some(t => firstWord.startsWith(t.toLowerCase()))

  const langExtension = useMemo(
    () => useNativeLang
      ? mermaidLang()
      : [mermaidFallbackLanguage, syntaxHighlighting(defaultHighlightStyle)],
    [useNativeLang],
  )

  const altClickExt = useMemo(
    () => onAltClick ? mermaidAltClickExtension(onAltClick, isDark) : [],
    [onAltClick, isDark],
  )

  const extensions = useMemo(
    () => [...EXTENSIONS_BASE, langExtension, errorLineState, errorLineDecoField, errorGutter, errorGutterLineClass, errorLineTheme, altClickExt],
    [langExtension, altClickExt],
  )

  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ effects: setErrorLine.of(error?.line ?? null) })
  }, [error])

  useEffect(() => {
    const view = editorViewRef.current
    if (!view || !error?.line) return
    const lineNum = error.line
    if (lineNum < 1 || lineNum > view.state.doc.lines) return
    const line = view.state.doc.line(lineNum)
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
  }, [error])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  // Close pages dropdown on outside click
  useEffect(() => {
    if (!pagesOpen) return
    const handler = (e: MouseEvent) => {
      if (pagesRef.current && !pagesRef.current.contains(e.target as Node)) setPagesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pagesOpen])

  const startRename = (page: DiagramPage) => {
    setRenamingId(page.id)
    setRenameValue(page.name)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenamePage(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const goToErrorLine = () => {
    if (!error?.line || !editorViewRef.current) return
    const view = editorViewRef.current
    const lineNum = error.line
    if (lineNum < 1 || lineNum > view.state.doc.lines) return
    const line = view.state.doc.line(lineNum)
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
    view.focus()
  }

  const handleAddPage = () => {
    onAddPage()
    setPagesOpen(false)
  }

  const handleFormat = (src?: string) => {
    const target = src ?? code
    try {
      const formatted = spacifyMermaid(formatMermaid(target, { indentSize: 2 }))
      if (formatted && formatted.trim() !== target.trim()) {
        onChange(formatted)
        return formatted
      }
    } catch {
      // If formatting fails, leave code as-is
    }
    return target
  }

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

  function handleCreateEditor(view: EditorView) {
    editorViewRef.current = view
    editorFocusRef.current = () => view.focus() // eslint-disable-line react-compiler/react-compiler
  }

  const handleCodeChange = (value: string) => {
    if (autoFormat) {
      handleFormat(value)
    } else {
      onChange(value)
    }
  }

  return (
    <div className={cn(
      'flex flex-col h-full rounded-xl border overflow-hidden animate-sidebar-in',
      isDark ? '[box-shadow:0_4px_24px_rgba(0,0,0,0.35)]' : '[box-shadow:0_4px_24px_rgba(0,0,0,0.08)]',
      isDark
        ? 'bg-[oklch(0.16_0.015_260)]/95 border-white/8'
        : 'bg-white/95 border-black/6',
      collapsed && 'h-auto',
    )}>

      {/* Title bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 shrink-0">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setActiveTab('code'); setCollapsed(false) }}
              className={cn('shrink-0 rounded-lg', activeTab === 'code' && !collapsed && (isDark ? 'bg-white/8 text-foreground' : 'bg-black/5 text-foreground'))}
            >
              <CodeSimple className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editor</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setActiveTab('config'); setCollapsed(false) }}
              className={cn('shrink-0 rounded-lg', activeTab === 'config' && !collapsed && (isDark ? 'bg-white/8 text-foreground' : 'bg-black/5 text-foreground'))}
            >
              <GearSix className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Diagram Config</TooltipContent>
        </Tooltip>


        {/* Page selector dropdown */}
        {activeTab === 'code' && (
          <div ref={pagesRef} className="relative flex-1 ml-1">
            <button
              onClick={() => setPagesOpen(!pagesOpen)}
              className={cn(
                'flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors border',
                isDark
                  ? 'bg-white/4 border-white/10 hover:bg-white/8 hover:border-white/15 text-zinc-200'
                  : 'bg-black/3 border-black/10 hover:bg-black/5 hover:border-black/15 text-zinc-800',
                pagesOpen && (isDark ? 'bg-white/8 border-white/15' : 'bg-black/5 border-black/15'),
              )}
            >
              <DiagramIcon type={detectDiagramType(activePage?.code ?? '')} className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-medium truncate">{activePage?.name ?? 'Untitled'}</span>
              <CaretUpDown className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
            </button>

            {/* Dropdown */}
            {pagesOpen && (
              <div className={cn(
                'absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border overflow-hidden animate-fade-up',
                isDark
                  ? 'bg-[oklch(0.17_0.018_260)] border-white/12'
                  : 'bg-white border-black/10',
              )}
              style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                  {pages.map((page, index) => {
                    const isActive = page.id === activePageId
                    const isRenaming = renamingId === page.id
                    const isConfirmDelete = confirmDeleteId === page.id
                    const isDragOver = dragOverIndex === index && dragFromIndex !== index
                    return (
                      <div
                        key={page.id}
                        draggable={!isRenaming && !isConfirmDelete}
                        onDragStart={(e) => {
                          setDragFromIndex(index)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          setDragOverIndex(index)
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragFromIndex !== null && dragFromIndex !== index) {
                            onReorderPages(dragFromIndex, index)
                          }
                          setDragFromIndex(null)
                          setDragOverIndex(null)
                        }}
                        onDragEnd={() => {
                          setDragFromIndex(null)
                          setDragOverIndex(null)
                        }}
                        className={cn(
                          'group flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors select-none',
                          isRenaming || isConfirmDelete ? 'cursor-default' : 'cursor-grab',
                          isDragOver && (isDark ? 'border-t-2 border-primary/60' : 'border-t-2 border-primary/50'),
                          dragFromIndex === index && 'opacity-40',
                          isActive
                            ? cn('font-medium', isDark ? 'bg-white/10 text-white' : 'bg-primary/8 text-foreground')
                            : cn(isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground'),
                        )}
                        onClick={() => {
                          if (!isRenaming && !isConfirmDelete) {
                            onSelectPage(page.id)
                            setPagesOpen(false)
                          }
                        }}
                      >
                        <DiagramIcon type={detectDiagramType(page.code)} className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />

                        {isConfirmDelete ? (
                          <>
                            <span className={cn('flex-1 text-xs', isDark ? 'text-red-300' : 'text-red-600')}>Delete "{page.name}"?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); setConfirmDeleteId(null); if (pages.length <= 1) setPagesOpen(false) }}
                              className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors', isDark ? 'bg-red-500/20 hover:bg-red-500/35 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600')}
                            >Yes</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                              className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors', isDark ? 'hover:bg-white/8 text-zinc-400' : 'hover:bg-black/5 text-zinc-500')}
                            >No</button>
                          </>
                        ) : isRenaming ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename()
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            className="flex-1 bg-transparent outline-none border-b border-primary text-xs text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 truncate">{page.name}</span>
                        )}

                        {/* Actions — visible on hover */}
                        {!isRenaming && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(page) }}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Rename"
                            >
                              <PencilSimple className="w-2.5 h-2.5" />
                            </button>
                            {pages.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(page.id) }}
                                className="p-0.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <TrashSimple className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* New diagram button inside dropdown */}
                <div className="border-t border-border/40 px-1 py-1">
                  <button
                    onClick={handleAddPage}
                    className={cn(
                      'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                      isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/3 hover:text-foreground',
                    )}
                  >
                    <Plus className="w-3 h-3" />
                    <span>New diagram</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <span className="text-xs font-semibold text-foreground tracking-wide flex-1 pl-1">
            Configuration
          </span>
        )}

        {/* Error indicator */}
        {error && activeTab === 'code' && (
          <div className="flex items-center gap-1 mr-0.5">
            <WarningCircle className="w-3 h-3 text-red-500" />
          </div>
        )}

        {/* Auto-format toggle */}
        {activeTab === 'code' && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onAutoFormatChange(!autoFormat)}
                className={cn(
                  'shrink-0 rounded-lg',
                  autoFormat ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Code className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{autoFormat ? 'Auto-format on (click to disable)' : 'Auto-format off (click to enable)'}</TooltipContent>
          </Tooltip>
        )}

        {/* Ligatures toggle */}
        {activeTab === 'code' && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onLigaturesChange(!editorLigatures)}
                className={cn(
                  'shrink-0 rounded-lg',
                  editorLigatures
                    ? (isDark ? 'text-primary' : 'text-primary')
                    : 'text-muted-foreground',
                )}
              >
                <TextAa className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{editorLigatures ? 'Disable ligatures' : 'Enable ligatures'}</TooltipContent>
          </Tooltip>
        )}

        {/* Copy code */}
        {activeTab === 'code' && code.trim() !== '' && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 1500)
                }}
                className={cn('shrink-0 rounded-lg', codeCopied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground')}
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <CopySimple className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{codeCopied ? 'Copied!' : 'Copy code'}</TooltipContent>
          </Tooltip>
        )}

        {/* New page shortcut button (always visible) */}
        {activeTab === 'code' && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleAddPage}
                className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New diagram (⌘T)</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon-sm" onClick={() => setCollapsed(!collapsed)} className="shrink-0 rounded-lg">
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
            {activeTab === 'code' && code.trim() === '' ? (
              <TemplateGallery mode={mode} onSelect={onChange} />
            ) : activeTab === 'code' ? (
              <CodeMirror
                key={activePageId}
                value={code}
                onChange={handleCodeChange}
                extensions={extensions}
                theme={isDark ? githubDark : githubLight}
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
            ) : (
              <ConfigPanel config={diagramConfig} code={code} mode={mode} onChange={onConfigChange} mermaidTheme={mermaidTheme} onMermaidThemeChange={onMermaidThemeChange} />
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
        </div>
      )}
    </div>
  )
}
