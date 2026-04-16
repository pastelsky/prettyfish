/**
 * ReloadPrompt — shows a brief toast when the app is ready for offline use.
 *
 * With registerType: 'autoUpdate', new service worker versions activate
 * immediately — no user prompt needed. This component only shows the
 * one-time "ready to work offline" notification.
 */
import { useRegisterSW } from 'virtual:pwa-register/react'
import { cn } from '@/lib/utils'
import { chromeGlassPanelClass } from '@/components/ui/app-chrome'

const INTERVAL_MS = 60 * 60 * 1000 // check for updates every 60 minutes

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) {
        console.log('[SW] Registered:', r?.scope)
      }
      if (r) {
        // Periodic update check — new SW will auto-activate via skipWaiting
        setInterval(() => { r.update() }, INTERVAL_MS)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update()
          }
        })
      }
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        console.error('[SW] Registration error:', error)
      }
    },
  })

  if (!offlineReady) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-up">
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 text-zinc-800 dark:text-zinc-200',
        chromeGlassPanelClass('light'),
        'dark:bg-[oklch(0.16_0.015_260/.95)] dark:border-white/8',
      )}>
        <div className="text-sm">Ready to work offline</div>
        <button
          onClick={() => setOfflineReady(false)}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
