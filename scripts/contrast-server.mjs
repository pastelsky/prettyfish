/**
 * Minimal static server for the rendered contrast audit.
 * Serves:
 *   /mermaid.js        — Mermaid UMD bundle (sets window.mermaid)
 *   /render.html       — diagram render harness page
 *
 * Usage: node scripts/contrast-server.mjs [port]
 * Default port: 4299
 */

import express from 'express'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PORT = parseInt(process.argv[2] ?? '4299', 10)

const app = express()

// Serve Mermaid UMD bundle — large but self-contained, no chunk imports
app.get('/mermaid.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(resolve(ROOT, 'node_modules/mermaid/dist/mermaid.min.js'))
})

// Diagram render harness — receives diagram code + config via query params or POST
// The test navigates here and uses page.evaluate() to call window.renderDiagram()
app.get('/render.html', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 20px; }
</style>
</head>
<body>
<div id="output"></div>
<script src="/mermaid.js"></script>
<script>
// Called by Playwright page.evaluate() with diagram code and theme config
window.renderDiagram = async function(code, themeVars, extraConfig) {
  // Reset mermaid state between renders
  if (window.__mermaidCounter === undefined) window.__mermaidCounter = 0;
  const id = 'diagram-' + (++window.__mermaidCounter);

  // Apply background to page
  const bg = themeVars.background || '#ffffff';
  document.body.style.background = bg;
  document.documentElement.style.background = bg;

  const config = {
    startOnLoad: false,
    theme: 'base',
    themeVariables: themeVars,
    ...(extraConfig || {}),
  };
  mermaid.initialize(config);

  try {
    const { svg } = await mermaid.render(id, code);
    document.getElementById('output').innerHTML = svg;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};
window.__ready = true;
</script>
</body>
</html>`)
})

app.listen(PORT, '127.0.0.1', () => {
  // Signal readiness for Playwright webServer
  console.log(`Contrast server ready on http://127.0.0.1:${PORT}`)
})
