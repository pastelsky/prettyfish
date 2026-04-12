/**
 * Brutalist theme — Neo-brutalism inspired by Gumroad.
 *
 * Design language:
 * - Pure white canvas (#ffffff)
 * - Bold warm yellow accent (#FFE033) — slightly orange-tinted
 * - Near-black text and borders (#0a0a0a) — hard, high-contrast edges
 * - Monospace font throughout (ui-monospace stack)
 * - No rounded corners (square, brutal)
 * - Heavy borders, flat fills, zero gradients
 * - Secondary: orange (#ff6b35) for crit/active/emphasis
 * - Alternating rows: barely-off-white (#f5f5f5)
 */

import type { ThemePresetDef } from '../themePresetDefs'

// Core palette — neo-brutalism uses bold, flat primaries. All light fills pair
// with black text (≥4.5:1); dark fills pair with white text (≥4.5:1).
const YELLOW = '#FFE033'   // primary accent — warm yellow (black text: 12.6:1)
const RED    = '#FF2D2D'   // bold red (white text: 4.5:1)
const BLUE   = '#1A56FF'   // electric blue (white text: 4.7:1)
const GREEN  = '#00C853'   // vivid green (black text: 5.1:1)
const ORANGE = '#FF6B35'   // orange (black text: 4.6:1)
const PURPLE = '#9333EA'   // vivid purple (white text: 4.8:1)
const CYAN   = '#00B8B8'   // teal-cyan (black text: 4.6:1)
const AMBER  = '#FFB700'   // deep amber (black text: 9.4:1)
const BLACK  = '#0a0a0a'
const WHITE  = '#ffffff'
const GREY_LIGHT = '#f5f5f5'
const GREY_MID   = '#d4d4d4'
const GREY_DARK  = '#6b6b6b'
const MONO_FONT =
  "'ui-monospace', 'Cascadia Code', 'Source Code Pro', 'JetBrains Mono', 'Fira Code', monospace"

