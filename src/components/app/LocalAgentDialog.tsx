import { useEffect, useState } from 'react'
import { Check, Copy, PlugsConnected, Sparkle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { LocalAgentBridgeControls } from '@/hooks/useLocalAgentBridge'
import type { RemoteAgentRelayControls } from '@/hooks/useRemoteAgentRelay'
import { cn } from '@/lib/utils'

interface LocalAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bridge: LocalAgentBridgeControls
  remoteRelay: RemoteAgentRelayControls
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      disabled={!value}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

function CodePanel({
  title,
  code,
}: {
  title: string
  code: string
}) {
  return (
    <div className="space-y-2 rounded-xl border border-black/8 bg-black/3 px-3 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <CopyButton value={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto rounded-lg bg-black px-3 py-2 text-[11px] text-zinc-100 dark:bg-black dark:text-zinc-100">
        {code}
      </pre>
    </div>
  )
}

export function LocalAgentDialog({ open, onOpenChange, bridge, remoteRelay }: LocalAgentDialogProps) {
  const isConnected = bridge.status === 'connected'
  const isBusy = bridge.status === 'connecting'
  const isRemoteConnected = remoteRelay.status === 'connected'
  const isRemoteBusy = remoteRelay.status === 'connecting'
  const hasHostedSession = Boolean(remoteRelay.sessionId && remoteRelay.agentToken)

  useEffect(() => {
    if (!open) return
    if (hasHostedSession || isRemoteBusy || isRemoteConnected) return
    void remoteRelay.createHostedSession()
  }, [hasHostedSession, isRemoteBusy, isRemoteConnected, open, remoteRelay])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="local-agent-dialog">
        <DialogHeader>
          <DialogTitle>Connect MCP</DialogTitle>
          <DialogDescription>
            This creates a browser-scoped Pretty Fish relay session. Your MCP client can then drive this live tab to create pages, update Mermaid diagrams, and export SVG or PNG without needing a local checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/18 bg-primary/6 px-4 py-4 dark:border-primary/25 dark:bg-primary/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold dark:bg-black/30">
                    <Sparkle className="h-3.5 w-3.5" />
                    Hosted MCP Session
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Session ID: <span className="font-semibold text-foreground">{remoteRelay.displayId ?? 'Generating…'}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Status: <span className="font-semibold text-foreground">{remoteRelay.status}</span>
                  </div>
                  {remoteRelay.error && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {remoteRelay.error}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void remoteRelay.createHostedSession()} disabled={isRemoteBusy}>
                    <PlugsConnected className="h-4 w-4" />
                    {hasHostedSession ? 'New session' : 'Generate session'}
                  </Button>
                  {isRemoteConnected ? (
                    <Button variant="outline" onClick={() => remoteRelay.disconnect()} disabled={isRemoteBusy}>
                      Disconnect browser
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => void remoteRelay.connect()} disabled={isRemoteBusy || !hasHostedSession}>
                      Reconnect browser
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/8 bg-background/80 px-3 py-3 dark:border-white/10">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">1. Browser</div>
                  <div className="mt-1 text-sm">
                    This tab is the executor. Keep it open while your MCP client is connected.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton value={remoteRelay.browserAttachUrl} label="Copy attach URL" />
                  </div>
                </div>
                <div className="rounded-xl border border-black/8 bg-background/80 px-3 py-3 dark:border-white/10">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">2. MCP Client</div>
                  <div className="mt-1 text-sm">
                    Add the hosted MCP config below to your client. This is the supported connection path.
                  </div>
                </div>
              </div>
            </div>

            <CodePanel
              title="Hosted MCP config"
              code={remoteRelay.getHostedConfigSnippet()}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-black/8 bg-black/3 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3">
                <div className="text-sm font-semibold">Advanced: local bridge</div>
                <div className="text-xs text-muted-foreground">
                  Use this only when the MCP client runs on the same machine and you want a direct localhost bridge instead of the hosted relay.
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="local-agent-bridge-url" className="text-sm font-medium">
                  Bridge URL
                </label>
                <Input
                  id="local-agent-bridge-url"
                  data-testid="local-agent-bridge-url"
                  value={bridge.bridgeUrl}
                  onChange={(event) => bridge.setBridgeUrl(event.target.value)}
                  placeholder="http://127.0.0.1:46321"
                  disabled={isBusy}
                />
              </div>

              <div className="mt-3 rounded-xl border border-black/8 bg-background/80 px-3 py-2 text-sm dark:border-white/10">
                <div><strong>Status:</strong> {bridge.status}</div>
                <div><strong>Session:</strong> {bridge.sessionId ?? 'Not connected'}</div>
                {bridge.error && <div className="text-red-600 dark:text-red-400"><strong>Error:</strong> {bridge.error}</div>}
              </div>

              <div className="mt-3">
                {isConnected ? (
                  <Button data-testid="local-agent-disconnect-button" variant="outline" onClick={() => void bridge.disconnect()} disabled={isBusy}>
                    Disconnect local bridge
                  </Button>
                ) : (
                  <Button data-testid="local-agent-connect-button" onClick={() => void bridge.connect()} disabled={isBusy}>
                    {isBusy ? 'Connecting…' : 'Connect local bridge'}
                  </Button>
                )}
              </div>
            </div>

            <div className={cn(
              'space-y-2 rounded-xl border px-3 py-3 text-xs',
              'border-black/8 bg-black/3 dark:border-white/10 dark:bg-white/5',
            )}>
              <div className="font-semibold">Usage notes</div>
              <div>Generate a fresh session when you want a new browser-scoped relay.</div>
              <div>The hosted MCP URL is the only supported connection path.</div>
            </div>
          </div>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
