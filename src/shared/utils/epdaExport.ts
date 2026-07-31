/**
 * Preview / Print / Save PDF: render content in an iframe, wait for layout,
 * then browser Print (Save as PDF). Avoids html2canvas which drops borders.
 */

/** Minimum spinner time before showing the HTML preview dialog. */
export const EPDA_PREVIEW_LOAD_DELAY_MS = 2000

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Same print path EPDA uses: settle fonts/layout, then iframe.contentWindow.print()
 * (browser “Save as PDF” destination).
 *
 * Waits for `afterprint` before resolving so the preview dialog can stay mounted
 * and the system print window is not torn down early.
 */
export async function printPreviewIframe(
  iframe: HTMLIFrameElement,
  settleMs: number = EPDA_PREVIEW_LOAD_DELAY_MS
): Promise<void> {
  const frameWin = iframe.contentWindow
  if (!frameWin) {
    throw new Error('Preview is not ready yet. Please try again.')
  }

  await delay(settleMs)

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      frameWin.removeEventListener('afterprint', finish)
      resolve()
    }

    frameWin.addEventListener('afterprint', finish)

    try {
      frameWin.focus()
      frameWin.print()
    } catch (error) {
      frameWin.removeEventListener('afterprint', finish)
      reject(
        error instanceof Error ? error : new Error('Failed to open print dialog')
      )
      return
    }

    // Fallback if the browser never emits afterprint.
    window.setTimeout(finish, 120_000)
  })
}

/**
 * Trigger an immediate download of a PDF blob URL (booking / transport docs).
 * Clones the blob first so the caller can revoke the preview URL safely.
 */
export async function downloadPdfBlobUrl(
  url: string,
  fileName: string
): Promise<void> {
  const safeName = fileName.toLowerCase().endsWith('.pdf')
    ? fileName
    : `${fileName}.pdf`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to download PDF')
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = safeName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  }
}
