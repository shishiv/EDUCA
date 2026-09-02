import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react'
import { PublicHeader } from '@/components/marketing/public-header'
import { blogPosts, getBlogPost, readBlogPostContent } from '@/lib/blog-posts'

type BlogPostPageProps = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const canonicalPath = `/blog/${post.slug}/`
  return {
    title: `${post.title} - EDUCA`,
    description: post.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: canonicalPath,
      publishedTime: `${post.date}T00:00:00.000Z`,
      modifiedTime: `${post.updatedAt}T00:00:00.000Z`,
      images: [{ url: post.ogImage, width: 1280, height: 720, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.ogImage],
    },
  }
}

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const relatedPosts = post.relatedSlugs
    .map(getBlogPost)
    .filter((relatedPost): relatedPost is NonNullable<typeof relatedPost> => relatedPost !== undefined)

  return (
    <div className="public-site" lang="pt-BR">
      <PublicHeader />
      <main>
        <section className="blog-hero blog-article-hero">
          <div className="public-shell">
            <Link href="/blog/" className="blog-back"><ArrowLeft aria-hidden size={16} /> Todos os guias</Link>
            <div className="blog-article-hero__copy">
              <p className="blog-tag">{post.category}</p>
              <h1>{post.title}</h1>
              <p>{post.description}</p>
              <div className="blog-card__meta">
                <span><CalendarDays aria-hidden size={16} /> Atualizado em {formatBlogDate(post.updatedAt)}</span>
                <span><Clock3 aria-hidden size={16} /> {post.readingTime}</span>
                <span>Busca: {post.primaryQuery}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="public-shell blog-article-layout">
          <article className="blog-prose">
            <MDXRemote source={readBlogPostContent(post)} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
          </article>
          <aside className="blog-aside">
            <div className="blog-callout">
              <strong>Sobre este runbook</strong>
              <p>Conteúdo para o município fazer o próprio dever de casa.</p>
              <small>A EDUCA pode documentar e apoiar tecnicamente a operação, mas não substitui o controlador nem o encarregado municipal.</small>
            </div>
            <nav aria-label="Outros guias LGPD">
              <p className="blog-tag">Continue lendo</p>
              <ul>
                {relatedPosts.map(relatedPost => (
                  <li key={relatedPost.slug}>
                    <Link href={`/blog/${relatedPost.slug}/`}>
                      <span>{relatedPost.title}</span><ArrowUpRight aria-hidden size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </main>
    </div>
  )
}

function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}
