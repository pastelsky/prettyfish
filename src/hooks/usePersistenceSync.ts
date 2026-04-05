import { useEffect, useMemo, useRef } from 'react'
import type { Dispatch } from 'react'

import {
  loadPersistedDocumentState,
  publishPersistedDocumentState,
  savePersistedDocumentState,
  subscribeToPersistedDocumentState,
} from '../lib/storage'
import { decodeStateFromHash } from '../lib/share'
import { normalizePersistedDocumentState } from '../lib/documentState'
import { stripRuntimePagesState, withRuntimePagesState } from '../types'
import { type AppAction, type AppStoreState } from '../state/appStore'

export interface UsePersistenceSyncOptions {
  state: AppStoreState
  dispatch: Dispatch<AppAction>
}

export function usePersistenceSync({ state, dispatch }: UsePersistenceSyncOptions): void {
  const hydratedRef = useRef(false)
  const suppressNextPersistRef = useRef(false)

  const snapshot = useMemo(() => ({
    pages: stripRuntimePagesState(state.pages),
    activePageId: state.activePageId,
    mode: state.mode,
    editorLigatures: state.editorLigatures,
    autoFormat: state.autoFormat,
  }), [state.activePageId, state.autoFormat, state.editorLigatures, state.mode, state.pages])

  useEffect(() => {
    let cancelled = false

    void loadPersistedDocumentState().then((persisted) => {
      if (cancelled) return
      hydratedRef.current = true

      const shared = decodeStateFromHash()
      const snapshot = shared
        ? { ...shared, autoFormat: true }
        : persisted

      if (!snapshot) return

      suppressNextPersistRef.current = true
      dispatch({
        type: 'document/restore',
        snapshot: {
          ...snapshot,
          pages: withRuntimePagesState(snapshot.pages),
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [dispatch])

  useEffect(() => {
    return subscribeToPersistedDocumentState((persisted) => {
      const normalized = normalizePersistedDocumentState(persisted)
      if (!normalized) return
      suppressNextPersistRef.current = true
      dispatch({
        type: 'document/restore',
        snapshot: {
          ...normalized,
          pages: withRuntimePagesState(normalized.pages),
        },
      })
    })
  }, [dispatch])

  useEffect(() => {
    if (!hydratedRef.current) return
    if (suppressNextPersistRef.current) {
      suppressNextPersistRef.current = false
      return
    }

    void savePersistedDocumentState(snapshot)
    publishPersistedDocumentState(snapshot)
  }, [snapshot])
}
