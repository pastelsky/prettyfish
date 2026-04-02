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
    case 'class':
      return <Square {...iconProps} />
    case 'state':
      return <Graph {...iconProps} />
    case 'er':
      return <Kanban {...iconProps} />
    case 'gantt':
      return <Gauge {...iconProps} />
    case 'pie':
    case 'bar':
      return <Graph {...iconProps} />
    default:
      return <Square {...iconProps} />
  }
}
