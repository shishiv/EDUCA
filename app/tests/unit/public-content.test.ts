import { describe, expect, it } from 'vitest'
import { blogPosts, readBlogPostContent } from '@/lib/blog-posts'
import redirects from '@/lib/public-redirects.json'

const expectedPosts = [
  {
    slug: 'lgpd-em-escola-municipal',
    title: 'LGPD em escola municipal: controlador, operador, bases legais e direitos',
    ogImage: '/brand/og-blog-lgpd-em-escola-municipal.jpg',
  },
  {
    slug: 'encarregado-de-dados-em-prefeitura',
    title: 'Encarregado de dados em prefeitura: como designar e publicar o contato',
    ogImage: '/brand/og-blog-encarregado-de-dados-em-prefeitura.jpg',
  },
  {
    slug: 'dado-de-crianca-no-educacenso',
    title: 'Dado de criança no Educacenso: base legal, limites e proteção',
    ogImage: '/brand/og-blog-dado-de-crianca-no-educacenso.jpg',
  },
]

describe('canonical public content', () => {
  it('publishes the three migrated runbooks with their canonical metadata and links', () => {
    expect(blogPosts.map(({ slug, title, ogImage }) => ({ slug, title, ogImage }))).toEqual(expectedPosts)

    for (const post of blogPosts) {
      const content = readBlogPostContent(post)
      expect(content).toContain('## Fontes primárias')
      expect(content).toMatch(/https:\/\/(www\.)?(planalto\.gov\.br|gov\.br)/)
      expect(content).toContain('/blog/')
    }
  })

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
