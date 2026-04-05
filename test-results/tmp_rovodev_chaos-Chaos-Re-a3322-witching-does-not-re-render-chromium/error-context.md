# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tmp_rovodev_chaos.spec.ts >> Chaos: Rendering efficiency >> scenario: selection switching does not re-render
- Location: tests/tmp_rovodev_chaos.spec.ts:193:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.react-flow__pane').first()
    - locator resolved to <div class="react-flow__pane draggable">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button class="group flex flex-col items-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/60 border-zinc-200/80 hover:border-primary/40 hover:bg-white">…</button> from <div data-sidebar-panel="true" class="absolute top-14 bottom-4 left-4 z-20">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button class="group flex flex-col items-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/60 border-zinc-200/80 hover:border-primary/40 hover:bg-white">…</button> from <div data-sidebar-panel="true" class="absolute top-14 bottom-4 left-4 z-20">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    106 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <button class="group flex flex-col items-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/60 border-zinc-200/80 hover:border-primary/40 hover:bg-white">…</button> from <div data-sidebar-panel="true" class="absolute top-14 bottom-4 left-4 z-20">…</div> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - application [ref=e6]:
    - generic [ref=e8]:
      - generic:
        - generic:
          - group [ref=e9]:
            - generic [ref=e10]:
              - textbox [ref=e12]: Diagram 1
              - generic [ref=e14]: Select a diagram
          - group [ref=e15]:
            - generic [ref=e16]:
              - textbox [ref=e18]: Diagram 2
              - document [ref=e21]:
                - generic [ref=e23]:
                  - generic [ref=e31]:
                    - paragraph [ref=e37]: "Yes"
                    - paragraph [ref=e43]: "No"
                  - generic [ref=e44]:
                    - paragraph [ref=e52]: Start
                    - paragraph [ref=e59]: Read Input
                    - paragraph [ref=e66]: Valid?
                    - paragraph [ref=e73]: Process Data
                    - paragraph [ref=e80]: Show Error
                    - paragraph [ref=e87]: Save to DB
                    - paragraph [ref=e95]: End
          - group [ref=e96]:
            - generic [ref=e97]:
              - textbox [ref=e99]: Diagram 3
              - generic [ref=e101]: Select a diagram
          - group [ref=e102]:
            - generic [ref=e103]:
              - textbox [ref=e105]: Diagram 4
              - textbox "Add description…" [ref=e107]
              - generic [ref=e109]: Select a diagram
    - img
    - generic "Control Panel" [ref=e110]:
      - button "Zoom In" [ref=e111] [cursor=pointer]:
        - img [ref=e112]
      - button "Zoom Out" [ref=e114] [cursor=pointer]:
        - img [ref=e115]
      - button "Fit View" [ref=e117] [cursor=pointer]:
        - img [ref=e118]
    - img "Mini Map" [ref=e121]
  - generic:
    - generic [ref=e127]:
      - generic [ref=e129]: PrettyFish
      - generic [ref=e130]: Mermaid Diagram Editor
      - generic [ref=e132]:
        - button [ref=e133]:
          - button [ref=e134]:
            - img
        - button [ref=e135]:
          - button [ref=e136]:
            - img
      - button "Page 1" [ref=e139] [cursor=pointer]:
        - generic [ref=e140]: Page 1
        - img [ref=e141]
    - generic [ref=e143]:
      - button [ref=e144]:
        - button [ref=e145]:
          - img
      - generic [ref=e147]:
        - button "Export" [disabled]:
          - img
          - text: Export
      - button "Share" [ref=e148]:
        - button "Share" [ref=e149]:
          - img
          - text: Share
      - button "Default" [ref=e152] [cursor=pointer]:
        - generic [ref=e157]: Default
        - img [ref=e158]
      - button [ref=e160]:
        - button [ref=e161]:
          - img
      - button [ref=e163]:
        - button [ref=e164]:
          - img
      - button [ref=e165]:
        - button [ref=e166]:
          - img
  - generic [ref=e167]:
    - generic "Drag to resize" [ref=e168]
    - generic [ref=e170]:
      - generic [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]: Editor
          - generic [ref=e174]: •
          - generic [ref=e175]: Diagram 4
        - button [ref=e176]:
          - button [ref=e177]:
            - img
      - generic [ref=e180]:
        - heading "Choose a diagram type" [level=2] [ref=e182]
        - generic [ref=e183]:
          - button "Flowchart Process flows, decision trees" [ref=e184] [cursor=pointer]:
            - img [ref=e186]
            - generic [ref=e191]:
              - generic [ref=e192]: Flowchart
              - generic [ref=e193]: Process flows, decision trees
          - button "Sequence Interactions between actors" [ref=e194] [cursor=pointer]:
            - img [ref=e196]
            - generic [ref=e202]:
              - generic [ref=e203]: Sequence
              - generic [ref=e204]: Interactions between actors
          - button "Class Diagram OOP structure and relationships" [ref=e205] [cursor=pointer]:
            - img [ref=e207]
            - generic [ref=e211]:
              - generic [ref=e212]: Class Diagram
              - generic [ref=e213]: OOP structure and relationships
          - button "ER Diagram Database entity relationships" [ref=e214] [cursor=pointer]:
            - img [ref=e216]
            - generic [ref=e221]:
              - generic [ref=e222]: ER Diagram
              - generic [ref=e223]: Database entity relationships
          - button "State Diagram State machines and transitions" [ref=e224] [cursor=pointer]:
            - img [ref=e226]
            - generic [ref=e236]:
              - generic [ref=e237]: State Diagram
              - generic [ref=e238]: State machines and transitions
          - button "Gantt Chart Project timelines and schedules" [ref=e239] [cursor=pointer]:
            - img [ref=e241]
            - generic [ref=e245]:
              - generic [ref=e246]: Gantt Chart
              - generic [ref=e247]: Project timelines and schedules
          - button "Pie Chart Proportions and distributions" [ref=e248] [cursor=pointer]:
            - img [ref=e250]
            - generic [ref=e255]:
              - generic [ref=e256]: Pie Chart
              - generic [ref=e257]: Proportions and distributions
          - button "Git Graph Git branch and commit history" [ref=e258] [cursor=pointer]:
            - img [ref=e260]
            - generic [ref=e268]:
              - generic [ref=e269]: Git Graph
              - generic [ref=e270]: Git branch and commit history
          - button "Mind Map Ideas, concepts and hierarchies" [ref=e271] [cursor=pointer]:
            - img [ref=e273]
            - generic [ref=e285]:
              - generic [ref=e286]: Mind Map
              - generic [ref=e287]: Ideas, concepts and hierarchies
          - button "Timeline Events across time periods" [ref=e288] [cursor=pointer]:
            - img [ref=e290]
            - generic [ref=e298]:
              - generic [ref=e299]: Timeline
              - generic [ref=e300]: Events across time periods
          - button "Quadrant Chart Feature prioritization matrix" [ref=e301] [cursor=pointer]:
            - img [ref=e303]
            - generic [ref=e308]:
              - generic [ref=e309]: Quadrant Chart
              - generic [ref=e310]: Feature prioritization matrix
          - button "XY Chart Bar and line charts with axes" [ref=e311] [cursor=pointer]:
            - img [ref=e313]
            - generic [ref=e319]:
              - generic [ref=e320]: XY Chart
              - generic [ref=e321]: Bar and line charts with axes
          - button "Architecture System architecture diagrams (beta)" [ref=e322] [cursor=pointer]:
            - img [ref=e324]
            - generic [ref=e329]:
              - generic [ref=e330]: Architecture
              - generic [ref=e331]: System architecture diagrams (beta)
          - button "Kanban Kanban boards with columns and cards" [ref=e332] [cursor=pointer]:
            - img [ref=e334]
            - generic [ref=e338]:
              - generic [ref=e339]: Kanban
              - generic [ref=e340]: Kanban boards with columns and cards
          - button "Sankey Flow diagrams showing quantities" [ref=e341] [cursor=pointer]:
            - img [ref=e343]
            - generic [ref=e355]:
              - generic [ref=e356]: Sankey
              - generic [ref=e357]: Flow diagrams showing quantities
          - button "Block Block diagrams with columns and sections" [ref=e358] [cursor=pointer]:
            - img [ref=e360]
            - generic [ref=e365]:
              - generic [ref=e366]: Block
              - generic [ref=e367]: Block diagrams with columns and sections
          - button "Packet Network packet structure diagrams" [ref=e368] [cursor=pointer]:
            - img [ref=e370]
            - generic [ref=e378]:
              - generic [ref=e379]: Packet
              - generic [ref=e380]: Network packet structure diagrams
          - button "User Journey Map user experiences across touchpoints" [ref=e381] [cursor=pointer]:
            - img [ref=e383]
            - generic [ref=e388]:
              - generic [ref=e389]: User Journey
              - generic [ref=e390]: Map user experiences across touchpoints
          - button "Requirement Requirements and their relationships" [ref=e391] [cursor=pointer]:
            - img [ref=e393]
            - generic [ref=e399]:
              - generic [ref=e400]: Requirement
              - generic [ref=e401]: Requirements and their relationships
          - button "Radar Radar/spider charts for comparison" [ref=e402] [cursor=pointer]:
            - img [ref=e404]
            - generic [ref=e412]:
              - generic [ref=e413]: Radar
              - generic [ref=e414]: Radar/spider charts for comparison
  - button "Add Diagram" [ref=e415]:
    - img
    - text: Add Diagram
