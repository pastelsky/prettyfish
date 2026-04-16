/**
 * mermaidCompletion.ts
 *
 * Context-aware CodeMirror autocompletion for Mermaid diagrams.
 *
 * Strategy:
 * - On the first line (blank or partial): offer diagram type starters as snippets
 * - On subsequent lines: offer keywords relevant to the detected diagram type
 * - Always offer universal items (comments, directives)
 *
 * Uses @codemirror/autocomplete's CompletionSource API.
 */

import { autocompletion } from '@codemirror/autocomplete'
import type { CompletionContext, Completion } from '@codemirror/autocomplete'
import { snippetCompletion } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { detectDiagramType } from './detectDiagram'

// ── Diagram starter snippets (shown on line 1) ────────────────────────────────

const DIAGRAM_STARTERS: Completion[] = [
  snippetCompletion('flowchart ${1:LR}\n  ${2:A} --> ${3:B}', {
    label: 'flowchart',
    detail: 'Flowchart / graph diagram',
    type: 'keyword',
    boost: 10,
  }),
  snippetCompletion('sequenceDiagram\n  ${1:Alice} ->> ${2:Bob}: ${3:Hello}', {
    label: 'sequenceDiagram',
    detail: 'Sequence diagram',
    type: 'keyword',
    boost: 9,
  }),
  snippetCompletion('classDiagram\n  class ${1:Animal} {\n    +${2:name} String\n    +${3:speak()} void\n  }', {
    label: 'classDiagram',
    detail: 'Class diagram (UML)',
    type: 'keyword',
    boost: 8,
  }),
  snippetCompletion('erDiagram\n  ${1:CUSTOMER} ||--o{ ${2:ORDER} : "${3:places}"\n  ${2:ORDER} {\n    int ${4:id}\n  }', {
    label: 'erDiagram',
    detail: 'Entity-relationship diagram',
    type: 'keyword',
    boost: 7,
  }),
  snippetCompletion('stateDiagram-v2\n  [*] --> ${1:State1}\n  ${1:State1} --> [*]', {
    label: 'stateDiagram-v2',
    detail: 'State diagram',
    type: 'keyword',
    boost: 6,
  }),
  snippetCompletion('gantt\n  title ${1:My Project}\n  dateFormat YYYY-MM-DD\n  section ${2:Phase 1}\n    ${3:Task 1} :${4:a1}, ${5:2024-01-01}, ${6:7d}', {
    label: 'gantt',
    detail: 'Gantt chart',
    type: 'keyword',
    boost: 5,
  }),
  snippetCompletion('pie title ${1:My Pie}\n  "${2:A}" : ${3:40}\n  "${4:B}" : ${5:60}', {
    label: 'pie',
    detail: 'Pie chart',
    type: 'keyword',
    boost: 5,
  }),
  snippetCompletion('gitGraph\n  commit\n  branch ${1:feature}\n  checkout ${1:feature}\n  commit\n  checkout main\n  merge ${1:feature}', {
    label: 'gitGraph',
    detail: 'Git graph diagram',
    type: 'keyword',
    boost: 4,
  }),
  snippetCompletion('mindmap\n  root((${1:Mind Map}))\n    ${2:Topic 1}\n      ${3:Subtopic}\n    ${4:Topic 2}', {
    label: 'mindmap',
    detail: 'Mind map',
    type: 'keyword',
    boost: 4,
  }),
  snippetCompletion('timeline\n  title ${1:My Timeline}\n  section ${2:Era 1}\n    ${3:2020} : ${4:Event}', {
    label: 'timeline',
    detail: 'Timeline diagram',
    type: 'keyword',
    boost: 3,
  }),
  snippetCompletion('quadrantChart\n  title ${1:Reach vs Impact}\n  x-axis ${2:Low Reach} --> ${3:High Reach}\n  y-axis ${4:Low Impact} --> ${5:High Impact}\n  quadrant-1 ${6:We should expand}\n  quadrant-2 ${7:Need to promote}\n  quadrant-3 ${8:Re-evaluate}\n  quadrant-4 ${9:May be improved}\n  ${10:Campaign A}: [${11:0.3}, ${12:0.6}]', {
    label: 'quadrantChart',
    detail: 'Quadrant chart',
    type: 'keyword',
    boost: 3,
  }),
  snippetCompletion('xychart-beta\n  title "${1:My Chart}"\n  x-axis [${2:Jan, Feb, Mar}]\n  y-axis "${3:Revenue}" ${4:0} --> ${5:1000}\n  bar [${6:100, 200, 300}]', {
    label: 'xychart-beta',
    detail: 'XY chart',
    type: 'keyword',
    boost: 3,
  }),
  snippetCompletion('architecture-beta\n  group ${1:api}[${2:API}]\n  service ${3:db}(${4:database})[${5:Database}] in ${1:api}\n  service ${6:server}(${7:server})[${8:Server}] in ${1:api}\n  ${6:server}:R --> L:${3:db}', {
    label: 'architecture-beta',
    detail: 'Architecture diagram',
    type: 'keyword',
    boost: 2,
  }),
  snippetCompletion('sankey-beta\n  ${1:A},${2:B},${3:10}\n  ${2:B},${4:C},${5:5}', {
    label: 'sankey-beta',
    detail: 'Sankey diagram',
    type: 'keyword',
    boost: 2,
  }),
  snippetCompletion('journey\n  title ${1:My Journey}\n  section ${2:Phase 1}\n    ${3:Task}: ${4:5}: ${5:Me}', {
    label: 'journey',
    detail: 'User journey diagram',
    type: 'keyword',
    boost: 2,
  }),
  snippetCompletion('requirementDiagram\n  requirement ${1:test_req} {\n    id: ${2:1}\n    text: ${3:Requirement description}\n    risk: ${4:high}\n    verifyMethod: ${5:test}\n  }', {
    label: 'requirementDiagram',
    detail: 'Requirement diagram',
    type: 'keyword',
    boost: 2,
  }),
  snippetCompletion('block-beta\n  columns ${1:3}\n  ${2:A}["${3:Block A}"]', {
    label: 'block-beta',
    detail: 'Block diagram',
    type: 'keyword',
    boost: 1,
  }),
  snippetCompletion('kanban\n  ${1:Todo}\n    ${2:task1}["${3:Task 1}"]\n  ${4:In Progress}\n    ${5:task2}["${6:Task 2}"]', {
    label: 'kanban',
    detail: 'Kanban board',
    type: 'keyword',
    boost: 1,
  }),
  snippetCompletion('packet-beta\n  0-15: "${1:Source Port}"\n  16-31: "${2:Dest Port}"\n  32-63: "${3:Sequence Number}"', {
    label: 'packet-beta',
    detail: 'Packet diagram',
    type: 'keyword',
    boost: 1,
  }),
  snippetCompletion('radar-beta\n  axis ${1:A}, ${2:B}, ${3:C}\n  curve ${4:My Data} { ${5:80}, ${6:60}, ${7:90} }', {
    label: 'radar-beta',
    detail: 'Radar chart',
    type: 'keyword',
    boost: 1,
  }),
]

