/**
 * mermaidTokenLookup.ts
 *
 * Maps Lezer AST node names (from codemirror-lang-mermaid) and
 * StreamLanguage token types (for unsupported diagram types) to
 * reference element names in our reference panel.
 *
 * Uses the real syntax tree — no regexes on raw text.
 */

import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'

export interface TokenRef {
  diagramType: string    // which DIAGRAM_REFS key to look up
  elementName: string    // matches RefElement.name in reference.ts
}

// ─── Node name → reference element mapping per diagram type ──────────────────

const FLOWCHART_NODE_MAP: Record<string, string> = {
  DiagramName:   'graph / flowchart',
  Orientation:   'graph / flowchart',
  Node:          'node shapes',
  Link:          'edge types',
  NodeEdge:      'edge types',
  NodeEdgeText:  'edge label',
  Keyword:       'subgraph',         // subgraph / end / direction
  StyleKeyword:  'style',
  LineComment:   '%%',
}

const SEQUENCE_NODE_MAP: Record<string, string> = {
  DiagramName:   'participant',
  Participant:   'participant',
  Actor:         'actor',
  Arrow:         'messages',
  Keyword:       'loop',             // loop / alt / opt / par / rect / note / activate / create / destroy
  End:           'loop',
  MessageText1:  'messages',
  MessageText2:  'messages',
  Note:          'note',
  Title:         'title',
}

const PIE_NODE_MAP: Record<string, string> = {
  DiagramName:   'pie',
  ShowData:      'showData',
  Title:         'title',
  TitleText:     'title',
  String:        'slice',
  Number:        'slice',
}

const GANTT_NODE_MAP: Record<string, string> = {
  DiagramName:   'title',
  Title:         'title',
  DateFormat:    'dateFormat',
  Section:       'section',
  Text:          'task',
  ImportantText: 'title',
}

const MINDMAP_NODE_MAP: Record<string, string> = {
  DiagramName:   'root node',
}

const DIAGRAM_NODE_MAPS: Record<string, Record<string, string>> = {
  flowchart:        FLOWCHART_NODE_MAP,
  graph:            FLOWCHART_NODE_MAP,
  sequenceDiagram:  SEQUENCE_NODE_MAP,
  pie:              PIE_NODE_MAP,
  gantt:            GANTT_NODE_MAP,
  mindmap:          MINDMAP_NODE_MAP,
}

// ─── StreamLanguage token → reference mapping (for unsupported diagram types) ─
// Our StreamLanguage emits token types: 'keyword', 'operator', 'string', 'comment', 'typeName'
// We also track the actual text of the token.

const GITGRAPH_KEYWORD_MAP: Record<string, string> = {
  commit:       'commit',
  branch:       'branch',
  checkout:     'checkout',
  merge:        'merge',
  'cherry-pick':'cherry-pick',
  gitgraph:     'commit',
}

const CLASSDIAGRAM_KEYWORD_MAP: Record<string, string> = {
  class:        'class',
  interface:    'class',
  abstract:     'abstract class',
  enum:         'enum',
  namespace:    'namespace',
  note:         'notes',
  link:         'link',
  click:        'click',
}

const ERDIAGRAM_KEYWORD_MAP: Record<string, string> = {
  erDiagram:    'entity',
  PK:           'attribute',
  FK:           'attribute',
  UK:           'attribute',
}

const STATEDIAGRAM_KEYWORD_MAP: Record<string, string> = {
  stateDiagram:   'state',
  state:          'state',
  'stateDiagram-v2': 'state',
  note:           'note',
  fork:           'fork / join',
  join:           'fork / join',
  choice:         'choice',
  direction:      'direction',
}

const STREAM_KEYWORD_MAPS: Record<string, Record<string, string>> = {
  gitGraph:         GITGRAPH_KEYWORD_MAP,
  classDiagram:     CLASSDIAGRAM_KEYWORD_MAP,
  erDiagram:        ERDIAGRAM_KEYWORD_MAP,
  'stateDiagram-v2': STATEDIAGRAM_KEYWORD_MAP,
  stateDiagram:     STATEDIAGRAM_KEYWORD_MAP,
  timeline:         {},
  quadrantChart:    {},
  'xychart-beta':   {},
}

