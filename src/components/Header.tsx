import { useState } from 'react'
import { copyShareUrl } from '../lib/share'
import type { AppMode, AppState, MermaidTheme } from '../types'
import { MERMAID_THEMES } from '../types'

interface HeaderProps {
  mode: AppMode
  mermaidTheme: MermaidTheme
  getState: () => AppState
  onModeChange: (mode: AppMode) => void
  onMermaidThemeChange: (theme: MermaidTheme) => void
}

export function Header({
  mode,
  mermaidTheme,
  getState,
  onModeChange,
  onMermaidThemeChange,
}: HeaderProps) {
  const isDark = mode === 'dark'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleShare = async () => {
    try {
      await copyShareUrl(getState())
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const headerBg = isDark
    ? 'bg-gray-950 border-gray-700 text-gray-100'
    : 'bg-white border-gray-200 text-gray-900'

  const selectCls = isDark
    ? 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-400'
    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'

  const toggleCls = isDark
    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'

  const shareBtnCls =
    copyState === 'copied'
      ? 'bg-green-600 text-white border-green-600'
      : copyState === 'error'
      ? 'bg-red-600 text-white border-red-600'
      : isDark
      ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'

  return (
    <header className={`flex items-center gap-3 px-5 py-2.5 border-b shrink-0 ${headerBg}`}>
      {/* Logo */}
      <svg
        className="w-5 h-5 text-purple-500 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      <h1 className="text-sm font-semibold tracking-wide">Mermaid Renderer</h1>

      <div className="flex items-center gap-2 ml-auto">
        {/* Mermaid theme */}
        <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Theme:</label>
        <select
          value={mermaidTheme}
          onChange={(e) => onMermaidThemeChange(e.target.value as MermaidTheme)}
          className={`text-xs rounded px-2 py-1 border outline-none cursor-pointer transition-colors ${selectCls}`}
        >
          {MERMAID_THEMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Share / deep-link button */}
        <button
          onClick={handleShare}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border transition-colors ${shareBtnCls}`}
          title="Copy shareable link to clipboard"
        >
          {copyState === 'copied' ? (
            <>
              <CheckIcon />
              Copied!
            </>
          ) : copyState === 'error' ? (
            <>
              <CrossIcon />
              Failed
            </>
          ) : (
            <>
              <LinkIcon />
              Share
            </>
          )}
        </button>

        {/* Light / Dark toggle */}
        <button
          onClick={() => onModeChange(isDark ? 'light' : 'dark')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border transition-colors ${toggleCls}`}
          title="Toggle light/dark mode"
        >
          {isDark ? <><SunIcon /> Light</> : <><MoonIcon /> Dark</>}
        </button>
      </div>
    </header>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7.5 3.5" strokeLinecap="round"/>
      <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 8l4 4 7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 13zM2.343 2.343a.75.75 0 011.061 0l1.06 1.061a.75.75 0 01-1.06 1.06l-1.061-1.06a.75.75 0 010-1.061zm9.193 9.193a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.061l-1.061-1.06a.75.75 0 010-1.061zM0 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H.75A.75.75 0 010 8zm13 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0113 8z"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 .278a.75.75 0 01.16.819A7 7 0 1014.903 9.84a.75.75 0 01.819.16A8.5 8.5 0 116.001.278z"/>
    </svg>
  )
}
