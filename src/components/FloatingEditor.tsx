import { useState, useRef, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { mermaid as mermaidLang } from 'codemirror-lang-mermaid'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { EditorView } from '@codemirror/view'
import type { AppMode } from '../types'

const EXTENSIONS = [mermaidLang(), EditorView.lineWrapping]

const MIN_W = 280
const MAX_W = 800
const MIN_H = 120
const MAX_H = 700
const DEFAULT_W = 380
const DEFAULT_H = 320

interface FloatingEditorProps {
  code: string
  mode: AppMode
  onChange: (value: string) => void
}

export function FloatingEditor({ code, mode, onChange }: FloatingEditorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(DEFAULT_W)
  const [height, setHeight] = useState(DEFAULT_H)
  const resizing = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

  const isDark = mode === 'dark'

  const panelBg = isDark
    ? 'bg-gray-900/90 border-gray-700 text-gray-100'
    : 'bg-white/90 border-gray-200 text-gray-900'
  const titleBarBg = isDark
    ? 'bg-gray-800/80 border-gray-700 text-gray-300'
    : 'bg-gray-100/80 border-gray-200 text-gray-600'
  const btnCls = isDark
    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-100 rounded p-0.5 transition-colors'
    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded p-0.5 transition-colors'
  const resizeHandleCls = isDark
    ? 'bg-gray-600 hover:bg-purple-500'
    : 'bg-gray-300 hover:bg-purple-400'

  // Resize drag from bottom-right corner
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = { startX: e.clientX, startY: e.clientY, startW: width, startH: height }

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const dw = ev.clientX - resizing.current.startX
      const dh = ev.clientY - resizing.current.startY
      setWidth(Math.min(MAX_W, Math.max(MIN_W, resizing.current.startW + dw)))
      setHeight(Math.min(MAX_H, Math.max(MIN_H, resizing.current.startH + dh)))
    }
    const onUp = () => {
      resizing.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, height])

  return (
    <div
      className={`rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden flex flex-col transition-all duration-200 ${panelBg}`}
      style={{ width, ...(collapsed ? {} : { height }) }}
    >
      {/* Title bar */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b select-none shrink-0 ${titleBarBg}`}>
        <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9zM4 5a.5.5 0 000 1h4a.5.5 0 000-1H4zm0 2.5a.5.5 0 000 1h8a.5.5 0 000-1H4zM4 10a.5.5 0 000 1h6a.5.5 0 000-1H4z"/>
        </svg>
        <span className="text-xs font-semibold flex-1 tracking-wide">Editor</span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={btnCls}
          title={collapsed ? 'Expand editor' : 'Collapse editor'}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
      </div>

      {/* Editor body */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden relative">
          <CodeMirror
            value={code}
            onChange={onChange}
            extensions={EXTENSIONS}
            theme={isDark ? githubDark : githubLight}
            height={`${height - 38}px`}
            style={{ fontSize: '13px' }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
            }}
          />

          {/* Resize handle — bottom-right corner */}
          <div
            onMouseDown={onResizeMouseDown}
            className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize rounded-tl transition-colors ${resizeHandleCls}`}
            title="Drag to resize"
          >
            <svg className="w-4 h-4 opacity-60" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 10l1-1v2h-2l1-1zM7 14l1-1v2H6l1-1zM14 7l1-1v2h-2l1-1zM14 11l1-1v2h-2l1-1zM11 14l1-1v2h-2l1-1zM14 14l1-1v2h-2l1-1z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

function CollapseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
