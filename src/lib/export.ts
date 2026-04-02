function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportSvg(svgString: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, 'diagram.svg')
}

export async function exportPng(svgString: string, bgColor: string): Promise<void> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')!

  // Resolve dimensions from explicit attrs or viewBox
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

  // Use base64 data URL to avoid canvas taint issues with blob URLs
  const serialized = new XMLSerializer().serializeToString(svgEl)
  const encoded = btoa(unescape(encodeURIComponent(serialized)))
  const dataUrl = `data:image/svg+xml;base64,${encoded}`

  const scale = 2 // HiDPI / retina
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
    if (blob) downloadBlob(blob, 'diagram.png')
  }, 'image/png')
}
