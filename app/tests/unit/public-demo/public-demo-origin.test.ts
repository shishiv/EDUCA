import { describe, expect, it } from 'vitest'
import { assertPublicDemoBaseURL, isLocalOrLoopbackHostname } from '@/scripts/public-demo-origin'

describe('public demo origin gate', () => {
  it.each([
    'localhost',
    'demo.localhost',
    '127.0.0.1',
    '127.42.0.1',
    '0.0.0.0',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '[::1]',
    '[::ffff:7f00:1]',
  ])('identifies %s as local or loopback', hostname => {
    expect(isLocalOrLoopbackHostname(hostname)).toBe(true)
  })

  it.each([
    'https://localhost',
    'https://demo.localhost',
    'https://127.0.0.1',
    'https://127.42.0.1',
    'https://0.0.0.0',
    'https://[::1]',
    'https://[::ffff:7f00:1]',
    'https://10.0.0.1',
    'https://172.16.0.1',
    'https://192.168.1.1',
    'https://demo.local',
  ])('rejects a non-public HTTPS origin: %s', value => {
    expect(() => assertPublicDemoBaseURL(value)).toThrow('HTTPS public origin')
  })

  it('accepts the configured public demo origin', () => {
    expect(assertPublicDemoBaseURL('https://educa-demo.vercel.app').origin).toBe(
      'https://educa-demo.vercel.app'
    )
    expect(assertPublicDemoBaseURL('https://[2606:4700:4700::1111]').hostname).toBe(
      '[2606:4700:4700::1111]'
    )
  })
})
