import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('src')
const BASELINE_FILE = path.resolve('scripts/dark-equivalent-baseline.json')
const SHOULD_UPDATE_BASELINE = process.argv.includes('--update-baseline')
const EXTS = new Set(['.ts', '.tsx'])

const EXPLICIT_COLOR_PREFIXES = [
  'bg-', 'text-', 'border-', 'ring-', 'fill-', 'stroke-',
  'from-', 'via-', 'to-', 'decoration-', 'outline-',
]

const SEMANTIC_COLOR_VALUES = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring',
  'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground',
  'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
]

const EXPLICIT_COLOR_VALUE_RE = /^(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-|$)/

const IGNORE_CLASS_PATTERNS = [
  /^dark:/,
  /^data-/, /^aria-/, /^group-/, /^peer-/,
  /^shadow(?:-|$)/, /^drop-shadow(?:-|$)/,
  /^opacity-/, /^backdrop-blur/, /^blur/, /^transition/, /^duration-/, /^ease-/, /^animate-/,
]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (EXTS.has(path.extname(full))) out.push(full)
  }
  return out
}

function isIgnoredToken(token) {
  return IGNORE_CLASS_PATTERNS.some((re) => re.test(token))
}

function classifyColorToken(token) {
  if (isIgnoredToken(token)) return null
  const cleaned = token.replace(/^(?:dark:|hover:|focus:|active:|disabled:|sm:|md:|lg:|xl:|2xl:|group-hover:|group-data-[^:]+:|data-[^:]+:|aria-[^:]+:)+/, '')
  for (const prefix of EXPLICIT_COLOR_PREFIXES) {
    if (!cleaned.startsWith(prefix)) continue
    const value = cleaned.slice(prefix.length)
    if (SEMANTIC_COLOR_VALUES.some((semantic) => value === semantic || value.startsWith(`${semantic}/`) || value.startsWith(`${semantic}-`))) {
      return null
    }
    if (EXPLICIT_COLOR_VALUE_RE.test(value)) {
      return prefix
    }
  }
  return null
}

function extractQuotedStrings(text) {
  const strings = []
  const regex = /(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g
  let match
  while ((match = regex.exec(text))) {
    strings.push({ value: match[2], index: match.index })
  }
  return strings
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split('\n').length
}

function hasDarkEquivalent(tokens, group) {
  return tokens.some((token) => {
    if (!token.includes('dark:')) return false
    const withoutDark = token.replace(/^(?:[a-z-]+:)*dark:/, '')
    return withoutDark.startsWith(group)
  })
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasNearbyDarkEquivalent(sourceText, index, group) {
  const windowStart = Math.max(0, index - 220)
  const windowEnd = Math.min(sourceText.length, index + 220)
  const nearby = sourceText.slice(windowStart, windowEnd)
  const pattern = "dark:[^\\s'\"`]*" + escapeRegExp(group)
  return new RegExp(pattern).test(nearby)
}

function violationId(violation) {
  return `${violation.file}::${violation.missing.join(',')}::${violation.sample}`
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  } catch {
    return []
  }
}

const files = walk(ROOT)
const violations = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  for (const str of extractQuotedStrings(text)) {
    if (!str.value.includes('bg-') && !str.value.includes('text-') && !str.value.includes('border-') && !str.value.includes('ring-') && !str.value.includes('fill-') && !str.value.includes('stroke-')) continue
    const tokens = str.value.split(/\s+/).filter(Boolean)
    const neededGroups = new Set()
    for (const token of tokens) {
      const group = classifyColorToken(token)
      if (group) neededGroups.add(group)
    }
    if (!neededGroups.size) continue
    const missing = [...neededGroups].filter((group) => !hasDarkEquivalent(tokens, group) && !hasNearbyDarkEquivalent(text, str.index, group))
    if (!missing.length) continue
    violations.push({
      file: path.relative(process.cwd(), file),
      line: lineNumberForIndex(text, str.index),
      missing,
      sample: str.value.trim(),
    })
  }
}

const baseline = loadBaseline()
const baselineSet = new Set(baseline)
const currentIds = violations.map(violationId)
const newViolations = violations.filter((violation) => !baselineSet.has(violationId(violation)))

if (SHOULD_UPDATE_BASELINE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify([...new Set(currentIds)].sort(), null, 2) + '\n')
  console.log(`Updated dark-equivalent baseline with ${new Set(currentIds).size} entries`)
  process.exit(0)
}

if (newViolations.length) {
  console.error('\nDark-equivalent audit failed. New explicit Tailwind color utilities need dark: counterparts (or use semantic theme tokens like bg-background/text-foreground).\n')
  for (const violation of newViolations.slice(0, 200)) {
    console.error(`${violation.file}:${violation.line} missing dark variants for [${violation.missing.join(', ')}]`)
    console.error(`  ${violation.sample}`)
  }
  if (newViolations.length > 200) {
    console.error(`\n...and ${newViolations.length - 200} more new violations`)
  }
  process.exit(1)
}

console.log(`✅ Dark-equivalent audit passed (${violations.length} total known matches, no new violations)`)
