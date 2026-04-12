/**
 * SponsorNudge — a non-intrusive, human-written sponsorship prompt.
 *
 * Rules:
 *   - Shown at most 3 times per user (lifetime)
 *   - At least 7 days apart between showings
 *   - Triggered externally via `recordDiagramCreated()` or `recordExport()`
 *   - Renders below the "Connect AI Agent" pill in the top-right corner
 *   - Dismissible with ✕ (counts as a showing)
 */

import { useState, useEffect } from 'react'
import { X, Heart } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'prettyfish:sponsor-nudge'
const MAX_SHOWS = 3
const MIN_GAP_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

interface NudgeState {
  showCount: number
  lastShownAt: number | null // epoch ms
}

function readState(): NudgeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as NudgeState
  } catch { /* ignore */ }
  return { showCount: 0, lastShownAt: null }
}

function writeState(s: NudgeState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** Call this whenever the user creates or exports a diagram. */
export function maybeShowSponsorNudge(): boolean {
  const s = readState()
  if (s.showCount >= MAX_SHOWS) return false
  const now = Date.now()
  if (s.lastShownAt !== null && now - s.lastShownAt < MIN_GAP_MS) return false
  return true
}

/** Mark that we showed the nudge (call when it becomes visible). */
export function recordNudgeShown() {
  const s = readState()
  writeState({ showCount: s.showCount + 1, lastShownAt: Date.now() })
}

// Rotating messages — [before logo, after logo]
// The Pretty Fish pink logo is rendered inline where the split occurs.
const MESSAGES: [string, string][] = [
  ["Pretty Fish lives rent-free in your browser. If it's been useful, throwing a few bucks our way keeps the lights on (and the ", " swimming)."],
  ["Built with too much coffee and genuine love for good diagrams. If Pretty Fish saved you some time, consider tossing a coin to your developer.", ""],
  ["Pretty Fish is free, open-source, and powered by stubbornness. If you've enjoyed it, GitHub Sponsors is a lovely way to say so.", ""],
]

function getMessage(showCount: number): [string, string] {
  return MESSAGES[showCount % MESSAGES.length]!
}

interface SponsorNudgeProps {
  visible: boolean
  onDismiss: () => void
  showCount: number
}

export function SponsorNudge({ visible, onDismiss, showCount }: SponsorNudgeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (visible) {
      // Small delay so it animates in after the trigger
      const t = setTimeout(() => setMounted(true), 400)
      return () => clearTimeout(t)
    } else {
      setMounted(false)
    }
  }, [visible])

  if (!visible && !mounted) return null

  return (
    <div
      className={cn(
        'w-72 rounded-2xl border pointer-events-auto overflow-hidden',
        'bg-white/80 dark:bg-[oklch(0.16_0.015_280/0.85)]',
        'border-black/8 dark:border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        'backdrop-blur-xl',
        'transition-all duration-300 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="text-[13px] font-semibold text-foreground">Support Pretty Fish</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors -mt-0.5 -mr-0.5 p-0.5 rounded shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3.5">
          {(() => {
            const [before, after] = getMessage(showCount)
            return (
              <>
                {before}{after ? <><img src="/favicon-pink.svg" alt="Pretty Fish" className="inline w-4 h-4 mx-0.5 align-middle" />{after}</> : null}
              </>
            )
          })()}
        </p>
        <a
          href="https://github.com/sponsors/pastelsky"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDismiss}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
            'bg-pink-500 hover:bg-pink-600 text-white',
          )}
        >
          <Heart className="w-3.5 h-3.5" weight="fill" />
          Sponsor on GitHub
        </a>
      </div>
    </div>
  )
}
