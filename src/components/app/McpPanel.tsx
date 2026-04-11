import { useEffect, useRef, useState } from 'react'
import { Check, Copy, PlugsConnected, Sparkle, X } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import type { RemoteAgentRelayControls } from '@/hooks/useRemoteAgentRelay'
import { cn } from '@/lib/utils'

interface McpPanelProps {
  open: boolean
  onClose: () => void
  remoteRelay: RemoteAgentRelayControls
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value, label, size = 'sm' }: { value: string; label: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={size === 'xs' ? 'h-7 px-2 text-xs' : undefined}
      onClick={async () => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      disabled={!value}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}

// ── Code block ─────────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-black px-3 py-2.5 text-[11px] leading-relaxed text-zinc-100 dark:bg-black dark:text-zinc-100">
      {code}
    </pre>
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
      status === 'disconnected' && 'bg-zinc-400 dark:bg-zinc-600',
    )} />
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function McpPanel({ open, onClose, remoteRelay }: McpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const hasSession = Boolean(remoteRelay.sessionId && remoteRelay.agentToken)
  const isConnected = remoteRelay.status === 'connected'
  const isBusy = remoteRelay.status === 'connecting'

  // Auto-create a hosted session when the panel opens for the first time
  useEffect(() => {
    if (!open) return
    if (hasSession || isBusy || isConnected) return
    void remoteRelay.createHostedSession()
  }, [hasSession, isBusy, isConnected, open, remoteRelay])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const configSnippet = remoteRelay.getHostedConfigSnippet()

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
          'absolute top-14 right-4 z-50 w-[360px] rounded-2xl border text-sm',
          'bg-popover text-popover-foreground',
          'ring-1 ring-foreground/8',
          '[box-shadow:0_8px_32px_rgba(0,0,0,0.12)]',
          'dark:[box-shadow:0_8px_32px_rgba(0,0,0,0.45)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-primary" />
            <span className="font-semibold">Connect MCP</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">

          {/* ── Session status ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusDot status={remoteRelay.status} />
                <span className="font-medium">
                  {isConnected ? 'Session ready' : isBusy ? 'Creating session…' : hasSession ? 'Session paused' : 'No session'}
                </span>
                {remoteRelay.displayId && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {remoteRelay.displayId}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() => void remoteRelay.createHostedSession()}
                disabled={isBusy}
              >
                <PlugsConnected className="h-3 w-3" />
                {hasSession ? 'New' : 'Generate'}
              </Button>
            </div>

            {remoteRelay.error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {remoteRelay.error}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* ── MCP config snippet ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MCP config</p>
              <CopyButton value={configSnippet} label="Copy" size="xs" />
            </div>
            <CodeBlock code={configSnippet} />
            <p className="text-xs text-muted-foreground">
              Paste into your AI client (Claude Desktop, Cursor, etc.) to connect it to this browser tab.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
