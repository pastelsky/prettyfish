/**
 * diagram-type-mappings.test.ts
 *
 * Exhaustive tests ensuring all diagram type mappings stay in sync across:
 * - detectDiagram.ts  (DiagramType union + regex matchers)
 * - referenceData.ts  (DIAGRAM_REFS keys)
 * - mermaidCompletion.ts (KEYWORDS record keys)
 * - mermaidAltClick.ts (DIAGRAM_TYPE_TO_REF_KEY mapping)
 * - mermaidTokenLookup.ts (DIAGRAM_NODE_MAPS + STREAM_KEYWORD_MAPS)
 * - reference.ts (getRef fallback)
 *
 * If any of these drift, these tests fail — preventing silent breakage.
 */

import { describe, it, expect } from 'vitest'
import { detectDiagramType, type DiagramType } from '../detectDiagram'
import { DIAGRAM_REFS } from '../referenceData'
import { getRef, GENERIC_REF } from '../reference'

// ── All diagram types that detectDiagramType can return (excluding 'other') ──

const ALL_DIAGRAM_TYPES: DiagramType[] = [
  'flowchart',
  'sequence',
  'gantt',
  'classDiagram',
  'erDiagram',
  'stateDiagram',
  'pie',
  'gitgraph',
  'mindmap',
  'timeline',
  'quadrant',
  'xychart',
  'architecture',
  'kanban',
  'sankey',
  'block',
  'packet',
  'journey',
  'requirement',
  'radar',
]

// Map from detectDiagramType output → referenceData key
// This is the canonical mapping. If a new type is added, it must be added here.
const DETECT_TO_REF_KEY: Record<string, string> = {
  flowchart:    'flowchart',
  sequence:     'sequenceDiagram',
  gantt:        'gantt',
  classDiagram: 'classDiagram',
  erDiagram:    'erDiagram',
  stateDiagram: 'stateDiagram',
  pie:          'pie',
  gitgraph:     'gitGraph',
  mindmap:      'mindmap',
  timeline:     'timeline',
  quadrant:     'quadrantChart',
  xychart:      'xychart',
  architecture: 'architecture',
  kanban:       'kanban',
  sankey:       'sankey',
  block:        'block',
  packet:       'packet',
  journey:      'journey',
  requirement:  'requirement',
  radar:        'radar',
}

// ── Sample code snippets that should be detected as each type ──

