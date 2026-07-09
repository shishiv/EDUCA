import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Post — EDUCA',
}

// In a real implementation, this would use next-mdx-remote to render MDX content.
// For now, it shows a placeholder for posts that don't exist yet.

export default function BlogPostPage({
  params,
}: {
  params: { slug: string }
}) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Blog
          </Link>
        </Button>

        <article className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold mb-4">
            Post não encontrado
          </h1>
          <p className="text-muted-foreground">
            O post &quot;{params.slug}&quot; ainda não foi publicado. Volte em
            breve para conferir novos conteúdos.
          </p>
        </article>
      </div>
    </div>
  )
}
