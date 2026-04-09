import { useCallback } from 'react'
import type { Dispatch } from 'react'
import {
  createDiagram,
  nextDiagramPosition,
  type Diagram,
  type DiagramConfig,
  type DiagramPage,
  type MermaidTheme,
} from '../types'
import {
  buildDuplicateName,
  findDiagramById,
  queueDiagramRender,
  type AppAction,
} from '../state/appStore'

export interface UseDiagramActionsOptions {
  pages: Diagram[] extends never ? never : import('../types').DiagramPage[]
  activePage: DiagramPage
  activeDiagram: Diagram | null
  dispatch: Dispatch<AppAction>
  pushUndoSnapshot: () => void
  focusDiagramRef: React.RefObject<((id: string) => void) | null>
}

export interface DiagramActions {
  addDiagram: () => string
  selectDiagram: (diagramId: string) => void
  focusDiagram: (diagramId: string) => void
  renameDiagram: (diagramId: string, name: string) => void
  updateDiagramDescription: (diagramId: string, description: string) => void
  duplicateDiagram: (source: Diagram) => string | undefined
  deleteDiagram: (diagramId: string) => void
  moveDiagram: (diagramId: string, x: number, y: number) => void
  resizeDiagram: (diagramId: string, width: number) => void
  updateCode: (value: string) => void
  setDiagramConfig: (config: DiagramConfig) => void
  setMermaidTheme: (theme: MermaidTheme) => void
}

import type React from 'react'

export function useDiagramActions({
  pages,
  activePage,
  activeDiagram,
  dispatch,
  pushUndoSnapshot,
  focusDiagramRef,
}: UseDiagramActionsOptions): DiagramActions {
  const addDiagram = useCallback((): string => {
    pushUndoSnapshot()
    const position = nextDiagramPosition(activePage.diagrams)
    const diagram = queueDiagramRender(
      createDiagram(`Diagram ${activePage.diagrams.length + 1}`, '', position),
    )
    dispatch({ type: 'diagram/add', pageId: activePage.id, diagram })
    setTimeout(() => focusDiagramRef.current?.(diagram.id), 50)
    return diagram.id
  }, [activePage, dispatch, focusDiagramRef, pushUndoSnapshot])

  const selectDiagram = useCallback((diagramId: string) => {
    dispatch({ type: 'diagram/select', pageId: activePage.id, diagramId })
  }, [activePage.id, dispatch])

  const focusDiagram = useCallback((diagramId: string) => {
    setTimeout(() => focusDiagramRef.current?.(diagramId), 50)
  }, [focusDiagramRef])

  const renameDiagram = useCallback((diagramId: string, name: string) => {
    const diagram = findDiagramById(pages, diagramId)?.diagram
    if (!diagram || diagram.name === name) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/rename', diagramId, name })
  }, [dispatch, pages, pushUndoSnapshot])

  const updateDiagramDescription = useCallback((diagramId: string, description: string) => {
    const diagram = findDiagramById(pages, diagramId)?.diagram
    const nextDescription = description || undefined
    if (!diagram || diagram.description === nextDescription) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/update-description', diagramId, description: nextDescription })
  }, [dispatch, pages, pushUndoSnapshot])

  const duplicateDiagram = useCallback((source: Diagram): string | undefined => {
    pushUndoSnapshot()
    const position = nextDiagramPosition(activePage.diagrams)
    const diagram: Diagram = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: buildDuplicateName(activePage, source.name),
      x: position.x,
      y: position.y,
      configOverrides: source.configOverrides ? structuredClone(source.configOverrides) : {},
      render: source.render ? structuredClone(source.render) : undefined,
    }
    dispatch({ type: 'diagram/duplicate', pageId: activePage.id, diagram })
    setTimeout(() => focusDiagramRef.current?.(diagram.id), 50)
    return diagram.id
  }, [activePage, dispatch, focusDiagramRef, pushUndoSnapshot])

  const deleteDiagram = useCallback((diagramId: string) => {
    pushUndoSnapshot()
    dispatch({ type: 'diagram/delete', pageId: activePage.id, diagramId })
  }, [activePage.id, dispatch, pushUndoSnapshot])

  const moveDiagram = useCallback((diagramId: string, x: number, y: number) => {
    const diagram = findDiagramById(pages, diagramId)?.diagram
    if (!diagram || (diagram.x === x && diagram.y === y)) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/move', diagramId, x, y })
  }, [dispatch, pages, pushUndoSnapshot])

  const resizeDiagram = useCallback((diagramId: string, width: number) => {
    const diagram = findDiagramById(pages, diagramId)?.diagram
    if (!diagram || diagram.width === width) return
    pushUndoSnapshot()
    dispatch({ type: 'diagram/resize', diagramId, width })
  }, [dispatch, pages, pushUndoSnapshot])

  const updateCode = useCallback((value: string) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-code', diagramId: activeDiagram.id, code: value })
  }, [activeDiagram, dispatch])

  const setDiagramConfig = useCallback((config: DiagramConfig) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-config', diagramId: activeDiagram.id, config })
  }, [activeDiagram, dispatch])

  const setMermaidTheme = useCallback((theme: MermaidTheme) => {
    if (!activeDiagram) return
    dispatch({ type: 'diagram/update-theme', diagramId: activeDiagram.id, theme })
  }, [activeDiagram, dispatch])

  return {
    addDiagram,
    selectDiagram,
    focusDiagram,
    renameDiagram,
    updateDiagramDescription,
    duplicateDiagram,
    deleteDiagram,
    moveDiagram,
    resizeDiagram,
    updateCode,
    setDiagramConfig,
    setMermaidTheme,
  }
}
