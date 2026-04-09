/**
 * InfiniteCanvas — React Flow-based infinite canvas.
 *
 * Each diagram in the current page becomes a React Flow node.
 * Supports pan, zoom, drag-to-reposition, click-to-select, minimap.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeChange,
  type OnNodesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useIsMobile } from '@/hooks/useIsMobile'

import { DiagramNode } from './DiagramNode'
import type { DiagramNodeData } from './DiagramNode'
import type { Diagram, DiagramPage, AppMode } from '@/types'
import { pfDebug } from '@/lib/debug'

// ── Node types ────────────────────────────────────────────────────────────────

import type { NodeTypes } from '@xyflow/react'
const nodeTypes: NodeTypes = { diagram: DiagramNode as NodeTypes[string] }

// ── Helper: page diagrams → RF nodes ────────────────────────────────────────

function diagramsToNodes(
  diagrams: Diagram[],
  activeDiagramId: string | null,
  mode: AppMode,
  onSelect: (id: string) => void,
  onRename: (id: string, name: string) => void,
  onUpdateDesc: (id: string, description: string) => void,
  onDelete: (id: string) => void,
  onOpenContextMenu: (id: string, x: number, y: number) => void,
): Node[] {
  return diagrams.map((ab) => ({
    id: ab.id,
    type: 'diagram',
    position: { x: ab.x, y: ab.y },
    data: {
      diagram: ab,
      isActive: ab.id === activeDiagramId,
      mode,
      onSelect,
      onRename,
      onUpdateDescription: onUpdateDesc,
      onDelete,
      onOpenContextMenu,
    } satisfies DiagramNodeData,
    selected: ab.id === activeDiagramId,
    // Provide initial measured dimensions so RF doesn't hide the node
    measured: { width: ab.width, height: 480 },
    selectable: true,
    draggable: true,
  }))
}

// ── Inner canvas (needs ReactFlowProvider context) ────────────────────────────

interface InnerCanvasProps {
  page: DiagramPage
  mode: AppMode
  onSelectDiagram: (id: string) => void
  onRenameDiagram: (id: string, name: string) => void
  onUpdateDiagramDescription: (id: string, description: string) => void
  onDeleteDiagram: (id: string) => void
  onOpenDiagramContextMenu: (id: string, x: number, y: number) => void
  onOpenCanvasContextMenu: (x: number, y: number) => void
  onMoveDiagram: (id: string, x: number, y: number) => void
  onResizeDiagram: (id: string, width: number) => void
  onRegisterFocus: (fn: (id: string) => void) => void
}

function InnerCanvas({
  page,
  mode,
  onSelectDiagram,
  onRenameDiagram,
  onUpdateDiagramDescription,
  onDeleteDiagram,
  onOpenDiagramContextMenu,
  onOpenCanvasContextMenu,
  onMoveDiagram,
  onResizeDiagram,
  onRegisterFocus,
}: InnerCanvasProps) {
  const prevPageId = useRef(page.id)
  const pageFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setViewport } = useReactFlow()

  const focusDiagramViewport = useCallback((diagram: Diagram, options?: { duration?: number }) => {
    const container = document.querySelector('.react-flow')
    if (!container) return
    const rect = container.getBoundingClientRect()

    const sidebarWidth = document.querySelector('[data-sidebar-panel]')
      ? Math.min(480, rect.width * 0.35)
      : 0
    const availableWidth = rect.width - sidebarWidth
    const availableHeight = rect.height

    const escapedId = typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(diagram.id) : diagram.id
    const nodeEl = document.querySelector(`[data-diagram-id="${escapedId}"]`) as HTMLElement | null
    const diagramHeight = nodeEl?.offsetHeight ?? 480
    const zoom = Math.min(1, Math.min(
      (availableWidth * 0.8) / diagram.width,
      (availableHeight * 0.8) / diagramHeight,
    ))

    const centerX = sidebarWidth + availableWidth / 2
    const centerY = availableHeight / 2
    const x = centerX - (diagram.x + diagram.width / 2) * zoom
    const y = centerY - (diagram.y + diagramHeight / 2) * zoom

    setViewport({ x, y, zoom }, options?.duration ? { duration: options.duration } : undefined)
  }, [setViewport])

  const focusDiagramInViewport = useCallback((id: string) => {
    pfDebug('canvas', 'focusDiagramInViewport requested', { pageId: page.id, diagramId: id })
    const ab = page.diagrams.find(a => a.id === id)
    if (!ab) return
    focusDiagramViewport(ab, { duration: 300 })
  }, [focusDiagramViewport, page.id, page.diagrams])

  useEffect(() => {
    onRegisterFocus(focusDiagramInViewport)
  }, [focusDiagramInViewport, onRegisterFocus])

  // Stable callback refs — update synchronously to avoid stale closures
  const selectRef = useRef(onSelectDiagram)
  const renameRef = useRef(onRenameDiagram)
  const updateDescRef = useRef(onUpdateDiagramDescription)
  const deleteRef = useRef(onDeleteDiagram)
  const contextMenuRef = useRef(onOpenDiagramContextMenu)
  // Keep refs current — use useLayoutEffect to avoid react-compiler "ref during render" error
  useLayoutEffect(() => { selectRef.current = onSelectDiagram }, [onSelectDiagram])
  useLayoutEffect(() => { renameRef.current = onRenameDiagram }, [onRenameDiagram])
  useLayoutEffect(() => { updateDescRef.current = onUpdateDiagramDescription }, [onUpdateDiagramDescription])
  useLayoutEffect(() => { deleteRef.current = onDeleteDiagram }, [onDeleteDiagram])
  useLayoutEffect(() => { contextMenuRef.current = onOpenDiagramContextMenu }, [onOpenDiagramContextMenu])

  const stableSelect = useCallback((id: string) => selectRef.current(id), [])
  const stableRename = useCallback((id: string, name: string) => renameRef.current(id, name), [])
  const stableUpdateDesc = useCallback((id: string, desc: string) => updateDescRef.current(id, desc), [])
  const stableDelete = useCallback((id: string) => deleteRef.current(id), [])
  const stableOpenContextMenu = useCallback((id: string, x: number, y: number) => contextMenuRef.current(id, x, y), [])

  const buildNodes = useCallback(() => {
    pfDebug('canvas', 'buildNodes', {
      pageId: page.id,
      diagramCount: page.diagrams.length,
      activeDiagramId: page.activeDiagramId,
    })
    return diagramsToNodes(
      page.diagrams,
      page.activeDiagramId,
      mode,
      stableSelect,
      stableRename,
      stableUpdateDesc,
      stableDelete,
      stableOpenContextMenu,
    )
  }, [page.id, page.diagrams, page.activeDiagramId, mode, stableSelect, stableRename, stableUpdateDesc, stableDelete, stableOpenContextMenu])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]) // populated by sync effect below

  // Sync nodes while preserving existing node identity/measurement where possible.
  // Replacing the whole node array on every selection change can cause visible flicker.
  useEffect(() => {
    const nextNodes = buildNodes()
    pfDebug('canvas', 'syncNodes effect', {
      pageId: page.id,
      nextNodeCount: nextNodes.length,
    })
    setNodes(prevNodes => {
      const prevById = new Map(prevNodes.map(node => [node.id, node]))
      return nextNodes.map(nextNode => {
        const prevNode = prevById.get(nextNode.id)
        if (!prevNode) return nextNode

        return {
          ...prevNode,
          position: nextNode.position,
          data: nextNode.data,
          measured: prevNode.measured ?? nextNode.measured,
          // Selection is controlled by document state: exactly one active diagram at a time.
          selected: nextNode.selected,
          dragging: prevNode.dragging,
        }
      })
    })
  }, [buildNodes, page.id, setNodes])

  // Gently focus the active diagram when switching pages
  useEffect(() => {
    if (pageFocusTimerRef.current) {
      clearTimeout(pageFocusTimerRef.current)
      pageFocusTimerRef.current = null
    }

    if (prevPageId.current !== page.id) {
      prevPageId.current = page.id
      if (page.activeDiagramId) {
        pageFocusTimerRef.current = setTimeout(() => {
          pfDebug('canvas', 'page switch focus fire', { pageId: page.id, diagramId: page.activeDiagramId })
          const ab = page.diagrams.find(a => a.id === page.activeDiagramId)
          if (!ab) return
          focusDiagramViewport(ab)
        }, 50)
      }
    }

    return () => {
      if (pageFocusTimerRef.current) {
        clearTimeout(pageFocusTimerRef.current)
        pageFocusTimerRef.current = null
      }
    }
  }, [focusDiagramViewport, page.id, page.activeDiagramId, page.diagrams, focusDiagramInViewport])

  // Handle node drag end → persist position
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      pfDebug('canvas', 'handleNodesChange', {
        pageId: page.id,
        changes: changes.map(change => ({ id: 'id' in change ? change.id : undefined, type: change.type })),
      })
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          pfDebug('canvas', 'persist diagram position', {
            pageId: page.id,
            diagramId: change.id,
            x: change.position.x,
            y: change.position.y,
          })
          onMoveDiagram(change.id, change.position.x, change.position.y)
        }
        if (change.type === 'dimensions' && change.dimensions) {
          if (change.resizing === false) {
            pfDebug('canvas', 'persist diagram width', {
              pageId: page.id,
              diagramId: change.id,
              width: change.dimensions.width,
            })
            onResizeDiagram(change.id, change.dimensions.width)
          } else {
            pfDebug('canvas', 'ignore measurement-only width change', {
              pageId: page.id,
              diagramId: change.id,
              width: change.dimensions.width,
              resizing: change.resizing,
            })
          }
        }
      }
    },
    [onNodesChange, onMoveDiagram, onResizeDiagram, page.id],
  )

  // Click on canvas background → deselect (handled by RF automatically)
  const handlePaneClick = useCallback(() => {
    // Don't deselect diagram on canvas click — keep sidebar open
    // Users can explicitly click another diagram or close the sidebar
  }, [])

  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    event.preventDefault()
    onOpenCanvasContextMenu(event.clientX, event.clientY)
  }, [onOpenCanvasContextMenu])

  const isDark = mode === 'dark'
  const isMobile = useIsMobile()
  const bgColor = isDark ? 'oklch(0.13 0.015 260)' : '#f3f3f4'
  const dotColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'

  return (
    <ReactFlow
      nodes={nodes}
      edges={[]}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onPaneClick={handlePaneClick}
      onPaneContextMenu={handlePaneContextMenu}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={2.5}
      snapToGrid
      snapGrid={[20, 20]}
      // Enforce single-selection semantics at the React Flow layer too.
      selectionOnDrag={false}
      multiSelectionKeyCode={null}
      style={{ background: bgColor }}
      deleteKeyCode={null} // We handle delete ourselves
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.5}
        color={dotColor}
      />
      {!isMobile && (
        <Controls
          position="bottom-right"
          showInteractive={false}
          style={{
            background: isDark ? 'oklch(0.20 0.015 260)' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            marginBottom: 20,
            marginRight: 16,
          }}
        />
      )}
    </ReactFlow>
  )
}

// ── Public component (wraps with ReactFlowProvider) ───────────────────────────

interface InfiniteCanvasProps {
  page: DiagramPage
  mode: AppMode
  onSelectDiagram: (id: string) => void
  onRenameDiagram: (id: string, name: string) => void
  onUpdateDiagramDescription: (id: string, description: string) => void
  onDeleteDiagram: (id: string) => void
  onOpenDiagramContextMenu: (id: string, x: number, y: number) => void
  onOpenCanvasContextMenu: (x: number, y: number) => void
  onMoveDiagram: (id: string, x: number, y: number) => void
  onResizeDiagram: (id: string, width: number) => void
  onRegisterFocus: (fn: (id: string) => void) => void
}

export function InfiniteCanvas(props: InfiniteCanvasProps) {
  return (
    <div data-testid="canvas-root" style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <InnerCanvas {...props} />
      </ReactFlowProvider>
    </div>
  )
}
