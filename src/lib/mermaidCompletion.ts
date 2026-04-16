/**
 * mermaidCompletion.ts
 *
 * Production-quality CodeMirror autocompletion for Mermaid diagrams.
 *
 * Design decisions:
 * 1. Context-aware: only shows keywords for the detected diagram type
 * 2. Positionally-aware: suppresses completions inside strings, comments, labels
 * 3. Uses `validFor` so CodeMirror re-filters locally instead of re-querying
 * 4. Keywords boosted by frequency/importance; snippets are low-boost (Ctrl+Space only)
 * 5. Keywords `apply` with a trailing space for fluid typing
 * 6. Snippets have distinct labels that won't collide with keyword filtering
 */

import { autocompletion } from '@codemirror/autocomplete'
import type { CompletionContext, Completion, CompletionResult } from '@codemirror/autocomplete'
import { snippetCompletion } from '@codemirror/autocomplete'
import { tooltips } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { detectDiagramType, type DiagramType } from './detectDiagram'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Keyword completion that appends a trailing space on accept (unless one exists) */
function kw(label: string, detail: string, boost = 0): Completion {
  return {
    label, detail, type: 'keyword', boost,
    apply: (view, completion, from, to) => {
      const after = view.state.doc.sliceString(to, to + 1)
      const insert = after === ' ' ? completion.label : completion.label + ' '
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } })
    },
  }
}

/** Constant completion (no trailing space — usually followed by punctuation) */
function ct(label: string, detail: string, boost = 0): Completion {
  return { label, detail, type: 'constant', boost }
}

/** Snippet that only shows on Ctrl+Space (low boost, won't match word filter) */
function snip(template: string, label: string, detail: string, boost = -10): Completion {
  return snippetCompletion(template, { label, detail, type: 'text', boost })
}

const VALID_FOR = /^[\w-]*$/

// ── Positional awareness ──────────────────────────────────────────────────────

/** Check if cursor is inside a context where completions should be suppressed */
function isInSuppressedContext(lineText: string, cursorCol: number): boolean {
  // Inside a %% comment — everything after %% is a comment
  const commentIdx = lineText.indexOf('%%')
  if (commentIdx !== -1 && cursorCol > commentIdx + 2) return true

  // Inside a string literal — count unescaped quotes before cursor
  let inDouble = false
  let inSingle = false
  for (let i = 0; i < cursorCol && i < lineText.length; i++) {
    const ch = lineText[i]
    if (ch === '\\') { i++; continue }  // skip escaped
    if (ch === '"' && !inSingle) inDouble = !inDouble
    if (ch === "'" && !inDouble) inSingle = !inSingle
  }
  if (inDouble || inSingle) return true

  // Inside square-bracket labels: [...] (flowchart node text)
  // Inside parenthesized labels: (...) (flowchart rounded nodes)
  // Inside curly labels: {...} (decision diamonds)
  // We track bracket depth — if we're inside an unclosed bracket, suppress
  let squareDepth = 0
  let parenDepth = 0
  let curlyDepth = 0
  for (let i = 0; i < cursorCol && i < lineText.length; i++) {
    const ch = lineText[i]
    if (ch === '"' || ch === "'") {
      // Skip over string contents
      const quote = ch
      i++
      while (i < cursorCol && i < lineText.length && lineText[i] !== quote) {
        if (lineText[i] === '\\') i++
        i++
      }
      continue
    }
    if (ch === '[') squareDepth++
    else if (ch === ']') squareDepth = Math.max(0, squareDepth - 1)
    else if (ch === '(') parenDepth++
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1)
    else if (ch === '{') curlyDepth++
    else if (ch === '}') curlyDepth = Math.max(0, curlyDepth - 1)
  }
  if (squareDepth > 0 || parenDepth > 0 || curlyDepth > 0) return true

  return false
}

// ── Diagram starter snippets (line 1 only, no type detected) ──────────────────

