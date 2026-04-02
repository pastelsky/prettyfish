import { useHotkeys } from 'react-hotkeys-hook'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import type { RefObject } from 'react'

interface UseKeyboardShortcutsOptions {
  transformRef: RefObject<ReactZoomPanPinchRef | null>
  onToggleEditor: () => void
  onNewPage: () => void
  onNextPage: () => void
  onPrevPage: () => void
  onOpenExport: () => void
  onToggleMode: () => void
  onOpenHelp: () => void
  onFocusEditor: () => void
}

// Shared hotkeys options — prevent defaults and work outside inputs when specified
const BASE_OPTS = { preventDefault: true }
const GLOBAL_OPTS = { preventDefault: true, enableOnFormTags: false }

export function useKeyboardShortcuts({
  transformRef,
  onToggleEditor,
  onNewPage,
  onNextPage,
  onPrevPage,
  onOpenExport,
  onToggleMode,
  onOpenHelp,
  onFocusEditor,
}: UseKeyboardShortcutsOptions) {

  // ── Zoom ──────────────────────────────────────────────
  useHotkeys('mod+=, mod+plus', () => {
    transformRef.current?.zoomIn(0.4, 200)
  }, BASE_OPTS)

  useHotkeys('mod+-', () => {
    transformRef.current?.zoomOut(0.4, 200)
  }, BASE_OPTS)

  useHotkeys('mod+0', () => {
    transformRef.current?.resetTransform(300)
  }, BASE_OPTS)

  useHotkeys('mod+shift+h, mod+shift+f', () => {
    transformRef.current?.resetTransform(300)
  }, BASE_OPTS)

  // ── Editor panel ──────────────────────────────────────
  useHotkeys('mod+\\', onToggleEditor, BASE_OPTS)
  useHotkeys('mod+shift+e', onToggleEditor, BASE_OPTS)

  // Focus editor / escape to blur
  useHotkeys('mod+/', onFocusEditor, BASE_OPTS)

  // ── Pages / tabs ─────────────────────────────────────
  useHotkeys('mod+t', onNewPage, BASE_OPTS)
  useHotkeys('mod+shift+]', onNextPage, BASE_OPTS)
  useHotkeys('mod+shift+[', onPrevPage, BASE_OPTS)
  useHotkeys('mod+tab', onNextPage, BASE_OPTS)
  useHotkeys('mod+shift+tab', onPrevPage, BASE_OPTS)

  // ── Export ────────────────────────────────────────────
  useHotkeys('mod+shift+s', onOpenExport, BASE_OPTS)

  // ── UI toggles ────────────────────────────────────────
  useHotkeys('mod+shift+d', onToggleMode, GLOBAL_OPTS) // d = dark

  // ── Help ─────────────────────────────────────────────
  useHotkeys('shift+/', onOpenHelp, GLOBAL_OPTS)  // ? key
}
