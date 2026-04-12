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
