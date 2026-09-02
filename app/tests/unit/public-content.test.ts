import { describe, expect, it } from 'vitest'
import redirects from '@/lib/public-redirects.json'

describe('canonical public content', () => {
  it('permanently redirects every preserved legacy public URL to its closest canonical destination', () => {
    const bySource = Object.fromEntries(redirects.map(redirect => [redirect.source, redirect]))

    expect(bySource).toMatchObject({
      '/privacidade': { destination: '/politica-privacidade', permanent: true },
      '/funcionalidades': { destination: '/#recursos', permanent: true },
      '/comunidade': { destination: 'https://github.com/shishiv/EDUCA/discussions', permanent: true },
      '/contribuidores': { destination: 'https://github.com/shishiv/EDUCA', permanent: true },
      '/patrocinadores': { destination: 'https://github.com/shishiv/EDUCA/discussions', permanent: true },
      '/piloto-municipal': { destination: '/demo', permanent: true },
      '/roadmap': { destination: 'https://github.com/shishiv/EDUCA/issues', permanent: true },
      '/whatsapp': { destination: 'https://github.com/shishiv/EDUCA/tree/dev/app/lib/notifications', permanent: true },
      '/blog/bem-vindo': { destination: '/blog', permanent: true },
    })
  })
})
