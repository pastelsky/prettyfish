/**
 * ReloadPrompt — shows a toast when the app is ready for offline use
 * or when a new version is available.
 *
 * Uses the React-specific hook from vite-plugin-pwa.
 * See: https://vite-pwa-org.netlify.app/frameworks/react.html
 */
import { useRegisterSW } from 'virtual:pwa-register/react'
import { cn } from '@/lib/utils'
import { chromeGlassPanelClass } from '@/components/ui/app-chrome'

const INTERVAL_MS = 60 * 60 * 1000 // check for updates every 60 minutes

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) {
        console.log('[SW] Registered:', r?.scope)
      }
      if (r) {
        // Periodic update check
        setInterval(() => { r.update() }, INTERVAL_MS)
        // Also check for updates when the user returns to the tab after being away
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

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-up">
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 text-zinc-800 dark:text-zinc-200',
        chromeGlassPanelClass('light'),
        'dark:bg-[oklch(0.16_0.015_260/.95)] dark:border-white/8',
      )}>
        <div className="text-sm">
          {offlineReady
            ? 'Ready to work offline'
            : 'Update available'}
        </div>
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-lg transition-colors',
              'bg-primary/15 text-primary hover:bg-primary/25',
            )}
          >
            Restart
          </button>
        )}
        <button
          onClick={close}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
