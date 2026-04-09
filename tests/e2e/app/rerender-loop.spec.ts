import { expect, test } from '@playwright/test'

async function chooseFlowchart(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('template-gallery')).toBeVisible()
  await page.locator('[data-testid="template-card"][data-template-id="flowchart"]').click()
  await expect(page.getByTestId('diagram-node')).toHaveCount(1)
  await expect(page.locator('[data-testid="diagram-node"] svg').first()).toBeVisible()
}

async function installMutationProbe(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="diagram-node"]')
    if (!root) {
      ;(window as typeof window & { __pfRenderProbe?: unknown }).__pfRenderProbe = { error: 'missing-diagram-node' }
      return
    }

    const events: Array<{ t: number; type: string; added: number; removed: number }> = []
    const start = performance.now()
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        events.push({
          t: Math.round(performance.now() - start),
          type: record.type,
          added: record.addedNodes.length,
          removed: record.removedNodes.length,
        })
      }
    })

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    })

    ;(window as typeof window & {
      __pfRenderProbe?: { events: typeof events; stop: () => Array<{ t: number; type: string; added: number; removed: number }> }
    }).__pfRenderProbe = {
      events,
      stop: () => {
        observer.disconnect()
        return events
      },
    }
  })
}

test('does not rerender diagrams continuously across tabs when the document is unchanged', async ({ browser }) => {
  const context = await browser.newContext()
  const page1 = await context.newPage()
  const page2 = await context.newPage()

  await page1.goto('/')
  await chooseFlowchart(page1)

  await page2.goto('/')
  await expect(page2.getByTestId('diagram-node')).toHaveCount(1)
  await expect(page2.locator('[data-testid="diagram-node"] svg').first()).toBeVisible()

  await installMutationProbe(page1)
  await page1.waitForTimeout(8000)

  const events = await page1.evaluate(() => {
    const probe = (window as typeof window & {
      __pfRenderProbe?: { stop: () => Array<{ t: number; type: string; added: number; removed: number }> }
    }).__pfRenderProbe
    return probe?.stop() ?? []
  })

  const structuralEvents = events.filter((event) => event.type === 'childList' && (event.added > 0 || event.removed > 0))
  console.log(JSON.stringify({ totalEvents: events.length, structuralEvents }, null, 2))

  expect(structuralEvents).toEqual([])
})
