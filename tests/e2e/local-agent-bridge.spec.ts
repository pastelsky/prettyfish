import { test, expect } from '@playwright/test'

import { createApp } from './support/pretty-fish-app'
import { PrettyFishMcpClient } from './support/local-agent-bridge'

test.describe('Local agent bridge', () => {
  test('pairs a live tab and executes MCP-driven diagram operations end to end', async ({ page }) => {
    const bridge = await PrettyFishMcpClient.start()
    const app = createApp(page)

    try {
      await app.openFresh()
      await app.header.openLocalAgentDialog()
      await app.localAgent.connect(bridge.bridgeUrl)

      const sessions = await bridge.callTool<{ sessions: Array<{ id: string; pageUrl: string }> }>('list_sessions')
      expect(sessions.sessions).toHaveLength(1)
      const sessionId = sessions.sessions[0]!.id

      const createPageResult = await bridge.callTool<{ page: { id: string; name: string } }>('create_page', {
        sessionId,
        name: 'Agent Generated',
      })
      expect(createPageResult.page.name).toBe('Agent Generated')

      const createDiagramResult = await bridge.callTool<{ diagram: { id: string; pageId: string; name: string } }>('create_diagram', {
        sessionId,
        pageId: createPageResult.page.id,
        name: 'Agent Flow',
      })
      expect(createDiagramResult.diagram.name).toBe('Agent Flow')

      const setCodeResult = await bridge.callTool<{ diagram: { id: string; name: string }; render: { status: string } }>('set_diagram_code', {
        sessionId,
        diagramId: createDiagramResult.diagram.id,
        code: `flowchart LR
  Browser[Pretty Fish tab] --> Bridge[Local bridge]
  Bridge --> Agent[MCP client]
  Agent --> Export[SVG and PNG]
`,
      })
      expect(setCodeResult.render.status).toBe('ready')

      await app.header.shouldShowActivePageNamed('Agent Generated')
      await app.canvas.shouldShowDiagramCount(2)
      await expect(app.editor.diagramNames.nth(1)).toHaveValue('Agent Flow')
      await app.editor.shouldRenderDiagramPreview()

      const renderStatus = await bridge.callTool<{ render: { status: string; error: unknown } }>('render_status', {
        sessionId,
        diagramId: createDiagramResult.diagram.id,
      })
      expect(renderStatus.render.status).toBe('ready')
      expect(renderStatus.render.error).toBeNull()

      const svgExport = await bridge.callTool<{ fileName: string; mimeType: string; data: string }>('export_svg', {
        sessionId,
        diagramId: createDiagramResult.diagram.id,
      })
      expect(svgExport.fileName).toContain('Agent Flow')
      expect(svgExport.mimeType).toContain('image/svg+xml')
      expect(svgExport.data.length).toBeGreaterThan(200)

      const pngExport = await bridge.callTool<any>('export_png', {
        sessionId,
        diagramId: createDiagramResult.diagram.id,
      })
      const pngImage = pngExport.content.find((entry: { type: string }) => entry.type === 'image')
      expect(pngImage.mimeType).toBe('image/png')
      expect(pngImage.data.length).toBeGreaterThan(200)

      const snapshot = await bridge.callTool<{ snapshot: { pages: Array<{ name: string; diagrams: Array<{ name: string; code: string }> }> } }>('get_snapshot', {
        sessionId,
      })
      const pageSnapshot = snapshot.snapshot.pages.find((entry) => entry.name === 'Agent Generated')
      expect(pageSnapshot).toBeTruthy()
      const diagramSnapshot = pageSnapshot!.diagrams.find((entry) => entry.name === 'Agent Flow')
      expect(diagramSnapshot).toBeTruthy()
      expect(diagramSnapshot!.code).toContain('Browser[Pretty Fish tab]')
    } finally {
      await bridge.stop()
    }
  })
})
