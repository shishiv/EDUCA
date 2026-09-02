import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Clock3 } from 'lucide-react'
import { PublicHeader } from '@/components/marketing/public-header'
import { blogPosts, type BlogPost } from '@/lib/blog-posts'

export const metadata: Metadata = {
  title: 'Guias LGPD para municípios - EDUCA',
  description:
    'Runbooks práticos sobre LGPD em escola municipal, encarregado de dados em prefeitura e dado de criança no Educacenso.',
  alternates: { canonical: '/blog/' },
  openGraph: {
    title: 'Guias LGPD para municípios - EDUCA',
    description:
      'Runbooks práticos para municípios que adotam o EDUCA e precisam organizar sua governança de dados.',
    url: '/blog/',
    images: [{
      url: '/brand/og-social-v2.jpg',
      width: 1280,
      height: 720,
      alt: 'EDUCA - gestão escolar municipal open source',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guias LGPD para municípios - EDUCA',
    description:
      'Runbooks práticos para municípios que adotam o EDUCA e precisam organizar sua governança de dados.',
    images: ['/brand/og-social-v2.jpg'],
  },
}

function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function BlogPostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}/`} className={`blog-card${featured ? ' blog-card--featured' : ''}`}>
      <div className="blog-card__top">
        <p className="blog-tag">{post.category}</p>
        <ArrowUpRight aria-hidden size={20} />
      </div>
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <div className="blog-card__meta">
        <span>Atualizado em {formatBlogDate(post.updatedAt)}</span>
        <span><Clock3 aria-hidden size={16} /> {post.readingTime}</span>
      </div>
      <strong className="blog-card__link">Ler o guia</strong>
    </Link>
  )
}

export default function BlogPage() {
  const [featuredPost, ...supportingPosts] = blogPosts

  return (
    <div className="public-site" lang="pt-BR">
      <PublicHeader />
      <main>
        <section className="blog-hero">
          <div className="public-shell blog-hero__grid">
            <div>
              <p className="blog-tag">Guias públicos</p>
              <h1>LGPD aplicada à rede municipal</h1>
              <p>
                Runbooks para documentar as decisões: papéis, bases legais,
                encarregado, crianças e Educacenso antes de liberar dados reais.
              </p>
            </div>
            <aside className="blog-callout">
              <strong>Ponto de partida</strong>
              <p>O município é o controlador. A EDUCA é operadora conforme instruções.</p>
              <small>O demo público continua sintético, sem titular real e sem encarregado municipal fictício.</small>
            </aside>
          </div>
        </section>

        <section className="public-shell blog-index">
          <div className="blog-index__heading">
            <div>
              <h2>Três guias para começar</h2>
              <p>Escolha a pergunta que trouxe você até aqui. Cada post responde uma busca e aponta para as próximas decisões do município.</p>
            </div>
            <p className="blog-tag">Conteúdo atualizado em 05.08.2026</p>
          </div>
          <div className="blog-index__grid">
            <BlogPostCard post={featuredPost} featured />
            <div className="blog-index__supporting">
              {supportingPosts.map(post => <BlogPostCard key={post.slug} post={post} />)}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
