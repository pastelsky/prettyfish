import type { DiagramType } from '@/lib/detectDiagram'
import {
  GitBranch,
  Graph,
  Kanban,
  Gauge,
  Rows,
  Square,
} from '@phosphor-icons/react'

export function DiagramIcon({ type, className }: { type: DiagramType; className?: string }) {
  const iconProps = { weight: 'fill' as const, className }

  switch (type) {
    case 'flowchart':
      return <GitBranch {...iconProps} />
    case 'sequence':
      return <Rows {...iconProps} />
    case 'classDiagram':
      return <Square {...iconProps} />
    case 'stateDiagram':
      return <Graph {...iconProps} />
    case 'erDiagram':
      return <Kanban {...iconProps} />
    case 'gantt':
      return <Gauge {...iconProps} />
    case 'pie':
      return <Graph {...iconProps} />
    default:
      return <Square {...iconProps} />
  }
}