// ── Per-diagram keyword completions ───────────────────────────────────────────

const FLOWCHART_KEYWORDS: Completion[] = [
  { label: 'subgraph', detail: 'Start a subgraph', type: 'keyword' },
  { label: 'end', detail: 'End a subgraph or block', type: 'keyword' },
  { label: 'direction', detail: 'Set layout direction', type: 'keyword' },
  { label: 'click', detail: 'Add click handler to node', type: 'keyword' },
  { label: 'style', detail: 'Style a node', type: 'keyword' },
  { label: 'classDef', detail: 'Define a CSS class', type: 'keyword' },
  { label: 'class', detail: 'Apply a class to node(s)', type: 'keyword' },
  { label: 'linkStyle', detail: 'Style a link by index', type: 'keyword' },
  // Orientations
  { label: 'LR', detail: 'Left to right', type: 'constant' },
  { label: 'RL', detail: 'Right to left', type: 'constant' },
  { label: 'TD', detail: 'Top down', type: 'constant' },
  { label: 'TB', detail: 'Top to bottom', type: 'constant' },
  { label: 'BT', detail: 'Bottom to top', type: 'constant' },
  // Node shape snippets
  snippetCompletion('${1:id}["${2:label}"]', { label: '["label"]', detail: 'Rectangle node', type: 'text' }),
  snippetCompletion('${1:id}("${2:label}")', { label: '("label")', detail: 'Rounded node', type: 'text' }),
  snippetCompletion('${1:id}{"${2:label}"}', { label: '{"label"}', detail: 'Diamond/decision', type: 'text' }),
  snippetCompletion('${1:id}[/"${2:label}"/]', { label: '[/"label"/]', detail: 'Parallelogram', type: 'text' }),
  snippetCompletion('${1:id}(("${2:label}"))', { label: '(("label"))', detail: 'Circle node', type: 'text' }),
  snippetCompletion('${1:id}>"${2:label}"]', { label: '>"label"]', detail: 'Asymmetric node', type: 'text' }),
]

