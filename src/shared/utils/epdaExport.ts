/**
 * EPDA export: render full HTML first, then let the browser produce PDF via Print
 * (Save as PDF). Avoids html2canvas/html2pdf which drops table borders and layout.
 */

/** Minimum spinner time before showing the HTML preview dialog. */
export const EPDA_PREVIEW_LOAD_DELAY_MS = 2000

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
