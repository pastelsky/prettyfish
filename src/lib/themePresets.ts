import { flattenThemeVariables } from './mermaidThemeVariables'
import { THEME_PRESET_DEFS, type ThemePresetDef } from './themePresetDefs'

export interface ThemePreset {
  label: string
  description: string
  themeVariables: Record<string, string>
  themeCSS?: string
  configOverrides: ThemePresetDef['configOverrides']
}

function toPreset(def: ThemePresetDef): ThemePreset {
  return {
    label: def.label,
    description: def.description,
    themeVariables: flattenThemeVariables(def.vars) as unknown as Record<string, string>,
    themeCSS: def.themeCSS,
    configOverrides: def.configOverrides,
  }
}

/** All theme presets, including disabled ones. Used for rendering saved documents that may reference a disabled theme. */
export const CUSTOM_THEME_PRESETS: Record<string, ThemePreset> = Object.fromEntries(
  Object.entries(THEME_PRESET_DEFS).map(([key, def]) => [key, toPreset(def)]),
)

export const CUSTOM_THEME_IDS = Object.keys(CUSTOM_THEME_PRESETS) as (keyof typeof CUSTOM_THEME_PRESETS)[]

/** Active (non-disabled) theme presets — used in the UI dropdown and theme selection. */
export const ACTIVE_THEME_PRESETS: Record<string, ThemePreset> = Object.fromEntries(
  Object.entries(THEME_PRESET_DEFS)
    .filter(([, def]) => !def.disabled)
    .map(([key, def]) => [key, toPreset(def)]),
)

export const ACTIVE_THEME_IDS = Object.keys(ACTIVE_THEME_PRESETS) as (keyof typeof ACTIVE_THEME_PRESETS)[]
