import { useEffect, useRef, useState } from 'react'
import { Check, Copy, PlugsConnected, ArrowsClockwise, X, Terminal } from '@phosphor-icons/react'
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
  webMcpSupported?: boolean
  webMcpToolCount?: number
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
      onClick={async () => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <Check className="h-3 w-3 text-green-500 dark:text-green-400" /> : <Copy className="h-3 w-3" />}
      {label && <span className="text-[10px]">{copied ? 'Copied' : label}</span>}
    </button>
  )
}

function StatusDot({ status }: { status: 'disconnected' | 'connecting' | 'connected' | 'error' }) {
  return (
    <span className={cn(
      'inline-block h-1.5 w-1.5 rounded-full shrink-0',
      status === 'connected' && 'bg-green-500',
      status === 'connecting' && 'bg-amber-400 animate-pulse',
      status === 'error' && 'bg-red-500',
      status === 'disconnected' && 'bg-zinc-400 dark:bg-zinc-500',
    )} />
  )
}

type TabId = 'install' | 'config' | 'prompt'

function buildPromptText(mcpUrl: string): string {
  return `# Pretty Fish: Mermaid Diagram Canvas

Whenever you need to render a Mermaid diagram, you can create and manage them on the Pretty Fish canvas. Your diagrams will appear live in the user's browser.

## Endpoint
\`POST ${mcpUrl}\`

All requests use JSON-RPC. Format:
\`\`\`
curl -X POST ${mcpUrl} \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"TOOL","arguments":{...}}}'
\`\`\`

## Tools

### create_diagram
Create a new diagram. Always give it a descriptive name.
\`\`\`json
{"name":"create_diagram","arguments":{"name":"User Auth Flow","code":"flowchart TD\\n  A[Login] --> B{Valid?}\\n  B -->|Yes| C[Dashboard]\\n  B -->|No| D[Error]"}}
\`\`\`

### set_diagram_code
Update an existing diagram's code. Use \`list_diagrams\` first to find the ID.
\`\`\`json
{"name":"set_diagram_code","arguments":{"diagramId":"abc-123","code":"flowchart LR\\n  A --> B --> C"}}
\`\`\`

### list_diagrams
List all diagrams on the current page. Pass \`include_code: true\` to also get source.
\`\`\`json
{"name":"list_diagrams","arguments":{}}
\`\`\`

### get_diagram
Get a single diagram by exact ID or fuzzy name match.
\`\`\`json
{"name":"get_diagram","arguments":{"name":"auth flow"}}
\`\`\`

### list_diagram_types
List all supported Mermaid diagram types (flowchart, sequence, class, ER, etc.).
\`\`\`json
{"name":"list_diagram_types","arguments":{}}
\`\`\`

### get_diagram_reference
Get the full syntax reference for a diagram type before writing code.
\`\`\`json
{"name":"get_diagram_reference","arguments":{"type":"sequence"}}
\`\`\`

### export_svg / export_png
Export a diagram as SVG or PNG image.
\`\`\`json
{"name":"export_png","arguments":{"diagramId":"abc-123","scale":2}}
\`\`\`

## Workflow
1. Call \`list_diagram_types\` to see what's available
2. Call \`get_diagram_reference\` for the syntax of the type you need
3. Call \`create_diagram\` with a descriptive name and valid Mermaid code
4. Call \`list_diagrams\` to see existing diagrams, \`set_diagram_code\` to update them`
}

