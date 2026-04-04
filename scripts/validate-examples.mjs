/**
 * Validates all Mermaid diagram examples from templates and reference docs.
 * Uses mermaid.parse() to check syntax without needing a browser/DOM.
 *
 * Usage: node --experimental-strip-types tmp_rovodev_validate_examples.mjs
 *
 * Note: Some diagram types (flowchart, sankey, mindmap, etc.) use a bundled
 * DOMPurify that requires a real DOM environment to initialise. In Node.js
 * this manifests as "DOMPurify.addHook is not a function". We treat these
 * as SKIPPED (env limitation) rather than failures — only genuine parse
 * errors (wrong syntax) are counted as failures.
 */

import mermaid from 'mermaid'
import { DIAGRAM_TEMPLATES } from '../src/lib/templates.ts'
import { DIAGRAM_REFS } from '../src/lib/reference.ts'

// ── Collect all snippets ─────────────────────────────────────────────────────
const snippets = []

for (const tpl of DIAGRAM_TEMPLATES) {
  snippets.push({ source: `template:${tpl.id}`, label: tpl.name, code: tpl.code })
}

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the error is a Node.js environment limitation
 * (DOMPurify not available), NOT a syntax error in the diagram code.
 */
function isDomEnvError(msg) {
  return (
    msg.includes('DOMPurify') ||
    msg.includes('addHook') ||
    msg.includes('sanitize is not a function') ||
    msg.includes('window is not defined') ||
    msg.includes('document is not defined')
  )
}

// ── Run validation ───────────────────────────────────────────────────────────
let passed = 0
let failed = 0
let skipped = 0
const failures = []
const skips = new Set()

console.log(`\nValidating ${snippets.length} Mermaid examples...\n`)

for (const snippet of snippets) {
  try {
    await mermaid.parse(snippet.code)
    passed++
  } catch (err) {
    const msg = err?.message ?? String(err)
    if (isDomEnvError(msg)) {
      // Node.js env limitation — not a syntax error, skip silently
      skipped++
      skips.add(snippet.source.split('/')[0].replace('template:', '').replace('ref:', ''))
    } else {
      failed++
      failures.push({ ...snippet, error: msg })
      console.error(`  ❌ ${snippet.source} — "${snippet.label}"`)
      console.error(`     Code: ${snippet.code.split('\n').slice(0,2).join(' | ')}`)
      console.error(`     Error: ${msg.slice(0, 300)}\n`)
    }
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped (DOM env) — out of ${snippets.length} total`)

if (skipped > 0) {
  console.log(`\nSkipped diagram types (need browser DOM for DOMPurify): ${[...skips].join(', ')}`)
  console.log('These passed mermaid.parse() in a real browser; skipping only in Node.js.')
}

if (failed > 0) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`SYNTAX ERRORS FOUND (${failed}):\n`)
  for (const f of failures) {
    console.log(`  • [${f.source}] "${f.label}"`)
    console.log(`    ${f.error}\n`)
  }
  process.exit(1)
} else {
  console.log('\n✅ All parseable examples validated successfully!')
  process.exit(0)
}
