# How to Debug Relay Connection and Reconnection

Use this guide when the browser shows the remote agent relay as disconnected, flaky, or stuck in reconnect.

This guide covers:

- how the relay connection works across frontend and backend
- what client-side and backend logs exist today
- how to inspect production behavior with Wrangler
- how to classify common failure modes

This guide does not cover the full MCP tool surface. It focuses on browser attachment and reconnection.

## Prerequisites

You should already have:

- access to this repository
- Cloudflare access through Wrangler
- a browser session where you can inspect `window.__prettyfishConnection`
- basic familiarity with WebSockets, Durable Objects, and local browser devtools

## Connection Model

The relay has three pieces:

1. The frontend hook in [src/hooks/useRemoteAgentRelay.ts](../src/hooks/useRemoteAgentRelay.ts)
2. The Worker and Durable Object in [src/relay/worker.ts](../src/relay/worker.ts)
3. The shared relay protocol in [src/relay/protocol.ts](../src/relay/protocol.ts)

At a high level:

1. The browser creates a hosted relay session by calling `POST /relay/sessions/public`.
2. The Worker creates a Durable Object for that `sessionId` and persists a `RelaySessionRecord`.
3. The browser connects to `wss://<origin>/relay/sessions/:sessionId/browser?token=...`.
4. The Durable Object validates the browser token, accepts the WebSocket, and sends a `hello` envelope.
5. The frontend marks the relay as `connected` only after that `hello` arrives.
6. MCP clients call `/mcp/:sessionId`, and the Durable Object forwards commands to the attached browser tab.

Important details:

- The browser tab is the only executor of diagram mutations.
- The Durable Object stores session state. Live sockets and in-memory state do not survive deploys or hibernation.
- A deploy can drop a live socket. It should not invalidate a correctly persisted session by itself.

## Current Reconnect Behavior

The reconnect policy lives in [src/hooks/useRemoteAgentRelay.ts](../src/hooks/useRemoteAgentRelay.ts).

The current behavior is:

- `connected` means the browser received relay `hello`, not just WebSocket `open`
- handshake timeout: `5s`
- fast reconnect retries: `3`
- background reconnect retries after fast retries: `10`
- background reconnect interval: `30s`
- heartbeat ping interval: `55s`
- pong freshness deadline: `115s`
- reconnect also triggers when:
  - the page becomes visible again
  - the browser comes back online

The hook enforces one active connect attempt at a time and one reconnect timer at a time.

## Frontend State and Debug Data

The browser exposes relay diagnostics on `window.__prettyfishConnection`.

Inspect it in devtools:

```js
window.__prettyfishConnection
window.__prettyfishConnection.state
window.__prettyfishConnection.history
```

Useful fields in `state`:

- `status`
- `sessionId`
- `reconnectAttempts`
- `backgroundReconnectAttempts`
- `socketReadyState`
- `error`
- `stats.lastOpenAt`
- `stats.lastHelloAt`
- `stats.lastPongAt`
- `stats.wsErrorCount`
- `stats.wsCloseCount`

Useful methods:

```js
window.__prettyfishConnection.enableVerbose()
window.__prettyfishConnection.disableVerbose()
window.__prettyfishConnection.clearHistory()
```

Verbose logging is enabled in production by default unless disabled through:

```js
localStorage.setItem('prettyfish:relay-debug', '0')
```

or:

```text
?relayDebug=0
```

## Important Frontend Events

The history array is the fastest way to understand where the connection failed.

Common event sequence for a healthy connect:

1. `page-switch`
2. `auto-attach` or `session-create-start`
3. `connect-start`
4. `ws-open`
5. `relay-hello`
6. `heartbeat-start`

Important event meanings:

- `connect-start`
  - the hook started a WebSocket attach attempt
- `ws-open`
  - the browser transport opened
- `relay-hello`
  - the Durable Object completed the relay handshake
- `ws-error`
  - the WebSocket failed before stable readiness
- `ws-close`
  - the socket closed after or during attach
- `hello-timeout`
  - the transport opened but `hello` never arrived within `5s`
- `heartbeat-stale`
  - pong freshness expired and the client force-closed the socket
- `reconnect-scheduled`
  - a retry was scheduled
