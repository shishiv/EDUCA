'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, FileQuestion, GraduationCap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-2">404</CardTitle>
            <CardDescription className="text-xl text-gray-600">
              Página não encontrada
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              A página que você está procurando não existe ou foi movida.
            </p>
            <p className="text-sm text-gray-500">
              Verifique se o endereço está correto ou navegue para uma das páginas disponíveis.
            </p>
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild className="h-12">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Ir para Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="h-12">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>

          {/* Links Úteis */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              Páginas Principais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/dashboard/alunos" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Alunos</div>
                  <div className="text-gray-500">Gerenciar estudantes</div>
                </div>
              </Link>
              <Link href="/dashboard/usuarios" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Usuários</div>
                  <div className="text-gray-500">Gerenciar usuários</div>
                </div>
              </Link>
              <Link href="/dashboard/escolas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Escolas</div>
                  <div className="text-gray-500">Unidades escolares</div>
                </div>
              </Link>
              <Link href="/dashboard/turmas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Turmas</div>
                  <div className="text-gray-500">Classes e professores</div>
                </div>
              </Link>
              <Link href="/dashboard/matriculas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Matrículas</div>
                  <div className="text-gray-500">Vínculos acadêmicos</div>
                </div>
              </Link>
              <Link href="/dashboard/relatorios" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Relatórios</div>
                  <div className="text-gray-500">Gerar relatórios</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Precisa de ajuda?</h4>
            <p className="text-sm text-blue-700">
              Entre em contato com o suporte técnico da Secretaria de Educação de Fronteira/MG
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Email: suporte@fronteira.mg.gov.br | Telefone: (34) 3555-0000
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}