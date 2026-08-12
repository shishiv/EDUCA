import { afterEach, describe, expect, it, vi } from 'vitest'

const environmentKeys = [
  'PILOT_LEGACY_APP_NAME',
  'PLAYWRIGHT_BASE_URL',
  'PILOT_LEGACY_SERVER_MANAGED',
] as const

const originalEnvironment = Object.fromEntries(
  environmentKeys.map(key => [key, process.env[key]])
)

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  vi.resetModules()
})

describe('legacy pilot Playwright server routing', () => {
  it('registers the isolated app name when Playwright owns the server', async () => {
    process.env.PILOT_LEGACY_APP_NAME = 'educa-r3-legacy-pilot-run-123'
    process.env.PLAYWRIGHT_BASE_URL = 'https://educa-r3-legacy-pilot-run-123.localhost'
    process.env.PILOT_LEGACY_SERVER_MANAGED = 'false'
    vi.resetModules()

    const { default: config } = await import('../../../playwright.pilot-legacy.config')

    expect(config.webServer).toMatchObject({
      command: 'portless run --name educa-r3-legacy-pilot-run-123 pnpm start',
      url: 'https://educa-r3-legacy-pilot-run-123.localhost',
    })
  })
})