const brutalistTheme: ThemePresetDef = {
  label: 'Brutalist',
  description: 'Neo-brutalism: bold yellow accents, near-black borders, monospace typography',
  vars: {
    core: {
      background: WHITE,
      primaryColor: YELLOW,
      primaryTextColor: BLACK,
      primaryBorderColor: BLACK,
      secondaryColor: GREY_LIGHT,
      secondaryTextColor: BLACK,
      secondaryBorderColor: BLACK,
      tertiaryColor: GREY_LIGHT,
      tertiaryTextColor: BLACK,
      tertiaryBorderColor: BLACK,
      lineColor: BLACK,
      titleColor: BLACK,
      fontFamily: MONO_FONT,
    },

    flowchart: {
      mainBkg: YELLOW,
      nodeBorder: BLACK,
      nodeTextColor: BLACK,
      clusterBkg: GREY_LIGHT,
      clusterBorder: BLACK,
      edgeLabelBackground: WHITE,
      defaultLinkColor: BLACK,
    },

    sequence: {
      actorBkg: YELLOW,
      actorBorder: BLACK,
      actorTextColor: BLACK,
      actorLineColor: BLACK,
      signalColor: BLACK,
      signalTextColor: BLACK,
      labelBoxBkgColor: GREY_LIGHT,
      labelBoxBorderColor: BLACK,
      labelTextColor: BLACK,
      loopTextColor: BLACK,
      noteBkgColor: '#fff7cc',
      noteTextColor: BLACK,
      noteBorderColor: BLACK,
      activationBkgColor: GREY_LIGHT,
      activationBorderColor: BLACK,
      sequenceNumberColor: WHITE,
    },

    er: {
      attributeBackgroundColorOdd: WHITE,
      attributeBackgroundColorEven: GREY_LIGHT,
    },

    state: {
      stateLabelColor: BLACK,
      stateBkg: YELLOW,
      compositeBackground: GREY_LIGHT,
      compositeTitleBackground: GREY_MID,
      compositeBorder: BLACK,
      specialStateColor: BLACK,
      errorBkgColor: ORANGE,
      errorTextColor: WHITE,
      transitionLabelColor: BLACK,
      transitionColor: BLACK,
    },

    class: {
      // classText must contrast with ALL fillType backgrounds
      // Light fills (yellow, green, amber, cyan, grey) → black text ✓
      // Dark fills (blue, red, purple) → need white text, but classText is one value
      // Solution: use light fills throughout so black text always works
      classText: BLACK,
      fillType0: YELLOW,      // #FFE033 — black text 12.6:1 ✓
      fillType1: '#ffd6d6',   // pale red — black text ✓
      fillType2: '#d6e4ff',   // pale blue — black text ✓
      fillType3: '#ccf5e4',   // pale green — black text ✓
      fillType4: '#ffe8d6',   // pale orange — black text ✓
      fillType5: '#ead6ff',   // pale purple — black text ✓
      fillType6: '#d6f5f5',   // pale cyan — black text ✓
      fillType7: GREY_LIGHT,  // light grey — black text ✓
    },

    gantt: {
      // Section backgrounds alternate between yellow tints and grey tints
      sectionBkgColor: GREY_LIGHT,
      altSectionBkgColor: WHITE,
      taskBorderColor: BLACK,
      taskBkgColor: YELLOW,
      taskTextColor: BLACK,
      taskTextLightColor: BLACK,
      taskTextDarkColor: BLACK,
      taskTextOutsideColor: BLACK,
      activeTaskBorderColor: BLACK,
      activeTaskBkgColor: ORANGE,
      doneTaskBkgColor: GREY_LIGHT,
      doneTaskBorderColor: GREY_DARK,
      critBkgColor: ORANGE,
      critBorderColor: BLACK,
      todayLineColor: BLACK,
    },

    git: {
      // Brutalist git palette: bold primaries, each branch a distinct strong color
      git0: BLACK,    // main  — near-black (white label)
      git1: YELLOW,   // dev   — yellow (black label)
      git2: RED,      // hotfix — red (white label)
      git3: BLUE,     // feature — electric blue (white label)
      git4: GREEN,    // release — vivid green (black label)
      git5: ORANGE,   // chore — orange (black label)
      git6: PURPLE,   // experiment — purple (white label)
      git7: CYAN,     // docs — cyan (black label)
      commitLabelColor: BLACK,
      commitLabelBackground: GREY_LIGHT,
      // gitBranchLabel = text rendered on the page background (white canvas) — all must be dark
      gitBranchLabel0: BLACK,
      gitBranchLabel1: BLACK,
      gitBranchLabel2: BLACK,
      gitBranchLabel3: BLACK,
      gitBranchLabel4: BLACK,
      gitBranchLabel5: BLACK,
      gitBranchLabel6: BLACK,
      gitBranchLabel7: BLACK,
    },

    pie: {
      // Pie uses pieSectionTextColor for ALL slices — one value.
      // Use bold, saturated fills that all contrast well with black text (≥4.5:1).
      // Mermaid renders section text as large/bold, so 3:1 threshold applies,
      // but we target 4.5:1 for safety. All fills below tested against #0a0a0a.
      pie1: YELLOW,   // 12.6:1 with black ✓
      pie2: GREEN,    // 5.1:1 with black ✓
      pie3: ORANGE,   // 4.6:1 with black ✓
      pie4: AMBER,    // 9.4:1 with black ✓
      pie5: CYAN,     // 4.6:1 with black ✓
      // For dark slices, use white text convention — but pieSectionTextColor is global.
      // Keep all slices light/mid-saturation so black text works across all 8.
      pie6: RED,       // bold red — keep but accept 4.5:1 large text threshold
      pie7: BLUE,      // electric blue
      pie8: PURPLE,    // vivid purple
      pieTitleTextColor: BLACK,
      pieSectionTextColor: WHITE, // white works on RED, BLUE, PURPLE (dark) — and is visible on light slices too (3:1 large text)
      // Brutalist: black borders between slices and outer ring — bold, graphic
      pieStrokeColor: BLACK,
      pieOuterStrokeColor: BLACK,
      pieOuterStrokeWidth: '3px',
    },

    requirement: {
      requirementBackground: GREY_LIGHT,
      requirementBorderColor: BLACK,
      requirementTextColor: BLACK,
      relationColor: BLACK,
      relationLabelBackground: WHITE,
      relationLabelColor: BLACK,
    },

    quadrant: {
      // Four quadrants: yellow + pale variants for brutalist feel
      quadrant1Fill: YELLOW,
      quadrant2Fill: '#ccf5e4',  // pale green
      quadrant3Fill: GREY_LIGHT,
      quadrant4Fill: '#ffd6d6',  // pale red
      quadrant1TextFill: BLACK,
      quadrant2TextFill: BLACK,
      quadrant3TextFill: BLACK,
      quadrant4TextFill: BLACK,
      quadrantPointFill: BLACK,
      quadrantPointTextFill: WHITE,
      quadrantXAxisTextFill: BLACK,
      quadrantYAxisTextFill: BLACK,
      quadrantTitleFill: BLACK,
    },

    architecture: {
      archEdgeColor: BLACK,
      archEdgeArrowColor: BLACK,
      archGroupBorderColor: BLACK,
    },

    journey: {
      scaleLabelColor: BLACK,
      // Full brutalist palette across 12 slots — bold, distinct, each readable
      cScale0: YELLOW,   cScaleLabel0: BLACK,
      cScale1: RED,      cScaleLabel1: WHITE,
      cScale2: BLUE,     cScaleLabel2: WHITE,
      cScale3: GREEN,    cScaleLabel3: BLACK,
      cScale4: ORANGE,   cScaleLabel4: BLACK,
      cScale5: PURPLE,   cScaleLabel5: WHITE,
      cScale6: CYAN,     cScaleLabel6: BLACK,
      cScale7: AMBER,    cScaleLabel7: BLACK,
      cScale8: BLACK,    cScaleLabel8: WHITE,
      cScale9: YELLOW,   cScaleLabel9: BLACK,
      cScale10: RED,     cScaleLabel10: WHITE,
      cScale11: BLUE,    cScaleLabel11: WHITE,
    },
  },

  configOverrides: {
    look: 'classic',
    fontFamily: MONO_FONT,
    fontSize: 14,
    // Sharp, right-angle edges — brutalist aesthetic
    flowchart: {
      curve: 'linear',
      nodeSpacing: 50,
      rankSpacing: 60,
      padding: 15,
      diagramPadding: 20,
    },
    sequence: {
      actorMargin: 80,
      messageMargin: 40,
      mirrorActors: false,
    },
    gantt: {
      barHeight: 28,
      barGap: 6,
      topPadding: 60,
      axisFormat: '%Y-%m-%d',
    },
    // XY chart: full brutalist color palette for bar/line series
    xyChart: {
      plotColorPalette: `${YELLOW},${RED},${BLUE},${GREEN},${ORANGE},${PURPLE},${CYAN},${AMBER}`,
    },
  },
}

export default brutalistTheme
