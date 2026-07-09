import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Info, Key, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Demo — EDUCA',
  description:
    'Experimente o EDUCA agora. Ambiente de demonstração com dados fictícios.',
}

export default function DemoPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Experimente o EDUCA agora
        </h1>
        <p className="text-lg text-muted-foreground">
          Acesse o ambiente de demonstração e explore todas as funcionalidades
          do sistema.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Credenciais de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                  demo@educa.app.br
                </code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Senha</p>
                <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                  Demo@2026
                </code>
              </div>
            </div>

            <Button size="lg" className="w-full" asChild>
              <a
                href="https://demo.educa.app.br"
                target="_blank"
                rel="noopener noreferrer"
              >
                Acessar Demo
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Ambiente de Demonstração
                </p>
                <p className="text-sm text-amber-700">
                  Este ambiente contém dados fictícios para fins de
                  demonstração. Os dados são resetados semanalmente. Não insira
                  informações reais neste ambiente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              O que testar na Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Dashboard com indicadores da secretaria</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Cadastro e gestão de alunos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Chamada digital com modo offline</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Boletim escolar e relatórios</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Controle de frequência Bolsa Família</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Relatórios INEP e Censo Escolar</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
