/**
 * Static contrast audit for all theme presets × all diagram types.
 * Checks every known text/background color pair for WCAG AA compliance.
 * 
 * Usage: node scripts/tmp_rovodev_contrast-audit.mjs
 */

// We can't easily import TS, so we'll run via tsx
import { CUSTOM_THEME_PRESETS } from '../src/lib/themePresets.ts'

// ── Color parsing ────────────────────────────────────────────────────────────

function parseHex(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1, hex2) {
  const c1 = parseHex(hex1)
  const c2 = parseHex(hex2)
  if (!c1 || !c2) return null
  const l1 = luminance(...c1)
  const l2 = luminance(...c2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// ── Define all text/background pairs per diagram type ────────────────────────

function getColorPairs(vars) {
  return [
    // ── Core / Flowchart ──
    { diagram: 'flowchart', label: 'Node text on primary bg', text: vars.primaryTextColor, bg: vars.mainBkg || vars.primaryColor },
    { diagram: 'flowchart', label: 'Node text on node bg', text: vars.nodeTextColor || vars.primaryTextColor, bg: vars.mainBkg || vars.primaryColor },
    { diagram: 'flowchart', label: 'Secondary text on secondary bg', text: vars.secondaryTextColor, bg: vars.secondaryColor },
    { diagram: 'flowchart', label: 'Tertiary text on tertiary bg', text: vars.tertiaryTextColor, bg: vars.tertiaryColor },
    { diagram: 'flowchart', label: 'Edge label text on edge label bg', text: vars.primaryTextColor, bg: vars.edgeLabelBackground },
    { diagram: 'flowchart', label: 'Cluster text on cluster bg', text: vars.tertiaryTextColor || vars.primaryTextColor, bg: vars.clusterBkg || vars.secondaryColor },

    // ── Sequence ──
    { diagram: 'sequence', label: 'Actor text on actor bg', text: vars.actorTextColor, bg: vars.actorBkg },
    { diagram: 'sequence', label: 'Signal text on background', text: vars.signalTextColor, bg: vars.background || '#ffffff' },
    { diagram: 'sequence', label: 'Label text on label box', text: vars.labelTextColor, bg: vars.labelBoxBkgColor },
    { diagram: 'sequence', label: 'Loop text on background', text: vars.loopTextColor, bg: vars.background || '#ffffff' },
    { diagram: 'sequence', label: 'Note text on note bg', text: vars.noteTextColor, bg: vars.noteBkgColor },
    { diagram: 'sequence', label: 'Seq number on primary', text: vars.sequenceNumberColor, bg: vars.primaryColor },

    // ── ER ──
    { diagram: 'er', label: 'Primary text on entity header', text: vars.primaryTextColor, bg: vars.primaryColor },
    { diagram: 'er', label: 'Primary text on attr row odd', text: vars.primaryTextColor, bg: vars.attributeBackgroundColorOdd },
    { diagram: 'er', label: 'Primary text on attr row even', text: vars.primaryTextColor, bg: vars.attributeBackgroundColorEven },

    // ── State ──
    { diagram: 'state', label: 'State label on state bg', text: vars.stateLabelColor, bg: vars.stateBkg },
    { diagram: 'state', label: 'Transition label on background', text: vars.transitionLabelColor, bg: vars.background || '#ffffff' },
    { diagram: 'state', label: 'Error text on error bg', text: vars.errorTextColor, bg: vars.errorBkgColor },
    { diagram: 'state', label: 'Title on composite bg', text: vars.primaryTextColor, bg: vars.compositeTitleBackground },

    // ── Class ──
    { diagram: 'class', label: 'Class text on fillType0', text: vars.classText, bg: vars.fillType0 },
    { diagram: 'class', label: 'Class text on fillType1', text: vars.classText, bg: vars.fillType1 },
    { diagram: 'class', label: 'Class text on fillType2', text: vars.classText, bg: vars.fillType2 },
    { diagram: 'class', label: 'Class text on fillType3', text: vars.classText, bg: vars.fillType3 },

    // ── Gantt ──
    { diagram: 'gantt', label: 'Task text on task bg', text: vars.taskTextColor, bg: vars.taskBkgColor },
    { diagram: 'gantt', label: 'Task text (light) on task bg', text: vars.taskTextLightColor, bg: vars.taskBkgColor },
    { diagram: 'gantt', label: 'Task text on active task bg', text: vars.taskTextColor, bg: vars.activeTaskBkgColor },
    { diagram: 'gantt', label: 'Task text on done task bg', text: vars.taskTextDarkColor, bg: vars.doneTaskBkgColor },
    { diagram: 'gantt', label: 'Task text on crit bg', text: vars.taskTextColor, bg: vars.critBkgColor },
    { diagram: 'gantt', label: 'Title on section bg', text: vars.titleColor || vars.primaryTextColor, bg: vars.sectionBkgColor },

    // ── Git ──
    ...Array.from({ length: 8 }, (_, i) => ({
      diagram: 'git',
      label: `Branch label ${i} on git${i}`,
      text: vars[`gitBranchLabel${i}`],
      bg: vars[`git${i}`],
    })),

    // ── Pie ──
    { diagram: 'pie', label: 'Pie section text on pie1', text: vars.pieSectionTextColor, bg: vars.pie1 },
    { diagram: 'pie', label: 'Pie section text on pie2', text: vars.pieSectionTextColor, bg: vars.pie2 },
    { diagram: 'pie', label: 'Pie section text on pie3', text: vars.pieSectionTextColor, bg: vars.pie3 },
    { diagram: 'pie', label: 'Pie section text on pie4', text: vars.pieSectionTextColor, bg: vars.pie4 },
    { diagram: 'pie', label: 'Pie title on background', text: vars.pieTitleTextColor, bg: vars.background || '#ffffff' },

    // ── Requirement ──
    { diagram: 'requirement', label: 'Req text on req bg', text: vars.requirementTextColor, bg: vars.requirementBackground },
    { diagram: 'requirement', label: 'Relation label on label bg', text: vars.relationLabelColor, bg: vars.relationLabelBackground },

    // ── Quadrant ──
    { diagram: 'quadrant', label: 'Q1 text on Q1 fill', text: vars.quadrant1TextFill, bg: vars.quadrant1Fill },
    { diagram: 'quadrant', label: 'Q2 text on Q2 fill', text: vars.quadrant2TextFill, bg: vars.quadrant2Fill },
    { diagram: 'quadrant', label: 'Q3 text on Q3 fill', text: vars.quadrant3TextFill, bg: vars.quadrant3Fill },
    { diagram: 'quadrant', label: 'Q4 text on Q4 fill', text: vars.quadrant4TextFill, bg: vars.quadrant4Fill },
    { diagram: 'quadrant', label: 'Point text on point fill', text: vars.quadrantPointTextFill, bg: vars.quadrantPointFill },
    { diagram: 'quadrant', label: 'X axis text on background', text: vars.quadrantXAxisTextFill, bg: vars.background || '#ffffff' },
    { diagram: 'quadrant', label: 'Title on background', text: vars.quadrantTitleFill, bg: vars.background || '#ffffff' },

    // ── Architecture ──
    { diagram: 'architecture', label: 'Title on background', text: vars.titleColor, bg: vars.background || '#ffffff' },
  ]
}

// ── Run audit ────────────────────────────────────────────────────────────────

const WCAG_AA_NORMAL = 4.5
const WCAG_AA_LARGE = 3.0

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     CONTRAST AUDIT: All Themes × All Diagrams   ║')
console.log('╚══════════════════════════════════════════════════╝\n')

let totalIssues = 0
let totalPairs = 0
const issuesByTheme = {}

for (const [themeId, preset] of Object.entries(CUSTOM_THEME_PRESETS)) {
  const vars = preset.themeVariables
  const pairs = getColorPairs(vars)
  const issues = []

  for (const pair of pairs) {
    if (!pair.text || !pair.bg) continue
    totalPairs++
    const ratio = contrastRatio(pair.text, pair.bg)
    if (ratio === null) continue
    
    const roundedRatio = Math.round(ratio * 100) / 100
    const passAA = ratio >= WCAG_AA_NORMAL
    const passAALarge = ratio >= WCAG_AA_LARGE

    if (!passAALarge) {
      issues.push({
        ...pair,
        ratio: roundedRatio,
        severity: 'FAIL',
      })
    } else if (!passAA) {
      issues.push({
        ...pair,
        ratio: roundedRatio,
        severity: 'WARN',
      })
    }
  }

  if (issues.length > 0) {
    issuesByTheme[themeId] = issues
    totalIssues += issues.length
    
    console.log(`\n── ${preset.label} (${themeId}) ──`)
    for (const issue of issues) {
      const icon = issue.severity === 'FAIL' ? '❌' : '⚠️ '
      console.log(`  ${icon} ${issue.ratio}:1  ${issue.label}`)
      console.log(`     text: ${issue.text}  bg: ${issue.bg}  [${issue.diagram}]`)
    }
  }
}

console.log('\n\n════════════════ SUMMARY ════════════════')
console.log(`Themes checked: ${Object.keys(CUSTOM_THEME_PRESETS).length}`)
console.log(`Total pairs checked: ${totalPairs}`)
console.log(`Issues found: ${totalIssues}`)
console.log(`  ❌ FAIL (<3:1): ${Object.values(issuesByTheme).flat().filter(i => i.severity === 'FAIL').length}`)
console.log(`  ⚠️  WARN (<4.5:1): ${Object.values(issuesByTheme).flat().filter(i => i.severity === 'WARN').length}`)

const clean = Object.keys(CUSTOM_THEME_PRESETS).filter(id => !issuesByTheme[id])
if (clean.length > 0) {
  console.log(`\n✅ Clean themes: ${clean.join(', ')}`)
}
console.log('═════════════════════════════════════════\n')

if (totalIssues > 0) {
  process.exit(1)
}
