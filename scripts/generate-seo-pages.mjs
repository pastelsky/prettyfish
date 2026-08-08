import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DIAGRAM_REFS } from '../src/lib/referenceData.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')
const guidesDir = path.join(publicDir, 'guides')
const screenshotsDir = path.join(publicDir, 'screenshots')
const sourceScreenshotsDir = path.join(projectRoot, 'docs', 'screenshots')

const BASE_URL = 'https://pretty.fish'

const GUIDE_CONFIG = {
  flowchart: {
    slug: 'flowchart-maker',
    heading: 'Mermaid Flowchart Maker',
    intent: 'Build cleaner Mermaid flowcharts with live preview, better themes, and export-ready output.',
    useCases: ['process maps', 'decision trees', 'system diagrams'],
    detail:
      'Flowchart searches are usually high-intent: someone already knows the diagram they need, but wants a Mermaid workflow that does not leave them with bland default output. This page leans into that by pairing real syntax with a stronger visual presentation story.',
    screenshot: {
      src: '/screenshots/workspace-overview.png',
      alt: 'Pretty Fish workspace showing a polished Mermaid flowchart on the infinite canvas',
      caption: 'The main workspace is built for flowchart iteration: source on one side, polished output on the other, with room for multiple diagrams.',
    },
  },
  sequenceDiagram: {
    slug: 'sequence-diagram-editor',
    heading: 'Mermaid Sequence Diagram Editor',
    intent: 'Write Mermaid sequence diagrams that are easier to style, present, and share.',
    useCases: ['API flows', 'service interactions', 'async request timelines'],
    detail:
      'Sequence diagrams need two things to be useful in practice: syntax that is easy to tweak and output that still looks good when dropped into an RFC, API review, or incident write-up. Pretty Fish is meant to improve exactly that workflow.',
    screenshot: {
      src: '/screenshots/reference-docs.png',
      alt: 'Pretty Fish reference docs panel open next to Mermaid editing tools for sequence diagrams',
      caption: 'Reference material stays close to the editor, which matters for sequence diagrams where small syntax changes can alter message order, actors, and grouping.',
    },
  },
  classDiagram: {
    slug: 'class-diagram-tool',
    heading: 'Mermaid Class Diagram Tool',
    intent: 'Model Mermaid class diagrams with a prettier visual style and faster iteration loop.',
    useCases: ['domain models', 'OO design reviews', 'UML sketches'],
  },
  stateDiagram: {
    slug: 'state-diagram-editor',
    heading: 'Mermaid State Diagram Editor',
    intent: 'Design Mermaid state diagrams with better readability, themes, and export options.',
    useCases: ['UI flows', 'workflow states', 'state machine design'],
  },
  erDiagram: {
    slug: 'er-diagram-tool',
    heading: 'Mermaid ER Diagram Tool',
    intent: 'Create Mermaid ER diagrams and database relationship maps with cleaner styling.',
    useCases: ['database schemas', 'entity modeling', 'data design reviews'],
    detail:
      'ER diagram visitors usually care about readability first. If the relationship graph feels cramped or generic, it is hard to use in planning or review. The pitch here is simple: keep Mermaid, but make the output more presentation-ready.',
    screenshot: {
      src: '/screenshots/dark-workspace.png',
      alt: 'Pretty Fish dark mode workspace with a Mermaid diagram styled for presentation',
      caption: 'Theming is not cosmetic only. For ER diagrams, stronger contrast and cleaner linework make schema reviews easier to scan.',
    },
  },
  gantt: {
    slug: 'gantt-chart-maker',
    heading: 'Mermaid Gantt Chart Maker',
    intent: 'Turn Mermaid Gantt charts into presentation-ready project timelines.',
    useCases: ['roadmaps', 'project plans', 'delivery schedules'],
  },
  pie: {
    slug: 'pie-chart-maker',
    heading: 'Mermaid Pie Chart Maker',
    intent: 'Create Mermaid pie charts with a more polished visual treatment and export flow.',
    useCases: ['composition views', 'quick breakdowns', 'status summaries'],
  },
  gitGraph: {
    slug: 'gitgraph-editor',
    heading: 'Mermaid Git Graph Editor',
    intent: 'Show branching strategies and release history with a better-looking Mermaid gitGraph view.',
    useCases: ['release flows', 'branching models', 'Git training docs'],
  },
  mindmap: {
    slug: 'mindmap-maker',
    heading: 'Mermaid Mindmap Maker',
    intent: 'Build Mermaid mindmaps that feel more polished and easier to present.',
    useCases: ['brainstorming', 'knowledge maps', 'planning sessions'],
  },
  timeline: {
    slug: 'timeline-maker',
    heading: 'Mermaid Timeline Maker',
    intent: 'Lay out Mermaid timelines with clearer structure and better themes.',
    useCases: ['project milestones', 'incident retrospectives', 'historical sequences'],
  },
  quadrantChart: {
    slug: 'quadrant-chart-maker',
    heading: 'Mermaid Quadrant Chart Maker',
    intent: 'Make Mermaid quadrant charts that are easier to compare and easier to share.',
    useCases: ['prioritization matrices', 'strategy maps', 'portfolio views'],
  },
  xychart: {
    slug: 'xy-chart-maker',
    heading: 'Mermaid XY Chart Maker',
    intent: 'Plot Mermaid XY charts with stronger defaults and better export quality.',
    useCases: ['trend lines', 'metric comparisons', 'simple charting'],
  },
  kanban: {
    slug: 'kanban-board-maker',
    heading: 'Mermaid Kanban Board Maker',
    intent: 'Create Mermaid kanban boards with a cleaner visual language and fast editing flow.',
    useCases: ['work tracking', 'delivery boards', 'process snapshots'],
  },
  sankey: {
    slug: 'sankey-diagram-maker',
    heading: 'Mermaid Sankey Diagram Maker',
    intent: 'Build Mermaid sankey diagrams that communicate flow volumes more clearly.',
    useCases: ['resource flows', 'cost allocation', 'traffic movement'],
  },
  block: {
    slug: 'block-diagram-maker',
    heading: 'Mermaid Block Diagram Maker',
    intent: 'Create Mermaid block diagrams with more polished presentation and simpler exports.',
    useCases: ['system architecture', 'module layout', 'high-level overviews'],
  },
  packet: {
    slug: 'packet-diagram-maker',
    heading: 'Mermaid Packet Diagram Maker',
    intent: 'Document Mermaid packet diagrams with better legibility and prettier themes.',
    useCases: ['network docs', 'packet structure', 'protocol explainers'],
  },
  journey: {
    slug: 'journey-map-maker',
    heading: 'Mermaid Journey Map Maker',
    intent: 'Create Mermaid journey diagrams that are easier to review in product and UX work.',
    useCases: ['customer journeys', 'user onboarding', 'service design'],
  },
  requirement: {
    slug: 'requirement-diagram-tool',
    heading: 'Mermaid Requirement Diagram Tool',
    intent: 'Organize Mermaid requirement diagrams with stronger visual hierarchy and export options.',
    useCases: ['system requirements', 'traceability docs', 'planning artifacts'],
  },
  radar: {
    slug: 'radar-chart-maker',
    heading: 'Mermaid Radar Chart Maker',
    intent: 'Build Mermaid radar charts with a sharper look for comparisons and presentations.',
    useCases: ['capability comparisons', 'scorecards', 'multi-axis reviews'],
  },
  architecture: {
    slug: 'architecture-diagram-maker',
    heading: 'Mermaid Architecture Diagram Maker',
    intent: 'Design Mermaid architecture diagrams with better themes, cleaner exports, and faster iteration.',
    useCases: ['cloud systems', 'service topology', 'technical overviews'],
    detail:
      'Architecture diagram searches often start as documentation work and end as communication work. The diagram has to survive not just the editor, but screenshots, design docs, planning decks, and review threads. These pages should speak to that end-to-end use case.',
    screenshot: {
      src: '/screenshots/workspace-overview.png',
      alt: 'Pretty Fish showing a multi-diagram workspace useful for architecture modeling',
      caption: 'Architecture work benefits from the multi-diagram canvas because one system usually needs several complementary Mermaid views, not one isolated chart.',
    },
  },
}

