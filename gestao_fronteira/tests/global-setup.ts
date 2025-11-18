import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * Configures browser for MCP automation and Brazilian educational context
 */
async function globalSetup(config: FullConfig) {

  // Launch browser for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext({
    // Brazilian Portuguese locale
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',

    // Educational interface optimizations
    reducedMotion: 'reduce',
    colorScheme: 'light',

    // Accessibility settings for Brazilian compliance
    forcedColors: 'none',
  })

  const page = await context.newPage()

  try {
    // Wait for Next.js dev server to be ready
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })

    // Pre-warm the application for faster test execution

    // Navigate to key educational pages to warm up the app
    const warmupPages = [
      '/',
      '/login',
      '/dashboard',
    ]

    for (const path of warmupPages) {
      try {
        await page.goto(`http://localhost:3000${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        })
      } catch (error) {
      }
    }

  } catch (error) {
    throw error
  } finally {
    await browser.close()
  }

}

export default globalSetup