const DIAGRAM_STARTERS: Completion[] = [
  snip('flowchart ${1:LR}\n  ${2:A} --> ${3:B}', 'flowchart', 'Flowchart / graph diagram', 10),
  snip('sequenceDiagram\n  ${1:Alice} ->> ${2:Bob}: ${3:Hello}', 'sequenceDiagram', 'Sequence diagram', 9),
  snip('classDiagram\n  class ${1:Animal} {\n    +${2:name} String\n  }', 'classDiagram', 'Class diagram (UML)', 8),
  snip('erDiagram\n  ${1:CUSTOMER} ||--o{ ${2:ORDER} : "${3:places}"', 'erDiagram', 'Entity-relationship diagram', 7),
  snip('stateDiagram-v2\n  [*] --> ${1:State1}\n  ${1:State1} --> [*]', 'stateDiagram-v2', 'State diagram', 6),
  snip('gantt\n  title ${1:My Project}\n  dateFormat YYYY-MM-DD\n  section ${2:Phase 1}\n    ${3:Task 1} :${4:a1}, ${5:2024-01-01}, ${6:7d}', 'gantt', 'Gantt chart', 5),
  snip('pie title ${1:My Pie}\n  "${2:A}" : ${3:40}\n  "${4:B}" : ${5:60}', 'pie', 'Pie chart', 5),
  snip('gitGraph\n  commit\n  branch ${1:feature}\n  checkout ${1:feature}\n  commit\n  checkout main\n  merge ${1:feature}', 'gitGraph', 'Git graph', 4),
  snip('mindmap\n  root((${1:Mind Map}))\n    ${2:Topic 1}\n    ${3:Topic 2}', 'mindmap', 'Mind map', 4),
  snip('timeline\n  title ${1:My Timeline}\n  section ${2:Era 1}\n    ${3:2020} : ${4:Event}', 'timeline', 'Timeline', 3),
  snip('quadrantChart\n  title ${1:Reach vs Impact}\n  x-axis ${2:Low} --> ${3:High}\n  y-axis ${4:Low} --> ${5:High}', 'quadrantChart', 'Quadrant chart', 3),
  snip('xychart-beta\n  title "${1:Chart}"\n  x-axis [${2:Jan, Feb, Mar}]\n  bar [${3:100, 200, 300}]', 'xychart-beta', 'XY chart', 3),
  snip('architecture-beta\n  group ${1:api}[${2:API}]\n  service ${3:db}(${4:database})[${5:DB}] in ${1:api}', 'architecture-beta', 'Architecture diagram', 2),
  snip('sankey-beta\n  ${1:A},${2:B},${3:10}', 'sankey-beta', 'Sankey diagram', 2),
  snip('journey\n  title ${1:My Journey}\n  section ${2:Phase 1}\n    ${3:Task}: ${4:5}: ${5:Me}', 'journey', 'User journey', 2),
  snip('requirementDiagram\n  requirement ${1:test_req} {\n    id: ${2:1}\n    text: ${3:Description}\n  }', 'requirementDiagram', 'Requirement diagram', 2),
  snip('block-beta\n  columns ${1:3}\n  ${2:A}["${3:Block A}"]', 'block-beta', 'Block diagram', 1),
  snip('kanban\n  ${1:Todo}\n    ${2:task1}["${3:Task 1}"]', 'kanban', 'Kanban board', 1),
  snip('packet-beta\n  0-15: "${1:Source Port}"\n  16-31: "${2:Dest Port}"', 'packet-beta', 'Packet diagram', 1),
  snip('radar-beta\n  axis ${1:A}, ${2:B}, ${3:C}\n  curve ${4:Data} { ${5:80}, ${6:60}, ${7:90} }', 'radar-beta', 'Radar chart', 1),
]

// ── Per-diagram keywords (high-boost) and snippets (low-boost, Ctrl+Space) ──