const sharedValueProps = [
  'Prettier Mermaid themes that make diagrams feel presentation-ready',
  'Live editing with immediate visual feedback',
  'Multi-diagram canvas for organizing related work',
  'Fast export to SVG, PNG, or raw Mermaid',
  'Shareable URLs for reviews and async collaboration',
]

const ADDITIONAL_GUIDES = [
  {
    slug: 'mermaid-live-editor-alternative',
    heading: 'Mermaid Live Editor Alternative: A Multi-Diagram Workspace',
    label: 'Mermaid Live Editor alternative',
    intent: 'Compare a focused Mermaid workspace with a single-diagram sandbox, then choose the workflow that fits the job.',
  },
]

const guideFaqs = {
  starter: (label) => `How do I start a Mermaid ${label.toLowerCase()} in Pretty Fish?`,
  starterAnswer: (label) => `Open one of the starter examples on this page, edit the Mermaid source, and keep iterating until the diagram is ready to export or share.`,
  styling: (label) => `Why use Pretty Fish instead of a plain Mermaid ${label.toLowerCase()} editor?`,
  stylingAnswer: () => 'Pretty Fish keeps Mermaid as the source of truth, but improves the working experience with stronger themes, prettier defaults, a multi-diagram canvas, and quick exports.',
  export: (label) => `Can I export this Mermaid ${label.toLowerCase()} once it looks right?`,
  exportAnswer: () => 'Yes. The editor is built around shipping diagrams into docs, specs, and slides, so SVG and PNG export are first-class flows.',
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase())
}

