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

interface LocalAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bridge: LocalAgentBridgeControls
  remoteRelay: RemoteAgentRelayControls
}

export function LocalAgentDialog({ open, onOpenChange, bridge, remoteRelay }: LocalAgentDialogProps) {
  const isConnected = bridge.status === 'connected'
  const isBusy = bridge.status === 'connecting'
  const isRemoteConnected = remoteRelay.status === 'connected'
  const isRemoteBusy = remoteRelay.status === 'connecting'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="local-agent-dialog">
        <DialogHeader>
          <DialogTitle>Local Agent Bridge</DialogTitle>
          <DialogDescription>
            Pair this tab with a localhost bridge so a local MCP client can create Mermaid pages, update diagrams, and export SVG or PNG through the live browser session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-black/8 bg-black/3 px-4 py-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3">
              <div className="text-sm font-semibold">Local bridge</div>
              <div className="text-xs text-muted-foreground">
                Use this when the MCP client runs on the same machine as the browser.
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

          <div className="rounded-xl border border-black/8 bg-black/3 px-4 py-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3">
              <div className="text-sm font-semibold">Remote relay</div>
              <div className="text-xs text-muted-foreground">
                Use this when the MCP client runs remotely through the Cloudflare relay.
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="remote-relay-url" className="text-sm font-medium">
                Relay URL
              </label>
              <Input
                id="remote-relay-url"
                value={remoteRelay.relayUrl}
                onChange={(event) => remoteRelay.setRelayUrl(event.target.value)}
                placeholder="https://prettyfish-relay.example.workers.dev"
                disabled={isRemoteBusy}
              />
            </div>

            <div className="mt-3 space-y-2">
              <label htmlFor="remote-relay-session-id" className="text-sm font-medium">
                Session ID
              </label>
              <Input
                id="remote-relay-session-id"
                value={remoteRelay.sessionId}
                onChange={(event) => remoteRelay.setSessionId(event.target.value)}
                placeholder="relay session id"
                disabled={isRemoteBusy}
              />
            </div>

            <div className="mt-3 space-y-2">
              <label htmlFor="remote-relay-browser-token" className="text-sm font-medium">
                Browser token
              </label>
              <Input
                id="remote-relay-browser-token"
                value={remoteRelay.browserToken}
                onChange={(event) => remoteRelay.setBrowserToken(event.target.value)}
                placeholder="browser token"
                disabled={isRemoteBusy}
              />
            </div>

            <div className="mt-3 rounded-xl border border-black/8 bg-background/80 px-3 py-2 text-sm dark:border-white/10">
              <div><strong>Status:</strong> {remoteRelay.status}</div>
              <div><strong>Session:</strong> {remoteRelay.sessionId || 'Not connected'}</div>
              {remoteRelay.error && <div className="text-red-600 dark:text-red-400"><strong>Error:</strong> {remoteRelay.error}</div>}
            </div>

            <div className="mt-3">
              {isRemoteConnected ? (
                <Button variant="outline" onClick={() => remoteRelay.disconnect()} disabled={isRemoteBusy}>
                  Disconnect remote relay
                </Button>
              ) : (
                <Button onClick={() => void remoteRelay.connect()} disabled={isRemoteBusy}>
                  {isRemoteBusy ? 'Connecting…' : 'Connect remote relay'}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-black/8 bg-black/3 px-3 py-3 text-xs dark:border-white/10 dark:bg-white/5">
            <div className="font-semibold">MCP config snippet</div>
            <pre className="overflow-x-auto rounded-lg bg-black px-3 py-2 text-[11px] text-zinc-100">
{`{
  "mcpServers": {
    "prettyfish": {
      "command": "node",
      "args": ["/absolute/path/to/prettyfish/scripts/prettyfish-bridge.mjs"]
    }
  }
}`}
            </pre>
            <div>
              Start the bridge locally with <code>npm run agent:bridge</code>, then connect this page.
            </div>
          </div>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
