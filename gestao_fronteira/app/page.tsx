import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  GraduationCap,
  Users,
  ArrowRight,
  Building2,
  LogIn
} from 'lucide-react'
import { NoticiasBoard } from '@/components/landing/NoticiasBoard'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header Simples */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo e Título */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistema de Gestão Escolar</h1>
                <p className="text-sm text-gray-600">Secretaria Municipal de Educação - Fronteira/MG</p>
              </div>
            </div>

            {/* Informações Rápidas */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>15 Escolas</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>3.200+ Alunos</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Área de Login - Coluna Esquerda */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
                <CardDescription>
                  Faça login para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Botão Único de Login */}
                <Link href="/login" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Entrar
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>

                {/* Descrição do Sistema */}
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-900 mb-2">Acesso Unificado</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    O sistema identifica automaticamente seu perfil após o login
                    e direciona você para o painel correto.
                  </p>
                </div>

                {/* Informações de Suporte */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p className="font-medium text-gray-900 mb-2">Precisa de ajuda?</p>
                  <p className="text-gray-600 text-xs">
                    Entre em contato com o suporte técnico:
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    suporte@fronteira.mg.gov.br
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Área de Avisos e Notícias - Coluna Direita */}
          <div className="lg:col-span-2">
            <NoticiasBoard />
          </div>
        </div>
      </main>

      {/* Footer Simplificado */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>&copy; 2025 Secretaria Municipal de Educação - Fronteira/MG</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-blue-600 transition-colors">Suporte</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
