/**
 * Fallback Mermaid syntax highlighting for diagram types not supported by
 * codemirror-lang-mermaid (erDiagram, gitGraph, classDiagram, stateDiagram,
 * timeline, xychart-beta, quadrantChart, etc.)
 *
 * Uses a StreamLanguage with a simple state machine to tokenize Mermaid source.
 */
import { StreamLanguage } from '@codemirror/language'

type State = {
  firstLine: boolean
  inComment: boolean
}

const KEYWORDS = new Set([
  // gitGraph
  'commit', 'branch', 'checkout', 'merge', 'cherry-pick',
  // classDiagram
  'class', 'interface', 'abstract', 'enum', 'namespace',
  'implements', 'extends', 'relationship',
  // stateDiagram
  'state', 'note', 'as', 'direction', 'hide', 'show', 'if', 'else', 'fork', 'join',
  // erDiagram
  'entity', 'relationship',
  // sequence
  'participant', 'actor', 'activate', 'deactivate', 'loop', 'alt', 'opt',
  'par', 'critical', 'break', 'end', 'autonumber',
  // gantt
  'section', 'title', 'dateFormat', 'axisFormat', 'excludes', 'todayMarker',
  'tickInterval', 'weekday',
  // timeline
  'section',
  // quadrant
  'quadrantChart', 'x-axis', 'y-axis', 'quadrant-1', 'quadrant-2', 'quadrant-3', 'quadrant-4',
  // xychart
  'xychart-beta', 'bar', 'line', 'x-axis', 'y-axis',
  // general
  'subgraph', 'direction', 'LR', 'RL', 'TD', 'TB', 'BT', 'TB',
])

const DIAGRAM_DECLARATIONS = [
  'erDiagram', 'gitGraph', 'classDiagram', 'stateDiagram-v2', 'stateDiagram',
  'sequenceDiagram', 'flowchart', 'graph', 'gantt', 'pie', 'mindmap', 'timeline',
  'xychart-beta', 'quadrantChart', 'requirementDiagram', 'journey',
  'block-beta', 'architecture-beta', 'sankey-beta',
]

export const mermaidFallbackLanguage = StreamLanguage.define<State>({
  name: 'mermaid',

  startState(): State {
    return { firstLine: true, inComment: false }
  },

  token(stream, state) {
    // Blank line
    if (stream.eatSpace()) return null

    // Comment: %% to end of line
    if (stream.match('%%')) {
      stream.skipToEnd()
      return 'comment'
    }

    // Directive: %%{ ... }%%
    if (stream.match(/%%\{/)) {
      stream.skipToEnd()
      return 'meta'
    }

    // First line: diagram type declaration
    if (state.firstLine) {
      for (const decl of DIAGRAM_DECLARATIONS) {
        if (stream.match(decl)) {
          state.firstLine = false
          return 'keyword'
        }
      }
      // Not a known declaration — consume the line
      stream.skipToEnd()
      state.firstLine = false
      return 'keyword'
    }

    // Strings: "..." or '...'
    if (stream.match(/"([^"\\]|\\.)*"/)) return 'string'
    if (stream.match(/'([^'\\]|\\.)*'/)) return 'string'

    // Arrow types used in mermaid
    if (stream.match(/-->>|-->|--x|--o|->>|->>|<<-|<-|-\.|\.->|==>/)) return 'operator'
    if (stream.match(/:::/)) return 'operator'
    if (stream.match(/[|<>]/)) return 'operator'

    // Note keyword
    if (stream.match(/\bnote\b/i)) return 'keyword'

    // Numbers
    if (stream.match(/\b\d+(\.\d+)?\b/)) return 'number'

    // Keywords (identifier followed by word boundary)
    const wordMatch = stream.match(/\b[a-zA-Z_][\w-]*\b/)
    if (wordMatch) {
      const word = typeof wordMatch === 'string' ? wordMatch : stream.current()
      if (KEYWORDS.has(word)) return 'keyword'
      // Capitalised identifiers are likely node/class names
      if (/^[A-Z]/.test(word)) return 'typeName'
      return null
    }

    // Brackets
    if (stream.match(/[[\]{}()]/)) return 'bracket'

    // Punctuation / arrows
    if (stream.match(/[:\-+*&]/)) return 'operator'

    // Consume anything else char by char
    stream.next()
    return null
  },

  blankLine(_state) {
    // no-op
  },

  copyState(state): State {
    return { ...state }
  },

  indent() {
    return -1 // no auto-indent
  },

  languageData: {
    commentTokens: { line: '%%' },
  },
})
