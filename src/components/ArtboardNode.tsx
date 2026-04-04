/**
 * ArtboardNode — a React Flow custom node that renders a single Mermaid diagram.
 *
 * Each artboard is a draggable, named panel on the infinite canvas.
 * Clicking it selects it (opens the sidebar editor).
 */
import { memo, useCallback, useRef } from 'react'
import { NodeResizer, type Node } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useMermaidRenderer } from '../hooks/useMermaidRenderer'
import { resolveConfig } from '../types'
import type { Artboard, MermaidTheme, DiagramConfigOverrides } from '../types'
import { CUSTOM_THEME_PRESETS } from '../lib/themePresets'

// ── Data passed via React Flow node.data ─────────────────────────────────────

export interface ArtboardNodeData extends Record<string, unknown> {
  artboard: Artboard
  isActive: boolean
  mode: 'light' | 'dark'
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onDelete: (id: string) => void
  onOpenContextMenu: (id: string, x: number, y: number) => void
}

export type ArtboardFlowNode = Node<ArtboardNodeData, 'artboard'>

// ── Component ─────────────────────────────────────────────────────────────────

export const ArtboardNode = memo(function ArtboardNode({
  data,
  selected,
}: NodeProps<ArtboardFlowNode>) {
  const { artboard, isActive, mode, onSelect, onRename, onUpdateDescription, onOpenContextMenu } = data

  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const mermaidTheme: MermaidTheme = artboard.mermaidTheme ?? 'default'
  const diagramConfig = resolveConfig(
    CUSTOM_THEME_PRESETS[mermaidTheme]?.configOverrides as DiagramConfigOverrides | undefined,
    artboard.configOverrides,
  )

  const { svg, error: mermaidError } = useMermaidRenderer(artboard.code, mermaidTheme, diagramConfig)

  const handleClick = useCallback(() => {
    onSelect(artboard.id)
  }, [artboard.id, onSelect])

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(artboard.id)
    onOpenContextMenu(artboard.id, e.clientX, e.clientY)
  }, [artboard.id, onOpenContextMenu, onSelect])

  const handleNameBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim()
    if (trimmed && trimmed !== artboard.name) {
      onRename(artboard.id, trimmed)
    }
  }, [artboard.id, artboard.name, onRename])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).value = artboard.name;
      (e.target as HTMLInputElement).blur()
    }
  }, [artboard.name])

  const handleDescBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onUpdateDescription(artboard.id, e.target.value.trim())
  }, [artboard.id, onUpdateDescription])

  const handleDescKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).value = artboard.description ?? '';
      (e.target as HTMLInputElement).blur()
    }
  }, [artboard.description])

  const isHighlighted = isActive || selected
  const borderColor = isHighlighted
    ? 'var(--color-primary, #4f46e5)'
    : mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'

  const bgColor = mode === 'dark' ? 'oklch(0.18 0.015 260)' : '#ffffff'
  const labelColor = mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        width: artboard.width,
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
      {/* Node resizer (shows handles on select) */}
      <NodeResizer
        minWidth={320}
        minHeight={200}
        isVisible={selected === true}
        handleClassName="artboard-resize-handle"
        lineClassName="artboard-resize-line"
        lineStyle={{ borderColor: 'var(--color-primary, #4f46e5)' }}
        handleStyle={{
          background: 'var(--color-primary, #4f46e5)',
          borderColor: '#fff',
          width: 14,
          height: 14,
          borderWidth: 2,
        }}
      />

      {/* Artboard label bar — draggable (except the text input) */}
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
          ref={nameInputRef}
          defaultValue={artboard.name}
          key={artboard.name}
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
            color: mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
            fontFamily: 'inherit',
            minWidth: 0,
            cursor: 'text',
          }}
        />

        {/* Width — only visible when resizing (selected) */}
        {selected && (
          <span style={{ fontSize: 10, color: labelColor, flexShrink: 0, opacity: 0.6 }}>
            {artboard.width}px
          </span>
        )}
      </div>

      {/* Description — visible when active */}
      {isActive && (
        <div style={{ padding: '0 10px 3px', height: 16, marginTop: 0 }} className="nodrag">
          <input
            ref={descInputRef}
            defaultValue={artboard.description ?? ''}
            key={artboard.description ?? ''}
            onBlur={handleDescBlur}
            onKeyDown={handleDescKeyDown}
            placeholder="Add description…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 10,
              color: mode === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
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
          minHeight: 240,
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
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="artboard-svg-container"
          />
        ) : (
          <div style={{
            color: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
            fontSize: 13,
          }}>
            {artboard.code.trim() === '' ? 'Select a diagram' : 'Rendering…'}
          </div>
        )}
      </div>
    </div>
  )
})

ArtboardNode.displayName = 'ArtboardNode'
