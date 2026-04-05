import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'

import { getDiagramRenderHash, renderDiagramDiagram } from '../lib/render'
import { findDiagramById, pickNextQueuedDiagram, type AppAction } from '../state/appStore'
import type { DiagramPage } from '../types'

interface RenderJob {
  diagramId: string
  inputHash: string
  started: boolean
  timer: ReturnType<typeof setTimeout> | null
}

export interface UseRenderQueueOptions {
  pages: DiagramPage[]
  activePageId: string
  activeDiagramId: string | null
  dispatch: Dispatch<AppAction>
}

export function useRenderQueue({
  pages,
  activePageId,
  activeDiagramId,
  dispatch,
}: UseRenderQueueOptions): void {
  const renderJobRef = useRef<RenderJob | null>(null)

  useEffect(() => {
    const currentJob = renderJobRef.current

    if (currentJob && !currentJob.started) {
      const latest = findDiagramById(pages, currentJob.diagramId)?.diagram
      const latestHash = latest ? getDiagramRenderHash(latest) : null
      if (!latest || latestHash !== currentJob.inputHash) {
        if (currentJob.timer) clearTimeout(currentJob.timer)
        renderJobRef.current = null
      }
    }

    if (renderJobRef.current) return

    const next = pickNextQueuedDiagram(pages, activePageId, activeDiagramId)
    if (!next) return

    const inputHash = getDiagramRenderHash(next)
    const delay = next.id === activeDiagramId ? 150 : 0
    const timer = setTimeout(() => {
      const job = renderJobRef.current
      if (!job || job.diagramId !== next.id || job.inputHash !== inputHash) return

      job.started = true
      dispatch({ type: 'render/mark-rendering', diagramId: next.id, inputHash })

      void renderDiagramDiagram(next)
        .then(result => {
          dispatch({
            type: 'render/complete',
            diagramId: next.id,
            inputHash,
            svg: result.svg,
            error: result.error,
            svgWidth: result.svgWidth,
            svgHeight: result.svgHeight,
          })
        })
        .finally(() => {
          const current = renderJobRef.current
          if (current?.diagramId === next.id && current.inputHash === inputHash) {
            renderJobRef.current = null
          }
        })
    }, delay)

    renderJobRef.current = {
      diagramId: next.id,
      inputHash,
      started: false,
      timer,
    }
  }, [activeDiagramId, activePageId, dispatch, pages])
}