// ─── Relationship / operator patterns (StreamLanguage diagrams) ───────────────

const ER_RELATIONSHIP_PATTERN = /\|\||\|o|\}o|\}\||\|{|o\||\.\./

// ─── Main lookup function ─────────────────────────────────────────────────────

/**
 * Given an EditorState and a document position, find the syntax node
 * at that position and return a TokenRef if we can map it to a reference element.
 */
export function lookupTokenAt(state: EditorState, pos: number): TokenRef | null {
  const tree = syntaxTree(state)
  const node = tree.resolveInner(pos, -1)

  // Walk up to find the diagram root name
  let diagramNode = node
  while (diagramNode && !diagramNode.name.endsWith('Diagram')) {
    diagramNode = diagramNode.parent as typeof node
  }

  // Determine the diagram type from the DiagramName node text or root node name
  let diagramType = ''
  if (diagramNode) {
    // Try to read the DiagramName child text
    const nameNode = diagramNode.getChild('DiagramName')
    if (nameNode) {
      diagramType = state.doc.sliceString(nameNode.from, nameNode.to).trim()
    } else {
      // Infer from root node name: FlowchartDiagram → flowchart
      const root = diagramNode.name
        .replace('Diagram', '')
        .replace('Sequence', 'sequenceDiagram')
        .replace('Flowchart', 'flowchart')
        .replace('Pie', 'pie')
        .replace('Gantt', 'gantt')
        .replace('Mindmap', 'mindmap')
      diagramType = root.charAt(0).toLowerCase() + root.slice(1)
    }
  }

  // Check if we have a native grammar map for this diagram type
  const normalizedType = normalizeDiagramType(diagramType)
  const nodeMap = DIAGRAM_NODE_MAPS[normalizedType]

  if (nodeMap) {
    // Native grammar: walk up the node hierarchy to find a mappable node
    let current: typeof node | null = node
    while (current) {
      const mapped = nodeMap[current.name]
      if (mapped) {
        return { diagramType: normalizedType, elementName: mapped }
      }
      current = current.parent
    }
    return null
  }

  // StreamLanguage fallback: read the token text and type from the stream
  const tokenText = getTokenTextAt(state, pos)
  if (!tokenText) return null

  const kwMap = STREAM_KEYWORD_MAPS[normalizedType]
  if (kwMap) {
    // Direct keyword match
    const direct = kwMap[tokenText]
    if (direct) return { diagramType: normalizedType, elementName: direct }

    // ER relationship operator match
    if (normalizedType === 'erDiagram' && ER_RELATIONSHIP_PATTERN.test(tokenText)) {
      return { diagramType: 'erDiagram', elementName: 'relationship' }
    }
  }

  return null
}

/**
 * Normalize diagram type keywords to DIAGRAM_REFS keys.
 */
function normalizeDiagramType(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (t === 'graph' || t.startsWith('flowchart')) return 'flowchart'
  if (t === 'sequencediagram') return 'sequenceDiagram'
  if (t === 'pie') return 'pie'
  if (t === 'gantt') return 'gantt'
  if (t === 'mindmap') return 'mindmap'
  if (t === 'gitgraph') return 'gitGraph'
  if (t === 'classdiagram') return 'classDiagram'
  if (t === 'erdiagram') return 'erDiagram'
  if (t === 'statediagram' || t === 'statediagram-v2') return 'stateDiagram-v2'
  if (t === 'timeline') return 'timeline'
  if (t === 'quadrantchart') return 'quadrantChart'
  if (t === 'xychart-beta') return 'xychart-beta'
  return t
}

/**
 * For StreamLanguage tokens, extract the word at position.
 * We walk left/right to find word boundaries.
 */
function getTokenTextAt(state: EditorState, pos: number): string {
  const line = state.doc.lineAt(pos)
  const lineText = line.text
  const col = pos - line.from

  // Find word boundaries (alphanumeric + hyphen + underscore + special relation chars)
  const wordPattern = /[\w\-|{}]/
  let start = col
  let end = col
  while (start > 0 && wordPattern.test(lineText[start - 1])) start--
  while (end < lineText.length && wordPattern.test(lineText[end])) end++

  return lineText.slice(start, end).trim()
}
