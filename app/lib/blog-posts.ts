import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Metadata for a published EDUCA blog runbook and its canonical content file. */
export interface BlogPost {
  slug: string
  title: string
  description: string
  excerpt: string
  date: string
  updatedAt: string
  category: string
  readingTime: string
  primaryQuery: string
  contentFile: string
  ogImage: string
  relatedSlugs: string[]
}

/** Published LGPD runbooks shown in the blog index and sitemap. */
export const blogPosts: BlogPost[] = [
  {
    slug: 'lgpd-em-escola-municipal',
    title: 'LGPD em escola municipal: controlador, operador, bases legais e direitos',
    description:
      'Runbook para municípios que adotam o EDUCA: papéis, bases legais, inventário, direitos e checklist antes de liberar dados reais.',
    excerpt:
      'O que o município precisa definir antes de usar dados reais: papéis, finalidades, bases legais, direitos e evidências de adoção.',
    date: '2026-08-05',
    updatedAt: '2026-08-05',
    category: 'Runbook LGPD',
    readingTime: '12 min de leitura',
    primaryQuery: 'LGPD em escola municipal',
    contentFile: 'lgpd-em-escola-municipal.mdx',
    ogImage: '/brand/og-blog-lgpd-em-escola-municipal.jpg',
    relatedSlugs: ['encarregado-de-dados-em-prefeitura', 'dado-de-crianca-no-educacenso'],
  },
  {
    slug: 'encarregado-de-dados-em-prefeitura',
    title: 'Encarregado de dados em prefeitura: como designar e publicar o contato',
    description:
      'Guia baseado na LGPD e na Resolução CD/ANPD nº 18/2024 para designar, publicar e manter o contato do encarregado municipal.',
    excerpt:
      'A prefeitura deve formalizar a indicação, publicar o ato e manter um canal público. A EDUCA não preenche esse papel no demo.',
    date: '2026-08-05',
    updatedAt: '2026-08-05',
    category: 'Runbook LGPD',
    readingTime: '9 min de leitura',
    primaryQuery: 'encarregado de dados em prefeitura',
    contentFile: 'encarregado-de-dados-em-prefeitura.mdx',
    ogImage: '/brand/og-blog-encarregado-de-dados-em-prefeitura.jpg',
    relatedSlugs: ['lgpd-em-escola-municipal', 'dado-de-crianca-no-educacenso'],
  },
  {
    slug: 'dado-de-crianca-no-educacenso',
    title: 'Dado de criança no Educacenso: base legal, limites e proteção',
    description:
      'Runbook para tratar dados de crianças e adolescentes no Censo Escolar: melhor interesse, base legal, exportação e limites de uso.',
    excerpt:
      'O Censo é obrigatório, mas isso não autoriza qualquer uso do cadastro. Veja como limitar campos, conferir a origem e controlar a exportação.',
    date: '2026-08-05',
    updatedAt: '2026-08-05',
    category: 'Runbook LGPD',
    readingTime: '11 min de leitura',
    primaryQuery: 'dado de criança no Educacenso',
    contentFile: 'dado-de-crianca-no-educacenso.mdx',
    ogImage: '/brand/og-blog-dado-de-crianca-no-educacenso.jpg',
    relatedSlugs: ['lgpd-em-escola-municipal', 'encarregado-de-dados-em-prefeitura'],
  },
]

/** Finds one published blog runbook by its public URL slug. */
export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

/** Reads the trusted local MDX source for a published blog runbook. */
export function readBlogPostContent(post: BlogPost): string {
  return readFileSync(path.join(process.cwd(), 'content', post.contentFile), 'utf8')
}
