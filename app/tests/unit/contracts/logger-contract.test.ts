import { afterEach, describe, expect, it, vi } from 'vitest'

describe('logger console contract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('emits development debug entries through console.debug', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.resetModules()
    const debug = vi.spyOn(globalThis.console, 'debug').mockImplementation(() => undefined)
    const info = vi.spyOn(globalThis.console, 'info').mockImplementation(() => undefined)
    const { logger } = await import('@/lib/logger')

    logger.debug('debug-contract')

    expect(debug).toHaveBeenCalledOnce()
    expect(info).not.toHaveBeenCalled()
  })
})
