import { useState, useRef, useEffect, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { EditorView } from '@codemirror/view'
import { Label } from '@/components/ui/label'
import { Slider as SliderBase } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Palette, ArrowCounterClockwise, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { detectDiagramType } from '@/lib/detectDiagram'
import type { DiagramConfig, FlowchartCurve, MermaidLook } from '@/types'
import { DEFAULT_DIAGRAM_CONFIG } from '@/types'

// Typed wrapper
function Slider({ onValueChange, ...props }: Omit<React.ComponentProps<typeof SliderBase>, 'onValueChange'> & { onValueChange: (vals: number[]) => void }) {
  return <SliderBase {...props} onValueChange={(v) => onValueChange(Array.isArray(v) ? (v as number[]) : [v as number])} />
}

interface ConfigPanelProps {
  mermaidTheme: string
  onMermaidThemeChange: (theme: string) => void
  config: DiagramConfig
  code: string
  onChange: (config: DiagramConfig) => void
}

// Each curve with its label, an SVG path, and optional extra elements to visualize them.
// All drawn on a 52×38 canvas using 3 points to reveal characteristic shape:
// A=(6,34), peak=(26,6), B=(46,34) — a U shape that clearly differentiates the curves.
// Paths derived from actual d3 curve implementations used by Mermaid.
const CURVES: { value: FlowchartCurve; label: string; path: string; dots?: string }[] = [
  // Linear: straight lines through points — sharp angles
  { value: 'linear',    label: 'Linear',
    path: 'M6,34 L26,6 L46,34' },
  // Basis: B-spline — does NOT pass through control point, smoothed/flattened
  // Peak is pulled down to ~18 (not 6) — characteristic "undershoot"
  { value: 'basis',     label: 'Basis',
    path: 'M6,34 L9.3,30.7 C12.7,27.3 19.3,20.7 26,20.7 C32.7,20.7 39.3,27.3 42.7,30.7 L46,34' },
  // Cardinal: passes THROUGH points, can overshoot — tension 0 = max overshoot
  { value: 'cardinal',  label: 'Cardinal',
    path: 'M6,34 C6,34 19.3,6 26,6 C32.7,6 46,34 46,34' },
  // CatmullRom (alpha=0.5): centripetal, passes through, smoother than cardinal
  { value: 'catmullRom',label: 'Catmull',
    path: 'M6,34 C10,24 18,6 26,6 C34,6 42,24 46,34' },
  // MonotoneX: monotone cubic, reaches peak but with gradual S-curve approach
  { value: 'monotoneX', label: 'Monotone',
    path: 'M6,34 C12.7,24 19.3,6 26,6 C32.7,6 39.3,24 46,34' },
  // Step: horizontal to midpoint, then vertical, then horizontal (step at midpoint x)
  { value: 'step',      label: 'Step',
    path: 'M6,34 H26 V6 H46' },
  // StepBefore: vertical FIRST at start x, then horizontal to end
  { value: 'stepBefore',label: 'Before',
    path: 'M6,34 V6 H46' },
  // StepAfter: horizontal to end x FIRST, then vertical at end
  { value: 'stepAfter', label: 'After',
    path: 'M6,34 H46 V6' },
]

// Curated Google Fonts collection — these all load from the Google Fonts link in index.html
// or from the system. Each has a googleFamily for font subsetting on export.
const FONTS: { value: string; label: string; preview: string; googleFamily?: string }[] = [
  { value: '"DM Sans", system-ui, sans-serif', label: 'DM Sans', preview: 'DM Sans', googleFamily: 'DM+Sans' },
  { value: '"Instrument Serif", Georgia, serif', label: 'Instrument Serif', preview: 'Instrument Serif', googleFamily: 'Instrument+Serif' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono', preview: 'JetBrains Mono', googleFamily: 'JetBrains+Mono' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'System UI', preview: 'System' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia', preview: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier', preview: 'Courier New' },
]

export function ConfigPanel({ config, code, onChange, mermaidTheme, onMermaidThemeChange }: ConfigPanelProps) {
  const diagramType = detectDiagramType(code)
  const isBaseTheme = mermaidTheme === 'base'
  const isDarkEditor = mermaidTheme === 'dark'
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual')
  // In JSON mode: track user-edited text separately; in visual mode: derive from config
  const [jsonUserText, setJsonUserText] = useState<string | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // The effective JSON text shown in the editor:
  // - visual mode: always reflect latest config (no stale state)
  // - json mode: user's edits (or latest config if they just switched)
  const jsonText = viewMode === 'json' && jsonUserText !== null
    ? jsonUserText
    : JSON.stringify(config, null, 2)

  const handleSwitchToJson = useCallback(() => {
    setJsonUserText(JSON.stringify(config, null, 2))
    setJsonError(null)
    setViewMode('json')
  }, [config])

  const handleSwitchToVisual = useCallback(() => {
    setJsonUserText(null)
    setJsonError(null)
    setViewMode('visual')
  }, [])

  const handleJsonChange = useCallback((val: string) => {
    setJsonUserText(val)
    try {
      const parsed = JSON.parse(val)
      onChange(parsed as DiagramConfig)
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON')
    }
  }, [onChange])

  // Use useCallback so these helpers don't get re-created on every render (rule 5.8)
  const set = useCallback(<K extends keyof DiagramConfig>(key: K, value: DiagramConfig[K]) => {
    onChange({ ...config, [key]: value })
  }, [config, onChange])
  const setFlowchart = useCallback(<K extends keyof DiagramConfig['flowchart']>(key: K, value: DiagramConfig['flowchart'][K]) => {
    onChange({ ...config, flowchart: { ...config.flowchart, [key]: value } })
  }, [config, onChange])
  const setSequence = useCallback(<K extends keyof DiagramConfig['sequence']>(key: K, value: DiagramConfig['sequence'][K]) => {
    onChange({ ...config, sequence: { ...config.sequence, [key]: value } })
  }, [config, onChange])
  const setGantt = useCallback(<K extends keyof DiagramConfig['gantt']>(key: K, value: DiagramConfig['gantt'][K]) => {
    onChange({ ...config, gantt: { ...config.gantt, [key]: value } })
  }, [config, onChange])
  const setThemeVar = useCallback(<K extends keyof DiagramConfig['themeVariables']>(key: K, value: string) => {
    onChange({ ...config, themeVariables: { ...config.themeVariables, [key]: value } })
  }, [config, onChange])
  function sliderVal(vals: number[]): number { return vals[0] ?? 0 }

  return (
    <div className="flex flex-col h-full">

      {/* ── Visual / JSON toggle ── */}
      <div className="flex gap-0.5 p-1 mx-3 my-2 rounded-lg shrink-0 border border-border/50 bg-muted/40">
        {(['visual', 'json'] as const).map((m) => (
          <button
            key={m}
            data-testid={m === viewMode ? 'config-view-mode-active' : 'config-view-mode-button'}
            data-view-mode={m}
            onClick={() => m === 'json' ? handleSwitchToJson() : handleSwitchToVisual()}
            className={cn(
              'flex-1 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize',
              viewMode === m
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            )}
          >
            {m === 'visual' ? 'Visual' : 'JSON'}
          </button>
        ))}
      </div>

      {/* ── JSON editor ── */}
      {viewMode === 'json' && (
        <div className="flex flex-col flex-1 min-h-0">
          <CodeMirror
            value={jsonText}
            onChange={handleJsonChange}
            extensions={[json(), EditorView.lineWrapping]}
            theme={isDarkEditor ? githubDark : githubLight}
            height="100%"
            style={{ height: '100%', fontSize: '11.5px' }}
            basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, bracketMatching: true, closeBrackets: true }}
          />
          {jsonError && (
            <div className="shrink-0 px-3.5 py-2 text-xs font-medium text-red-500 border-t border-red-500/20 bg-red-500/5 font-mono">
              {jsonError}
            </div>
          )}
        </div>
      )}

      {/* ── Visual editor ── */}
      {viewMode === 'visual' && (
      <div className="flex flex-col gap-0 text-sm overflow-y-auto flex-1">

      {/* ── Appearance ── */}
      <Section title="Appearance" first>
        <LookPicker value={config.look} onChange={(v) => set('look', v as MermaidLook)} />

        {/* Font selector — dropdown with preview */}
        <Row label="Font Family">
          <FontSelect
            value={config.fontFamily}
            onChange={(v) => {
              set('fontFamily', v)
              // Also update themeVariables.fontFamily so mermaid picks it up
              onChange({ ...config, fontFamily: v, themeVariables: { ...config.themeVariables, fontFamily: v } })
            }}
          />
        </Row>

        {/* Font size — slider with number input */}
        <Row label="Font Size">
          <div className="flex items-center gap-3">
            <Slider min={10} max={24} step={1} value={[config.fontSize]}
              onValueChange={(vals) => set('fontSize', sliderVal(vals))} className="flex-1" />
            <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">{config.fontSize}px</span>
          </div>
        </Row>
      </Section>

      <Divider />

      {/* ── Colors ── */}
      <Section title="Colors">
        {!isBaseTheme ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 -mt-1 mb-1">
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              Custom colors only work with the <strong>Base</strong> theme.
            </p>
            <button
              data-testid="config-switch-to-base-button"
              onClick={() => onMermaidThemeChange('base')}
              className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 cursor-pointer hover:no-underline"
            >
              Switch to Base →
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground -mt-1 mb-1 leading-relaxed">
            Using <strong className="text-foreground/70">Base</strong> theme — colors are customizable.
          </p>
        )}
        <div className={cn('flex flex-col gap-2', !isBaseTheme && 'opacity-50 pointer-events-none')}>
          <div className="grid grid-cols-3 gap-2">
            <ColorSwatch label="Primary" value={config.themeVariables.primaryColor}
              onChange={(v) => { setThemeVar('primaryColor', v); setThemeVar('mainBkg', v); setThemeVar('nodeBorder', v) }} />
            <ColorSwatch label="Text" value={config.themeVariables.primaryTextColor}
              onChange={(v) => setThemeVar('primaryTextColor', v)} />
            <ColorSwatch label="Lines" value={config.themeVariables.lineColor}
              onChange={(v) => setThemeVar('lineColor', v)} />
            <ColorSwatch label="Cluster" value={config.themeVariables.clusterBkg}
              onChange={(v) => setThemeVar('clusterBkg', v)} />
            <ColorSwatch label="Labels" value={config.themeVariables.edgeLabelBackground}
              onChange={(v) => setThemeVar('edgeLabelBackground', v)} />
            <ColorSwatch label="Title" value={config.themeVariables.titleColor}
              onChange={(v) => setThemeVar('titleColor', v)} />
          </div>
        </div>
      </Section>

      {/* ── Flowchart ── */}
      {diagramType === 'flowchart' && (
        <>
          <Divider />
          <Section title="Flowchart">
            <div className="px-0 py-1">
              <p className="text-xs text-muted-foreground font-medium mb-2">Edge Curve</p>
              <CurveCardGrid
                value={config.flowchart.curve}
                onChange={(v) => setFlowchart('curve', v as FlowchartCurve)}
              />
            </div>
            <SliderRow label="Node Gap" value={config.flowchart.nodeSpacing} unit="px"
              min={10} max={150} step={5}
              onChange={(v) => setFlowchart('nodeSpacing', v)} />
            <SliderRow label="Rank Gap" value={config.flowchart.rankSpacing} unit="px"
              min={10} max={150} step={5}
              onChange={(v) => setFlowchart('rankSpacing', v)} />
            <SliderRow label="Padding" value={config.flowchart.padding} unit="px"
              min={0} max={50} step={2}
              onChange={(v) => setFlowchart('padding', v)} />
          </Section>
        </>
      )}

      {/* ── Sequence ── */}
      {diagramType === 'sequence' && (
        <>
          <Divider />
          <Section title="Sequence">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">Show Numbers</Label>
              <Switch checked={config.sequence.showSequenceNumbers}
                onCheckedChange={(v) => setSequence('showSequenceNumbers', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">Mirror Actors</Label>
              <Switch checked={config.sequence.mirrorActors}
                onCheckedChange={(v) => setSequence('mirrorActors', v)} />
            </div>
            <SliderRow label="Actor Width" value={config.sequence.width} unit="px"
              min={80} max={300} step={10}
              onChange={(v) => setSequence('width', v)} />
            <SliderRow label="Msg Margin" value={config.sequence.messageMargin} unit="px"
              min={10} max={100} step={5}
              onChange={(v) => setSequence('messageMargin', v)} />
            <SliderRow label="Actor Margin" value={config.sequence.actorMargin} unit="px"
              min={10} max={150} step={5}
              onChange={(v) => setSequence('actorMargin', v)} />
          </Section>
        </>
      )}

      {/* ── Gantt ── */}
      {diagramType === 'gantt' && (
        <>
          <Divider />
          <Section title="Gantt">
            <SliderRow label="Bar Height" value={config.gantt.barHeight} unit="px"
              min={10} max={60} step={2}
              onChange={(v) => setGantt('barHeight', v)} />
            <SliderRow label="Bar Gap" value={config.gantt.barGap} unit="px"
              min={0} max={20} step={1}
              onChange={(v) => setGantt('barGap', v)} />
            <SliderRow label="Top Pad" value={config.gantt.topPadding} unit="px"
              min={10} max={100} step={5}
              onChange={(v) => setGantt('topPadding', v)} />
            <Row label="Axis Format">
              <input
                type="text"
                value={config.gantt.axisFormat}
                onChange={(e) => setGantt('axisFormat', e.target.value)}
                className="w-full text-xs rounded-md border border-border/60 bg-background px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="%Y-%m-%d"
              />
            </Row>
          </Section>
        </>
      )}

      {/* ── Info sections ── */}
      {(diagramType === 'classDiagram' || diagramType === 'erDiagram') && (
        <>
          <Divider />
          <Section title={diagramType === 'classDiagram' ? 'Class Diagram' : 'ER Diagram'}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Layout is controlled by the diagram syntax. Global settings above still apply.
            </p>
          </Section>
        </>
      )}

      {(diagramType === 'pie' || diagramType === 'mindmap' || diagramType === 'timeline' || diagramType === 'quadrant' || diagramType === 'xychart' || diagramType === 'gitgraph' || diagramType === 'stateDiagram') && (
        <>
          <Divider />
          <Section title="Options">
            <p className="text-xs text-muted-foreground leading-relaxed">
              No additional layout options for this diagram type.
            </p>
          </Section>
        </>
      )}

      <Divider />

      <div className="px-4 py-3">
        <Button
          data-testid="config-reset-defaults-button"
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 rounded-md gap-1.5 bg-background"
          onClick={() => onChange(DEFAULT_DIAGRAM_CONFIG)}
        >
          <ArrowCounterClockwise className="w-3 h-3" /> Reset to Defaults
        </Button>
      </div>
      </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-3 px-4 py-3', first && 'pt-3')}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      {children}
    </div>
  )
}

function SliderRow({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{value}{unit}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? min)} className="w-full" />
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/40 mx-4" />
}

// ── Font selector ──

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Stable toggle using functional updater (rule 5.11)
  const toggleOpen = useCallback(() => setOpen(o => !o), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    // Passive listener — no preventDefault needed (rule 4.2)
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = FONTS.find(f => f.value === value) ?? FONTS[0]

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="config-font-select-trigger"
        onClick={toggleOpen}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border/60',
          'text-xs cursor-pointer transition-colors',
          'hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary',
          open && 'border-primary/40 ring-1 ring-primary',
        )}
      >
        <span style={{ fontFamily: current.value }} className="truncate">{current.label}</span>
        <CaretDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border/60',
          'bg-popover py-1 overflow-hidden animate-fade-up',
        )}>
          {FONTS.map((f) => (
            <button
              key={f.value}
              data-testid={value === f.value ? 'config-font-option-active' : 'config-font-option'}
              data-font-label={f.label}
              onClick={() => { onChange(f.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors',
                'hover:bg-muted',
                value === f.value && 'bg-primary/10 text-primary font-medium',
              )}
            >
              <span style={{ fontFamily: f.value }}>{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Color swatch with popover picker ──

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [localColor, setLocalColor] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  // Stable toggle using functional updater (rule 5.11)
  const toggleOpen = useCallback(() => setOpen(o => !o), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    // Passive listener — no preventDefault needed (rule 4.2)
    document.addEventListener('mousedown', handler, { passive: true })
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleChange = (color: string) => {
    setLocalColor(color)
    onChange(color)
  }

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="config-color-swatch"
        data-color-label={label}
        onClick={() => {
          if (!open) setLocalColor(value)
          toggleOpen()
        }}
        className={cn(
          'flex flex-col items-center gap-1.5 p-2 rounded-md border border-border/40',
          'cursor-pointer transition-colors hover:border-border/80 w-full',
          open && 'border-primary/40',
        )}
      >
        <div
          className="w-full h-6 rounded-md border border-border/30"
          style={{ backgroundColor: value }}
        />
        <span className="text-[10px] text-muted-foreground truncate w-full text-center">{label}</span>
      </button>

      {open && (
        <div className={cn(
          'absolute left-0 top-full mt-1 z-50 rounded-lg border border-border/60',
          'bg-popover p-3 animate-fade-up',
        )} style={{ width: '200px' }}>
          <HexColorPicker color={localColor} onChange={handleChange} style={{ width: '100%', height: '140px' }} />
          <div className="flex items-center gap-2 mt-2">
            <Palette className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={localColor}
              onChange={(e) => {
                const v = e.target.value
                setLocalColor(v)
                if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
              }}
              className="flex-1 text-xs font-mono px-2 py-1 rounded-md border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Curve card grid ──

function CurveCardGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {CURVES.map((curve) => {
        const active = value === curve.value
        return (
          <button
            key={curve.value}
            onClick={() => onChange(curve.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all cursor-pointer',
              'hover:border-primary/50 hover:bg-primary/5',
              active
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-border/60 bg-background/50 text-muted-foreground',
            )}
            title={curve.label}
          >
            <svg
              viewBox="0 0 52 40"
              className="w-full h-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* The curve path */}
              <path
                d={curve.path}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={active ? 'stroke-primary' : 'stroke-muted-foreground/60'}
              />
              {/* Anchor dots at A, peak, B */}
              <circle cx="6"  cy="34" r="2"   className={active ? 'fill-primary' : 'fill-muted-foreground/60'} />
              <circle cx="26" cy="6"  r="1.5" className={active ? 'fill-primary/50' : 'fill-muted-foreground/30'} />
              <circle cx="46" cy="34" r="2"   className={active ? 'fill-primary' : 'fill-muted-foreground/60'} />
            </svg>
            <span className="text-[9px] font-medium leading-none tracking-wide">{curve.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Look / Style picker ──

function LookPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    {
      value: 'classic',
      label: 'Classic',
      // SVG: clean sharp rect node with straight arrow
      svg: (
        <svg viewBox="0 0 60 36" fill="none" className="w-full h-5">
          <rect x="4"  y="13" width="18" height="10" rx="1.5" strokeWidth="1.4" stroke="currentColor"/>
          <line x1="22" y1="18" x2="34" y2="18" strokeWidth="1.4" stroke="currentColor"/>
          <polyline points="31,15 34,18 31,21" strokeWidth="1.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="34" y="13" width="22" height="10" rx="1.5" strokeWidth="1.4" stroke="currentColor"/>
          {/* diagonal tick marks for "sharp" feel */}
          <line x1="8"  y1="13" x2="8"  y2="23" strokeWidth="0.5" stroke="currentColor" strokeOpacity="0.3"/>
          <line x1="14" y1="13" x2="14" y2="23" strokeWidth="0.5" stroke="currentColor" strokeOpacity="0.3"/>
        </svg>
      ),
    },
    {
      value: 'handDrawn',
      label: 'Sketch',
      // SVG: wobbly hand-drawn rect with sketchy arrow — uses slightly jittered paths
      svg: (
        <svg viewBox="0 0 60 36" fill="none" className="w-full h-5">
          {/* Sketchy left box */}
          <path d="M5,14 C4.8,13.9 21.5,13.2 22,13.5 C22.3,16 22.1,22.5 22,23 C18,23.3 5.5,23.1 5,22.8 C4.7,19.5 4.9,14.5 5,14 Z"
            strokeWidth="1.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Sketchy arrow */}
          <path d="M22,18 C25,17.5 31,18.5 34,18" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
          <path d="M31,15.5 C32.5,16.5 34,18 31.5,20.5" strokeWidth="1.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Sketchy right box */}
          <path d="M34.5,13.5 C38,13 54.5,13.5 55,14 C55.2,17 55,23 55,23.2 C51,23.5 35,23 34.5,23 C34.2,19.5 34.3,14 34.5,13.5 Z"
            strokeWidth="1.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="flex gap-1.5 -mt-1 mb-1">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            data-testid={active ? 'config-look-option-active' : 'config-look-option'}
            data-look-value={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-all cursor-pointer',
              'hover:border-primary/50 hover:bg-primary/5',
              active
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-border/60 bg-background/50 text-muted-foreground',
            )}
          >
            <div className="w-10 shrink-0">{opt.svg}</div>
            <span className="text-xs font-medium leading-none">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-md border border-border/60 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
