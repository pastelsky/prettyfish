/**
 * InfiniteCanvas — React Flow-based infinite canvas.
 *
 * Each artboard in the current page becomes a React Flow node.
 * Supports pan, zoom, drag-to-reposition, click-to-select, minimap.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeChange,
  type OnNodesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ArtboardNode } from './ArtboardNode'
import type { ArtboardNodeData } from './ArtboardNode'
import type { Artboard, DiagramPage } from '../types'
import type { AppMode } from '../types'
import { pfDebug } from '../lib/debug'

// ── Node types ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { artboard: ArtboardNode } as any

// ── Helper: page artboards → RF nodes ────────────────────────────────────────

function artboardsToNodes(
  artboards: Artboard[],
  activeArtboardId: string | null,
  mode: AppMode,
  activeSvg: string,
  activeError: ArtboardNodeData['activeError'],
  onSelect: (id: string) => void,
  onRename: (id: string, name: string) => void,
  onUpdateDesc: (id: string, description: string) => void,
  onDelete: (id: string) => void,
  onOpenContextMenu: (id: string, x: number, y: number) => void,
): Node[] {
  return artboards.map((ab) => ({
    id: ab.id,
    type: 'artboard',
    position: { x: ab.x, y: ab.y },
    data: {
      artboard: ab,
      isActive: ab.id === activeArtboardId,
      mode,
      activeSvg: ab.id === activeArtboardId ? activeSvg : undefined,
      activeError: ab.id === activeArtboardId ? activeError : undefined,
      onSelect,
      onRename,
      onUpdateDescription: onUpdateDesc,
      onDelete,
      onOpenContextMenu,
    } satisfies ArtboardNodeData,
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
  activeSvg: string
  activeError: ArtboardNodeData['activeError']
  onSelectArtboard: (id: string) => void
  onRenameArtboard: (id: string, name: string) => void
  onUpdateArtboardDescription: (id: string, description: string) => void
  onDeleteArtboard: (id: string) => void
  onOpenDiagramContextMenu: (id: string, x: number, y: number) => void
  onOpenCanvasContextMenu: (x: number, y: number) => void
  onMoveArtboard: (id: string, x: number, y: number) => void
  onResizeArtboard: (id: string, width: number) => void
  onRegisterFocus: (fn: (id: string) => void) => void
}

function InnerCanvas({
  page,
  mode,
  activeSvg,
  activeError,
  onSelectArtboard,
  onRenameArtboard,
  onUpdateArtboardDescription,
  onDeleteArtboard,
  onOpenDiagramContextMenu,
  onOpenCanvasContextMenu,
  onMoveArtboard,
  onResizeArtboard,
  onRegisterFocus,
}: InnerCanvasProps) {
  const prevPageId = useRef(page.id)
  const pageFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setViewport } = useReactFlow()

  const focusArtboardInViewport = useCallback((id: string) => {
    pfDebug('canvas', 'focusDiagramInViewport requested', { pageId: page.id, diagramId: id })
    const ab = page.artboards.find(a => a.id === id)
    if (!ab) return

    const container = document.querySelector('.react-flow')
    if (!container) return
    const rect = container.getBoundingClientRect()

    const sidebarWidth = document.querySelector('[data-sidebar-panel]')
      ? Math.min(480, rect.width * 0.35)
      : 0
    const availableWidth = rect.width - sidebarWidth
    const availableHeight = rect.height

    const artboardH = 480
    const zoom = Math.min(1, Math.min(
      (availableWidth * 0.8) / ab.width,
      (availableHeight * 0.8) / artboardH,
    ))

    const centerX = sidebarWidth + availableWidth / 2
    const centerY = availableHeight / 2
    const x = centerX - (ab.x + ab.width / 2) * zoom
    const y = centerY - (ab.y + artboardH / 2) * zoom

    setViewport({ x, y, zoom }, { duration: 300 })
  }, [page.id, page.artboards, setViewport])

  // Register the zoom-to-artboard function with the parent (rule 5.7 — narrow deps)
  useEffect(() => {
    onRegisterFocus(focusArtboardInViewport)
  }, [focusArtboardInViewport, onRegisterFocus])

  // Stable callback refs — update synchronously to avoid stale closures
  // without adding callbacks to the node-sync effect deps (rule 8.3)
  const selectRef = useRef(onSelectArtboard)
  const renameRef = useRef(onRenameArtboard)
  const updateDescRef = useRef(onUpdateArtboardDescription)
  const deleteRef = useRef(onDeleteArtboard)
  const contextMenuRef = useRef(onOpenDiagramContextMenu)
  // Keep refs current — use useLayoutEffect to avoid react-compiler "ref during render" error
  useLayoutEffect(() => { selectRef.current = onSelectArtboard }, [onSelectArtboard])
  useLayoutEffect(() => { renameRef.current = onRenameArtboard }, [onRenameArtboard])
  useLayoutEffect(() => { updateDescRef.current = onUpdateArtboardDescription }, [onUpdateArtboardDescription])
  useLayoutEffect(() => { deleteRef.current = onDeleteArtboard }, [onDeleteArtboard])
  useLayoutEffect(() => { contextMenuRef.current = onOpenDiagramContextMenu }, [onOpenDiagramContextMenu])

  const stableSelect = useCallback((id: string) => selectRef.current(id), [])
  const stableRename = useCallback((id: string, name: string) => renameRef.current(id, name), [])
  const stableUpdateDesc = useCallback((id: string, desc: string) => updateDescRef.current(id, desc), [])
  const stableDelete = useCallback((id: string) => deleteRef.current(id), [])
  const stableOpenContextMenu = useCallback((id: string, x: number, y: number) => contextMenuRef.current(id, x, y), [])

  const buildNodes = useCallback(() => {
    pfDebug('canvas', 'buildNodes', {
      pageId: page.id,
      diagramCount: page.artboards.length,
      activeDiagramId: page.activeArtboardId,
    })
    // activeSvg/activeError are patched separately in a lightweight effect below
    return artboardsToNodes(
      page.artboards,
      page.activeArtboardId,
      mode,
      '',   // activeSvg — patched separately
      null, // activeError — patched separately
      stableSelect,
      stableRename,
      stableUpdateDesc,
      stableDelete,
      stableOpenContextMenu,
    )
  }, [page.id, page.artboards, page.activeArtboardId, mode, stableSelect, stableRename, stableUpdateDesc, stableDelete, stableOpenContextMenu])

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
          selected: prevNode.selected,
          dragging: prevNode.dragging,
        }
      })
    })
  }, [buildNodes, page.id, setNodes])

  // Lightweight update: only patch activeSvg/activeError on active node when SVG changes
  // This avoids rebuilding all nodes on every render cycle
  useEffect(() => {
    const activeId = page.activeArtboardId
    if (!activeId) return
    setNodes(prev => prev.map(n => {
      if (n.id !== activeId) return n
      const prevData = n.data as ArtboardNodeData
      if (prevData.activeSvg === activeSvg && prevData.activeError === activeError) return n
      return { ...n, data: { ...prevData, activeSvg, activeError } }
    }))
  }, [activeSvg, activeError, page.activeArtboardId, setNodes])

  // Gently focus the active artboard when switching pages
  useEffect(() => {
    if (pageFocusTimerRef.current) {
      clearTimeout(pageFocusTimerRef.current)
      pageFocusTimerRef.current = null
    }

    if (prevPageId.current !== page.id) {
      prevPageId.current = page.id
      if (page.activeArtboardId) {
        pageFocusTimerRef.current = setTimeout(() => {
          pfDebug('canvas', 'page switch focus fire', { pageId: page.id, diagramId: page.activeArtboardId })
          const ab = page.artboards.find(a => a.id === page.activeArtboardId)
          if (!ab) return
          const container = document.querySelector('.react-flow')
          if (!container) return
          const rect = container.getBoundingClientRect()
          const sidebarWidth = document.querySelector('[data-sidebar-panel]')
            ? Math.min(480, rect.width * 0.35)
            : 0
          const availableWidth = rect.width - sidebarWidth
          const availableHeight = rect.height
          const artboardH = 480
          const zoom = Math.min(1, Math.min(
            (availableWidth * 0.8) / ab.width,
            (availableHeight * 0.8) / artboardH,
          ))
          const centerX = sidebarWidth + availableWidth / 2
          const centerY = availableHeight / 2
          const x = centerX - (ab.x + ab.width / 2) * zoom
          const y = centerY - (ab.y + artboardH / 2) * zoom
          setViewport({ x, y, zoom })
        }, 50)
      }
    }

    return () => {
      if (pageFocusTimerRef.current) {
        clearTimeout(pageFocusTimerRef.current)
        pageFocusTimerRef.current = null
      }
    }
  }, [page.id, page.activeArtboardId, page.artboards, focusArtboardInViewport, setViewport])

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
          onMoveArtboard(change.id, change.position.x, change.position.y)
        }
        if (change.type === 'dimensions' && change.dimensions) {
          if (change.resizing === false) {
            pfDebug('canvas', 'persist diagram width', {
              pageId: page.id,
              diagramId: change.id,
              width: change.dimensions.width,
            })
            onResizeArtboard(change.id, change.dimensions.width)
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
    [onNodesChange, onMoveArtboard, onResizeArtboard, page.id],
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
  const bgColor = isDark ? 'oklch(0.13 0.015 260)' : '#f1f0f5'
  const dotColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'
  const minimapBg = isDark ? 'oklch(0.18 0.015 260)' : '#e8e7ef'
  const minimapMask = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'

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
      <Controls
        position="bottom-right"
        showInteractive={false}
        style={{
          background: isDark ? 'oklch(0.20 0.015 260)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          marginBottom: 112,
        }}
      />
      <MiniMap
        nodeColor={isDark ? 'oklch(0.30 0.02 260)' : '#ddd8f8'}
        maskColor={minimapMask}
        style={{
          width: 132,
          height: 88,
          background: minimapBg,
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          borderRadius: 10,
        }}
      />
    </ReactFlow>
  )
}

// ── Public component (wraps with ReactFlowProvider) ───────────────────────────

interface InfiniteCanvasProps {
  page: DiagramPage
  mode: AppMode
  activeSvg: string
  activeError: ArtboardNodeData['activeError']
  onSelectArtboard: (id: string) => void
  onRenameArtboard: (id: string, name: string) => void
  onUpdateArtboardDescription: (id: string, description: string) => void
  onDeleteArtboard: (id: string) => void
  onOpenDiagramContextMenu: (id: string, x: number, y: number) => void
  onOpenCanvasContextMenu: (x: number, y: number) => void
  onMoveArtboard: (id: string, x: number, y: number) => void
  onResizeArtboard: (id: string, width: number) => void
  onRegisterFocus: (fn: (id: string) => void) => void
}

export function InfiniteCanvas(props: InfiniteCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <InnerCanvas {...props} />
      </ReactFlowProvider>
    </div>
  )
}
