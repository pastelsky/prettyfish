import { useCallback } from 'react'
import type { Dispatch } from 'react'
import { createPage, withRuntimePagesState } from '../types'
import type { DiagramPage } from '../types'
import type { AppAction } from '../state/appStore'

export interface UsePageActionsOptions {
  pages: DiagramPage[]
  dispatch: Dispatch<AppAction>
  pushUndoSnapshot: () => void
  pageById: Map<string, DiagramPage>
}

export interface PageActions {
  addPage: () => string
  createPageWithName: (name?: string, code?: string) => string
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
}

export function usePageActions({
  pages,
  dispatch,
  pushUndoSnapshot,
  pageById,
}: UsePageActionsOptions): PageActions {
  const createPageWithName = useCallback((name?: string, code = ''): string => {
    pushUndoSnapshot()
    const page = withRuntimePagesState([createPage(name?.trim() || `Page ${pages.length + 1}`, code)])[0]!
    dispatch({ type: 'page/add', page })
    return page.id
  }, [dispatch, pages.length, pushUndoSnapshot])

  const addPage = useCallback((): string => createPageWithName(), [createPageWithName])

  const deletePage = useCallback((pageId: string) => {
    if (pages.length === 1) return
    pushUndoSnapshot()
    dispatch({ type: 'page/delete', pageId })
  }, [dispatch, pages.length, pushUndoSnapshot])

  const renamePage = useCallback((pageId: string, name: string) => {
    const page = pageById.get(pageId)
    if (!page || page.name === name) return
    pushUndoSnapshot()
    dispatch({ type: 'page/rename', pageId, name })
  }, [dispatch, pageById, pushUndoSnapshot])

  return { addPage, createPageWithName, deletePage, renamePage }
}