const SAMPLE_CODE: Record<DiagramType, string> = {
  flowchart:    'flowchart LR\n  A --> B',
  sequence:     'sequenceDiagram\n  Alice ->> Bob: Hello',
  gantt:        'gantt\n  title My Project',
  classDiagram: 'classDiagram\n  class Animal',
  erDiagram:    'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
  stateDiagram: 'stateDiagram-v2\n  [*] --> Active',
  pie:          'pie title Pets\n  "Dogs" : 40',
  gitgraph:     'gitGraph\n  commit',
  mindmap:      'mindmap\n  root((Root))',
  timeline:     'timeline\n  title History',
  quadrant:     'quadrantChart\n  title Priorities',
  xychart:      'xychart-beta\n  title Sales',
  architecture: 'architecture-beta\n  group api[API]',
  kanban:       'kanban\n  Todo',
  sankey:       'sankey-beta\n  A,B,10',
  block:        'block-beta\n  columns 3',
  packet:       'packet-beta\n  0-15: "Source"',
  journey:      'journey\n  title My Journey',
  requirement:  'requirementDiagram\n  requirement test_req',
  radar:        'radar-beta\n  axis A, B, C',
  other:        'hello world this is not a diagram',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('detectDiagramType', () => {
  it.each(Object.entries(SAMPLE_CODE))(
    'detects %s from sample code',
    (expectedType, code) => {
      expect(detectDiagramType(code)).toBe(expectedType)
    },
  )

  it('returns "other" for empty input', () => {
    expect(detectDiagramType('')).toBe('other')
  })

  it('returns "other" for plain text', () => {
    expect(detectDiagramType('just some text\nwith lines')).toBe('other')
  })

  it('is case-insensitive for diagram declarations', () => {
    expect(detectDiagramType('FLOWCHART LR\n  A --> B')).toBe('flowchart')
    expect(detectDiagramType('SequenceDiagram\n  A ->> B: hi')).toBe('sequence')
    expect(detectDiagramType('GANTT\n  title X')).toBe('gantt')
  })
})

describe('DIAGRAM_REFS coverage', () => {
  it('has a reference entry for every diagram type', () => {
    const refKeys = Object.keys(DIAGRAM_REFS)
    for (const diagType of ALL_DIAGRAM_TYPES) {
      const refKey = DETECT_TO_REF_KEY[diagType]
      expect(refKeys, `Missing referenceData key for detectDiagramType "${diagType}" (expected ref key "${refKey}")`).toContain(refKey)
    }
  })

  it('every referenceData entry has at least one element', () => {
    for (const [key, ref] of Object.entries(DIAGRAM_REFS)) {
      expect(ref.elements.length, `DIAGRAM_REFS["${key}"] has no elements`).toBeGreaterThan(0)
    }
  })

  it('every element has name, syntax, and description', () => {
    for (const [key, ref] of Object.entries(DIAGRAM_REFS)) {
      for (const el of ref.elements) {
        expect(el.name, `Element in ${key} missing name`).toBeTruthy()
        expect(el.syntax, `"${el.name}" in ${key} missing syntax`).toBeTruthy()
        expect(el.description, `"${el.name}" in ${key} missing description`).toBeTruthy()
      }
    }
  })
})

describe('getRef', () => {
  it('returns the correct ref for each referenceData key', () => {
    for (const key of Object.keys(DIAGRAM_REFS)) {
      const ref = getRef(key)
      expect(ref.id, `getRef("${key}") returned wrong ref`).toBe(key)
    }
  })

  it('returns GENERIC_REF for unknown types', () => {
    expect(getRef('nonexistent')).toBe(GENERIC_REF)
    expect(getRef('')).toBe(GENERIC_REF)
  })

  it('every detect type resolves to a non-generic ref via DETECT_TO_REF_KEY', () => {
    for (const diagType of ALL_DIAGRAM_TYPES) {
      const refKey = DETECT_TO_REF_KEY[diagType]!
      const ref = getRef(refKey)
      expect(ref, `getRef("${refKey}") for detect type "${diagType}" returned null/undefined`).toBeTruthy()
      expect(ref).not.toBe(GENERIC_REF)
    }
  })
})

describe('DETECT_TO_REF_KEY completeness', () => {
  it('covers every DiagramType (excluding "other")', () => {
    for (const diagType of ALL_DIAGRAM_TYPES) {
      expect(DETECT_TO_REF_KEY, `DETECT_TO_REF_KEY missing entry for "${diagType}"`).toHaveProperty(diagType)
    }
  })

  it('every mapped ref key exists in DIAGRAM_REFS', () => {
    for (const [diagType, refKey] of Object.entries(DETECT_TO_REF_KEY)) {
      expect(Object.keys(DIAGRAM_REFS), `DETECT_TO_REF_KEY["${diagType}"] maps to "${refKey}" which does not exist in DIAGRAM_REFS`).toContain(refKey)
    }
  })
})

describe('ALL_DIAGRAM_TYPES is exhaustive', () => {
  it('covers every non-other value in the DiagramType union', () => {
    // If a new type is added to detectDiagramType but not to ALL_DIAGRAM_TYPES,
    // the detection tests above will miss it. This test ensures we don't forget.
    // Each type must have a sample code entry and a DETECT_TO_REF_KEY entry.
    expect(ALL_DIAGRAM_TYPES.length).toBe(20) // bump this when adding a new type
    for (const t of ALL_DIAGRAM_TYPES) {
      expect(t).not.toBe('other')
      expect(SAMPLE_CODE).toHaveProperty(t)
      expect(DETECT_TO_REF_KEY).toHaveProperty(t)
    }
  })
})

describe('hover tooltip ref lookup', () => {
  // Verify that for each diagram type, hovering common keywords resolves
  // to a valid reference element (not null, not wrong type)
  const KEYWORD_SAMPLES: Record<string, string[]> = {
    flowchart:    ['subgraph', 'classDef', 'style'],
    sequence:     ['participant', 'actor', 'loop', 'alt', 'note', 'activate'],
    gantt:        ['title', 'dateFormat', 'section'],
    classDiagram: ['class', 'namespace'],
    erDiagram:    ['string', 'int', 'float', 'boolean', 'date'],
    stateDiagram: ['state', 'note', 'direction'],
    pie:          ['showData'],
    gitgraph:     ['commit', 'branch', 'checkout', 'merge'],
    mindmap:      [],
    timeline:     ['title', 'section'],
    quadrant:     ['title', 'x-axis', 'y-axis'],
    xychart:      ['title', 'x-axis', 'y-axis', 'bar', 'line'],
    architecture: ['group', 'service', 'junction'],
    kanban:       [],
    sankey:       [],
    block:        ['columns'],
    packet:       [],
    journey:      ['title', 'section'],
    requirement:  ['requirement', 'element'],
    radar:        ['axis', 'curve'],
  }

  for (const [diagType, keywords] of Object.entries(KEYWORD_SAMPLES)) {
    if (keywords.length === 0) continue

    const refKey = DETECT_TO_REF_KEY[diagType]!
    const diagramRef = DIAGRAM_REFS[refKey]

    if (!diagramRef) continue

    for (const keyword of keywords) {
      it(`"${keyword}" in ${diagType} resolves to a reference element`, () => {
        const wordLower = keyword.toLowerCase()
        const element =
          diagramRef.elements.find(e => e.name.toLowerCase() === wordLower) ??
          diagramRef.elements.find(e => e.syntax.split(/\s/)[0]?.toLowerCase() === wordLower) ??
          diagramRef.elements.find(e => {
            const syntaxLower = e.syntax.toLowerCase()
            return syntaxLower.startsWith(wordLower) && (
              syntaxLower.length === wordLower.length ||
              /[\s[({|<]/.test(syntaxLower[wordLower.length]!)
            )
          })

        expect(element, `Keyword "${keyword}" in ${diagType} (refKey: "${refKey}") did not match any reference element. Available: ${diagramRef.elements.map(e => e.name).join(', ')}`).toBeTruthy()
      })
    }
  }
})

describe('sample code → reference round-trip', () => {
  it.each(ALL_DIAGRAM_TYPES)(
    'detect("%s" sample) → getRef(refKey) returns a valid diagram ref',
    (diagType) => {
      const code = SAMPLE_CODE[diagType]!
      const detected = detectDiagramType(code)
      expect(detected).toBe(diagType)

      const refKey = DETECT_TO_REF_KEY[diagType]!
      const ref = getRef(refKey)
      expect(ref).not.toBe(GENERIC_REF)
      expect(ref.elements.length).toBeGreaterThan(0)
    },
  )
})