- `reconnect-stop`
  - all fast and background retries were exhausted
- `lifecycle-reconnect`
  - reconnect was triggered by `visibilitychange` or `online`

## Backend Logs Available Today

Backend logging is intentionally sparse. The Worker logs only failure or race conditions that are useful during incidents.

Current logs in [src/relay/worker.ts](../src/relay/worker.ts):

- `[relay] attach_rejected`
  - the outer Worker forwarded an attach request to the Durable Object and did not get `101`
- `[relay-do] attach_session_missing`
  - the Durable Object could not load the persisted session record
- `[relay-do] invalid_browser_token`
  - the browser token did not match the stored token
- `[relay-do] superseded_sockets_closed`
  - a newer socket replaced older sockets for the same role
- `[relay-do] hello_send_failed`
  - the Durable Object accepted the socket but failed while sending the initial `hello`

Success-path logs are intentionally minimized to keep log volume down.

## How to Query Production Logs

Start with a live tail:

```bash
npx wrangler tail prettyfish --format json
```

For a more human-readable view:

```bash
npx wrangler tail prettyfish --format pretty --sampling-rate 0.99
```

Useful deploy and version commands:

```bash
npx wrangler deployments list
npx wrangler versions list
npx wrangler versions view <version-id>
```

What to look for in JSON tail output:

- top-level `executionModel`
  - `stateless` means the outer Worker
  - `durableObject` means the relay Durable Object
- `event.request.url`
  - whether the event is `/relay/sessions/.../browser` or `https://relay.internal/connect/browser?...`
- `event.response.status`
  - for failed attach requests
- `logs`
  - structured log messages from the Worker
- `event.getWebSocketEvent`
  - close events after a socket was accepted
- `outcome`
  - often `ok`, `canceled`, `responseStreamDisconnected`, or `exception`

## Recommended Debug Workflow

Follow this order during incidents.

### 1. Inspect the browser state first

In the failing tab, capture:

```js
window.__prettyfishConnection.state
window.__prettyfishConnection.history
```

Questions to answer:

- Is there a `sessionId`?
- Did the client reach `connect-start`?
- Did it reach `ws-open`?
- Did it reach `relay-hello`?
- Is it fast retries or background retries?
- Did a `heartbeat-stale` event occur?

### 2. Classify the failure point

Use this table.

| Browser history | What it means | Next step |
|---|---|---|
| No `connect-start` | The hook never attempted attach | Inspect page state and UI flow |
| `connect-start` then `ws-error`, no `ws-open` | Upgrade failed before open | Tail backend logs for attach rejection |
| `ws-open`, then no `relay-hello`, then `hello-timeout` | Transport opened but relay handshake stalled | Tail Durable Object logs and inspect close events |
| `relay-hello`, then later `ws-close` | Live socket dropped after successful attach | Inspect reconnect events and heartbeat freshness |
| `heartbeat-stale` | Browser stopped seeing pong or relay traffic | Investigate zombie socket or browser sleep/network handoff |

### 3. Tail backend logs while reproducing

Run:

```bash
npx wrangler tail prettyfish --format json
```

Then reproduce the problem in the browser.

Correlate:

- `sessionId` from `window.__prettyfishConnection.state`
- browser `connect-start` timestamp
- Worker and Durable Object request timestamps

### 4. Interpret backend results

Use this table.

| Backend signal | Meaning | Likely action |
|---|---|---|
| `attach_rejected` with `403` | token mismatch | inspect browser token and session storage |
| `attach_rejected` with `404` | session record missing | inspect session persistence or sticky local state |
| `attach_session_missing` | DO loaded with no persisted session record | inspect session creation path and persistence |
| `invalid_browser_token` | browser token no longer matches stored record | inspect local page storage and session replacement |
| `superseded_sockets_closed` | a new socket replaced an older one | normal during reconnect races unless it repeats continuously |
| `hello_send_failed` | DO accepted socket but it died immediately during handshake | inspect client churn, edge instability, or immediate close events |

### 5. Check Cloudflare close events

In JSON tail, a successful accept can still be followed by a close event like:

```json
{
  "event": {
    "getWebSocketEvent": {
      "webSocketEventType": "close",
      "code": 1006,
      "wasClean": false
    }
  }
}
```

