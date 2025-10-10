import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * Configures browser for MCP automation and Brazilian educational context
 */
async function globalSetup(config: FullConfig) {
  // console.log('🚀 Setting up Playwright for Brazilian Educational UI/UX Testing...')

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
    // console.log('⏳ Waiting for Next.js dev server at http://localhost:3000...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    // console.log('✅ Next.js dev server is ready')

    // Pre-warm the application for faster test execution
    // console.log('🔥 Pre-warming application for educational workflows...')

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
        // console.log(`✅ Warmed up: ${path}`)
      } catch (error) {
        // console.log(`⚠️  Could not warm up ${path} (may not exist yet): ${error}`)
      }
    }

  } catch (error) {
    // console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  // console.log('🎯 Playwright setup complete - Ready for MCP automation!')
}

export default globalSetup