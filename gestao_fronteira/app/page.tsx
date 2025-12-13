import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  ArrowRight,
  LogIn,
  BookOpen,
  GraduationCap,
  CheckSquare,
  School
} from 'lucide-react'
// NoticiasBoard moved inline to simplify structure
import { EducaLogo, EducaLogoWithSeal } from '@/components/identity/educa-logo'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-educa-blue-50 via-white to-educa-green-50">
      {/* Header com nova identidade EDUCA */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo EDUCA */}
            <EducaLogo size="md" showText showFronteira />

            {/* Quick Stats - estilo Google Classroom */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50">
                <School className="h-4 w-4 text-indigo-600" />
                <span className="text-gray-700 font-medium">15 Escolas</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50">
                <Users className="h-4 w-4 text-violet-600" />
                <span className="text-gray-700 font-medium">3.200+ Alunos</span>
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
            <Card className="sticky top-24 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl border-0 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-900">Acesso ao Sistema</CardTitle>
                <CardDescription className="text-gray-500">
                  Faça login para acessar o EDUCA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Botão Único de Login com cor EDUCA */}
                <Link href="/login" className="block">
                  <button
                    className="w-full h-14 text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center font-semibold"
                    style={{ backgroundColor: '#4361EE', color: 'white' }}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Entrar
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </button>
                </Link>

                {/* Módulos do Sistema - Preview visual */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { icon: Users, label: 'Alunos', color: 'text-violet-600', bg: 'bg-violet-50' },
                    { icon: BookOpen, label: 'Turmas', color: 'text-sky-600', bg: 'bg-sky-50' },
                    { icon: CheckSquare, label: 'Frequência', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { icon: GraduationCap, label: 'Notas', color: 'text-orange-600', bg: 'bg-orange-50' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 p-2.5 rounded-lg ${item.bg} opacity-70`}
                    >
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-xs font-medium text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Descrição do Sistema */}
                <div className="bg-educa-blue-50 rounded-xl p-4 text-sm border border-educa-blue-100">
                  <p className="font-semibold text-educa-blue-700 mb-1">Acesso Unificado</p>
                  <p className="text-educa-blue-600 text-xs leading-relaxed">
                    O sistema identifica automaticamente seu perfil após o login
                    e direciona você para o painel correto.
                  </p>
                </div>

                {/* Informações de Suporte */}
                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-1">Precisa de ajuda?</p>
                  <p className="text-gray-500 text-xs">
                    Entre em contato com o suporte técnico:
                  </p>
                  <p className="text-educa-blue-500 text-xs mt-1 font-medium">
                    suporte@fronteira.mg.gov.br
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Área de Avisos e Notícias - Coluna Direita */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg rounded-xl border-0 bg-white">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Avisos e Notícias</CardTitle>
                <CardDescription className="text-gray-500">
                  Comunicados da Secretaria Municipal de Educação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  <p>Nenhum aviso no momento.</p>
                  <p className="text-sm mt-1">Os avisos da SME aparecerão aqui.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer com identidade oficial */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo com selo de Fronteira */}
            <EducaLogoWithSeal size="sm" />

            {/* Links */}
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-educa-blue-500 transition-colors">
                Suporte
              </a>
              <a href="#" className="text-gray-500 hover:text-educa-blue-500 transition-colors">
                Privacidade
              </a>
              <a href="#" className="text-gray-500 hover:text-educa-blue-500 transition-colors">
                Termos
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; 2025 EDUCA - Sistema Educacional de Fronteira/MG
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Secretaria Municipal de Educação
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