```

# Test source

```ts
  112 |     const widthPersist = logs.filter(l => l.scope === 'canvas' && l.message === 'persist diagram width')
  113 |     expect(widthPersist.length).toBe(0)
  114 |   })
  115 | 
  116 |   test('scenario: editor typing stress', async ({ page }) => {
  117 |     const logs = await freshPage(page)
  118 |     // Add diagram, select flowchart type
  119 |     await page.keyboard.press('Control+t')
  120 |     await page.waitForTimeout(400)
  121 |     // Click flowchart in template gallery
  122 |     const flowchartBtn = page.getByText('Flowchart').first()
  123 |     if (await flowchartBtn.isVisible({ timeout: 2000 })) await flowchartBtn.click()
  124 |     await page.waitForTimeout(500)
  125 |     logs.length = 0
  126 | 
  127 |     // Type in editor
  128 |     const editor = page.locator('.cm-editor').first()
  129 |     if (await editor.isVisible({ timeout: 2000 })) {
  130 |       await editor.click()
  131 |       await page.keyboard.press('Control+a')
  132 |       await page.keyboard.type('flowchart LR\n  A --> B --> C --> D\n  D --> E', { delay: 25 })
  133 |     }
  134 |     await page.waitForTimeout(1200) // wait for debounce to settle
  135 |     const issues = analyze(logs, '03_editor_typing_stress')
  136 |     const renders = logs.filter(l => l.scope === 'mermaid-render' && l.message === 'render start')
  137 |     // Should render at most a few times (debounce should batch)
  138 |     expect(renders.length).toBeLessThan(6)
  139 |   })
  140 | 
  141 |   test('scenario: copy paste diagrams', async ({ page }) => {
  142 |     const logs = await freshPage(page)
  143 |     await page.keyboard.press('Control+t')
  144 |     await page.waitForTimeout(300)
  145 |     const flowchartBtn = page.getByText('Flowchart').first()
  146 |     if (await flowchartBtn.isVisible({ timeout: 2000 })) await flowchartBtn.click()
  147 |     await page.waitForTimeout(400)
  148 |     logs.length = 0
  149 | 
  150 |     // Copy/paste 4x
  151 |     for (let i = 0; i < 4; i++) {
  152 |       await page.keyboard.press('Meta+c')
  153 |       await page.waitForTimeout(80)
  154 |       await page.keyboard.press('Meta+v')
  155 |       await page.waitForTimeout(200)
  156 |     }
  157 |     await page.waitForTimeout(600)
  158 |     const issues = analyze(logs, '04_copy_paste_diagrams')
  159 |     const buildNodeCount = logs.filter(l => l.scope === 'canvas' && l.message === 'buildNodes').length
  160 |     expect(buildNodeCount).toBeLessThan(20)
  161 |   })
  162 | 
  163 |   test('scenario: multi-page multi-diagram chaos', async ({ page }) => {
  164 |     const logs = await freshPage(page)
  165 |     // 3 pages
  166 |     for (let i = 0; i < 2; i++) {
  167 |       await page.keyboard.press('Control+Shift+T')
  168 |       await page.waitForTimeout(200)
  169 |     }
  170 |     // Go to page 1, add 3 diagrams
  171 |     await page.keyboard.press('Control+Shift+[')
  172 |     await page.keyboard.press('Control+Shift+[')
  173 |     await page.waitForTimeout(150)
  174 |     for (let i = 0; i < 3; i++) {
  175 |       await page.keyboard.press('Control+t')
  176 |       await page.waitForTimeout(120)
  177 |     }
  178 |     // Page switch stress
  179 |     for (let i = 0; i < 8; i++) {
  180 |       await page.keyboard.press(i % 2 === 0 ? 'Control+Shift+]' : 'Control+Shift+[')
  181 |       await page.waitForTimeout(150)
  182 |     }
  183 |     // Undo a few times
  184 |     for (let i = 0; i < 3; i++) {
  185 |       await page.keyboard.press('Meta+z')
  186 |       await page.waitForTimeout(100)
  187 |     }
  188 |     await page.waitForTimeout(800)
  189 |     analyze(logs, '05_multi_page_chaos')
  190 |     expect(true).toBe(true) // diagnostic — always passes
  191 |   })
  192 | 
  193 |   test('scenario: selection switching does not re-render', async ({ page }) => {
  194 |     const logs = await freshPage(page)
  195 |     // Add 3 diagrams with code
  196 |     await page.keyboard.press('Control+t')
  197 |     await page.waitForTimeout(300)
  198 |     const flowchartBtn = page.getByText('Flowchart').first()
  199 |     if (await flowchartBtn.isVisible({ timeout: 2000 })) await flowchartBtn.click()
  200 |     await page.waitForTimeout(400)
  201 |     for (let i = 0; i < 2; i++) {
  202 |       await page.keyboard.press('Control+t')
  203 |       await page.waitForTimeout(200)
  204 |     }
  205 |     await page.waitForTimeout(600)
  206 |     logs.length = 0
  207 | 
  208 |     // Click each diagram node on canvas to select (via Ctrl+T shortcut switches focus)
  209 |     // Use canvas clicks instead since we don't have test-ids
  210 |     const canvas = page.locator('.react-flow__pane').first()
  211 |     if (await canvas.isVisible({ timeout: 1000 })) {
> 212 |       await canvas.click({ position: { x: 100, y: 300 } })
      |                    ^ Error: locator.click: Test timeout of 60000ms exceeded.
  213 |       await page.waitForTimeout(150)
  214 |       await canvas.click({ position: { x: 700, y: 300 } })
  215 |       await page.waitForTimeout(150)
  216 |       await canvas.click({ position: { x: 1200, y: 300 } })
  217 |       await page.waitForTimeout(150)
  218 |     }
  219 |     await page.waitForTimeout(500)
  220 |     analyze(logs, '06_selection_switching')
  221 |     // Selecting should NOT trigger mermaid re-renders of already-rendered diagrams
  222 |     const renders = logs.filter(l => l.scope === 'mermaid-render' && l.message === 'render start')
  223 |     expect(renders.length).toBeLessThan(5)
  224 |   })
  225 | 
  226 |   test('scenario: undo redo stress', async ({ page }) => {
  227 |     const logs = await freshPage(page)
  228 |     // Create some state to undo
  229 |     for (let i = 0; i < 3; i++) {
  230 |       await page.keyboard.press('Control+t')
  231 |       await page.waitForTimeout(150)
  232 |     }
  233 |     await page.waitForTimeout(300)
  234 |     logs.length = 0
  235 | 
  236 |     // Undo/redo rapidly
  237 |     for (let i = 0; i < 6; i++) {
  238 |       await page.keyboard.press('Meta+z')
  239 |       await page.waitForTimeout(80)
  240 |     }
  241 |     for (let i = 0; i < 6; i++) {
  242 |       await page.keyboard.press('Meta+Shift+z')
  243 |       await page.waitForTimeout(80)
  244 |     }
  245 |     await page.waitForTimeout(600)
  246 |     analyze(logs, '07_undo_redo_stress')
  247 |     const buildNodes = logs.filter(l => l.scope === 'canvas' && l.message === 'buildNodes').length
  248 |     expect(buildNodes).toBeLessThan(30)
  249 |   })
  250 | })
  251 | 
```