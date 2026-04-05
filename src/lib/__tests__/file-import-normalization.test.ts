// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest'

import { loadProjectFile } from '../file'

describe('project file loading', () => {
  test('returns null for corrupt json', async () => {
    const input = document.createElement('input')
    vi.spyOn(document, 'createElement').mockReturnValue(input)

    const resultPromise = loadProjectFile()
    Object.defineProperty(input, 'files', {
      value: [{ text: async () => '{bad json' }],
      configurable: true,
    })
    input.onchange?.(new Event('change'))

    await expect(resultPromise).resolves.toBeNull()
  })

  test('normalizes partial valid project files', async () => {
    const input = document.createElement('input')
    vi.spyOn(document, 'createElement').mockReturnValue(input)

    const resultPromise = loadProjectFile()
    Object.defineProperty(input, 'files', {
      value: [{ text: async () => JSON.stringify({ pages: [{ diagrams: [{ code: 'flowchart TD\nA-->B' }] }] }) }],
      configurable: true,
    })
    input.onchange?.(new Event('change'))

    await expect(resultPromise).resolves.toMatchObject({
      version: 1,
      pages: expect.any(Array),
      activePageId: expect.any(String),
    })
  })
})