function fallbackConfig(id, label) {
  const readable = toTitleCase(label)
  return {
    slug: `${id.toLowerCase()}-diagram-maker`,
    heading: `Mermaid ${readable} Maker`,
    intent: `Create ${readable.toLowerCase()} diagrams in Mermaid with better themes, nicer defaults, and quick export.`,
    useCases: ['technical docs', 'team communication', 'visual explanations'],
  }
}

function summarizeExamples(diagram) {
  const examples = []

  for (const element of diagram.elements) {
    for (const example of element.examples) {
      examples.push({
        label: `${element.name} · ${example.label}`,
        code: example.code,
      })
      if (examples.length === 4) return examples
    }
  }

  return examples
}

function encodeStateToHash(state) {
  const json = JSON.stringify(state)
  return `#/d/${Buffer.from(json, 'utf8').toString('base64')}`
}

function buildStarterState(diagramLabel, example) {
  return {
    version: 1,
    activePageId: 'page-1',
    mode: 'light',
    editorLigatures: true,
    autoFormat: true,
    pages: [
      {
        id: 'page-1',
        name: `${diagramLabel} Examples`,
        activeDiagramId: 'diagram-1',
        diagrams: [
          {
            id: 'diagram-1',
            name: example.label,
            description: `${diagramLabel} starter example`,
            code: example.code,
            x: 0,
            y: 0,
            width: 640,
            mermaidTheme: 'blueprint',
            configOverrides: {},
          },
        ],
      },
    ],
  }
}

function buildStarterLink(diagramLabel, example) {
  const state = buildStarterState(diagramLabel, example)
  return `${BASE_URL}/${encodeStateToHash(state)}`
}

