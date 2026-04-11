# Local Agent Bridge

Pretty Fish can pair the current browser tab with a local bridge process so an MCP client can drive the live app session.

## What Phase One Supports

- Pair one Pretty Fish browser tab with a local bridge on `127.0.0.1`
- Create pages
- Create diagrams
- Replace Mermaid source and wait for render completion
- Read render status
- Export SVG
- Export PNG
- Read the current document snapshot

The bridge does **not** write browser storage directly. The live Pretty Fish tab executes commands and persists through the normal app code path.

## Start The Bridge

```bash
npm run agent:bridge
```

Default listener:

- `http://127.0.0.1:46321`

Optional environment variables:

- `PRETTYFISH_BRIDGE_HOST`
- `PRETTYFISH_BRIDGE_PORT`

## Pair The Browser Tab

1. Open Pretty Fish.
2. Click the plug icon in the header.
3. Leave the bridge URL at `http://127.0.0.1:46321` unless you changed it.
4. Click `Connect`.

After pairing, the dialog shows the current session ID.

## MCP Config

Example MCP entry:

```json
{
  "mcpServers": {
    "prettyfish": {
      "command": "node",
      "args": ["/absolute/path/to/prettyfish/scripts/prettyfish-bridge.mjs"]
    }
  }
}
```

## Available Tools

- `list_sessions`
- `create_page`
- `create_diagram`
- `set_diagram_code`
- `render_status`
- `export_svg`
- `export_png`
- `get_snapshot`

If `sessionId` is omitted, the bridge uses the most recently active paired session.