That means:

- the DO accepted the socket
- the connection died almost immediately afterward
- the browser may only report a generic `error` event

This usually points to:

- browser/network interruption
- aggressive reconnect churn
- a socket that opened at the edge but did not survive long enough to complete the relay handshake

## Common Failure Patterns

### Pattern: Reconnect loop with no `ws-open`

Symptoms:

- browser history shows `connect-start`, `ws-error`, `ws-close`, `reconnect-scheduled`
- no `ws-open`
- no `relay-hello`

Meaning:

- the upgrade failed before the browser saw an open socket

Check:

- `attach_rejected`
- response status in Worker tail

### Pattern: `ws-open` but no `relay-hello`

Symptoms:

- browser history shows `ws-open`
- then `hello-timeout`

Meaning:

- the transport opened but the relay never completed the handshake

Check:

- `hello_send_failed`
- immediate DO `close` events with code `1006`

### Pattern: Connected, then agent says browser is detached

Symptoms:

- UI looked connected
- MCP `session_info` or tool calls say the browser is not attached

Meaning:

- most often a stale or superseded socket race

Check:

- repeated `superseded_sockets_closed`
- browser `peer-status`
- whether a newer socket displaced an older browser socket

### Pattern: Connection dies after sleep, network handoff, or tab backgrounding

Symptoms:

- session worked earlier
- later it silently dies or reconnects slowly

Meaning:

- browser lifecycle or half-open socket problem

Check:

- `heartbeat-stale`
- `lifecycle-reconnect`
- `online` and `visibilitychange` recovery behavior

## Local Browser Storage

Relay session state is stored per page ID in local storage.

Relevant keys:

- `prettyfish:relay-session-id:<pageId>`
- `prettyfish:relay-browser-token:<pageId>`
- `prettyfish:relay-client-secret:<pageId>`

This matters because:

- the canvas page identity is separate from the relay session identity
- the same page can hold a stale relay session
- clicking `New Session` replaces the stored relay session for that page

## What a Deploy Should Do

A deploy can:

- restart the Worker
- restart Durable Object instances
- drop live WebSocket connections

A deploy should not, by itself:

- erase persisted Durable Object storage
- invalidate a valid stored relay session record

Expected recovery path after deploy:

1. live socket drops
2. browser sees `ws-close`
3. reconnect attempts start
4. browser reattaches to the same `sessionId`
5. relay sends `hello`
6. status returns to `connected`

If that does not happen, inspect:

- browser reconnect history
- attach rejection logs
- Durable Object handshake logs

## Useful One-Off Commands

Inspect the current branch and working tree:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
```

Tail only relay-related local Wrangler logs:

```bash
rg -n "attach_rejected|attach_session_missing|invalid_browser_token|superseded_sockets_closed|hello_send_failed|relay-hello|ws-open|ws-error|ws-close" ~/Library/Preferences/.wrangler/logs/wrangler-*.log
```

Inspect the relay hook quickly:

```bash
rg -n "scheduleReconnect|heartbeat|visibilitychange|online|hello-timeout|heartbeat-stale" src/hooks/useRemoteAgentRelay.ts
```

Inspect Worker attach logic quickly:

```bash
rg -n "attach_rejected|attach_session_missing|invalid_browser_token|superseded_sockets_closed|hello_send_failed|connect/browser" src/relay/worker.ts
```

## When to Escalate

Escalate beyond normal reconnect debugging if any of these happen:

- multiple users hit the same attach failure pattern at the same time
- successful connects are immediately followed by many `1006` closes
- `hello_send_failed` appears repeatedly for fresh sessions
- reconnect fails for newly created sessions, not just older sticky ones
- the browser remains detached even after `New Session`

At that point, assume a production regression in the relay path and inspect the currently deployed version with:

```bash
npx wrangler deployments list
npx wrangler versions list
npx wrangler versions view <version-id>
```

## Related Files

- [src/hooks/useRemoteAgentRelay.ts](../src/hooks/useRemoteAgentRelay.ts)
- [src/relay/worker.ts](../src/relay/worker.ts)
- [src/relay/protocol.ts](../src/relay/protocol.ts)
- [docs/remote-agent-relay.md](./remote-agent-relay.md)
