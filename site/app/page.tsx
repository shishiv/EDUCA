import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  Users,
  Shield,
  Heart,
  Smartphone,
  FileText,
  ClipboardList,
  BarChart3,
  Code2,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Totalmente Online',
    description:
      'Acesse de qualquer lugar, sem instalação. Funciona em computadores, tablets e celulares.',
  },
  {
    icon: Users,
    title: 'Multi-tenant',
    description:
      'Cada município com seus dados isolados. Infraestrutura compartilhada, dados privados.',
  },
  {
    icon: Shield,
    title: 'Conformidade LGPD',
    description:
      'Privacidade de dados desde o design. Controle de acesso granular e logs de auditoria.',
  },
  {
    icon: Heart,
    title: 'Bolsa Família',
    description:
      'Controle de frequência para condicionalidades do Bolsa Família. Relatórios prontos para o MEC.',
  },
  {
    icon: Smartphone,
    title: 'Chamada Digital',
    description:
      'Registro de presença via tablet ou celular. Sincronização offline para salas sem internet.',
  },
  {
    icon: FileText,
    title: 'Boletim Escolar',
    description:
      'Boletins digitais com notas, frequência e observações. Acesso para pais e responsáveis.',
  },
  {
    icon: ClipboardList,
    title: 'Matrículas',
    description:
      'Gestão completa do ciclo de matrícula: rematrícula automática, transferências, vagas.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios INEP',
    description:
      'Relatórios educacionais prontos para o Censo Escolar e indicadores do INEP/MEC.',
  },
  {
    icon: Code2,
    title: 'Código Aberto',
    description:
      'Código 100% aberto (MIT). Sem lock-in. Customize, contribua, tenha autonomia.',
  },
]

const blogPosts = [
  {
    title: 'Por que open source na gestão pública?',
    excerpt:
      'Como o código aberto pode transformar a gestão educacional municipal no Brasil.',
    date: 'Em breve',
  },
  {
    title: 'EDUCA e a LGPD nas escolas',
    excerpt:
      'Entenda como o EDUCA foi projetado para estar em conformidade com a Lei Geral de Proteção de Dados.',
    date: 'Em breve',
  },
  {
    title: 'Guia de implantação para municípios',
    excerpt:
      'Passo a passo para sua cidade começar a usar o EDUCA na gestão escolar.',
    date: 'Em breve',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4" variant="secondary">
              Open Source · Gestão Escolar Municipal
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Gestão escolar municipal,
              <span className="text-primary"> open source.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sistema completo de gestão educacional para os 5.570 municípios
              brasileiros. Matrículas, chamada digital, boletim, frequência
              Bolsa Família e relatórios INEP — tudo em código aberto.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/demo/">
                  Testar Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="https://github.com/shishiv/EDUCA" target="_blank" rel="noopener noreferrer">
                  Ver no GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Tudo que sua secretaria de educação precisa
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades completas para gestão escolar municipal, do
              planejamento ao censo escolar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">0+</div>
              <div className="text-muted-foreground">Municípios</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">0+</div>
              <div className="text-muted-foreground">Escolas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">0+</div>
              <div className="text-muted-foreground">Alunos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Últimos do Blog
            </h2>
            <p className="text-muted-foreground">
              Novidades, guias e reflexões sobre educação e tecnologia.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Card key={post.title} className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <CardContent className="px-0 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      {post.date}
                    </p>
                  </CardContent>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/blog">
                Ver todos os posts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Pronto para transformar a educação do seu município?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Comece testando a demonstração ou explore o código no GitHub.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="https://demo.educa.app.br" target="_blank" rel="noopener noreferrer">
                Testar Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://github.com/shishiv/EDUCA" target="_blank" rel="noopener noreferrer">
                Ver no GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
