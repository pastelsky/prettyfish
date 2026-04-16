import type { ThemePresetDef } from '../themePresetDefs'

const blueprint: ThemePresetDef = {
  label: 'Blueprint',
  description: 'Technical blueprint with deep navy borders and monospace font',
  themeCSS: `
    /* ── Flowchart nodes — rounded corners ── */
    .node rect, .node circle, .node ellipse, .node path {
      rx: 6; ry: 6;
    }
    /* Polygons (parallelogram, trapezoid, diamond) don't support rx/ry —
       use round line joins to soften the sharp corners instead. */
    .node polygon { stroke-linejoin: round; }

    /* ── Cluster / subgraph borders ── */
    .cluster rect { rx: 8; ry: 8; }

    /* ── Sequence diagram ── */
    .note rect, .note path { rx: 4; ry: 4; }
    .activation0, .activation1, .activation2 { rx: 3; ry: 3; }

    /* ── State diagram ── */
    .stateGroup rect { rx: 6; ry: 6; }

    /* ── Class diagram ── */
    g.classGroup rect { rx: 4; ry: 4; }

    /* ── ER diagram ── */
    .entityBox { rx: 4; ry: 4; }

    /* ── Gantt ── */
    .task { rx: 3; ry: 3; }

    /* ── Pie chart — refined stroke and label styling ── */
    .pieOuterCircle { stroke-width: 1.5px; opacity: 0.9; }
    .slice { stroke: #f5f8ff; stroke-width: 2px; }
    .pieTitleText { font-weight: 600; font-size: 1.1em; }
    .legend text { font-size: 0.9em; }

    /* ── Mindmap ── */
    .mindmap-node rect, .mindmap-node circle { rx: 8; ry: 8; }
  `,
  configOverrides: {
    look: 'classic' as const,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13,
    flowchart: { curve: 'linear' as const, nodeSpacing: 48, rankSpacing: 52, padding: 16, diagramPadding: 10 },
    sequence: { showSequenceNumbers: false, mirrorActors: false, messageMargin: 30, actorMargin: 50, width: 140 },
    gantt: { barHeight: 18, barGap: 4, topPadding: 48, axisFormat: '%Y-%m-%d' },
  },
  vars: {
    core: {
      background: '#f5f8ff',
      primaryColor: '#e8eef8',
      primaryTextColor: '#0a2d6b',
      primaryBorderColor: '#0a2d6b',
      secondaryColor: '#e8f0ff',
      secondaryTextColor: '#1a3a8a',
      secondaryBorderColor: '#1a3a8a',
      tertiaryColor: '#edf1fb',
      tertiaryTextColor: '#2a4a7a',
      tertiaryBorderColor: '#2a4a7a',
      lineColor: '#1a4a9a',
      titleColor: '#0a2d6b',
      fontFamily: '"JetBrains Mono", monospace',
    },
    flowchart: {
      mainBkg: '#e8eef8',
      nodeBorder: '#0a2d6b',
      nodeTextColor: '#0a2d6b',
      clusterBkg: '#eef2fc',
      clusterBorder: '#1a4a9a',
      edgeLabelBackground: '#f0f4ff',
      defaultLinkColor: '#1a4a9a',
    },
    sequence: {
      actorBkg: '#e8eef8',
      actorBorder: '#0a2d6b',
      actorTextColor: '#0a2d6b',
      actorLineColor: '#0a2d6b',
      signalColor: '#0a2d6b',
      signalTextColor: '#0a2d6b',
      labelBoxBkgColor: '#e8eef8',
      labelBoxBorderColor: '#0a2d6b',
      labelTextColor: '#0a2d6b',
      loopTextColor: '#0a2d6b',
      activationBkgColor: '#c8d8f0',
      activationBorderColor: '#0a2d6b',
      sequenceNumberColor: '#ffffff',
      noteBkgColor: '#eef3ff',
      noteTextColor: '#0a2d6b',
      noteBorderColor: '#1a4a9a',
    },
    er: {
      attributeBackgroundColorOdd: '#f5f8ff',
      attributeBackgroundColorEven: '#e8eef8',
    },
    state: {
      stateBkg: '#e8eef8',
      stateLabelColor: '#0a2d6b',
      compositeBackground: '#eef2fc',
      compositeTitleBackground: '#d8e4f4',
      compositeBorder: '#0a2d6b',
      transitionColor: '#1a4a9a',
      transitionLabelColor: '#0a2d6b',
      specialStateColor: '#1a4a9a',
      errorBkgColor: '#fee2e2',
      errorTextColor: '#991b1b',
    },
    class: {
      classText: '#0a2d6b',
      fillType0: '#e8eef8',
      fillType1: '#e8f0ff',
      fillType2: '#edf1fb',
      fillType3: '#d8e4f4',
      fillType4: '#c8d8f0',
      fillType5: '#b8cce8',
      fillType6: '#a8c0e0',
      fillType7: '#98b4d8',
    },
    gantt: {
      sectionBkgColor: '#eef2fc',
      altSectionBkgColor: '#f5f8ff',
      taskBorderColor: '#0a2d6b',
      taskBkgColor: '#e8eef8',
      taskTextColor: '#0a2d6b',
      taskTextLightColor: '#0a2d6b',
      taskTextDarkColor: '#0a2d6b',
      taskTextOutsideColor: '#0a2d6b',
      activeTaskBorderColor: '#0a2d6b',
      activeTaskBkgColor: '#c8d8f0',
      doneTaskBkgColor: '#94a3b8',
      doneTaskBorderColor: '#64748b',
      critBkgColor: '#fee2e2',
      critBorderColor: '#ef4444',
      todayLineColor: '#1a4a9a',
    },
    git: {
      git0: '#0a2d6b',
      git1: '#1a4a9a',
      git2: '#2a5aaa',
      git3: '#3a6aba',
      git4: '#4a7aca',
      git5: '#5a8ada',
      git6: '#1a3a8a',
      git7: '#0a2d6b',
      commitLabelColor: '#0a2d6b',
      commitLabelBackground: '#d8e4f4',
      gitBranchLabel0: '#0a2d6b',
      gitBranchLabel1: '#0a2d6b',
      gitBranchLabel2: '#0a2d6b',
      gitBranchLabel3: '#0a2d6b',
      gitBranchLabel4: '#000000',
      gitBranchLabel5: '#000000',
      gitBranchLabel6: '#0a2d6b',
      gitBranchLabel7: '#0a2d6b',
    },
    pie: {
      pie1: '#0a2d6b',
      pie2: '#1a4a9a',
      pie3: '#2a5aaa',
      pie4: '#3a6aba',
      pie5: '#4a7aca',
      pie6: '#5a8ada',
      pie7: '#1a3a8a',
      pie8: '#0a2d6b',
      pieTitleTextColor: '#0a2d6b',
      pieSectionTextColor: '#ffffff',
      pieStrokeColor: '#f5f8ff',
    },
    requirement: {
      requirementBackground: '#e8eef8',
      requirementBorderColor: '#0a2d6b',
      requirementTextColor: '#0a2d6b',
      relationColor: '#1a4a9a',
      relationLabelBackground: '#f0f4ff',
      relationLabelColor: '#0a2d6b',
    },
    quadrant: {
      quadrant1Fill: '#e8eef8',
      quadrant2Fill: '#d8e4f4',
      quadrant3Fill: '#eef2fc',
      quadrant4Fill: '#f0f4ff',
      quadrant1TextFill: '#0a2d6b',
      quadrant2TextFill: '#0a2d6b',
      quadrant3TextFill: '#0a2d6b',
      quadrant4TextFill: '#0a2d6b',
      quadrantPointFill: '#0a2d6b',
      quadrantPointTextFill: '#ffffff',
      quadrantXAxisTextFill: '#0a2d6b',
      quadrantYAxisTextFill: '#0a2d6b',
      quadrantTitleFill: '#0a2d6b',
    },
    architecture: {
      archEdgeColor: '#1a4a9a',
      archEdgeArrowColor: '#1a4a9a',
      archGroupBorderColor: '#0a2d6b',
    },
    xyChart: {
      plotColorPalette: '#1a4a9a,#2563a8,#3878c0,#5090d8,#6baed6,#386ca8',
    },

    journey: {
      scaleLabelColor: '#1a1a1a',
      cScale0: '#e8eef8', cScaleLabel0: '#1a1a1a',
      cScale1: '#d8e4f4', cScaleLabel1: '#1a1a1a',
      cScale2: '#c8d8f0', cScaleLabel2: '#1a1a1a',
      cScale3: '#b8cce8', cScaleLabel3: '#1a1a1a',
      cScale4: '#a8c0e0', cScaleLabel4: '#1a1a1a',
      cScale5: '#98b4d8', cScaleLabel5: '#1a1a1a',
      cScale6: '#88a8d0', cScaleLabel6: '#1a1a1a',
      cScale7: '#789cc8', cScaleLabel7: '#1a1a1a',
      cScale8: '#6890c0', cScaleLabel8: '#1a1a1a',
      cScale9: '#5884b8', cScaleLabel9: '#1a1a1a',
      cScale10: '#4878b0', cScaleLabel10: '#ffffff',
      cScale11: '#386ca8', cScaleLabel11: '#ffffff',
    },
  },
}

export default blueprint satisfies ThemePresetDef