function buildGuideHtml(diagramId, diagram, config, guideLinks) {
  const pageUrl = `${BASE_URL}/guides/${config.slug}/`
  const examples = summarizeExamples(diagram)
  const title = `${config.heading} | Pretty Fish`
  const description = `${config.intent} Pretty Fish is a prettier Mermaid editor with themes, live preview, multi-page canvases, and export-friendly output.`
  const keywords = [
    `${diagram.label} mermaid editor`,
    `${diagram.label} mermaid examples`,
    `${diagram.label} maker`,
    'pretty mermaid diagrams',
    'mermaid themes',
  ]

  const introParagraph = `${config.intent} Pretty Fish keeps the Mermaid source front and center, but gives the output a more polished feel with stronger themes and a faster editing loop than a plain Mermaid sandbox.`
  const useCases = config.useCases.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const valueProps = sharedValueProps.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const exampleCards = examples.map((example) => `
    <article class="example-card">
      <h3>${escapeHtml(example.label)}</h3>
      <p>${escapeHtml(`A working Mermaid ${diagram.label.toLowerCase()} starter you can open directly in Pretty Fish.`)}</p>
      <pre><code>${escapeHtml(example.code)}</code></pre>
      <div class="example-card__actions">
        <a class="button button--primary" href="${buildStarterLink(diagram.label, example)}">Open this example</a>
      </div>
    </article>
  `).join('')
  const syntaxRows = diagram.elements.map((element) => `
    <tr>
      <td>${escapeHtml(element.name)}</td>
      <td><code>${escapeHtml(element.syntax)}</code></td>
      <td>${escapeHtml(element.description)}</td>
    </tr>
  `).join('')
  const patternList = diagram.elements.slice(0, 8).map((element) => `<li><strong>${escapeHtml(element.name)}:</strong> ${escapeHtml(element.description)}</li>`).join('')
  const relatedLinks = guideLinks
    .filter((entry) => entry.slug !== config.slug)
    .slice(0, 6)
    .map((entry) => `<li><a href="/guides/${entry.slug}/">${escapeHtml(entry.label)}</a></li>`)
    .join('')
  const faqItems = [
    {
      q: guideFaqs.starter(diagram.label),
      a: guideFaqs.starterAnswer(diagram.label),
    },
    {
      q: guideFaqs.styling(diagram.label),
      a: guideFaqs.stylingAnswer(),
    },
    {
      q: guideFaqs.export(diagram.label),
      a: guideFaqs.exportAnswer(),
    },
  ]
  const faqHtml = faqItems.map((item) => `
    <details class="faq-item">
      <summary>${escapeHtml(item.q)}</summary>
      <p>${escapeHtml(item.a)}</p>
    </details>
  `).join('')

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: config.heading,
    description,
    author: {
      '@type': 'Organization',
      name: 'Pretty Fish',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pretty Fish',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: pageUrl,
    about: {
      '@type': 'SoftwareApplication',
      name: 'Pretty Fish',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      url: BASE_URL,
    },
    keywords,
  }
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
  const screenshotBlock = config.screenshot
    ? `
        <section class="panel panel--full panel--screenshot">
          <div class="screenshot-copy">
            <h2>What this looks like in Pretty Fish</h2>
            <p>${escapeHtml(config.detail ?? `${diagram.label} work gets better when the editor and the final visual treatment both hold up under review.`)}</p>
            <p>${escapeHtml(config.screenshot.caption)}</p>
          </div>
          <figure class="screenshot-frame">
            <img src="${config.screenshot.src}" alt="${escapeHtml(config.screenshot.alt)}" loading="lazy" />
            <figcaption>${escapeHtml(config.screenshot.caption)}</figcaption>
          </figure>
        </section>
      `
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${config.screenshot ? `${BASE_URL}${config.screenshot.src}` : `${BASE_URL}/og-image.png`}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${config.screenshot ? `${BASE_URL}${config.screenshot.src}` : `${BASE_URL}/og-image.png`}" />
    <link rel="stylesheet" href="/seo-guides.css" />
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
    <script type="application/ld+json">${JSON.stringify(faqStructuredData)}</script>
  </head>
  <body>
    <div class="page-shell">
      <header class="hero">
        <div class="hero__eyebrow">Pretty Fish Mermaid Guides</div>
        <h1>${escapeHtml(config.heading)}</h1>
        <p>${escapeHtml(introParagraph)}</p>
        <div class="hero__actions">
          <a class="button button--primary" href="/">Open Pretty Fish</a>
          <a class="button" href="/guides/">Browse all Mermaid guides</a>
        </div>
      </header>

      <main class="content-grid">
        <section class="panel">
          <h2>Why teams use this Mermaid ${escapeHtml(diagram.label.toLowerCase())} page</h2>
          <p>This page is built around actual Mermaid ${escapeHtml(diagram.label.toLowerCase())} syntax, starter examples, and editor entry points. It is meant to help someone complete the task, not just land on a keyword page.</p>
          <ul>${useCases}</ul>
        </section>

        <section class="panel">
          <h2>Why Pretty Fish fits Mermaid better</h2>
          <ul>${valueProps}</ul>
        </section>

        ${screenshotBlock}

        <section class="panel panel--full">
          <h2>Open a Mermaid ${escapeHtml(diagram.label)} starter in the app</h2>
          <p>These links open directly in Pretty Fish with a real Mermaid example loaded into the editor. That keeps each guide useful as a marketing page and as a working starting point.</p>
          <div class="starter-links">
            ${examples.map((example) => `<a class="button" href="${buildStarterLink(diagram.label, example)}">${escapeHtml(example.label)}</a>`).join('')}
          </div>
        </section>

        <section class="panel panel--full">
          <h2>Mermaid ${escapeHtml(diagram.label)} syntax examples</h2>
          <div class="example-grid">
            ${exampleCards}
          </div>
        </section>

        <section class="panel">
          <h2>Most useful Mermaid ${escapeHtml(diagram.label)} patterns</h2>
          <ul>${patternList}</ul>
        </section>

        <section class="panel">
          <h2>Use this page when you need</h2>
          <p>${escapeHtml(`A Mermaid ${diagram.label.toLowerCase()} page that helps with both discovery and execution: examples to borrow, syntax to reference, and a direct jump into a prettier Mermaid editing workflow.`)}</p>
        </section>

        <section class="panel panel--full">
          <h2>Useful Mermaid ${escapeHtml(diagram.label)} syntax</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Syntax</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                ${syntaxRows}
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>What to optimize for</h2>
          <p>If someone is searching for a Mermaid ${escapeHtml(diagram.label.toLowerCase())} editor, they usually want three things: correct syntax, a fast feedback loop, and visuals that are good enough to ship into docs, specs, or slides.</p>
        </section>

        <section class="panel">
          <h2>Common questions</h2>
          <div class="faq-list">
            ${faqHtml}
          </div>
        </section>

        <section class="panel">
          <h2>Related Mermaid guides</h2>
          <ul>${relatedLinks}</ul>
        </section>
      </main>
    </div>
  </body>
</html>`
}

function buildIndexHtml(guideLinks) {
  const title = 'Mermaid Diagram Guides and Diagram Type Pages | Pretty Fish'
  const description = 'Browse Mermaid editor landing pages, syntax guides, and examples for flowcharts, sequence diagrams, ERDs, Gantt charts, architecture diagrams, and more.'
  const cards = guideLinks.map((guide) => `
    <article class="guide-card">
      <h2><a href="/guides/${guide.slug}/">${escapeHtml(guide.heading)}</a></h2>
      <p>${escapeHtml(guide.intent)}</p>
      <div class="guide-card__meta">${escapeHtml(guide.label)}</div>
    </article>
  `).join('').trimEnd()

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}/guides/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${BASE_URL}/guides/" />
    <meta property="og:image" content="${BASE_URL}/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${BASE_URL}/og-image.png" />
    <link rel="stylesheet" href="/seo-guides.css" />
  </head>
  <body>
    <div class="page-shell">
      <header class="hero">
        <div class="hero__eyebrow">Pretty Fish Mermaid Guides</div>
        <h1>Mermaid diagram pages for every chart type Pretty Fish supports</h1>
        <p>These pages exist to capture real search intent around Mermaid syntax, examples, and editor discovery, while consistently reinforcing what Pretty Fish is best at: prettier themes, cleaner exports, and a better editing loop for Mermaid diagrams.</p>
        <div class="hero__actions">
          <a class="button button--primary" href="/">Open Pretty Fish</a>
        </div>
      </header>

      <main class="guide-grid">
        ${cards}
      </main>
    </div>
  </body>
</html>`
}

