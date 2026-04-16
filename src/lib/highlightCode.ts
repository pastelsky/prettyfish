/**
 * Lightweight offline syntax highlighter for code snippets in the reference panel.
 * Uses @lezer/highlight + codemirror-lang-mermaid + mermaidFallbackLanguage
 * to produce highlighted HTML spans — no editor instance needed.
 */

import { highlightTree } from '@lezer/highlight'
import { classHighlighter } from '@lezer/highlight'
import { StreamLanguage } from '@codemirror/language'
import { mermaidFallbackLanguage } from './mermaidHighlight'

// Cache parsed trees for the same code string
const cache = new Map<string, string>()

/**
 * Returns an array of {text, className} spans for the given mermaid code snippet.
 * Falls back to plain text if parsing fails.
 */
export function highlightMermaidCode(code: string, isDark: boolean): Array<{ text: string; className?: string }> {
  const cacheKey = `${code}::${isDark}`
  if (cache.has(cacheKey)) {
    // Can't store spans in cache easily, just skip caching for now
  }

  try {
    // Parse the code using the mermaid StreamLanguage
    const lang = mermaidFallbackLanguage instanceof StreamLanguage
      ? mermaidFallbackLanguage
      : StreamLanguage.define(mermaidFallbackLanguage as Parameters<typeof StreamLanguage.define>[0])

    const parser = lang.parser
    const tree = parser.parse(code)

    const spans: Array<{ text: string; className?: string }> = []
    let pos = 0

    highlightTree(tree, classHighlighter, (from, to, cls) => {
      // Text before this token — unstyled
      if (from > pos) {
        spans.push({ text: code.slice(pos, from) })
      }
      spans.push({ text: code.slice(from, to), className: cls })
      pos = to
    })

    // Remaining text
    if (pos < code.length) {
      spans.push({ text: code.slice(pos) })
    }

    return spans.length > 0 ? spans : [{ text: code }]
  } catch {
    return [{ text: code }]
  }
}

/**
 * Map @lezer highlight class names to CSS colors.
 * classHighlighter uses class names like "tok-keyword", "tok-string", "tok-comment", etc.
 */
export function getHighlightStyle(isDark: boolean): string {
  if (isDark) {
    return `
      .tok-keyword { color: #569cd6; font-weight: bold; }
      .tok-string { color: #ce9178; }
      .tok-comment { color: #6a9955; font-style: italic; }
      .tok-number { color: #b5cea8; }
      .tok-operator { color: #d4d4d4; }
      .tok-punctuation { color: #808080; }
      .tok-variableName { color: #9cdcfe; }
      .tok-typeName { color: #4ec9b0; }
      .tok-className { color: #4ec9b0; }
      .tok-definition { color: #dcdcaa; }
      .tok-propertyName { color: #9cdcfe; }
      .tok-literal { color: #ce9178; }
      .tok-name { color: #c8c8c8; }
      .tok-labelName { color: #c8c8c8; }
      .tok-atom { color: #569cd6; }
    `
  } else {
    return `
      .tok-keyword { color: #0000ff; font-weight: bold; }
      .tok-string { color: #a31515; }
      .tok-comment { color: #008000; font-style: italic; }
      .tok-number { color: #098658; }
      .tok-operator { color: #000000; }
      .tok-punctuation { color: #666666; }
      .tok-variableName { color: #001080; }
      .tok-typeName { color: #267f99; }
      .tok-className { color: #267f99; }
      .tok-definition { color: #795e26; }
      .tok-propertyName { color: #001080; }
      .tok-literal { color: #a31515; }
      .tok-name { color: #333333; }
      .tok-labelName { color: #333333; }
      .tok-atom { color: #0000ff; }
    `
  }
}