const KEYWORDS: Record<string, Completion[]> = {
  flowchart: [
    kw('subgraph', 'Start a subgraph', 10),
    kw('end', 'End a subgraph or block', 9),
    kw('direction', 'Set layout direction', 5),
    kw('click', 'Add click handler to node', 3),
    kw('style', 'Style a node', 3),
    kw('classDef', 'Define a CSS class', 3),
    kw('class', 'Apply a class to node(s)', 3),
    kw('linkStyle', 'Style a link by index', 2),
    ct('LR', 'Left to right', 4),
    ct('RL', 'Right to left', 4),
    ct('TD', 'Top down', 4),
    ct('TB', 'Top to bottom', 4),
    ct('BT', 'Bottom to top', 4),
  ],

  sequence: [
    kw('participant', 'Declare a participant', 10),
    kw('actor', 'Declare an actor (stick figure)', 9),
    kw('activate', 'Activate a participant', 7),
    kw('deactivate', 'Deactivate a participant', 7),
    kw('loop', 'Start a loop block', 8),
    kw('end', 'End a block', 9),
    kw('alt', 'Alternative block', 7),
    kw('else', 'Else branch in alt block', 6),
    kw('opt', 'Optional block', 6),
    kw('par', 'Parallel block', 6),
    kw('and', 'And branch in par block', 5),
    kw('critical', 'Critical block', 5),
    kw('break', 'Break block', 4),
    kw('rect', 'Highlight region with color', 4),
    kw('note', 'Add a note', 7),
    kw('autonumber', 'Auto-number messages', 3),
    kw('title', 'Set diagram title', 5),
    kw('create', 'Create a participant mid-diagram', 3),
    kw('destroy', 'Destroy a participant mid-diagram', 3),
    // Snippets — only on Ctrl+Space
    snip('note right of ${1:A}: ${2:text}', 'note right of…', 'Note to the right'),
    snip('note over ${1:A},${2:B}: ${3:text}', 'note over…', 'Note spanning participants'),
  ],

  classDiagram: [
    kw('class', 'Define a class', 10),
    kw('interface', 'Define an interface', 7),
    kw('abstract', 'Mark as abstract', 5),
    kw('enum', 'Define an enum', 5),
    kw('namespace', 'Define a namespace', 5),
    kw('direction', 'Set layout direction', 4),
    kw('note', 'Add a note', 4),
    kw('link', 'Add a hyperlink to a class', 3),
    kw('callback', 'Add a callback to a class', 3),
    kw('click', 'Add click handler', 3),
    // Snippets
    snip('class ${1:Name} {\n  +${2:field} ${3:Type}\n  +${4:method}() ${5:ReturnType}\n}', 'class {…}', 'Class with fields/methods'),
  ],

  erDiagram: [
    ct('PK', 'Primary key', 5),
    ct('FK', 'Foreign key', 5),
    ct('UK', 'Unique key', 4),
    ct('string', 'String attribute', 3),
    ct('int', 'Integer attribute', 3),
    ct('float', 'Float attribute', 2),
    ct('boolean', 'Boolean attribute', 2),
    ct('date', 'Date attribute', 2),
    // Snippets
    snip('${1:ENTITY} {\n  ${2:string} ${3:id} PK\n  ${4:string} ${5:name}\n}', 'entity {…}', 'Entity definition'),
  ],

  stateDiagram: [
    kw('state', 'Define a named state', 10),
    kw('note', 'Add a note to a state', 5),
    kw('direction', 'Set layout direction', 5),
    // Snippets
    snip('[*] --> ${1:State}', '[*] → start', 'Start transition'),
    snip('${1:State} --> [*]', '→ [*] end', 'End transition'),
    snip('state ${1:Compound} {\n  ${2:A} --> ${3:B}\n}', 'state {…}', 'Compound/nested state'),
  ],

  gantt: [
    kw('title', 'Set the chart title', 10),
    kw('dateFormat', 'Set date format (e.g. YYYY-MM-DD)', 9),
    kw('axisFormat', 'Format for axis labels', 7),
    kw('tickInterval', 'Tick interval for the axis', 5),
    kw('section', 'Start a new section', 8),
    kw('excludes', 'Exclude days from timeline', 4),
    kw('todayMarker', 'Show/hide today marker', 3),
    ct('done', 'Mark task as done', 5),
    ct('active', 'Mark task as active', 5),
    ct('crit', 'Mark task as critical', 5),
    ct('milestone', 'Create a milestone', 4),
    kw('after', 'Task starts after another', 4),
  ],

  pie: [
    kw('showData', 'Show values on pie slices', 8),
    kw('title', 'Set the chart title', 10),
  ],

  gitgraph: [
    kw('commit', 'Add a commit', 10),
    kw('branch', 'Create a branch', 9),
    kw('checkout', 'Switch to a branch', 8),
    kw('merge', 'Merge a branch', 8),
    kw('cherry-pick', 'Cherry-pick a commit', 5),
    // Snippets
    snip('commit id: "${1:label}" tag: "${2:tag}"', 'commit id+tag', 'Labeled commit with tag'),
    snip('commit type: ${1:HIGHLIGHT}', 'commit type…', 'Styled commit (HIGHLIGHT/REVERSE/NORMAL)'),
  ],

  mindmap: [
    snip('root((${1:Root Topic}))', 'root((…))', 'Root node (circle)'),
  ],

  xychart: [
    kw('title', 'Set chart title', 10),
    kw('x-axis', 'Define the X axis', 9),
    kw('y-axis', 'Define the Y axis', 9),
    kw('bar', 'Bar chart data series', 7),
    kw('line', 'Line chart data series', 7),
  ],

  architecture: [
    kw('group', 'Define a group/container', 10),
    kw('service', 'Define a service', 9),
    kw('junction', 'Define a junction point', 5),
    kw('in', 'Place component inside group', 7),
    ct('cloud', 'Cloud icon', 3),
    ct('server', 'Server icon', 3),
    ct('database', 'Database icon', 3),
    ct('disk', 'Disk icon', 2),
    ct('internet', 'Internet icon', 2),
  ],

  timeline: [
    kw('title', 'Set the timeline title', 10),
    kw('section', 'Start a new section', 8),
  ],

  quadrant: [
    kw('title', 'Set chart title', 10),
    kw('x-axis', 'Label the X axis', 9),
    kw('y-axis', 'Label the Y axis', 9),
    kw('quadrant-1', 'Label top-right quadrant', 5),
    kw('quadrant-2', 'Label top-left quadrant', 5),
    kw('quadrant-3', 'Label bottom-left quadrant', 5),
    kw('quadrant-4', 'Label bottom-right quadrant', 5),
  ],

  journey: [
    kw('title', 'Set journey title', 10),
    kw('section', 'Start a section', 8),
  ],

  requirement: [
    kw('requirement', 'Define a requirement', 10),
    kw('functionalRequirement', 'Functional requirement', 7),
    kw('interfaceRequirement', 'Interface requirement', 6),
    kw('performanceRequirement', 'Performance requirement', 6),
    kw('physicalRequirement', 'Physical requirement', 6),
    kw('designConstraint', 'Design constraint', 6),
    kw('element', 'Define an element', 8),
    kw('satisfies', 'Satisfies relationship', 4),
    kw('traces', 'Traces relationship', 4),
    kw('contains', 'Contains relationship', 4),
    ct('high', 'High risk/priority', 3),
    ct('medium', 'Medium risk/priority', 3),
    ct('low', 'Low risk/priority', 3),
    ct('test', 'Verify by test', 2),
    ct('analysis', 'Verify by analysis', 2),
    ct('inspection', 'Verify by inspection', 2),
    ct('demonstration', 'Verify by demonstration', 2),
  ],

  sankey: [],

  block: [
    kw('columns', 'Set number of columns', 8),
    kw('space', 'Empty space in grid', 5),
    kw('end', 'End a block', 7),
  ],

  kanban: [],

  packet: [],

  radar: [
    kw('axis', 'Define radar axes', 10),
    kw('curve', 'Define a data curve', 9),
    snip('axis ${1:A}, ${2:B}, ${3:C}', 'axis …', 'Axis label list'),
    snip('curve ${1:Series} { ${2:80}, ${3:60}, ${4:90} }', 'curve {…}', 'Data series'),
  ],
}