const SEQUENCE_KEYWORDS: Completion[] = [
  { label: 'participant', detail: 'Declare a participant', type: 'keyword' },
  { label: 'actor', detail: 'Declare an actor (stick figure)', type: 'keyword' },
  { label: 'activate', detail: 'Activate a participant', type: 'keyword' },
  { label: 'deactivate', detail: 'Deactivate a participant', type: 'keyword' },
  { label: 'loop', detail: 'Start a loop block', type: 'keyword' },
  { label: 'end', detail: 'End a block', type: 'keyword' },
  { label: 'alt', detail: 'Alternative block', type: 'keyword' },
  { label: 'else', detail: 'Else branch in alt block', type: 'keyword' },
  { label: 'opt', detail: 'Optional block', type: 'keyword' },
  { label: 'par', detail: 'Parallel block', type: 'keyword' },
  { label: 'and', detail: 'And branch in par block', type: 'keyword' },
  { label: 'critical', detail: 'Critical block', type: 'keyword' },
  { label: 'break', detail: 'Break block', type: 'keyword' },
  { label: 'rect', detail: 'Highlight region with color', type: 'keyword' },
  { label: 'note', detail: 'Add a note', type: 'keyword' },
  { label: 'autonumber', detail: 'Auto-number messages', type: 'keyword' },
  { label: 'title', detail: 'Set diagram title', type: 'keyword' },
  { label: 'create', detail: 'Create a participant mid-diagram', type: 'keyword' },
  { label: 'destroy', detail: 'Destroy a participant mid-diagram', type: 'keyword' },
  // Arrow snippets
  snippetCompletion('${1:A} ->> ${2:B}: ${3:message}', { label: '->>', detail: 'Solid arrow with head', type: 'text' }),
  snippetCompletion('${1:A} -->> ${2:B}: ${3:message}', { label: '-->>', detail: 'Dashed arrow with head', type: 'text' }),
  snippetCompletion('${1:A} -> ${2:B}: ${3:message}', { label: '->', detail: 'Solid open arrow', type: 'text' }),
  snippetCompletion('${1:A} -x ${2:B}: ${3:message}', { label: '-x', detail: 'Solid arrow with X (async)', type: 'text' }),
  snippetCompletion('note right of ${1:A}: ${2:note text}', { label: 'note right of', detail: 'Note to the right', type: 'text' }),
  snippetCompletion('note over ${1:A},${2:B}: ${3:note text}', { label: 'note over', detail: 'Note spanning participants', type: 'text' }),
]

