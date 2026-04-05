import { useHotkeys } from 'react-hotkeys-hook'

interface UseKeyboardShortcutsOptions {
  // ── Diagrams ───────────────────────────────────
  onNewDiagram: () => void
  onCopyDiagram: () => void
  onPasteDiagram: () => void
  onDeleteDiagram: () => void

  // ── Pages ───────────────────────────────────────
  onNewPage: () => void
  onNextPage: () => void
  onPrevPage: () => void

  // ── Panels ──────────────────────────────────────
  onToggleSidebar: () => void
  onToggleDocs: () => void
  onFocusEditor: () => void

  // ── Actions ─────────────────────────────────────
  onToggleDarkMode: () => void
  onUndo: () => void
  onRedo: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onOpenHelp: () => void
}

const BASE = { preventDefault: true }
const GLOBAL = { preventDefault: true, enableOnFormTags: false }
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const StandardMod = isMac ? 'meta' : 'ctrl'
const BrowserSafeMod = 'ctrl'

export function useKeyboardShortcuts(opts: UseKeyboardShortcutsOptions) {
  // ── Diagrams ─────────────────────────────────────────
  useHotkeys(`${BrowserSafeMod}+t`, opts.onNewDiagram, BASE)
  useHotkeys(`${StandardMod}+c`, opts.onCopyDiagram, GLOBAL)
  useHotkeys(`${StandardMod}+v`, opts.onPasteDiagram, GLOBAL)
  useHotkeys('backspace', opts.onDeleteDiagram, GLOBAL) // only when no input focused

  // ── Pages ─────────────────────────────────────────────
  useHotkeys(`${BrowserSafeMod}+shift+t`, opts.onNewPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+]`, opts.onNextPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+}`, opts.onNextPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+bracketright`, opts.onNextPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+[`, opts.onPrevPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+{`, opts.onPrevPage, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+bracketleft`, opts.onPrevPage, BASE)

  // ── Panels ────────────────────────────────────────────
  useHotkeys(`${StandardMod}+\\`, opts.onToggleSidebar, BASE)
  useHotkeys(`${StandardMod}+backslash`, opts.onToggleSidebar, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+e`, opts.onToggleSidebar, BASE)
  useHotkeys(`${BrowserSafeMod}+shift+r`, opts.onToggleDocs, BASE)
  useHotkeys(`${StandardMod}+/`, opts.onFocusEditor, BASE)
  useHotkeys(`${StandardMod}+slash`, opts.onFocusEditor, BASE)

  // ── Actions ───────────────────────────────────────────
  useHotkeys(`${StandardMod}+z`, opts.onUndo, GLOBAL)
  useHotkeys(`${StandardMod}+shift+z`, opts.onRedo, GLOBAL)
  useHotkeys('ctrl+y', opts.onRedo, GLOBAL)
  useHotkeys(`${BrowserSafeMod}+shift+d`, opts.onToggleDarkMode, GLOBAL)
  useHotkeys(`${BrowserSafeMod}+s`, opts.onSaveProject, BASE)
  useHotkeys(`${BrowserSafeMod}+o`, opts.onLoadProject, BASE)
  useHotkeys('shift+/', opts.onOpenHelp, GLOBAL) // "?"
  useHotkeys('shift+slash', opts.onOpenHelp, GLOBAL)
  useHotkeys('?', opts.onOpenHelp, GLOBAL)
}