function buildMermaidLiveEditorAlternativeHtml(guideLinks) {
  const pageUrl = `${BASE_URL}/guides/mermaid-live-editor-alternative/`
  const title = 'Mermaid Live Editor Alternative: A Multi-Diagram Workspace | Pretty Fish'
  const description = 'Looking for a Mermaid Live Editor alternative? Compare a focused multi-diagram Mermaid workspace with a single-diagram sandbox, then try Pretty Fish without an account.'
  const relatedLinks = guideLinks
    .slice(0, 6)
    .map((guide) => `<li><a href="/guides/${guide.slug}/">${escapeHtml(guide.label)}</a></li>`)
    .join('')
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'TechArticle',
    headline: 'Mermaid Live Editor Alternative: A Multi-Diagram Workspace', description,
    author: { '@type': 'Organization', name: 'Pretty Fish' },
    publisher: { '@type': 'Organization', name: 'Pretty Fish' }, mainEntityOfPage: pageUrl,
    about: { '@type': 'SoftwareApplication', name: 'Pretty Fish', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', url: BASE_URL },
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${BASE_URL}/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${BASE_URL}/og-image.png" />
    <link rel="stylesheet" href="/seo-guides.css" />
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  </head>
  <body>
    <div class="page-shell">
      <header class="hero">
        <div class="hero__eyebrow">Pretty Fish Mermaid Guides</div>
        <h1>Mermaid Live Editor alternative: work across a whole diagram set</h1>
        <p>Use the right tool for the job. A single-diagram sandbox is excellent for trying a snippet. Pretty Fish is for the next step: iterating on several Mermaid diagrams, polishing their appearance, and exporting something ready for a document or review.</p>
        <div class="hero__actions"><a class="button button--primary" href="/">Open Pretty Fish</a><a class="button" href="/guides/">Browse Mermaid guides</a></div>
      </header>
      <main class="content-grid">
        <section class="panel panel--full"><h2>When a Mermaid workspace is the better fit</h2><p>Choose a focused editor when the diagram is part of a larger piece of work: an architecture review, a design document, a database discussion, or an incident write-up. Keeping related diagrams on one canvas reduces the friction of jumping between separate snippets and makes it easier to keep visual treatment consistent.</p><ul><li>You need more than one diagram for the same project or document.</li><li>You want to try visual themes before exporting an SVG or PNG.</li><li>You want Mermaid source to stay editable while you refine the presentation.</li><li>You need a shareable link for a teammate to open without creating an account.</li></ul></section>
        <section class="panel"><h2>What to keep from a sandbox workflow</h2><p>Mermaid works best when the source remains the source of truth. Start with a small valid example, make one change at a time, and keep the code next to the rendered result. Pretty Fish follows that same loop rather than replacing Mermaid with a proprietary diagram format.</p></section>
        <section class="panel"><h2>What Pretty Fish adds</h2><ul><li>Multiple diagrams on a single canvas and multiple pages in one workspace.</li><li>Theme choices and configuration controls for a more presentation-ready output.</li><li>SVG and PNG export alongside the original Mermaid source.</li><li>Reference material, templates, and live rendering in the same browser tab.</li></ul></section>
        <section class="panel panel--full"><h2>A practical migration path</h2><ol><li>Copy an existing Mermaid block into Pretty Fish.</li><li>Check the rendered result and correct syntax while the source is visible.</li><li>Add the companion sequence, ER, or architecture diagram on the same page.</li><li>Choose a theme that matches the document or presentation where the diagram will appear.</li><li>Export the final diagram while retaining the Mermaid code for future edits.</li></ol></section>
        <section class="panel"><h2>Try a relevant starter</h2><p>Start with the diagram type closest to the task, then adapt the working syntax rather than beginning from a blank editor.</p><ul>${relatedLinks}</ul></section>
        <section class="panel"><h2>Questions this page answers</h2><div class="faq-list"><details class="faq-item"><summary>Is Pretty Fish compatible with Mermaid?</summary><p>Yes. Pretty Fish keeps Mermaid source editable and renders it live in the browser.</p></details><details class="faq-item"><summary>Can I use Pretty Fish without an account?</summary><p>Yes. Open the editor, paste Mermaid code, and work directly in the browser.</p></details><details class="faq-item"><summary>Can I move from a single diagram to a larger workspace?</summary><p>Yes. Add related diagrams to the canvas, organize them into pages, and preserve the source for each one.</p></details></div></section>
      </main>
    </div>
  </body>
</html>`
}

function buildSitemapXml(guideLinks) {
  const pages = [
    { url: `${BASE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { url: `${BASE_URL}/guides/`, priority: '0.9', changefreq: 'weekly' },
    ...guideLinks.map((guide) => ({
      url: `${BASE_URL}/guides/${guide.slug}/`,
      priority: '0.8',
      changefreq: 'weekly',
    })),
  ]

  const xmlRows = pages.map((page) => `  <url>
    <loc>${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlRows}
</urlset>
`
}

async function main() {
  const guideLinks = Object.entries(DIAGRAM_REFS).map(([diagramId, diagram]) => {
    const config = GUIDE_CONFIG[diagramId] ?? fallbackConfig(diagramId, diagram.label)
    return {
      ...config,
      label: diagram.label,
      diagramId,
    }
  })
  const allGuideLinks = [...guideLinks, ...ADDITIONAL_GUIDES]

  await mkdir(guidesDir, { recursive: true })
  await mkdir(screenshotsDir, { recursive: true })

  const screenshotFiles = new Set(
    guideLinks
      .map((guide) => guide.screenshot?.src)
      .filter(Boolean)
      .map((src) => src.split('/').at(-1)),
  )

  for (const fileName of screenshotFiles) {
    await copyFile(path.join(sourceScreenshotsDir, fileName), path.join(screenshotsDir, fileName))
  }

  for (const guide of guideLinks) {
    const diagram = DIAGRAM_REFS[guide.diagramId]
    const pageDir = path.join(guidesDir, guide.slug)
    await mkdir(pageDir, { recursive: true })
    const html = buildGuideHtml(guide.diagramId, diagram, guide, guideLinks)
    await writeFile(path.join(pageDir, 'index.html'), html, 'utf8')
  }

  const alternativeDir = path.join(guidesDir, 'mermaid-live-editor-alternative')
  await mkdir(alternativeDir, { recursive: true })
  await writeFile(path.join(alternativeDir, 'index.html'), buildMermaidLiveEditorAlternativeHtml(guideLinks), 'utf8')

  await writeFile(path.join(guidesDir, 'index.html'), buildIndexHtml(allGuideLinks), 'utf8')
  await writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(allGuideLinks), 'utf8')
}

await main()
