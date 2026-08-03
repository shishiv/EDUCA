import { afterEach, describe, expect, it, vi } from 'vitest'
import { metrics } from '@/lib/monitoring/metrics'

const ENV_KEYS = [
  'NEXT_PUBLIC_DEMO_SANDBOX',
  'DEMO_SANDBOX',
  'GRAFANA_CLOUD_URL',
  'GRAFANA_CLOUD_API_KEY',
] as const
const originalEnvironment = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]))

function restoreEnvironment(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnvironment[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  restoreEnvironment()
  vi.restoreAllMocks()
})

describe('demo monitoring boundary', () => {
  it('discards synthetic metrics instead of sending them to Grafana', async () => {
    process.env.NEXT_PUBLIC_DEMO_SANDBOX = 'true'
    process.env.GRAFANA_CLOUD_URL = 'https://grafana.invalid'
    process.env.GRAFANA_CLOUD_API_KEY = 'synthetic-test-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    metrics.record('demo_synthetic_metric', 1)
    await metrics.flush()

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