// Universal completions — always available regardless of diagram type
const UNIVERSAL: Completion[] = [
  snip('%%{init: {${1:"theme": "base"}}}%%', '%%{init:}%%', 'Init directive (theme, config)', -20),
  snip('%% ${1:comment}', '%%…', 'Comment', -20),
]

// ── CompletionSource ──────────────────────────────────────────────────────────

function mermaidCompletionSource(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context
  const line = state.doc.lineAt(pos)
  const lineNumber = line.number
  const cursorCol = pos - line.from

  // Get the word being typed
  const word = context.matchBefore(/[\w-]+/)

  // ── Suppress in comments, strings, and bracket labels ──
  if (isInSuppressedContext(line.text, cursorCol)) return null

  // ── Detect diagram type from document ──
  const fullText = state.doc.toString()
  const diagType = detectDiagramType(fullText)

  // ── Line 1, no type detected: offer diagram starters ──
  if (lineNumber === 1 && diagType === 'other') {
    const from = word ? word.from : pos
    return { from, options: DIAGRAM_STARTERS, validFor: VALID_FOR, filter: true }
  }

  // ── Body lines: need a word being typed (or explicit Ctrl+Space) ──
  if (!word && !context.explicit) return null

  const from = word ? word.from : pos
  const diagramKws = getKeywordsForType(diagType)
  const options = [...UNIVERSAL, ...diagramKws]

  if (options.length === 0) return null

  return { from, options, validFor: VALID_FOR, filter: true }
}

function getKeywordsForType(diagType: DiagramType): Completion[] {
  if (diagType === 'other') return []
  return KEYWORDS[diagType] ?? []
}

// ── Exported extension ────────────────────────────────────────────────────────

export function mermaidCompletionExtension(): Extension {
  return [
    // Fixed positioning so the dropdown escapes overflow:hidden containers
    tooltips({ position: 'fixed' }),
    autocompletion({
      override: [mermaidCompletionSource],
      defaultKeymap: true,
      activateOnTyping: true,
      maxRenderedOptions: 20,
      icons: false,
    }),
  ]
}
