import posthog from 'posthog-js'
import { cn } from '@/lib/utils'
import { DIAGRAM_TEMPLATES } from '@/lib/templates'
import type { AppMode } from '@/types'

interface TemplateGalleryProps {
  mode: AppMode
  onSelect: (code: string) => void
}

// ── Custom SVG icons per diagram type ─────────────────────────────────────────
// Each icon is a 24×24 SVG that visually represents the diagram structure

function FlowchartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="8" y="1" width="8" height="5" rx="1.5" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="12" y1="6" x2="12" y2="9" strokeWidth="1.4" stroke="currentColor"/>
      <polygon points="12,9 7,14 17,14" strokeWidth="1.4" stroke="currentColor" fill="none" strokeLinejoin="round"/>
      <line x1="7" y1="14" x2="4" y2="14" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="17" y1="14" x2="20" y2="14" strokeWidth="1.4" stroke="currentColor"/>
      <rect x="1" y="14" width="6" height="4.5" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
      <rect x="17" y="14" width="6" height="4.5" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
    </svg>
  )
}

function SequenceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Two lifelines */}
      <rect x="3" y="1" width="5" height="3.5" rx="1" strokeWidth="1.4" stroke="currentColor"/>
      <rect x="16" y="1" width="5" height="3.5" rx="1" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="5.5" y1="4.5" x2="5.5" y2="23" strokeWidth="1.2" stroke="currentColor" strokeDasharray="2 1.5"/>
      <line x1="18.5" y1="4.5" x2="18.5" y2="23" strokeWidth="1.2" stroke="currentColor" strokeDasharray="2 1.5"/>
      {/* Messages */}
      <line x1="5.5" y1="8" x2="18.5" y2="8" strokeWidth="1.4" stroke="currentColor"/>
      <polyline points="15.5,6.5 18.5,8 15.5,9.5" strokeWidth="1.4" stroke="currentColor" fill="none" strokeLinejoin="round"/>
      <line x1="18.5" y1="13" x2="5.5" y2="13" strokeWidth="1.4" stroke="currentColor" strokeDasharray="3 1.5"/>
      <polyline points="8.5,11.5 5.5,13 8.5,14.5" strokeWidth="1.4" stroke="currentColor" fill="none" strokeLinejoin="round"/>
      <line x1="5.5" y1="18" x2="18.5" y2="18" strokeWidth="1.4" stroke="currentColor"/>
      <polyline points="15.5,16.5 18.5,18 15.5,19.5" strokeWidth="1.4" stroke="currentColor" fill="none" strokeLinejoin="round"/>
    </svg>
  )
}

function ClassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="9" height="12" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="2" y1="6" x2="11" y2="6" strokeWidth="1.2" stroke="currentColor"/>
      <line x1="2" y1="9" x2="11" y2="9" strokeWidth="1.2" stroke="currentColor"/>
      <rect x="13" y="10" width="9" height="12" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="13" y1="14" x2="22" y2="14" strokeWidth="1.2" stroke="currentColor"/>
      <line x1="13" y1="17" x2="22" y2="17" strokeWidth="1.2" stroke="currentColor"/>
      {/* Inheritance arrow */}
      <line x1="13" y1="8" x2="11" y2="8" strokeWidth="1.2" stroke="currentColor"/>
      <polygon points="11,6.5 8.5,8 11,9.5" strokeWidth="1.2" stroke="currentColor" fill="white"/>
    </svg>
  )
}

function StateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="5" cy="5" r="2.5" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="19" cy="5" r="2.5" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="12" cy="14" r="3.5" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="12" cy="22" r="1.5" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="12" cy="22" r="2.5" strokeWidth="1.1" stroke="currentColor"/>
      {/* Transitions */}
      <path d="M7 6.5 Q10 10 8.5 12" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <polyline points="8.5,12 8.7,14 10.5,13.5" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <path d="M17 6.5 Q14 10 15.5 12" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <polyline points="15.5,12 15.3,14 13.5,13.5" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <line x1="12" y1="17.5" x2="12" y2="19.5" strokeWidth="1.3" stroke="currentColor"/>
    </svg>
  )
}

function ERIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="1" y="7" width="8" height="10" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="1" y1="11" x2="9" y2="11" strokeWidth="1.1" stroke="currentColor"/>
      <rect x="15" y="7" width="8" height="10" rx="1.2" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="15" y1="11" x2="23" y2="11" strokeWidth="1.1" stroke="currentColor"/>
      {/* Relationship line with crow's foot */}
      <line x1="9" y1="12" x2="15" y2="12" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="9" y1="10.5" x2="11" y2="12" strokeWidth="1.2" stroke="currentColor"/>
      <line x1="9" y1="13.5" x2="11" y2="12" strokeWidth="1.2" stroke="currentColor"/>
    </svg>
  )
}

function GanttIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="2" y1="2" x2="2" y2="22" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.3" stroke="currentColor"/>
      {/* Bars */}
      <rect x="4" y="4" width="10" height="3" rx="1" strokeWidth="1.3" stroke="currentColor" fill="currentColor" fillOpacity="0.2"/>
      <rect x="8" y="9" width="12" height="3" rx="1" strokeWidth="1.3" stroke="currentColor" fill="currentColor" fillOpacity="0.2"/>
      <rect x="4" y="14" width="7" height="3" rx="1" strokeWidth="1.3" stroke="currentColor" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  )
}

function PieIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="13" r="9" strokeWidth="1.4" stroke="currentColor"/>
      {/* Pie slices */}
      <path d="M12 13 L12 4" strokeWidth="1.3" stroke="currentColor"/>
      <path d="M12 13 L20.5 17.5" strokeWidth="1.3" stroke="currentColor"/>
      <path d="M12 13 L4 9.5" strokeWidth="1.3" stroke="currentColor"/>
      <path d="M12 13 L4 17.5" strokeWidth="1.3" stroke="currentColor"/>
    </svg>
  )
}

function GitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Main branch */}
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.4" stroke="currentColor"/>
      {/* Feature branch */}
      <path d="M7 12 Q9 6 14 6" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <line x1="14" y1="6" x2="20" y2="6" strokeWidth="1.3" stroke="currentColor"/>
      <path d="M20 6 Q22 9 22 12" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      {/* Commits on main */}
      <circle cx="5" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <circle cx="11" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <circle cx="17" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      {/* Commits on feature */}
      <circle cx="14" cy="6" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <circle cx="20" cy="6" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
    </svg>
  )
}

function MindMapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" strokeWidth="1.4" stroke="currentColor"/>
      {/* Branches */}
      <line x1="12" y1="9" x2="12" y2="3" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="12" cy="2" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="9.5" y1="10" x2="4" y2="7" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="3" cy="6.5" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="9.5" y1="14" x2="4" y2="17" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="3" cy="17.5" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="12" y1="15" x2="12" y2="21" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="12" cy="22" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="14.5" y1="10" x2="20" y2="7" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="21" cy="6.5" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
      <line x1="14.5" y1="14" x2="20" y2="17" strokeWidth="1.3" stroke="currentColor"/>
      <circle cx="21" cy="17.5" r="1.5" strokeWidth="1.3" stroke="currentColor"/>
    </svg>
  )
}

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" stroke="currentColor"/>
      <polyline points="20,10 22,12 20,14" strokeWidth="1.4" stroke="currentColor" fill="none" strokeLinejoin="round"/>
      {/* Events */}
      <circle cx="5" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <line x1="5" y1="10" x2="5" y2="6" strokeWidth="1.2" stroke="currentColor"/>
      <rect x="2" y="3" width="6" height="3" rx="0.8" strokeWidth="1.2" stroke="currentColor"/>
      <circle cx="12" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <line x1="12" y1="14" x2="12" y2="18" strokeWidth="1.2" stroke="currentColor"/>
      <rect x="9" y="18" width="6" height="3" rx="0.8" strokeWidth="1.2" stroke="currentColor"/>
      <circle cx="19" cy="12" r="2" strokeWidth="1.3" stroke="currentColor" fill="white"/>
      <line x1="19" y1="10" x2="19" y2="6" strokeWidth="1.2" stroke="currentColor"/>
      <rect x="16" y="3" width="6" height="3" rx="0.8" strokeWidth="1.2" stroke="currentColor"/>
    </svg>
  )
}

function QuadrantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Axes */}
      <line x1="2" y1="22" x2="2" y2="2" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="2" y1="22" x2="22" y2="22" strokeWidth="1.4" stroke="currentColor"/>
      <polyline points="1,4 2,2 3,4" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      <polyline points="20,21 22,22 20,23" strokeWidth="1.3" stroke="currentColor" fill="none"/>
      {/* Quadrant lines */}
      <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" stroke="currentColor" strokeDasharray="2 1.5"/>
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1" stroke="currentColor" strokeDasharray="2 1.5"/>
      {/* Points */}
      <circle cx="6" cy="7" r="1.5" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="17" cy="6" r="1.5" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="16" cy="17" r="1.5" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="6" cy="18" r="1.5" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="10" cy="9" r="1.5" fill="currentColor" fillOpacity="0.7"/>
    </svg>
  )
}

function XYChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="2" y1="21" x2="2" y2="3" strokeWidth="1.4" stroke="currentColor"/>
      <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.4" stroke="currentColor"/>
      {/* Line chart */}
      <polyline points="4,17 8,12 13,14 18,7 22,9" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinejoin="round"/>
      <circle cx="4" cy="17" r="1.2" fill="currentColor"/>
      <circle cx="8" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="13" cy="14" r="1.2" fill="currentColor"/>
      <circle cx="18" cy="7" r="1.2" fill="currentColor"/>
    </svg>
  )
}

// Icon map by template id
function KanbanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="6" height="18" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="16" y="2" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="4" y1="6" x2="6" y2="6" stroke="currentColor" strokeWidth="1"/>
      <line x1="4" y1="9" x2="6" y2="9" stroke="currentColor" strokeWidth="1"/>
      <line x1="4" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1"/>
      <line x1="11" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1"/>
      <line x1="11" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1"/>
      <line x1="18" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
function SankeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Left source bars */}
      <rect x="1" y="3" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="1" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="15" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.6"/>
      {/* Right target bars */}
      <rect x="20" y="2" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="20" y="12" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.5"/>
      {/* Flow bands */}
      <path d="M4 4 C10 4 14 3 20 3" stroke="currentColor" strokeWidth="3" strokeOpacity="0.4" fill="none"/>
      <path d="M4 8 C10 8 14 10 20 10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.4" fill="none"/>
      <path d="M4 11 C10 11 14 13 20 13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" fill="none"/>
      <path d="M4 13 C10 13 14 17 20 17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" fill="none"/>
      <path d="M4 16 C10 16 14 19 20 19" stroke="currentColor" strokeWidth="4" strokeOpacity="0.35" fill="none"/>
      <path d="M4 20 C10 20 14 22 20 22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" fill="none"/>
    </svg>
  )
}
function BlockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="20" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="2" y="10" width="9.5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="12.5" y="10" width="9.5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="2" y="17" width="20" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}
function PacketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="20" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="2" y="7" width="10" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="12" y="7" width="10" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="2" y="12" width="20" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="2" y="17" width="7" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="9" y="17" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="15" y="17" width="7" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}
function JourneyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Person/actor icon at top */}
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M9 8h6" stroke="currentColor" strokeWidth="1.2"/>
      {/* Horizontal journey path */}
      <line x1="2" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1"/>
      {/* Section dividers */}
      <line x1="9" y1="11" x2="9" y2="21" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4"/>
      <line x1="16" y1="11" x2="16" y2="21" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4"/>
      {/* Task dots with ratings (bars above/below line) */}
      <circle cx="4" cy="14" r="1.5" fill="currentColor" opacity="0.8"/>
      <line x1="4" y1="11" x2="4" y2="12.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12.5" cy="14" r="1.5" fill="currentColor" opacity="0.8"/>
      <line x1="12.5" y1="15.5" x2="12.5" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="19.5" cy="14" r="1.5" fill="currentColor" opacity="0.8"/>
      <line x1="19.5" y1="11" x2="19.5" y2="12.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function RequirementIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="13" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="7.5" y="15" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="6.5" y1="9" x2="10" y2="15" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="17.5" y1="9" x2="14" y2="15" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="4" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="4" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  )
}
function RadarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="12,2 21,9 18,20 6,20 3,9" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <polygon points="12,6 17.5,10.5 16,17 8,17 6.5,10.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <polygon points="12,8 15,12 14,16 10,16 9,12" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.15"/>
      <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="3" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="21" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="6" y1="20" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="18" y1="20" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  )
}

function ArchitectureIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cloud shape at top (API gateway / internet) */}
      <path d="M5 9 C5 7 6.5 6 8 6.5 C8.5 5 10 4 12 4 C14 4 15.5 5 16 6.5 C17.5 6 19 7 19 9 C19 10.5 17.8 11 16.5 11 L7.5 11 C6.2 11 5 10.5 5 9Z" stroke="currentColor" strokeWidth="1.2"/>
      {/* Connector line down */}
      <line x1="12" y1="11" x2="12" y2="14" stroke="currentColor" strokeWidth="1.2"/>
      {/* Middle server box */}
      <rect x="8" y="14" width="8" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      {/* Server rack lines */}
      <line x1="9.5" y1="15.5" x2="14.5" y2="15.5" stroke="currentColor" strokeWidth="0.7"/>
      <line x1="9.5" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="0.7"/>
      {/* Connector to DB cylinder */}
      <line x1="12" y1="18.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1.2"/>
      {/* DB cylinder */}
      <ellipse cx="12" cy="20.5" rx="4" ry="1.2" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="8" y1="20.5" x2="8" y2="22.5" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="16" y1="20.5" x2="16" y2="22.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M8 22.5 Q12 23.7 16 22.5" stroke="currentColor" strokeWidth="1.1" fill="none"/>
    </svg>
  )
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  flowchart: FlowchartIcon,
  sequence: SequenceIcon,
  classDiagram: ClassIcon,
  stateDiagram: StateIcon,
  erDiagram: ERIcon,
  gantt: GanttIcon,
  pie: PieIcon,
  gitgraph: GitIcon,
  mindmap: MindMapIcon,
  timeline: TimelineIcon,
  quadrant: QuadrantIcon,
  xychart: XYChartIcon,
  architecture: ArchitectureIcon,
  kanban: KanbanIcon,
  sankey: SankeyIcon,
  block: BlockIcon,
  packet: PacketIcon,
  journey: JourneyIcon,
  requirement: RequirementIcon,
  radar: RadarIcon,
}

export function TemplateGallery({ mode, onSelect }: TemplateGalleryProps) {
  const isDark = mode === 'dark'

  return (
    <div data-testid="template-gallery" className="flex flex-col h-full overflow-y-auto p-5 gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className={cn(
          'text-xl font-semibold tracking-tight',
          isDark ? 'text-zinc-100' : 'text-zinc-800',
        )}>
          Choose a diagram type
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {DIAGRAM_TEMPLATES.map((tmpl, i) => {
          const Icon = ICON_MAP[tmpl.id] ?? FlowchartIcon
          return (
            <button
              key={tmpl.id}
              data-testid="template-card"
              data-template-id={tmpl.id}
              data-template-name={tmpl.name}
              onClick={() => { posthog.capture('template_selected', { template_id: tmpl.id, template_name: tmpl.name }); onSelect(tmpl.code) }}
              className={cn(
                'group flex flex-col items-start gap-2.5 p-3 rounded-lg border text-left',
                'transition-all duration-200 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDark
                  ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-primary/30'
                  : 'bg-white/60 border-zinc-200/80 hover:border-primary/40 hover:bg-white',
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Icon */}
              <span className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                isDark
                  ? 'bg-white/[0.06] group-hover:bg-primary/20 text-zinc-400 group-hover:text-primary'
                  : 'bg-zinc-100 group-hover:bg-primary/10 text-zinc-500 group-hover:text-primary',
              )}>
                <Icon className="w-5 h-5" />
              </span>

              {/* Text */}
              <div className="flex flex-col gap-0.5 min-w-0 w-full">
                <span className={cn(
                  'text-xs font-semibold leading-tight truncate',
                  isDark ? 'text-zinc-200' : 'text-zinc-700',
                )}>
                  {tmpl.name}
                </span>
                <span className={cn(
                  'text-[10px] leading-tight',
                  isDark ? 'text-zinc-600' : 'text-zinc-400',
                )}>
                  {tmpl.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
