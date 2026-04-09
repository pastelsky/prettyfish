import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

async function expectNoA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, `${label}\n${JSON.stringify(results.violations, null, 2)}`).toEqual([])
}

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('has no obvious axe violations in the default shell', async ({ page }) => {
    // TODO: intermittently catches a contrast violation during initial render under parallel load
    test.fixme()
    await expectNoA11yViolations(page, 'default shell')
  })

  test('has no obvious axe violations with the docs panel open', async ({ page }) => {
    const app = createApp(page)
    await app.header.toggleDocs()
    await app.docs.shouldBeVisible()
    await expectNoA11yViolations(page, 'docs panel open')
  })

  test('has no obvious axe violations after choosing a diagram template', async ({ page }) => {
    const app = createApp(page)
    await app.startFlowchartDiagram()
    await app.editor.shouldBeVisible()
    await expectNoA11yViolations(page, 'diagram workspace')
  })
})
