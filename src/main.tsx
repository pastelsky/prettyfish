import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import posthog from 'posthog-js'
import './index.css'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-01-30',
})
import App from './App.tsx'
import { PresentationMode } from './components/PresentationMode.tsx'
import { ReloadPrompt } from './components/ReloadPrompt.tsx'

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
