/**
 * Strongly-typed Mermaid theme variables organized by diagram type.
 *
 * Derived from mermaid's Theme class (node_modules/mermaid/dist/themes/theme-base.d.ts)
 * and the cascade logic in the bundled source.
 *
 * DESIGN: Each diagram group is a required field on ThemeVariablesByDiagram.
 * Adding a new group here will cause a compile error in every theme preset
 * until it is explicitly populated — forcing exhaustive coverage.
 */

// ── Per-diagram variable groups ──────────────────────────────────────────────

/** Core variables shared by every diagram type. All required. */
export interface CoreVars {
  background: string
  primaryColor: string
  primaryTextColor: string
  primaryBorderColor: string
  secondaryColor: string
  secondaryTextColor: string
  secondaryBorderColor: string
  tertiaryColor: string
  tertiaryTextColor: string
  tertiaryBorderColor: string
  lineColor: string
  titleColor: string
  fontFamily: string
}

/** Flowchart / graph / mindmap / block / kanban nodes and edges. */
export interface FlowchartVars {
  mainBkg: string                   // ← defaults: primaryColor
  nodeBorder: string                // ← defaults: primaryBorderColor
  nodeTextColor: string             // ← defaults: primaryTextColor
  clusterBkg: string                // ← defaults: secondaryColor
  clusterBorder: string             // ← defaults: border2
  edgeLabelBackground: string
  defaultLinkColor: string          // ← defaults: lineColor
}

/** Sequence diagram — actors, signals, activation bars, notes. */
export interface SequenceVars {
  actorBkg: string
  actorBorder: string
  actorTextColor: string
  actorLineColor: string            // ← defaults: actorBorder
  signalColor: string
  signalTextColor: string
  labelBoxBkgColor: string
  labelBoxBorderColor: string
  labelTextColor: string
  loopTextColor: string
  activationBkgColor: string
  activationBorderColor: string
  sequenceNumberColor: string
  noteBkgColor: string
  noteTextColor: string
  noteBorderColor: string
}

/** ER diagram — entity attribute row backgrounds. */
export interface ERVars {
  attributeBackgroundColorOdd: string
  attributeBackgroundColorEven: string
}

/** State diagram — states, transitions, composites, errors. */
export interface StateVars {
  stateBkg: string
  stateLabelColor: string
  compositeBackground: string
  compositeTitleBackground: string
  compositeBorder: string
  transitionColor: string
  transitionLabelColor: string
  specialStateColor: string
  errorBkgColor: string
  errorTextColor: string
}

/** Class diagram — section fills and text. */
export interface ClassVars {
  classText: string
  fillType0: string
  fillType1: string
  fillType2: string
  fillType3: string
  fillType4: string
  fillType5: string
  fillType6: string
  fillType7: string
}

/** Gantt chart — tasks, sections, critical path. */
export interface GanttVars {
  sectionBkgColor: string
  altSectionBkgColor: string
  taskBorderColor: string
  taskBkgColor: string
  taskTextColor: string
  taskTextLightColor: string
  taskTextDarkColor: string
  taskTextOutsideColor: string
  activeTaskBorderColor: string
  activeTaskBkgColor: string
  doneTaskBkgColor: string
  doneTaskBorderColor: string
  critBkgColor: string
  critBorderColor: string
  todayLineColor: string
  /** Background for weekend/excluded days in Gantt. Defaults to altSectionBkgColor. */
  excludeBkgColor?: string
  /** Grid line color. Defaults to sectionBkgColor. */
  gridColor?: string
}

/** Git graph — branch colors and labels. */
export interface GitVars {
  git0: string
  git1: string
  git2: string
  git3: string
  git4: string
  git5: string
  git6: string
  git7: string
  /** Text color for commit ID labels (shown below each commit circle). Defaults to secondaryTextColor. */
  commitLabelColor: string
  /** Background rect color for commit ID labels (rendered at 0.5 opacity). Defaults to secondaryColor. */
  commitLabelBackground: string
  /** Font size for commit ID labels. Mermaid default: "10px". */
  commitLabelFontSize?: string
  gitBranchLabel0: string
  gitBranchLabel1: string
  gitBranchLabel2: string
  gitBranchLabel3: string
  gitBranchLabel4: string
  gitBranchLabel5: string
  gitBranchLabel6: string
  gitBranchLabel7: string
  /** Text color for git tag labels. Defaults to primaryTextColor. */
  tagLabelColor?: string
  /** Background color for git tag labels. Defaults to primaryColor. */
  tagLabelBackground?: string
}

/** Pie chart — slice colors and label styling. */
export interface PieVars {
  pie1: string
  pie2: string
  pie3: string
  pie4: string
  pie5: string
  pie6: string
  pie7: string
  pie8: string
  /** Extra pie slice colors — Mermaid supports up to 12 slices. */
  pie9?: string
  pie10?: string
  pie11?: string
  pie12?: string
  pieTitleTextColor: string
  pieSectionTextColor: string
  pieStrokeColor: string
  /** Width of stroke between slices. */
  pieStrokeWidth?: string
  /** Stroke color for the outer ring of the pie chart. */
  pieOuterStrokeColor?: string
  /** Width of the outer ring stroke. */
  pieOuterStrokeWidth?: string
  /** Opacity of pie slices (0-1). */
  pieOpacity?: string
}

/** Requirement diagram — boxes and relation lines. */
export interface RequirementVars {
  requirementBackground: string
  requirementBorderColor: string
  /** Border stroke width. Mermaid accepts CSS length strings. */
  requirementBorderSize?: string
  requirementTextColor: string
  relationColor: string
  relationLabelBackground: string
  relationLabelColor: string
}

