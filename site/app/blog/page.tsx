import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — EDUCA',
  description:
    'Novidades, guias e reflexões sobre gestão escolar municipal, tecnologia educacional e open source.',
}

// Placeholder posts — replace with MDX when content is ready
const posts: {
  slug: string
  title: string
  excerpt: string
  date: string
}[] = []

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Novidades, guias e reflexões sobre gestão escolar municipal,
          tecnologia educacional e open source.
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.slug} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <CalendarDays className="h-3 w-3" />
                  {post.date}
                </div>
                <CardTitle className="text-lg">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {post.excerpt}
                </p>
                <Button variant="link" className="px-0" asChild>
                  <Link href={`/blog/${post.slug}`}>
                    Ler mais
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 text-muted-foreground/30">📝</div>
          <h2 className="text-2xl font-semibold mb-2">Em breve</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Estamos preparando conteúdos sobre gestão escolar municipal,
            tecnologia educacional e open source. Volte em breve!
          </p>
        </div>
      )}
    </div>
  )
}