const CLASS_KEYWORDS: Completion[] = [
  { label: 'class', detail: 'Define a class', type: 'keyword' },
  { label: 'interface', detail: 'Define an interface', type: 'keyword' },
  { label: 'abstract', detail: 'Mark as abstract', type: 'keyword' },
  { label: 'enum', detail: 'Define an enum', type: 'keyword' },
  { label: 'namespace', detail: 'Define a namespace', type: 'keyword' },
  { label: 'direction', detail: 'Set layout direction', type: 'keyword' },
  { label: 'note', detail: 'Add a note', type: 'keyword' },
  { label: 'link', detail: 'Add a hyperlink to a class', type: 'keyword' },
  { label: 'callback', detail: 'Add a callback to a class', type: 'keyword' },
  { label: 'click', detail: 'Add click handler', type: 'keyword' },
  // Relationship snippets
  snippetCompletion('${1:A} <|-- ${2:B}', { label: '<|--', detail: 'Inheritance', type: 'text' }),
  snippetCompletion('${1:A} *-- ${2:B}', { label: '*--', detail: 'Composition', type: 'text' }),
  snippetCompletion('${1:A} o-- ${2:B}', { label: 'o--', detail: 'Aggregation', type: 'text' }),
  snippetCompletion('${1:A} --> ${2:B}', { label: '-->', detail: 'Association', type: 'text' }),
  snippetCompletion('${1:A} ..> ${2:B}', { label: '..>', detail: 'Dependency', type: 'text' }),
  snippetCompletion('${1:A} ..|> ${2:B}', { label: '..|>', detail: 'Realization', type: 'text' }),
  snippetCompletion('class ${1:ClassName} {\n  +${2:field} ${3:Type}\n  +${4:method}() ${5:ReturnType}\n}', {
    label: 'class { }',
    detail: 'Class with fields/methods',
    type: 'keyword',
  }),
]

const ER_KEYWORDS: Completion[] = [
  // Cardinality snippets
  snippetCompletion('${1:ENTITY1} ||--|| ${2:ENTITY2} : "${3:relationship}"', {
    label: '||--||',
    detail: 'Exactly one to exactly one',
    type: 'text',
  }),
  snippetCompletion('${1:ENTITY1} ||--o{ ${2:ENTITY2} : "${3:relationship}"', {
    label: '||--o{',
    detail: 'Exactly one to zero or more',
    type: 'text',
  }),
  snippetCompletion('${1:ENTITY1} }|--|{ ${2:ENTITY2} : "${3:relationship}"', {
    label: '}|--|{',
    detail: 'One or more to one or more',
    type: 'text',
  }),
  snippetCompletion('${1:ENTITY} {\n  ${2:string} ${3:id} PK\n  ${4:string} ${5:name}\n}', {
    label: 'entity { }',
    detail: 'Entity definition',
    type: 'keyword',
  }),
  // Attribute types
  { label: 'PK', detail: 'Primary key', type: 'constant' },
  { label: 'FK', detail: 'Foreign key', type: 'constant' },
  { label: 'UK', detail: 'Unique key', type: 'constant' },
  { label: 'string', detail: 'String attribute', type: 'type' },
  { label: 'int', detail: 'Integer attribute', type: 'type' },
  { label: 'float', detail: 'Float attribute', type: 'type' },
  { label: 'boolean', detail: 'Boolean attribute', type: 'type' },
  { label: 'date', detail: 'Date attribute', type: 'type' },
]

const STATE_KEYWORDS: Completion[] = [
  { label: 'state', detail: 'Define a named state', type: 'keyword' },
  { label: 'note', detail: 'Add a note to a state', type: 'keyword' },
  { label: 'direction', detail: 'Set layout direction', type: 'keyword' },
  { label: 'hide empty description', detail: 'Hide states with no description', type: 'keyword' },
  // Transition snippets
  snippetCompletion('[*] --> ${1:State}', { label: '[*] -->', detail: 'Start transition', type: 'text' }),
  snippetCompletion('${1:State} --> [*]', { label: '--> [*]', detail: 'End transition', type: 'text' }),
  snippetCompletion('${1:StateA} --> ${2:StateB}: ${3:event}', { label: '--> :event', detail: 'Labeled transition', type: 'text' }),
  snippetCompletion('state "${1:Description}" as ${2:alias}', { label: 'state as', detail: 'State with alias', type: 'text' }),
  snippetCompletion('state ${1:CompoundState} {\n  ${2:StateA} --> ${3:StateB}\n}', { label: 'state { }', detail: 'Compound/nested state', type: 'keyword' }),
]

