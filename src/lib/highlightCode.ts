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
      .tok-keyword { color: #b39ddb; font-weight: bold; }
      .tok-string { color: #f48fb1; }
      .tok-comment { color: #d4a054; font-style: italic; }
      .tok-number { color: #e0a050; }
      .tok-operator { color: #9ca3af; }
      .tok-punctuation { color: #9ca3af; }
      .tok-variableName { color: #6dc9a8; }
      .tok-typeName { color: #5db8c9; }
      .tok-className { color: #5db8c9; }
      .tok-definition { color: #dcdcaa; }
      .tok-propertyName { color: #6dc9a8; }
      .tok-literal { color: #6dc9a8; }
      .tok-name { color: #c8c8c8; }
      .tok-labelName { color: #80a8c8; }
      .tok-atom { color: #80a8c8; }
      .tok-content { color: #a0aab4; }
      .tok-modifier { color: #b39ddb; font-style: italic; }
    `
  } else {
    return `
      .tok-keyword { color: #5f3dc4; font-weight: bold; }
      .tok-string { color: #9f1c1c; }
      .tok-comment { color: #8a5a00; font-style: italic; }
      .tok-number { color: #b35c00; }
      .tok-operator { color: #9ca3af; }
      .tok-punctuation { color: #a3aab8; }
      .tok-variableName { color: #1a6b5a; }
      .tok-typeName { color: #0f5c7a; }
      .tok-className { color: #0f5c7a; }
      .tok-definition { color: #795e26; }
      .tok-propertyName { color: #1a6b5a; }
      .tok-literal { color: #005c41; }
      .tok-name { color: #333333; }
      .tok-labelName { color: #173b8c; }
      .tok-atom { color: #173b8c; }
      .tok-content { color: #4a5568; }
      .tok-modifier { color: #6b52a3; font-style: italic; }
    `
  }
}
