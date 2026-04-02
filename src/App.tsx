import { useState, useEffect, useCallback } from 'react'

import { Header } from './components/Header'
import { FloatingEditor } from './components/FloatingEditor'
import { Preview } from './components/Preview'
import { useMermaidRenderer } from './hooks/useMermaidRenderer'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './lib/storage'
import { decodeStateFromHash } from './lib/share'
import { DEFAULT_DIAGRAM } from './types'
import type { AppMode, AppState, MermaidTheme } from './types'

function getInitialState(): Pick<AppState, 'code' | 'mode' | 'mermaidTheme'> {
  const fromHash = decodeStateFromHash()
  return {
    code: fromHash?.code ?? loadFromStorage(STORAGE_KEYS.code, DEFAULT_DIAGRAM),
    mode: fromHash?.mode ?? loadFromStorage<AppMode>(STORAGE_KEYS.mode, 'dark'),
    mermaidTheme: fromHash?.mermaidTheme ?? loadFromStorage<MermaidTheme>(STORAGE_KEYS.mermaidTheme, 'default'),
  }
}

const initial = getInitialState()

export default function App() {
  const [code, setCode] = useState<string>(initial.code)
  const [mode, setMode] = useState<AppMode>(initial.mode)
  const [mermaidTheme, setMermaidTheme] = useState<MermaidTheme>(initial.mermaidTheme)

  useEffect(() => saveToStorage(STORAGE_KEYS.code, code), [code])
  useEffect(() => saveToStorage(STORAGE_KEYS.mode, mode), [mode])
  useEffect(() => saveToStorage(STORAGE_KEYS.mermaidTheme, mermaidTheme), [mermaidTheme])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  const { svg, error } = useMermaidRenderer(code, mermaidTheme)
  const getState = useCallback((): AppState => ({ code, mode, mermaidTheme }), [code, mode, mermaidTheme])

  return (
    // Full-screen canvas layer
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background canvas — fills everything */}
      <Preview svg={svg} error={error} mode={mode} />

      {/* Floating header bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <Header
            mode={mode}
            mermaidTheme={mermaidTheme}
            getState={getState}
            onModeChange={setMode}
            onMermaidThemeChange={setMermaidTheme}
          />
        </div>
      </div>

      {/* Floating editor panel — bottom-left */}
      <div className="absolute bottom-6 left-6 z-20">
        <FloatingEditor code={code} mode={mode} onChange={setCode} />
      </div>
    </div>
  )
}
