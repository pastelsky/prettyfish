import { useCallback, useRef } from 'react'

export interface DocumentHistoryOptions<T> {
  limit: number
  makeSnapshot: () => T
  restoreSnapshot: (snapshot: T) => void
}

export interface DocumentHistoryController {
  pushUndoSnapshot: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

export function useDocumentHistory<T>({
  limit,
  makeSnapshot,
  restoreSnapshot,
}: DocumentHistoryOptions<T>): DocumentHistoryController {
  const undoStackRef = useRef<T[]>([])
  const redoStackRef = useRef<T[]>([])

  const pushUndoSnapshot = useCallback(() => {
    undoStackRef.current.push(makeSnapshot())
    if (undoStackRef.current.length > limit) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [limit, makeSnapshot])

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(makeSnapshot())
    restoreSnapshot(previous)
  }, [makeSnapshot, restoreSnapshot])

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(makeSnapshot())
    restoreSnapshot(next)
  }, [makeSnapshot, restoreSnapshot])

  const clearHistory = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
  }, [])

  return {
    pushUndoSnapshot,
    undo,
    redo,
    clearHistory,
  }
}
