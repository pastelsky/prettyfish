import { z } from 'zod'

import {
  ARTBOARD_DEFAULT_WIDTH,
  createDiagram,
  createPage,
  MERMAID_THEMES,
  type AppState,
  type Diagram,
  type DiagramConfigOverrides,
  type DiagramPage,
  type MermaidTheme,
} from '../types'
import type { PersistedDocumentState } from './storage'

const THEME_VALUES = MERMAID_THEMES.map((theme) => theme.value) as [MermaidTheme, ...MermaidTheme[]]

const MermaidThemeSchema = z.enum(THEME_VALUES)
const LooseObjectSchema = z.record(z.string(), z.any())
const DiagramConfigOverridesSchema: z.ZodType<DiagramConfigOverrides> = LooseObjectSchema as z.ZodType<DiagramConfigOverrides>

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asMode(value: unknown, fallback: 'light' | 'dark'): 'light' | 'dark' {
  return value === 'dark' || value === 'light' ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asConfigOverrides(value: unknown): DiagramConfigOverrides {
  const parsed = DiagramConfigOverridesSchema.safeParse(value)
  return parsed.success ? parsed.data : {}
}

function asMermaidTheme(value: unknown, fallback: MermaidTheme): MermaidTheme {
  const parsed = MermaidThemeSchema.safeParse(value)
  return parsed.success ? parsed.data : fallback
}

const DiagramInputSchema = z.object({
  id: z.unknown().optional(),
  name: z.unknown().optional(),
  description: z.unknown().optional(),
  code: z.unknown().optional(),
  x: z.unknown().optional(),
  y: z.unknown().optional(),
  width: z.unknown().optional(),
  mermaidTheme: z.unknown().optional(),
  configOverrides: z.unknown().optional(),
}).passthrough()

const LegacyPageInputSchema = z.object({
  id: z.unknown().optional(),
  name: z.unknown().optional(),
  code: z.unknown().optional(),
  mermaidTheme: z.unknown().optional(),
  configOverrides: z.unknown().optional(),
}).passthrough()

const PageInputSchema = z.object({
  id: z.unknown().optional(),
  name: z.unknown().optional(),
  diagrams: z.array(z.unknown()).optional(),
  activeDiagramId: z.unknown().optional(),
}).passthrough()

const PersistedDocumentInputSchema = z.object({
  pages: z.unknown().optional(),
  activePageId: z.unknown().optional(),
  mode: z.unknown().optional(),
  editorLigatures: z.unknown().optional(),
  autoFormat: z.unknown().optional(),
}).passthrough()

const AppStateInputSchema = z.object({
  version: z.unknown().optional(),
  pages: z.array(z.unknown()),
  activePageId: z.unknown().optional(),
  mode: z.unknown().optional(),
  editorLigatures: z.unknown().optional(),
  autoFormat: z.unknown().optional(),
}).passthrough()

function normalizeDiagram(raw: unknown, index: number): Diagram | null {
  const parsed = DiagramInputSchema.safeParse(raw)
  if (!parsed.success) return null

  const value = parsed.data
  const fallback = createDiagram(`Diagram ${index + 1}`, '', { x: 0, y: 0 })
  const x = asFiniteNumber(value.x, fallback.x)
  const y = asFiniteNumber(value.y, fallback.y)
  const width = asFiniteNumber(value.width, fallback.width)
  const theme = asMermaidTheme(value.mermaidTheme, fallback.mermaidTheme ?? 'default')

  return {
    id: asString(value.id, fallback.id),
    name: asString(value.name, fallback.name),
    description: asOptionalString(value.description),
    code: typeof value.code === 'string' ? value.code : '',
    x,
    y,
    width: width > 0 ? width : ARTBOARD_DEFAULT_WIDTH,
    mermaidTheme: theme,
    configOverrides: asConfigOverrides(value.configOverrides),
  }
}

function normalizeLegacyPage(raw: unknown, index: number): DiagramPage | null {
  const parsed = LegacyPageInputSchema.safeParse(raw)
  if (!parsed.success) return null

  const value = parsed.data
  const diagram = normalizeDiagram({
    name: 'Diagram 1',
    code: value.code,
    mermaidTheme: value.mermaidTheme,
    configOverrides: value.configOverrides,
    x: 0,
    y: 0,
    width: ARTBOARD_DEFAULT_WIDTH,
  }, 0)

  if (!diagram) return null

  return {
    id: asString(value.id, crypto.randomUUID()),
    name: asString(value.name, `Page ${index + 1}`),
    diagrams: [diagram],
    activeDiagramId: diagram.id,
  }
}

export function normalizePages(rawPages: unknown): DiagramPage[] {
  const pages = z.array(z.unknown()).safeParse(rawPages)
  if (!pages.success) return []

  return pages.data.flatMap((pageRaw, pageIndex) => {
    const parsed = PageInputSchema.safeParse(pageRaw)
    if (!parsed.success) return []

    const value = parsed.data
    if (!Array.isArray(value.diagrams)) {
      const legacy = normalizeLegacyPage(pageRaw, pageIndex)
      return legacy ? [legacy] : []
    }

    const diagrams = value.diagrams
      .map((diagramRaw, diagramIndex) => normalizeDiagram(diagramRaw, diagramIndex))
      .filter((diagram): diagram is Diagram => Boolean(diagram))

    const ensuredDiagrams = diagrams.length > 0 ? diagrams : [createDiagram('Diagram 1', '', { x: 0, y: 0 })]
    const activeDiagramId = typeof value.activeDiagramId === 'string' && ensuredDiagrams.some((diagram) => diagram.id === value.activeDiagramId)
      ? value.activeDiagramId
      : ensuredDiagrams[0]!.id

    return [{
      id: asString(value.id, crypto.randomUUID()),
      name: asString(value.name, `Page ${pageIndex + 1}`),
      diagrams: ensuredDiagrams,
      activeDiagramId,
    } satisfies DiagramPage]
  })
}

export function normalizePersistedDocumentState(raw: unknown): PersistedDocumentState | null {
  if (!isObjectLike(raw)) return null

  const parsed = PersistedDocumentInputSchema.safeParse(raw)
  if (!parsed.success) return null

  const value = parsed.data
  const pages = normalizePages(value.pages)
  const recoveredPages = pages.length > 0 ? pages : [createPage('Page 1', '')]

  const activePageId = typeof value.activePageId === 'string' && recoveredPages.some((page) => page.id === value.activePageId)
    ? value.activePageId
    : recoveredPages[0]!.id

  return {
    pages: recoveredPages,
    activePageId,
    mode: asMode(value.mode, 'light'),
    editorLigatures: asBoolean(value.editorLigatures, true),
    autoFormat: asBoolean(value.autoFormat, true),
  }
}

export function normalizeAppState(raw: unknown): AppState | null {
  const parsed = AppStateInputSchema.safeParse(raw)
  if (!parsed.success) return null

  const normalized = normalizePersistedDocumentState(parsed.data)
  if (!normalized) return null

  return {
    version: 1,
    pages: normalized.pages,
    activePageId: normalized.activePageId,
    mode: normalized.mode,
    editorLigatures: normalized.editorLigatures,
  }
}
