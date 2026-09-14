import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { Download, Page, TestInfo } from '@playwright/test'

/** Evidence only: observes the existing scenario without changing download behavior. */
export async function instrumentDownload(page: Page) {
  const scripts: { url: string; status: number }[] = []
  const issues: { kind: string; detail: string }[] = []
  page.on('response', response => {
    if (response.request().resourceType() === 'script') scripts.push({ url: response.url(), status: response.status() })
    if (response.status() >= 400) issues.push({ kind: 'response', detail: `${response.status()} ${response.url()}` })
  })
  page.on('console', message => {
    if (message.type() === 'error') issues.push({ kind: 'console', detail: message.text() })
  })
  page.on('pageerror', error => issues.push({ kind: 'pageerror', detail: error.message }))
  page.on('requestfailed', request => issues.push({ kind: 'requestfailed', detail: `${request.url()} ${request.failure()?.errorText}` }))
  await page.addInitScript(() => {
    const clicks: { method: string; href: string; download: string; connected: boolean; stack: string | undefined }[] = []
    function record(anchor: HTMLAnchorElement, method: string) {
      clicks.push({ method, href: anchor.href, download: anchor.download, connected: anchor.isConnected, stack: new Error().stack })
      sessionStorage.setItem('educa-download-diagnostic', JSON.stringify(clicks))
    }
    const nativeClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      record(this, 'click')
      return nativeClick.call(this)
    }
    const nativeDispatch = HTMLAnchorElement.prototype.dispatchEvent
    HTMLAnchorElement.prototype.dispatchEvent = function (event: Event) {
      if (event.type === 'click') record(this, 'dispatchEvent')
      return nativeDispatch.call(this, event)
    }
  })
  return async (download: Download, testInfo: TestInfo) => {
    const artifact = testInfo.outputPath('frequency-download-diagnostic.bin')
    let saveError: string | null = null
    try { await download.saveAs(artifact) } catch (error) { saveError = String(error) }
    const bytes = saveError === null ? await readFile(artifact) : null
    const browserPage = await page.evaluate(() => ({
      url: location.href, origin: location.origin, userAgent: navigator.userAgent,
      anchorEvents: sessionStorage.getItem('educa-download-diagnostic'),
    }))
    const metadata = {
      browser: page.context().browser()?.browserType().name(), version: page.context().browser()?.version(),
      page: browserPage, scripts, issues,
      download: { url: download.url(), suggestedFilename: download.suggestedFilename(), failure: await download.failure(),
        saveError, bytes: bytes?.length, prefixHex: bytes?.subarray(0, 64).toString('hex'),
        sha256: bytes === null ? null : createHash('sha256').update(bytes).digest('hex') },
    }
    await testInfo.attach('frequency-download-diagnostic.json', { body: JSON.stringify(metadata, null, 2), contentType: 'application/json' })
    if (bytes) await testInfo.attach('frequency-download-diagnostic.bin', { body: bytes, contentType: 'application/octet-stream' })
  }
}
