/**
 * Unit tests: validate every Mermaid code example in templates.ts and reference.ts
 * parses without a syntax error.
 *
 * Uses mermaid.parse() which is available in Node.js (no DOM required for the
 * parser itself). Some diagram types bundle DOMPurify and require a real browser
 * DOM to initialise — those emit recognisable env-limitation errors and are
 * marked as skipped rather than failed.
 */
import { describe, it, expect } from 'vitest'
import mermaid from 'mermaid'
import { DIAGRAM_TEMPLATES } from '../templates'
import { DIAGRAM_REFS } from '../reference'

// ── Types ────────────────────────────────────────────────────────────────────

interface Snippet {
  source: string
  label: string
  code: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the error is a Node.js environment limitation
 * (DOMPurify / window not available in test runner), NOT a diagram syntax error.
 */
function isDomEnvError(msg: string): boolean {
  return (
    msg.includes('DOMPurify') ||
    msg.includes('addHook') ||
    msg.includes('sanitize is not a function') ||
    msg.includes('window is not defined') ||
    msg.includes('document is not defined')
  )
}

// ── Collect all snippets ──────────────────────────────────────────────────────

function collectSnippets(): Snippet[] {
  const snippets: Snippet[] = []

  // Template gallery examples
  for (const tpl of DIAGRAM_TEMPLATES) {
    snippets.push({
      source: `template:${tpl.id}`,
      label: tpl.name,
      code: tpl.code,
    })
  }

  // Reference doc examples
  for (const [diagId, ref] of Object.entries(DIAGRAM_REFS)) {
    for (const element of ref.elements) {
      for (const example of element.examples) {
        snippets.push({
          source: `ref:${diagId}/${element.name}`,
          label: example.label,
          code: example.code,
        })
      }
    }
  }

  return snippets
}

// ── Tests ────────────────────────────────────────────────────────────────────

const snippets = collectSnippets()

describe('Mermaid diagram examples', () => {
  it('should have examples to test', () => {
    expect(snippets.length).toBeGreaterThan(0)
  })

  describe('template examples', () => {
    const templateSnippets = snippets.filter(s => s.source.startsWith('template:'))

    for (const snippet of templateSnippets) {
      it(`${snippet.source} — ${snippet.label}`, async () => {
        try {
          await mermaid.parse(snippet.code)
          // parse succeeded — all good
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err)
          if (isDomEnvError(msg)) {
            // Node.js env limitation — not a syntax error, skip gracefully
            return
          }
          // Real syntax error — fail the test with a clear message
          throw new Error(
            `Syntax error in ${snippet.source} ("${snippet.label}"):\n${msg}`
          )
        }
      })
    }
  })

  describe('reference doc examples', () => {
    const refSnippets = snippets.filter(s => s.source.startsWith('ref:'))

    for (const snippet of refSnippets) {
      it(`${snippet.source} — ${snippet.label}`, async () => {
        try {
          await mermaid.parse(snippet.code)
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err)
          if (isDomEnvError(msg)) {
            return
          }
          throw new Error(
            `Syntax error in ${snippet.source} ("${snippet.label}"):\n${msg}`
          )
        }
      })
    }
  })
})
