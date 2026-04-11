# Remote Agent Relay

Phase two moves command transport out of localhost and into a Cloudflare Worker relay.

## Goals

- Keep the browser tab as the only executor of Pretty Fish mutations
- Let a remote MCP server communicate with the browser over a relay
- Move session creation and peer coordination into Cloudflare

## Files

- Worker entry: [src/relay/worker.ts](../src/relay/worker.ts)
- Shared protocol: [src/relay/protocol.ts](../src/relay/protocol.ts)
- Worker config: [wrangler.relay.jsonc](../wrangler.relay.jsonc)

## Session Model

1. A trusted backend calls `POST /api/relay/sessions` with `RELAY_BOOTSTRAP_TOKEN`.
2. The Worker creates a session in the Durable Object and returns:
   - `sessionId`
   - `browserToken`
   - `agentToken`
3. The browser connects by WebSocket to:
   - `/api/relay/sessions/:sessionId/browser?token=...`
4. The remote MCP side connects by WebSocket to:
   - `/api/relay/sessions/:sessionId/agent?token=...`
5. The Durable Object forwards:
   - `command` messages from agent to browser
   - `command_result` messages from browser to agent

## Current Scope

This is a relay scaffold, not the full browser integration yet.

What it already provides:

- session creation route
- tokenized browser/agent websocket connection routes
- per-session Durable Object coordination
- message forwarding and simple peer-status notifications

What still needs to be added:

- token issuance policy tied to your auth or operator flow
- expiry, revocation, and audit logging

## Remote MCP Process

Use the remote MCP wrapper to create a relay session and print a browser attach URL:

```bash
PRETTYFISH_RELAY_URL="https://your-relay.example.workers.dev" \
PRETTYFISH_RELAY_BOOTSTRAP_TOKEN="your-secret" \
npm run agent:remote-relay
```

The process will print:

- the relay session ID
- a browser attach URL containing:
  - `relayUrl`
  - `relaySessionId`
  - `relayBrowserToken`

Opening that URL in Pretty Fish will auto-connect the browser tab to the relay.

## Local Development

```bash
wrangler dev -c wrangler.relay.jsonc
```

Set a real bootstrap token before using it:

```bash
export RELAY_BOOTSTRAP_TOKEN="your-secret"
```