const GANTT_KEYWORDS: Completion[] = [
  { label: 'title', detail: 'Set the chart title', type: 'keyword' },
  { label: 'dateFormat', detail: 'Set the date format (e.g. YYYY-MM-DD)', type: 'keyword' },
  { label: 'axisFormat', detail: 'Format for the axis labels', type: 'keyword' },
  { label: 'tickInterval', detail: 'Tick interval for the axis', type: 'keyword' },
  { label: 'section', detail: 'Start a new section', type: 'keyword' },
  { label: 'excludes', detail: 'Exclude days from timeline', type: 'keyword' },
  { label: 'todayMarker', detail: 'Show/hide today marker', type: 'keyword' },
  { label: 'done', detail: 'Mark task as done', type: 'constant' },
  { label: 'active', detail: 'Mark task as active', type: 'constant' },
  { label: 'crit', detail: 'Mark task as critical', type: 'constant' },
  { label: 'milestone', detail: 'Create a milestone', type: 'constant' },
  { label: 'after', detail: 'Task starts after another', type: 'keyword' },
  snippetCompletion('${1:Task Name} :${2:done, }${3:taskId}, ${4:2024-01-01}, ${5:7d}', {
    label: 'task',
    detail: 'Gantt task definition',
    type: 'text',
  }),
]

const PIE_KEYWORDS: Completion[] = [
  { label: 'showData', detail: 'Show values on pie slices', type: 'keyword' },
  { label: 'title', detail: 'Set the chart title', type: 'keyword' },
  snippetCompletion('"${1:Label}" : ${2:value}', { label: '"label" : value', detail: 'Pie slice', type: 'text' }),
]

const GIT_KEYWORDS: Completion[] = [
  { label: 'commit', detail: 'Add a commit', type: 'keyword' },
  { label: 'branch', detail: 'Create a branch', type: 'keyword' },
  { label: 'checkout', detail: 'Switch to a branch', type: 'keyword' },
  { label: 'merge', detail: 'Merge a branch', type: 'keyword' },
  { label: 'cherry-pick', detail: 'Cherry-pick a commit', type: 'keyword' },
  snippetCompletion('commit id: "${1:label}" tag: "${2:tag}"', { label: 'commit id+tag', detail: 'Labeled commit with tag', type: 'text' }),
  snippetCompletion('commit type: ${1:HIGHLIGHT}', { label: 'commit type', detail: 'Styled commit (HIGHLIGHT/REVERSE/NORMAL)', type: 'text' }),
]

const MINDMAP_KEYWORDS: Completion[] = [
  snippetCompletion('root((${1:Root Topic}))', { label: 'root(())', detail: 'Root node (circle)', type: 'keyword' }),
  snippetCompletion('  ${1:Topic}\n    ${2:Subtopic}', { label: 'subtopic', detail: 'Indented subtopic', type: 'text' }),
  { label: '::icon()', detail: 'Add an icon to a node', type: 'keyword' },
]

