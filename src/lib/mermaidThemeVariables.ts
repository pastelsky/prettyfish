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
  gitBranchLabel0: string
  gitBranchLabel1: string
  gitBranchLabel2: string
  gitBranchLabel3: string
  gitBranchLabel4: string
  gitBranchLabel5: string
  gitBranchLabel6: string
  gitBranchLabel7: string
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
  pieTitleTextColor: string
  pieSectionTextColor: string
  pieStrokeColor: string
}

/** Requirement diagram — boxes and relation lines. */
export interface RequirementVars {
  requirementBackground: string
  requirementBorderColor: string
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
}

/** Architecture diagram — edges and group borders. */
export interface ArchitectureVars {
  archEdgeColor: string
  archEdgeArrowColor: string
  archGroupBorderColor: string
}

/** Journey / timeline — section scale colors. */
export interface JourneyVars {
  cScale0: string
  cScale1: string
  cScale2: string
  cScale3: string
  cScale4: string
  cScale5: string
  cScale6: string
  cScale7: string
  cScale8: string
  cScale9: string
  cScale10: string
  cScale11: string
}

// ── Composite structured type ────────────────────────────────────────────────

/**
 * Exhaustive, structured theme variables grouped by diagram.
 *
 * Every group is **required**. Adding a new group here will cause compile
 * errors in every ThemePreset until it's populated.
 */
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
  ) as FlatMermaidThemeVariables
}
