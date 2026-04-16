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

/** Snippet completion with tab-stop placeholders */
function snip(template: string, label: string, detail: string, boost = 0): Completion {
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
    snip('subgraph ${1:Title}\n  ${2}\nend', 'subgraph', 'Start a subgraph', 10),
    kw('end', 'End a subgraph or block', 9),
    snip('direction ${1:LR}', 'direction', 'Set layout direction', 5),
    snip('click ${1:nodeId} "${2:url}"', 'click', 'Add click handler to node', 3),
    snip('style ${1:nodeId} fill:${2:#f9f},stroke:${3:#333}', 'style', 'Style a node', 3),
    snip('classDef ${1:className} fill:${2:#f9f},stroke:${3:#333}', 'classDef', 'Define a CSS class', 3),
    snip('class ${1:nodeId} ${2:className}', 'class', 'Apply a class to node(s)', 3),
    snip('linkStyle ${1:0} stroke:${2:#ff3},stroke-width:${3:2px}', 'linkStyle', 'Style a link by index', 2),
    ct('LR', 'Left to right', 4),
    ct('RL', 'Right to left', 4),
    ct('TD', 'Top down', 4),
    ct('TB', 'Top to bottom', 4),
    ct('BT', 'Bottom to top', 4),
  ],

  sequence: [
    snip('participant ${1:Name}', 'participant', 'Declare a participant', 10),
    snip('actor ${1:Name}', 'actor', 'Declare an actor (stick figure)', 9),
    snip('activate ${1:Name}', 'activate', 'Activate a participant', 7),
    snip('deactivate ${1:Name}', 'deactivate', 'Deactivate a participant', 7),
    snip('loop ${1:Condition}\n  ${2}\nend', 'loop', 'Start a loop block', 8),
    kw('end', 'End a block', 9),
    snip('alt ${1:Condition}\n  ${2}\nelse ${3:Otherwise}\n  ${4}\nend', 'alt', 'Alternative block', 7),
    kw('else', 'Else branch in alt block', 6),
    snip('opt ${1:Condition}\n  ${2}\nend', 'opt', 'Optional block', 6),
    snip('par ${1:Label}\n  ${2}\nand ${3:Label}\n  ${4}\nend', 'par', 'Parallel block', 6),
    kw('and', 'And branch in par block', 5),
    snip('critical ${1:Label}\n  ${2}\nend', 'critical', 'Critical block', 5),
    snip('break ${1:Condition}\n  ${2}\nend', 'break', 'Break block', 4),
    snip('rect rgb(${1:200}, ${2:220}, ${3:255})\n  ${4}\nend', 'rect', 'Highlight region with color', 4),
    snip('note right of ${1:A}: ${2:text}', 'note right of', 'Note to the right', 7),
    snip('note left of ${1:A}: ${2:text}', 'note left of', 'Note to the left', 7),
    snip('note over ${1:A},${2:B}: ${3:text}', 'note over', 'Note spanning participants', 6),
    kw('autonumber', 'Auto-number messages', 3),
    snip('title ${1:Diagram Title}', 'title', 'Set diagram title', 5),
    snip('create participant ${1:Name}', 'create', 'Create a participant mid-diagram', 3),
    snip('destroy ${1:Name}', 'destroy', 'Destroy a participant mid-diagram', 3),
  ],

  classDiagram: [
    snip('class ${1:Name} {\n  +${2:field} ${3:Type}\n  +${4:method}() ${5:ReturnType}\n}', 'class', 'Define a class with members', 10),
    kw('interface', 'Define an interface', 7),
    kw('abstract', 'Mark as abstract', 5),
    kw('enum', 'Define an enum', 5),
    snip('namespace ${1:Name} {\n  ${2}\n}', 'namespace', 'Define a namespace', 5),
    snip('direction ${1:LR}', 'direction', 'Set layout direction', 4),
    snip('note for ${1:ClassName} "${2:note text}"', 'note', 'Add a note', 4),
    snip('link ${1:ClassName} "${2:url}"', 'link', 'Add a hyperlink to a class', 3),
    snip('click ${1:ClassName} ${2:callbackName}', 'click', 'Add click handler', 3),
  ],

  erDiagram: [
    snip('${1:ENTITY} {\n  ${2:string} ${3:id} PK\n  ${4:string} ${5:name}\n}', 'entity', 'Entity definition with attributes', 10),
    ct('PK', 'Primary key', 5),
    ct('FK', 'Foreign key', 5),
    ct('UK', 'Unique key', 4),
    ct('string', 'String attribute', 3),
    ct('int', 'Integer attribute', 3),
    ct('float', 'Float attribute', 2),
    ct('boolean', 'Boolean attribute', 2),
    ct('date', 'Date attribute', 2),
  ],

  stateDiagram: [
    snip('state ${1:Name}', 'state', 'Define a named state', 10),
    snip('state ${1:Compound} {\n  ${2:A} --> ${3:B}\n}', 'state {…}', 'Compound/nested state', 9),
    snip('[*] --> ${1:State}', '[*] → start', 'Start transition', 8),
    snip('${1:State} --> [*]', '→ [*] end', 'End transition', 7),
    snip('note right of ${1:State}: ${2:text}', 'note', 'Add a note to a state', 5),
    snip('direction ${1:LR}', 'direction', 'Set layout direction', 5),
  ],

  gantt: [
    snip('title ${1:Project Name}', 'title', 'Set the chart title', 10),
    snip('dateFormat ${1:YYYY-MM-DD}', 'dateFormat', 'Set date format', 9),
    snip('section ${1:Phase Name}', 'section', 'Start a new section', 8),
    snip('axisFormat ${1:%Y-%m-%d}', 'axisFormat', 'Format for axis labels', 7),
    snip('tickInterval ${1:1week}', 'tickInterval', 'Tick interval for the axis', 5),
    snip('excludes ${1:weekends}', 'excludes', 'Exclude days from timeline', 4),
    kw('todayMarker', 'Show/hide today marker', 3),
    kw('after', 'Task starts after another', 4),
    ct('done', 'Mark task as done', 5),
    ct('active', 'Mark task as active', 5),
    ct('crit', 'Mark task as critical', 5),
    ct('milestone', 'Create a milestone', 4),
  ],

  pie: [
    snip('title ${1:Chart Title}', 'title', 'Set the chart title', 10),
    kw('showData', 'Show values on pie slices', 8),
    snip('"${1:Label}" : ${2:value}', '"label" : value', 'Pie slice entry', 6),
  ],

  gitgraph: [
    kw('commit', 'Add a commit', 10),
    snip('commit id: "${1:label}" tag: "${2:tag}"', 'commit id+tag', 'Labeled commit with tag', 9),
    snip('commit type: ${1:HIGHLIGHT}', 'commit type', 'Styled commit (HIGHLIGHT/REVERSE/NORMAL)', 8),
    snip('branch ${1:feature}', 'branch', 'Create a branch', 9),
    snip('checkout ${1:feature}', 'checkout', 'Switch to a branch', 8),
    snip('merge ${1:feature}', 'merge', 'Merge a branch', 8),
    snip('cherry-pick id: "${1:commitId}"', 'cherry-pick', 'Cherry-pick a commit', 5),
  ],

  mindmap: [
    snip('root((${1:Root Topic}))', 'root', 'Root node (circle)', 10),
  ],

  xychart: [
    snip('title "${1:Chart Title}"', 'title', 'Set chart title', 10),
    snip('x-axis [${1:Jan, Feb, Mar}]', 'x-axis', 'Define the X axis', 9),
    snip('y-axis "${1:Label}" ${2:0} --> ${3:100}', 'y-axis', 'Define the Y axis', 9),
    snip('bar [${1:100, 200, 300}]', 'bar', 'Bar chart data series', 7),
    snip('line [${1:100, 200, 300}]', 'line', 'Line chart data series', 7),
  ],

  architecture: [
    snip('group ${1:id}[${2:Label}]', 'group', 'Define a group/container', 10),
    snip('service ${1:id}(${2:icon})[${3:Label}] in ${4:group}', 'service', 'Define a service', 9),
    snip('junction ${1:id} in ${2:group}', 'junction', 'Define a junction point', 5),
    ct('cloud', 'Cloud icon', 3),
    ct('server', 'Server icon', 3),
    ct('database', 'Database icon', 3),
    ct('disk', 'Disk icon', 2),
    ct('internet', 'Internet icon', 2),
  ],

  timeline: [
    snip('title ${1:Timeline Title}', 'title', 'Set the timeline title', 10),
    snip('section ${1:Era Name}', 'section', 'Start a new section', 8),
    snip('${1:2024} : ${2:Event description}', 'year : event', 'Timeline entry', 6),
  ],

  quadrant: [
    snip('title ${1:Chart Title}', 'title', 'Set chart title', 10),
    snip('x-axis ${1:Low} --> ${2:High}', 'x-axis', 'Label the X axis', 9),
    snip('y-axis ${1:Low} --> ${2:High}', 'y-axis', 'Label the Y axis', 9),
    snip('quadrant-1 ${1:Label}', 'quadrant-1', 'Label top-right quadrant', 5),
    snip('quadrant-2 ${1:Label}', 'quadrant-2', 'Label top-left quadrant', 5),
    snip('quadrant-3 ${1:Label}', 'quadrant-3', 'Label bottom-left quadrant', 5),
    snip('quadrant-4 ${1:Label}', 'quadrant-4', 'Label bottom-right quadrant', 5),
    snip('${1:Point}: [${2:0.5}, ${3:0.5}]', 'point', 'Plot a data point', 4),
  ],

  journey: [
    snip('title ${1:Journey Title}', 'title', 'Set journey title', 10),
    snip('section ${1:Phase Name}', 'section', 'Start a section', 8),
    snip('${1:Task}: ${2:5}: ${3:Person1}', 'task', 'Journey task (name: score: actors)', 6),
  ],

  requirement: [
    snip('requirement ${1:name} {\n  id: ${2:1}\n  text: ${3:Description}\n  risk: ${4:high}\n  verifyMethod: ${5:test}\n}', 'requirement', 'Define a requirement', 10),
    snip('element ${1:name} {\n  type: ${2:component}\n}', 'element', 'Define an element', 8),
    kw('functionalRequirement', 'Functional requirement', 7),
    kw('interfaceRequirement', 'Interface requirement', 6),
    kw('performanceRequirement', 'Performance requirement', 6),
    kw('physicalRequirement', 'Physical requirement', 6),
    kw('designConstraint', 'Design constraint', 6),
    kw('satisfies', 'Satisfies relationship', 4),
    kw('traces', 'Traces relationship', 4),
    kw('contains', 'Contains relationship', 4),
    ct('high', 'High risk/priority', 3),
    ct('medium', 'Medium risk/priority', 3),
    ct('low', 'Low risk/priority', 3),
  ],

  sankey: [
    snip('${1:Source},${2:Target},${3:10}', 'flow', 'Sankey flow entry', 5),
  ],

  block: [
    snip('columns ${1:3}', 'columns', 'Set number of columns', 8),
    kw('space', 'Empty space in grid', 5),
    kw('end', 'End a block', 7),
    snip('${1:id}["${2:Label}"]', 'block', 'Block with label', 6),
  ],

  kanban: [
    snip('${1:Column Title}\n  ${2:taskId}["${3:Task label}"]', 'column', 'Kanban column with task', 8),
    snip('@{ ticket: ${1:MC-123}, priority: ${2:High} }', 'metadata', 'Task metadata', 5),
  ],

  packet: [
    snip('${1:0}-${2:15}: "${3:Field Name}"', 'field', 'Packet field definition', 8),
  ],

  radar: [
    snip('axis ${1:A}, ${2:B}, ${3:C}', 'axis', 'Define radar axes', 10),
    snip('curve ${1:Series} { ${2:80}, ${3:60}, ${4:90} }', 'curve', 'Define a data curve', 9),
  ],
}

// Universal completions — always available regardless of diagram type
const UNIVERSAL: Completion[] = [
  snip('%%{init: {${1:"theme": "base"}}}%%', '%%{init:}%%', 'Init directive (theme, config)', -5),
  snip('%% ${1:comment}', '%%…', 'Comment', -5),
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
