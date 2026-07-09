import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Github,
  MessageCircle,
  MessageSquare,
  Code2,
  Users,
  BookOpen,
  GitPullRequest,
  Bug,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Comunidade — EDUCA',
  description:
    'Participe da comunidade EDUCA. Contribua no GitHub, entre no Telegram e ajude a transformar a educação municipal.',
}

const benefits = [
  {
    icon: Code2,
    title: 'Impacto real',
    description:
      'Seu código vai ajudar milhares de escolas e milhões de alunos em todo o Brasil.',
  },
  {
    icon: Users,
    title: 'Networking',
    description:
      'Conecte-se com desenvolvedores, gestores públicos e educadores de todo o país.',
  },
  {
    icon: BookOpen,
    title: 'Aprendizado',
    description:
      'Contribua com um projeto real de gestão pública. Stack moderna: Next.js, React, TypeScript, Supabase.',
  },
  {
    icon: GitPullRequest,
    title: 'Portfólio',
    description:
      'Contribuições em um projeto open source com impacto social relevante para seu currículo.',
  },
  {
    icon: Bug,
    title: 'Qualidade',
    description:
      'Participe de code reviews, testes e discussões técnicas que elevam seu nível como dev.',
  },
]

export default function ComunidadePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Comunidade</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          O EDUCA é um projeto open source construído por e para a comunidade.
          Junte-se a nós e ajude a transformar a educação municipal brasileira.
        </p>
      </div>

      {/* Community Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card className="border-0 shadow-sm text-center">
          <CardHeader>
            <Github className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>GitHub</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Código fonte, issues, pull requests e documentação técnica.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://github.com/shishiv/EDUCA"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Acessar GitHub
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm text-center">
          <CardHeader>
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Telegram</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Grupo oficial da comunidade. Discussões, dúvidas e novidades.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://t.me/educa_app"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Entrar no Telegram
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm text-center">
          <CardHeader>
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
            <CardTitle className="text-muted-foreground/60">Fórum</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Em breve. Espaço para discussões mais longas, tutoriais e
              suporte da comunidade.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* How to Contribute */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
          Como Contribuir
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </span>
                <CardTitle className="text-lg">Explore o Projeto</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Leia a documentação, entenda a arquitetura e veja as issues
                abertas. O repositório tem guias para começar.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </span>
                <CardTitle className="text-lg">Escolha uma Issue</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Issues com label &quot;good first issue&quot; são ótimas para
                começar. Comente que vai trabalhar nela para evitar duplicidade.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </span>
                <CardTitle className="text-lg">Abra um Pull Request</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Siga o guia de contribuição, mantenha o padrão de código e
                participe do code review. Toda contribuição é bem-vinda!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why Contribute */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
          Por que contribuir?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="border-0 shadow-sm text-center">
              <CardHeader>
                <benefit.icon className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-base">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
