/**
 * DiagramNode — a React Flow custom node that renders a single Mermaid diagram.
 *
 * Each diagram is a draggable, named panel on the infinite canvas.
 * Clicking it selects it (opens the sidebar editor).
 */
import { memo, useCallback, useEffect, useRef } from 'react'
import { NodeResizeControl, type Node } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { Diagram } from '@/types'

// ── Data passed via React Flow node.data ─────────────────────────────────────

export interface DiagramNodeData extends Record<string, unknown> {
  diagram: Diagram
  isActive: boolean
  mode: 'light' | 'dark'
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onDelete: (id: string) => void
  onOpenContextMenu: (id: string, x: number, y: number) => void
}

export type DiagramFlowNode = Node<DiagramNodeData, 'diagram'>

// ── Component ─────────────────────────────────────────────────────────────────

export const DiagramNode = memo(function DiagramNode({
  data,
  selected,
}: NodeProps<DiagramFlowNode>) {
  const { diagram, isActive, mode, onSelect, onRename, onUpdateDescription, onOpenContextMenu } = data

  // Each diagram now owns its own render record; selection does not move render ownership.
  const svg = diagram.render?.svg ?? ''
  const mermaidError = diagram.render?.error ?? null
  const isRendering = diagram.render?.status === 'queued' || diagram.render?.status === 'rendering'

  const handleClick = useCallback(() => {
    onSelect(diagram.id)
  }, [diagram.id, onSelect])

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(diagram.id)
    onOpenContextMenu(diagram.id, e.clientX, e.clientY)
  }, [diagram.id, onOpenContextMenu, onSelect])

  // Long-press for touch devices (fires context menu after 500 ms)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    longPressTriggeredRef.current = false
    // Capture the pointer so we still get pointerup/cancel even if touch moves
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onSelect(diagram.id)
      onOpenContextMenu(diagram.id, e.clientX, e.clientY)
    }, 500)
  }, [diagram.id, onOpenContextMenu, onSelect])

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // Clean up timer on unmount
  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }, [])

  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const handleNameBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim()
    if (trimmed && trimmed !== diagram.name) {
      onRename(diagram.id, trimmed)
    }
  }, [diagram.id, diagram.name, onRename])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).value = diagram.name;
      (e.target as HTMLInputElement).blur()
    }
  }, [diagram.name])

  const handleDescBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onUpdateDescription(diagram.id, e.target.value.trim())
  }, [diagram.id, onUpdateDescription])

  const handleDescKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).value = diagram.description ?? '';
      (e.target as HTMLInputElement).blur()
    }
  }, [diagram.description])

  const isHighlighted = isActive || selected
  const svgWidth = diagram.render?.svgWidth ?? null
  const svgHeight = diagram.render?.svgHeight ?? null
  const previewAvailableWidth = Math.max(0, diagram.width - 32)
  const renderedPreviewHeight = svgWidth && svgHeight
    ? Math.ceil(svgHeight * Math.min(1, previewAvailableWidth / svgWidth))
    : null
  const previewMinHeight = Math.max(240, (renderedPreviewHeight ?? 0) + 8)
  const borderColor = isHighlighted
    ? 'var(--color-primary, #4f46e5)'
    : mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'

  const bgColor = mode === 'dark' ? 'oklch(0.18 0.015 260)' : '#ffffff'
  const labelColor = mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(17,24,39,0.66)'

  return (
    <div
      data-testid="diagram-node"
      data-diagram-id={diagram.id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        width: diagram.width,
        minHeight: 300,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHighlighted
          ? `0 0 0 3px ${mode === 'dark' ? 'rgba(99,102,241,0.32)' : 'rgba(79,70,229,0.16)'}, 0 3px 16px rgba(0,0,0,0.09)`
          : '0 1px 8px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'grab',
      }}
    >
      {/* Corner-only proportional scaling so the affordance matches resizing the rendered diagram itself. */}
      {selected === true && (
        <>
          <NodeResizeControl
            minWidth={320}
            // keepAspectRatio — disabled: Mermaid diagrams have content-driven height
            position="top-left"
            className="diagram-resize-handle"
            style={{
              background: 'var(--color-primary, #4f46e5)',
              borderColor: '#fff',
              width: 14,
              height: 14,
              borderWidth: 2,
            }}
          />
          <NodeResizeControl
            minWidth={320}
            // keepAspectRatio — disabled: Mermaid diagrams have content-driven height
            position="top-right"
            className="diagram-resize-handle"
            style={{
              background: 'var(--color-primary, #4f46e5)',
              borderColor: '#fff',
              width: 14,
              height: 14,
              borderWidth: 2,
            }}
          />
          <NodeResizeControl
            minWidth={320}
            // keepAspectRatio — disabled: Mermaid diagrams have content-driven height
            position="bottom-left"
            className="diagram-resize-handle"
            style={{
              background: 'var(--color-primary, #4f46e5)',
              borderColor: '#fff',
              width: 14,
              height: 14,
              borderWidth: 2,
            }}
          />
          <NodeResizeControl
            minWidth={320}
            // keepAspectRatio — disabled: Mermaid diagrams have content-driven height
            position="bottom-right"
            className="diagram-resize-handle"
            style={{
              background: 'var(--color-primary, #4f46e5)',
              borderColor: '#fff',
              width: 14,
              height: 14,
              borderWidth: 2,
            }}
          />
        </>
      )}

      {/* Diagram label bar — draggable (except the text input) */}
      <div
        style={{
          padding: '5px 10px 1px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          userSelect: 'none',
        }}
      >
        <input
          data-testid="diagram-name-input"
          aria-label="Diagram name"
          title="Diagram name"
          ref={nameInputRef}
          defaultValue={diagram.name}
          key={diagram.name}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          className="nodrag"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 11,
            fontWeight: 600,
            color: mode === 'dark' ? 'rgba(255,255,255,0.76)' : 'rgba(17,24,39,0.72)',
            fontFamily: 'inherit',
            minWidth: 0,
            cursor: 'text',
          }}
        />

        {/* Width — only visible when resizing (selected) */}
        {selected && (
          <span style={{ fontSize: 10, color: labelColor, flexShrink: 0 }}>
            {diagram.width}px
          </span>
        )}
      </div>

      {/* Description — visible when active */}
      {isActive && (
        <div style={{ padding: '0 10px 3px', height: 16, marginTop: 0, display: 'flex' }} className="nodrag">
          <input
            data-testid="diagram-description-input"
            aria-label="Diagram description"
            title="Diagram description"
            ref={descInputRef}
            defaultValue={diagram.description ?? ''}
            key={diagram.description ?? ''}
            onBlur={handleDescBlur}
            onKeyDown={handleDescKeyDown}
            placeholder="Add description…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 10,
              fontWeight: 500,
              color: mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(17,24,39,0.66)',
              fontFamily: 'inherit',
              cursor: 'text',
            }}
          />
        </div>
      )}

      {/* Diagram preview area */}
      <div
        style={{
          flex: 1,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: previewMinHeight,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {mermaidError ? (
          <div style={{
            color: '#ef4444',
            fontSize: 11,
            fontFamily: 'monospace',
            padding: 12,
            background: mode === 'dark' ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
            borderRadius: 6,
            border: '1px solid rgba(239,68,68,0.2)',
            width: '100%',
            maxHeight: 160,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            ⚠ {mermaidError.message}
            {mermaidError.line != null && ` (line ${mermaidError.line})`}
          </div>
        ) : svg ? (
          <>
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}
              className="diagram-svg-container"
            />
            {isRendering && (
              <div style={{
                position: 'absolute',
                right: 10,
                bottom: 10,
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 999,
                background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
              }}>
                Rendering…
              </div>
            )}
          </>
        ) : (
          <div
            aria-hidden="true"
            style={{
              color: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
              fontSize: 13,
            }}
          >
            {diagram.code.trim() === '' ? '' : 'Rendering…'}
          </div>
        )}
      </div>
    </div>
  )
})

DiagramNode.displayName = 'DiagramNode'