export function McpPanel({ open, onClose, remoteRelay, webMcpSupported = false, webMcpToolCount = 0 }: McpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>('install')
  const isDark = document.documentElement.classList.contains('dark')

  const hasSession = Boolean(remoteRelay.sessionId && remoteRelay.mcpUrl)
  const isConnected = remoteRelay.status === 'connected'
  const isBusy = remoteRelay.status === 'connecting'

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const configSnippet = remoteRelay.getHostedConfigSnippet()
  const addMcpCmd = `npx add-mcp ${remoteRelay.mcpUrl}`
  const promptText = remoteRelay.mcpUrl ? buildPromptText(remoteRelay.mcpUrl) : ''
  const statusLabel = isConnected
    ? 'Connected'
    : isBusy
      ? 'Creating...'
      : hasSession
        ? 'Ready'
        : 'No session'

  const tabs: { id: TabId; label: string }[] = [
    { id: 'install', label: 'Install MCP' },
    { id: 'config', label: 'MCP config' },
    { id: 'prompt', label: 'Copy prompt' },
  ]

  return (
    <>
      <div className="absolute inset-0 z-40" onClick={onClose} aria-hidden="true" />

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
        <div className="flex items-start justify-between gap-2 border-b px-3.5 py-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" weight="duotone" />
              <span className="text-[13px] font-semibold">Connect MCP</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Let an AI agent create and export diagrams on this page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-2.5 p-3.5">

          {/* WebMCP banner */}
          {webMcpSupported && (
            <div className="space-y-1 rounded-lg bg-green-50 px-2.5 py-2 dark:bg-green-950/30">
              <div className="flex items-center gap-1.5">
                <StatusDot status="connected" />
                <span className="text-[11px] font-medium text-green-800 dark:text-green-300">
                  WebMCP active
                </span>
              </div>
              <p className="text-[10px] text-green-700 dark:text-green-400">
                {webMcpToolCount} tools registered on this page. Use the{' '}
                <a
                  href="https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-900 dark:hover:text-green-200"
                >
                  Model Context Tool Inspector
                </a>{' '}
                extension to test tools, or connect any browser agent.
              </p>
            </div>
          )}

          {/* Session row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <StatusDot status={remoteRelay.status} />
              <span className="text-xs font-medium">{statusLabel}</span>
              {hasSession && remoteRelay.displayId && (
                <span className="truncate rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {remoteRelay.displayId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {hasSession && !isConnected && !isBusy && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => void remoteRelay.connect()}
                  title="Reconnect"
                >
                  <ArrowsClockwise className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant={hasSession ? 'outline' : 'default'}
                className="h-6 px-2 text-[11px]"
                onClick={() => void remoteRelay.createHostedSession()}
                disabled={isBusy}
              >
                <PlugsConnected className="h-3 w-3" />
                {hasSession ? 'New' : 'Generate'}
              </Button>
            </div>
          </div>

          {/* Error */}
          {remoteRelay.error && (
            <div className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {remoteRelay.error}
            </div>
          )}

          {/* Config sections */}
          {hasSession ? (
            <>
              <div className="h-px bg-border" />

              {/* Tabs */}
              <div className="flex gap-0.5 rounded-lg bg-muted/60 p-0.5 dark:bg-muted/40">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      'flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'install' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Run this command to auto-configure Claude Code, Cursor, VS Code, Codex, and more.
                    </p>
                    <CopyBtn value={addMcpCmd} label="Copy" />
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-[#0d1117] dark:bg-[#0d1117]">
                    <code className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
                      <span className="text-[#ff7b72]">npx</span>{' '}
                      <span className="text-[#c9d1d9]">add-mcp</span>{' '}
                      <span className="text-[#79c0ff]">{remoteRelay.mcpUrl}</span>
                    </code>
                  </div>
                </div>
              )}

              {activeTab === 'config' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Paste into your MCP client config file.
                    </p>
                    <CopyBtn value={configSnippet} label="Copy" />
                  </div>
                  <div className="overflow-hidden rounded-lg border border-black/8 text-[11px] dark:border-white/10">
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
                        highlightSelectionMatches: false,
                      }}
                      style={{ fontSize: '11px' }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'prompt' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Paste into any AI chat. No MCP setup needed.
                    </p>
                    <CopyBtn value={promptText} label="Copy" />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg px-3 py-2 bg-[#0d1117] dark:bg-[#0d1117]">
                    <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#c9d1d9]">
                      {promptText}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : !isBusy ? (
            <>
              <div className="h-px bg-border" />
              <p className="text-[11px] text-muted-foreground">
                Generate a session to get your MCP config.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
