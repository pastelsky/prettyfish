import { useEffect, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

function parseHash(): { svg: string | null; bg: string; title: string } {
  try {
    const hash = window.location.hash.slice(1)
    if (!hash) return { svg: null, bg: '#ffffff', title: '' }
    const data = JSON.parse(decodeURIComponent(escape(atob(hash))))
    return { svg: data.svg ?? null, bg: data.bg ?? '#ffffff', title: data.title ?? '' }
  } catch {
    try {
      return { svg: atob(window.location.hash.slice(1)), bg: '#ffffff', title: '' }
    } catch {
      return { svg: null, bg: '#ffffff', title: '' }
    }
  }
}

/**
 * Standalone presentation view — renders a base64-encoded SVG full-screen
 * with pinch-to-zoom. Opened in a new tab via window.open().
 * URL format: /present#<base64-encoded-json>
 */
export function PresentationMode() {
  const [parsed] = useState(parseHash)

  useEffect(() => {
    if (parsed.title) {
      document.title = `${parsed.title} — Pretty Fish`
    } else {
      document.title = 'Pretty Fish — Presentation'
    }
  }, [parsed.title])

  if (!parsed.svg) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100vw', height: '100vh', fontFamily: 'system-ui',
        color: '#888', fontSize: '14px',
      }}>
        No diagram to display
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: parsed.bg === 'transparent' ? '#ffffff' : (parsed.bg || '#ffffff'),
      touchAction: 'none',
    }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={10}
        centerOnInit
        wheel={{ step: 0.12 }}
        pinch={{ step: 20 }}
        doubleClick={{ mode: 'reset' }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: parsed.svg }}
            style={{ padding: '10vh 10vw' }}
          />
        </TransformComponent>
      </TransformWrapper>

      <ExitHint />
    </div>
  )
}

function ExitHint() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px 16px',
      borderRadius: '8px', fontSize: '12px', fontFamily: 'system-ui',
      pointerEvents: 'none',
    }}>
      Double-click to reset zoom · Close tab to exit
    </div>
  )
}
