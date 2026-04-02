function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Extract unique characters from all text/tspan elements in an SVG string.
 */
function extractSvgText(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const textEls = doc.querySelectorAll('text, tspan')
  const chars = new Set<string>()
  textEls.forEach((el) => {
    const content = el.textContent ?? ''
    for (const ch of content) {
      chars.add(ch)
    }
  })
  // Always include space
  chars.add(' ')
  return Array.from(chars).join('')
}

/**
 * Detect the Google Font family name from a CSS font-family string.
 * Returns null if it's not a Google Font we can subset.
 */
function detectGoogleFontFamily(fontFamily: string): string | null {
  const GOOGLE_FONT_MAP: Record<string, string> = {
    'dm sans': 'DM+Sans',
    'instrument serif': 'Instrument+Serif',
    'jetbrains mono': 'JetBrains+Mono',
  }
  const lower = fontFamily.toLowerCase().replace(/["']/g, '')
  for (const [key, value] of Object.entries(GOOGLE_FONT_MAP)) {
    if (lower.includes(key)) return value
  }
  return null
}

/**
 * Fetch a character-subsetted font from Google Fonts CSS API,
 * then fetch the actual woff2 file and return it as a base64 data URL
 * embedded in a @font-face CSS block.
 */
async function fetchSubsettedFontCSS(
  googleFamily: string,
  chars: string,
): Promise<string | null> {
  try {
    const textParam = encodeURIComponent(chars)
    const cssUrl = `https://fonts.googleapis.com/css2?family=${googleFamily}:wght@400;700&text=${textParam}&display=swap`

    // Google Fonts returns different formats based on User-Agent.
    // Request woff2 by pretending to be a modern browser.
    const cssResp = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
      },
    })
    if (!cssResp.ok) return null
    const cssText = await cssResp.text()

    // Parse out all url() references and fetch + inline them as base64
    const urlRegex = /url\(([^)]+)\)/g
    let result = cssText
    const urls = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(cssText)) !== null) {
      urls.add(match[1])
    }

    for (const fontUrl of urls) {
      try {
        const fontResp = await fetch(fontUrl)
        if (!fontResp.ok) continue
        const blob = await fontResp.blob()
        const b64 = await blobToBase64(blob)
        result = result.replaceAll(fontUrl, b64)
      } catch {
        // Skip fonts that fail to fetch
      }
    }

    return result
  } catch {
    return null
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Embed subsetted fonts into an SVG string by adding a <style> element
 * with @font-face declarations containing base64-encoded font data.
 */
async function embedFontsInSvg(svgString: string, fontFamily: string): Promise<string> {
  const googleFamily = detectGoogleFontFamily(fontFamily)
  if (!googleFamily) return svgString

  const chars = extractSvgText(svgString)
  if (chars.trim().length === 0) return svgString

  const fontCSS = await fetchSubsettedFontCSS(googleFamily, chars)
  if (!fontCSS) return svgString

  // Inject <style> into the SVG
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')
  if (!svgEl) return svgString

  const styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent = fontCSS
  svgEl.insertBefore(styleEl, svgEl.firstChild)

  return new XMLSerializer().serializeToString(svgEl)
}

/**
 * Try to detect the font family used in the SVG from its inline styles or
 * from the mermaid config that was used to render it.
 */
function detectFontFromSvg(svgString: string): string {
  // Look for font-family in the SVG content
  const match = svgString.match(/font-family:\s*["']?([^"';]+)/i)
  return match?.[1]?.trim() ?? ''
}

export async function exportSvg(svgString: string, filename = 'diagram'): Promise<void> {
  const fontFamily = detectFontFromSvg(svgString)
  const withFonts = await embedFontsInSvg(svgString, fontFamily)
  const blob = new Blob([withFonts], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, `${filename}.svg`)
}

export async function exportPng(
  svgString: string,
  bgColor: string,
  filename = 'diagram',
  scale = 2,
): Promise<void> {
  // Embed fonts first so the PNG renders correctly
  const fontFamily = detectFontFromSvg(svgString)
  const withFonts = await embedFontsInSvg(svgString, fontFamily)

  const parser = new DOMParser()
  const doc = parser.parseFromString(withFonts, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')!

  let width = parseFloat(svgEl.getAttribute('width') ?? '0')
  let height = parseFloat(svgEl.getAttribute('height') ?? '0')
  if (!width || !height) {
    const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
    if (vb && vb.length === 4) {
      width = vb[2]
      height = vb[3]
    }
  }
  if (!width) width = 1200
  if (!height) height = 800

  svgEl.setAttribute('width', `${width}px`)
  svgEl.setAttribute('height', `${height}px`)

  const serialized = new XMLSerializer().serializeToString(svgEl)
  const encoded = btoa(unescape(encodeURIComponent(serialized)))
  const dataUrl = `data:image/svg+xml;base64,${encoded}`

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      resolve()
    }
    img.onerror = reject
    img.src = dataUrl
  })

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${filename}.png`)
  }, 'image/png')
}
