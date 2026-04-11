import { useEffect, useRef, useState } from 'react'
import { Check, Copy, PlugsConnected, Sparkle, X, ArrowsClockwise } from '@phosphor-icons/react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'

import { Button } from '@/components/ui/button'
import type { RemoteAgentRelayControls } from '@/hooks/useRemoteAgentRelay'
import { cn } from '@/lib/utils'

interface McpPanelProps {
  open: boolean
  onClose: () => void
  remoteRelay: RemoteAgentRelayControls
  isDark?: boolean
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={async () => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      disabled={!value}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
}

// ── Status dot ─────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'disconnected' | 'connecting' | 'connected' | 'error' }) {
  return (
    <span className={cn(
      'inline-block h-2 w-2 rounded-full shrink-0',
      status === 'connected' && 'bg-green-500',
      status === 'connecting' && 'bg-amber-400 animate-pulse',
      status === 'error' && 'bg-red-500',
      status === 'disconnected' && 'bg-zinc-400 dark:bg-zinc-500',
    )} />
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function McpPanel({ open, onClose, remoteRelay, isDark = false }: McpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const hasSession = Boolean(remoteRelay.sessionId && remoteRelay.agentToken)
  const isConnected = remoteRelay.status === 'connected'
  const isBusy = remoteRelay.status === 'connecting'

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const configSnippet = remoteRelay.getHostedConfigSnippet()
  const statusLabel = isConnected
    ? 'Browser connected'
    : isBusy
      ? 'Creating session…'
      : hasSession
        ? 'Session ready'
        : 'No session'

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="mcp-panel"
        role="dialog"
        aria-label="Connect MCP"
        className={cn(
          'absolute top-14 right-4 z-50 w-[380px] rounded-2xl border text-sm',
          'bg-popover text-popover-foreground',
          'ring-1 ring-foreground/8',
          '[box-shadow:0_8px_32px_rgba(0,0,0,0.12)]',
          'dark:[box-shadow:0_8px_32px_rgba(0,0,0,0.45)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-primary" />
              <span className="font-semibold">Connect MCP</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Let any AI agent drive this browser tab to create and export diagrams.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">

          {/* ── Session row ── */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusDot status={remoteRelay.status} />
              <span className="font-medium text-sm">{statusLabel}</span>
              {hasSession && remoteRelay.displayId && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {remoteRelay.displayId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {hasSession && !isConnected && !isBusy && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => void remoteRelay.connect()}
                  title="Reconnect browser WebSocket"
                >
                  <ArrowsClockwise className="h-3 w-3" />
                  Reconnect
                </Button>
              )}
              <Button
                size="sm"
                variant={hasSession ? 'outline' : 'default'}
                className="h-7 px-2.5 text-xs"
                onClick={() => void remoteRelay.createHostedSession()}
                disabled={isBusy}
              >
                <PlugsConnected className="h-3 w-3" />
                {hasSession ? 'New session' : 'Generate session'}
              </Button>
            </div>
          </div>

          {/* Error message */}
          {remoteRelay.error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {remoteRelay.error}
            </div>
          )}

          {/* ── MCP config — only shown once a session exists ── */}
          {hasSession ? (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MCP config</p>
                  <CopyButton value={configSnippet} />
                </div>
                <div className="overflow-hidden rounded-lg border border-black/8 dark:border-white/10 text-[11px]">
                  <CodeMirror
                    value={configSnippet}
                    extensions={[json()]}
                    theme={isDark ? githubDark : githubLight}
                    editable={false}
                    basicSetup={{
                      lineNumbers: false,
                      foldGutter: false,
                      highlightActiveLine: false,
                      highlightActiveLineGutter: false,
                    }}
                    style={{ fontSize: '11px' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste into your AI client (Claude Desktop, Cursor, etc.) to connect it to this tab.
                </p>
              </div>
            </>
          ) : !isBusy ? (
            <>
              <div className="h-px bg-border" />
              <p className="text-xs text-muted-foreground">
                Generate a session to get your MCP config URL.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
