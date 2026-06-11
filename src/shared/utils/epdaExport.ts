/**
 * EPDA export: render full HTML first, then let the browser produce PDF via Print
 * (Save as PDF). Avoids html2canvas/html2pdf which drops table borders and layout.
 */

/** Minimum spinner time before showing the HTML preview dialog. */
export const EPDA_PREVIEW_LOAD_DELAY_MS = 2000

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function toHtmlFileName(fileName: string): string {
  if (fileName.toLowerCase().endsWith('.html')) return fileName
  return fileName.replace(/\.pdf$/i, '.html')
}

/** Download a standalone `.html` file (complete document from the template). */
export function downloadEpdaHtml(html: string, fileName: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = toHtmlFileName(fileName)
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Open the EPDA as a real HTML document and trigger the browser print dialog.
 * User selects "Save as PDF" / "Microsoft Print to PDF" for a vector-faithful PDF.
 */
export async function printEpdaAsPdf(html: string): Promise<void> {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups to export EPDA as PDF.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  await new Promise<void>((resolve) => {
    const runPrint = () => {
      printWindow.focus()
      printWindow.print()
      resolve()
    }

    if (printWindow.document.readyState === 'complete') {
      window.setTimeout(runPrint, 600)
      return
    }

    printWindow.addEventListener('load', () => window.setTimeout(runPrint, 600), { once: true })
  })
}