const XYCHART_KEYWORDS: Completion[] = [
  { label: 'title', detail: 'Set chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'Define the X axis', type: 'keyword' },
  { label: 'y-axis', detail: 'Define the Y axis', type: 'keyword' },
  { label: 'bar', detail: 'Bar chart data series', type: 'keyword' },
  { label: 'line', detail: 'Line chart data series', type: 'keyword' },
]

const ARCHITECTURE_KEYWORDS: Completion[] = [
  { label: 'group', detail: 'Define a group/container', type: 'keyword' },
  { label: 'service', detail: 'Define a service', type: 'keyword' },
  { label: 'junction', detail: 'Define a junction point', type: 'keyword' },
  { label: 'in', detail: 'Place component inside group', type: 'keyword' },
  // Icon types
  { label: 'cloud', detail: 'Cloud icon', type: 'constant' },
  { label: 'server', detail: 'Server icon', type: 'constant' },
  { label: 'database', detail: 'Database icon', type: 'constant' },
  { label: 'disk', detail: 'Disk icon', type: 'constant' },
  { label: 'internet', detail: 'Internet icon', type: 'constant' },
]

const UNIVERSAL_KEYWORDS: Completion[] = [
  snippetCompletion('%%{init: {${1:"theme": "base"}}}%%', {
    label: '%%{init:}%%',
    detail: 'Mermaid init directive (theme, config)',
    type: 'keyword',
  }),
  snippetCompletion('%% ${1:comment}', {
    label: '%%',
    detail: 'Comment',
    type: 'text',
  }),
]

// ── Keyword map by diagram type ───────────────────────────────────────────────

const TIMELINE_KEYWORDS: Completion[] = [
  { label: 'title', detail: 'Set the timeline title', type: 'keyword' },
  { label: 'section', detail: 'Start a new section', type: 'keyword' },
  snippetCompletion('section ${1:Era Name}\n  ${2:Year} : ${3:Event}', {
    label: 'section + event',
    detail: 'Section with event',
    type: 'text',
  }),
]

const QUADRANT_KEYWORDS: Completion[] = [
  { label: 'title', detail: 'Set chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'Label the X axis', type: 'keyword' },
  { label: 'y-axis', detail: 'Label the Y axis', type: 'keyword' },
  { label: 'quadrant-1', detail: 'Label top-right quadrant', type: 'keyword' },
  { label: 'quadrant-2', detail: 'Label top-left quadrant', type: 'keyword' },
  { label: 'quadrant-3', detail: 'Label bottom-left quadrant', type: 'keyword' },
  { label: 'quadrant-4', detail: 'Label bottom-right quadrant', type: 'keyword' },
  snippetCompletion('${1:Point}: [${2:0.5}, ${3:0.5}]', {
    label: 'point',
    detail: 'Plot a point [x, y]',
    type: 'text',
  }),
]

const JOURNEY_KEYWORDS: Completion[] = [
  { label: 'title', detail: 'Set journey title', type: 'keyword' },
  { label: 'section', detail: 'Start a section', type: 'keyword' },
  snippetCompletion('${1:Task}: ${2:5}: ${3:Person1}, ${4:Person2}', {
    label: 'task : score : actors',
    detail: 'Journey task',
    type: 'text',
  }),
]

const REQUIREMENT_KEYWORDS: Completion[] = [
  { label: 'requirement', detail: 'Define a requirement', type: 'keyword' },
  { label: 'functionalRequirement', detail: 'Functional requirement', type: 'keyword' },
  { label: 'interfaceRequirement', detail: 'Interface requirement', type: 'keyword' },
  { label: 'performanceRequirement', detail: 'Performance requirement', type: 'keyword' },
  { label: 'physicalRequirement', detail: 'Physical requirement', type: 'keyword' },
  { label: 'designConstraint', detail: 'Design constraint', type: 'keyword' },
  { label: 'element', detail: 'Define an element', type: 'keyword' },
  { label: 'satisfies', detail: 'Satisfies relationship', type: 'keyword' },
  { label: 'traces', detail: 'Traces relationship', type: 'keyword' },
  { label: 'contains', detail: 'Contains relationship', type: 'keyword' },
  { label: 'high', detail: 'High risk/priority', type: 'constant' },
  { label: 'medium', detail: 'Medium risk/priority', type: 'constant' },
  { label: 'low', detail: 'Low risk/priority', type: 'constant' },
  { label: 'test', detail: 'Verify by test', type: 'constant' },
  { label: 'analysis', detail: 'Verify by analysis', type: 'constant' },
  { label: 'inspection', detail: 'Verify by inspection', type: 'constant' },
  { label: 'demonstration', detail: 'Verify by demonstration', type: 'constant' },
]

const SANKEY_KEYWORDS: Completion[] = [
  snippetCompletion('${1:Source},${2:Target},${3:value}', {
    label: 'Source,Target,value',
    detail: 'Sankey flow row',
    type: 'text',
  }),
]

const BLOCK_KEYWORDS: Completion[] = [
  { label: 'columns', detail: 'Set number of columns', type: 'keyword' },
  { label: 'space', detail: 'Empty space in grid', type: 'keyword' },
  snippetCompletion('${1:id}["${2:Label}"]', { label: 'block', detail: 'Block with label', type: 'text' }),
  snippetCompletion('block:${1:id}\n  ${2:A} --> ${3:B}\nend', { label: 'block group', detail: 'Nested block group', type: 'keyword' }),
]

const KANBAN_KEYWORDS: Completion[] = [
  snippetCompletion('${1:Column Title}\n  ${2:taskId}["${3:Task label}"]', {
    label: 'column + task',
    detail: 'Kanban column with task',
    type: 'text',
  }),
  snippetCompletion('@{ ticket: ${1:MC-123}, priority: ${2:Very High} }', {
    label: '@{ ticket }',
    detail: 'Task metadata',
    type: 'text',
  }),
]

const PACKET_KEYWORDS: Completion[] = [
  snippetCompletion('${1:0}-${2:15}: "${3:Field Name}"', {
    label: 'bit-range: "field"',
    detail: 'Packet field definition',
    type: 'text',
  }),
]

const RADAR_KEYWORDS: Completion[] = [
  { label: 'axis', detail: 'Define radar axes', type: 'keyword' },
  { label: 'curve', detail: 'Define a data curve', type: 'keyword' },
  snippetCompletion('axis ${1:A}, ${2:B}, ${3:C}', { label: 'axis list', detail: 'Axis labels', type: 'text' }),
  snippetCompletion('curve ${1:Series} { ${2:80}, ${3:60}, ${4:90} }', { label: 'curve { }', detail: 'Data series', type: 'text' }),
]

const DIAGRAM_KEYWORDS: Record<string, Completion[]> = {
  flowchart:    FLOWCHART_KEYWORDS,
  sequence:     SEQUENCE_KEYWORDS,
  classDiagram: CLASS_KEYWORDS,
  erDiagram:    ER_KEYWORDS,
  stateDiagram: STATE_KEYWORDS,
  gantt:        GANTT_KEYWORDS,
  pie:          PIE_KEYWORDS,
  gitgraph:     GIT_KEYWORDS,
  mindmap:      MINDMAP_KEYWORDS,
  xychart:      XYCHART_KEYWORDS,
  architecture: ARCHITECTURE_KEYWORDS,
  timeline:     TIMELINE_KEYWORDS,
  quadrant:     QUADRANT_KEYWORDS,
  journey:      JOURNEY_KEYWORDS,
  requirement:  REQUIREMENT_KEYWORDS,
  sankey:       SANKEY_KEYWORDS,
  block:        BLOCK_KEYWORDS,
  kanban:       KANBAN_KEYWORDS,
  packet:       PACKET_KEYWORDS,
  radar:        RADAR_KEYWORDS,
}

// ── CompletionSource ──────────────────────────────────────────────────────────

function mermaidCompletionSource(context: CompletionContext) {
  const { state, pos } = context

  // Figure out which line we're on (1-indexed)
  const line = state.doc.lineAt(pos)
  const lineNumber = line.number

  // Get the word/token being typed
  const word = context.matchBefore(/[\w-]/)

  // Detect diagram type from full document text
  const fullText = state.doc.toString()
  const diagType = detectDiagramType(fullText)

  // ── First line: offer diagram type starters only if no type is declared yet ──
  if (lineNumber === 1 && diagType === 'other') {
    const from = word ? word.from : pos
    return { from, options: DIAGRAM_STARTERS, filter: true }
  }

  // ── Subsequent lines (or line 1 already has a type): diagram-specific keywords ──
  // Only trigger on explicit Ctrl+Space or when actively typing a word
  if (!word && !context.explicit) return null

  const from = word ? word.from : pos

  const diagramKws = diagType !== 'other' ? (DIAGRAM_KEYWORDS[diagType] ?? []) : []
  const options = [...UNIVERSAL_KEYWORDS, ...diagramKws]

  if (options.length === 0) return null

  return { from, options, filter: true }
}

// ── Exported extension ────────────────────────────────────────────────────────

export function mermaidCompletionExtension(): Extension {
  return autocompletion({
    override: [mermaidCompletionSource],
    defaultKeymap: true,
    activateOnTyping: true,
    maxRenderedOptions: 30,
    icons: true,
  })
}
