/**
 * Custom theme presets for Pretty Fish.
 * Each preset uses mermaid's 'base' theme with custom themeVariables.
 */

export interface ThemePreset {
  label: string
  description: string
  themeVariables: Record<string, string>
}

export const CUSTOM_THEME_PRESETS: Record<string, ThemePreset> = {
  // ── S1: Wireframe ──────────────────────────────────────────────────────────
  // Inspired by UX wireframe sketches — gray lines, minimal fills,
  // annotation-style yellow accents
  wireframe: {
    label: 'Wireframe',
    description: 'Sketch-style wireframe',
    themeVariables: {
      primaryColor: '#f5f5f5',
      primaryTextColor: '#333333',
      primaryBorderColor: '#999999',
      lineColor: '#888888',
      background: '#ffffff',
      mainBkg: '#f5f5f5',
      nodeBorder: '#999999',
      clusterBkg: '#fafafa',
      edgeLabelBackground: '#ffffff',
      titleColor: '#333333',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      // Additional vars mermaid supports
      secondaryColor: '#eeeeee',
      tertiaryColor: '#fafafa',
      secondaryBorderColor: '#aaaaaa',
      tertiaryBorderColor: '#cccccc',
      secondaryTextColor: '#555555',
      tertiaryTextColor: '#666666',
      noteBkgColor: '#fff9c4',
      noteTextColor: '#333333',
      noteBorderColor: '#e6d85e',
      // Sequence diagram
      actorBkg: '#f5f5f5',
      actorBorder: '#999999',
      actorTextColor: '#333333',
      signalColor: '#888888',
      signalTextColor: '#333333',
      labelBoxBkgColor: '#f5f5f5',
      labelBoxBorderColor: '#999999',
      labelTextColor: '#333333',
      loopTextColor: '#666666',
      activationBkgColor: '#eeeeee',
      activationBorderColor: '#999999',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── S2: Corporate / Service Blueprint ──────────────────────────────────────
  // Clean business aesthetic — soft pastels (salmon, sky blue, mint, cream),
  // thin gray borders, structured and professional
  corporate: {
    label: 'Corporate',
    description: 'Clean business pastels',
    themeVariables: {
      primaryColor: '#e8f4f8',
      primaryTextColor: '#1a1a2e',
      primaryBorderColor: '#b8d4de',
      lineColor: '#8898a8',
      background: '#ffffff',
      mainBkg: '#e8f4f8',
      nodeBorder: '#b8d4de',
      clusterBkg: '#f7f9fb',
      edgeLabelBackground: '#ffffff',
      titleColor: '#1a1a2e',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      secondaryColor: '#fde8e0',
      tertiaryColor: '#e8f5e8',
      secondaryBorderColor: '#e0b8a8',
      tertiaryBorderColor: '#b8d4b8',
      secondaryTextColor: '#1a1a2e',
      tertiaryTextColor: '#1a1a2e',
      noteBkgColor: '#fff8e1',
      noteTextColor: '#1a1a2e',
      noteBorderColor: '#e6d49e',
      // Sequence
      actorBkg: '#e8f4f8',
      actorBorder: '#b8d4de',
      actorTextColor: '#1a1a2e',
      signalColor: '#8898a8',
      signalTextColor: '#1a1a2e',
      labelBoxBkgColor: '#fde8e0',
      labelBoxBorderColor: '#e0b8a8',
      labelTextColor: '#1a1a2e',
      loopTextColor: '#5a6a7a',
      activationBkgColor: '#d4eaf4',
      activationBorderColor: '#8cb8d0',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── S3: Amethyst ───────────────────────────────────────────────────────────
  // Bold purple/violet gradient palette — deep purple nodes, lighter lavender
  // children, white background, clean minimal lines
  amethyst: {
    label: 'Amethyst',
    description: 'Bold purple gradients',
    themeVariables: {
      primaryColor: '#7b1fa2',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#6a1b9a',
      lineColor: '#9c27b0',
      background: '#ffffff',
      mainBkg: '#7b1fa2',
      nodeBorder: '#6a1b9a',
      clusterBkg: '#f3e5f5',
      edgeLabelBackground: '#ffffff',
      titleColor: '#4a148c',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      secondaryColor: '#ce93d8',
      tertiaryColor: '#e1bee7',
      secondaryBorderColor: '#ab47bc',
      tertiaryBorderColor: '#ba68c8',
      secondaryTextColor: '#ffffff',
      tertiaryTextColor: '#4a148c',
      noteBkgColor: '#f3e5f5',
      noteTextColor: '#4a148c',
      noteBorderColor: '#ce93d8',
      // Sequence
      actorBkg: '#7b1fa2',
      actorBorder: '#6a1b9a',
      actorTextColor: '#ffffff',
      signalColor: '#9c27b0',
      signalTextColor: '#4a148c',
      labelBoxBkgColor: '#e1bee7',
      labelBoxBorderColor: '#ab47bc',
      labelTextColor: '#4a148c',
      loopTextColor: '#7b1fa2',
      activationBkgColor: '#e1bee7',
      activationBorderColor: '#9c27b0',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── S4: Neo Brutalist ──────────────────────────────────────────────────────
  // High contrast, electric colors — bold blue primary, neon yellow-green accents,
  // hot pink highlights, black for depth. Loud, unapologetic.
  neon: {
    label: 'Neon',
    description: 'Electric brutalist colors',
    themeVariables: {
      primaryColor: '#3333ff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#1a1a1a',
      lineColor: '#1a1a1a',
      background: '#ffffff',
      mainBkg: '#3333ff',
      nodeBorder: '#1a1a1a',
      clusterBkg: '#d4ff00',
      edgeLabelBackground: '#d4ff00',
      titleColor: '#1a1a1a',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      secondaryColor: '#ff44cc',
      tertiaryColor: '#d4ff00',
      secondaryBorderColor: '#1a1a1a',
      tertiaryBorderColor: '#1a1a1a',
      secondaryTextColor: '#ffffff',
      tertiaryTextColor: '#1a1a1a',
      noteBkgColor: '#d4ff00',
      noteTextColor: '#1a1a1a',
      noteBorderColor: '#1a1a1a',
      // Sequence
      actorBkg: '#3333ff',
      actorBorder: '#1a1a1a',
      actorTextColor: '#ffffff',
      signalColor: '#1a1a1a',
      signalTextColor: '#1a1a1a',
      labelBoxBkgColor: '#ff44cc',
      labelBoxBorderColor: '#1a1a1a',
      labelTextColor: '#ffffff',
      loopTextColor: '#1a1a1a',
      activationBkgColor: '#d4ff00',
      activationBorderColor: '#1a1a1a',
      sequenceNumberColor: '#ffffff',
    },
  },
}

export const CUSTOM_THEME_IDS = Object.keys(CUSTOM_THEME_PRESETS) as (keyof typeof CUSTOM_THEME_PRESETS)[]
