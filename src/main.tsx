import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { PresentationMode } from './components/app/PresentationMode.tsx'
import { ReloadPrompt } from './components/app/ReloadPrompt.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'

function scheduleAnalyticsInit() {
  const loadAnalytics = () => {
    void import('./lib/analytics.ts').then(({ initAnalytics }) => initAnalytics())
  }

  if (document.readyState === 'complete') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadAnalytics, { timeout: 2_000 })
    } else {
      globalThis.setTimeout(loadAnalytics, 1_500)
    }
    return
  }

  window.addEventListener('load', loadAnalytics, { once: true })
}

scheduleAnalyticsInit()

const isPresentation = window.location.pathname.endsWith('/present')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPresentation ? (
      <PresentationMode />
    ) : (
      <TooltipProvider>
        <App />
        <ReloadPrompt />
      </TooltipProvider>
    )}
  </StrictMode>,
)