/** Quadrant chart — quadrant fills and labels. */
export interface QuadrantVars {
  quadrant1Fill: string
  quadrant2Fill: string
  quadrant3Fill: string
  quadrant4Fill: string
  quadrant1TextFill: string
  quadrant2TextFill: string
  quadrant3TextFill: string
  quadrant4TextFill: string
  quadrantPointFill: string
  quadrantPointTextFill: string
  quadrantXAxisTextFill: string
  quadrantYAxisTextFill: string
  quadrantTitleFill: string
  /** Inner grid line color. */
  quadrantInternalBorderStrokeFill?: string
  /** Outer border color. */
  quadrantExternalBorderStrokeFill?: string
}

/** Architecture diagram — edges and group borders. */
export interface ArchitectureVars {
  archEdgeColor: string
  archEdgeArrowColor: string
  archGroupBorderColor: string
}

/** Journey / timeline / mindmap — section scale colors and per-slot label colors. */
export interface JourneyVars {
  /**
   * Fallback label color for all cScale slots. Mermaid also generates per-slot
   * cScaleLabel0-11 which override this. We use per-slot labels so each cScale
   * background can have a properly contrasting text color.
   */
  scaleLabelColor: string
  cScale0: string
  cScaleLabel0: string
  cScale1: string
  cScaleLabel1: string
  cScale2: string
  cScaleLabel2: string
  cScale3: string
  cScaleLabel3: string
  cScale4: string
  cScaleLabel4: string
  cScale5: string
  cScaleLabel5: string
  cScale6: string
  cScaleLabel6: string
  cScale7: string
  cScaleLabel7: string
  cScale8: string
  cScaleLabel8: string
  cScale9: string
  cScaleLabel9: string
  cScale10: string
  cScaleLabel10: string
  cScale11: string
  cScaleLabel11: string
}

// ── Composite structured type ────────────────────────────────────────────────

/**
 * Exhaustive, structured theme variables grouped by diagram.
 *
 * Every group is **required**. Adding a new group here will cause compile
 * errors in every ThemePreset until it's populated.
 */
/**
 * XY chart — plot color palette and axis colors.
 * NOTE: Mermaid reads this as a NESTED object in themeVariables.xyChart,
 * not as flat keys. flattenThemeVariables preserves this nesting.
 */
export interface XYChartVars {
  /** Comma-separated hex colors for data series (bars, lines). */
  plotColorPalette: string
  backgroundColor?: string
  titleColor?: string
  xAxisTitleColor?: string
  xAxisLabelColor?: string
  xAxisLineColor?: string
  yAxisTitleColor?: string
  yAxisLabelColor?: string
  yAxisLineColor?: string
  dataLabelColor?: string
}

/**
 * Truly optional vars — Mermaid derives these automatically from other vars.
 * Themes CAN override them but are not required to.
 * Every other field is REQUIRED — missing fields cause TypeScript errors.
 */
export type OptionalThemeVars =
  | 'pie9' | 'pie10' | 'pie11' | 'pie12'
  | 'pieStrokeWidth' | 'pieOuterStrokeColor' | 'pieOuterStrokeWidth' | 'pieOpacity'
  | 'excludeBkgColor' | 'gridColor'
  | 'tagLabelColor' | 'tagLabelBackground'
  | 'requirementBorderSize'
  | 'quadrantInternalBorderStrokeFill' | 'quadrantExternalBorderStrokeFill'

export interface ThemeVariablesByDiagram {
  core: CoreVars
  flowchart: FlowchartVars
  sequence: SequenceVars
  er: ERVars
  state: StateVars
  class: ClassVars
  gantt: GanttVars
  git: GitVars
  pie: PieVars
  requirement: RequirementVars
  quadrant: QuadrantVars
  architecture: ArchitectureVars
  journey: JourneyVars
  /**
   * Passed as nested themeVariables.xyChart — NOT flattened into root.
   * Required: every theme must define plotColorPalette so XY charts use theme colors.
   */
  xyChart: XYChartVars
}

/** All diagram group keys — useful for iteration. */
export type DiagramGroup = keyof ThemeVariablesByDiagram

/** Flat union of all variable values (for passing to mermaid's API). */
export type FlatMermaidThemeVariables =
  & CoreVars
  & FlowchartVars
  & SequenceVars
  & ERVars
  & StateVars
  & ClassVars
  & GanttVars
  & GitVars
  & PieVars
  & RequirementVars
  & QuadrantVars
  & ArchitectureVars
  & JourneyVars

/**
 * Flatten a structured ThemeVariablesByDiagram into a flat Record
 * suitable for mermaid's themeVariables config.
 */
export function flattenThemeVariables(grouped: ThemeVariablesByDiagram): FlatMermaidThemeVariables {
  return Object.assign(
    {},
    grouped.core,
    grouped.flowchart,
    grouped.sequence,
    grouped.er,
    grouped.state,
    grouped.class,
    grouped.gantt,
    grouped.git,
    grouped.pie,
    grouped.requirement,
    grouped.quadrant,
    grouped.architecture,
    grouped.journey,
    // xyChart is passed as a NESTED object (themeVariables.xyChart) because
    // Mermaid's theme class reads this.xyChart?.plotColorPalette — not flat keys.
    grouped.xyChart !== undefined ? { xyChart: grouped.xyChart } : {},
  ) as FlatMermaidThemeVariables
}
