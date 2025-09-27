'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MunicipalLogo } from '@/components/identity/municipal-assets'
import {
  UserCog,
  GraduationCap,
  School,
  Users,
  BookOpen,
  ChevronRight
} from 'lucide-react'

type UserRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

interface RoleOption {
  role: UserRole
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const roleOptions: RoleOption[] = [
  {
    role: 'admin',
    title: 'Administrador do Sistema',
    description: 'Acesso completo a todas as funcionalidades do sistema',
    icon: <UserCog className="h-7 w-7" />,
    color: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  },
  {
    role: 'diretor',
    title: 'Diretor(a) Escolar',
    description: 'Gerenciar escola, professores, turmas e relatórios administrativos',
    icon: <School className="h-7 w-7" />,
    color: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  },
  {
    role: 'secretario',
    title: 'Secretário(a) de Educação',
    description: 'Supervisão geral das escolas e políticas educacionais',
    icon: <Users className="h-7 w-7" />,
    color: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
  },
  {
    role: 'professor',
    title: 'Professor(a)',
    description: 'Gerenciar turmas, frequência de alunos e atividades pedagógicas',
    icon: <GraduationCap className="h-7 w-7" />,
    color: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
  },
  {
    role: 'responsavel',
    title: 'Responsável/Familiar',
    description: 'Acompanhar desenvolvimento e frequência dos estudantes',
    icon: <BookOpen className="h-7 w-7" />,
    color: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
  }
]

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRoleSelection = async (role: UserRole) => {
    setLoading(true)
    setSelectedRole(role)

    try {
      // Create mock user profile in localStorage for development
      const mockUserProfile = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        email: 'admin@fronteira.mg.gov.br',
        nome: getNameForRole(role),
        tipo_usuario: role,
        escola_id: role === 'admin' || role === 'secretario' ? null : '550e8400-e29b-41d4-a716-446655440001',
        ativo: true,
        created_at: new Date().toISOString()
      }

      // Store in localStorage for development
      localStorage.setItem('dev_user_profile', JSON.stringify(mockUserProfile))
      localStorage.setItem('dev_auth_bypass', 'true')
      localStorage.setItem('dev_selected_role', role)

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error setting role:', error)
      setLoading(false)
    }
  }

  const getNameForRole = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Administrador do Sistema'
      case 'diretor':
        return 'Maria Santos (Diretora)'
      case 'secretario':
        return 'João Silva (Secretário)'
      case 'professor':
        return 'Ana Costa (Professora)'
      case 'responsavel':
        return 'Carlos Oliveira (Responsável)'
      default:
        return 'Usuário do Sistema'
    }
  }

  const getRoleAccessLevel = (role: UserRole): number => {
    switch (role) {
      case 'admin':
        return 5 // Full system access
      case 'secretario':
        return 4 // Municipality-wide oversight
      case 'diretor':
        return 3 // School-level management
      case 'professor':
        return 2 // Class-level management
      case 'responsavel':
        return 1 // Student viewing only
      default:
        return 1
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fronteira-primary/8 via-white to-fronteira-green/6">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,theme(colors.fronteira-blue),transparent_60%)]" />
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-6xl">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-white rounded-full shadow-lg ring-1 ring-black/5">
              <MunicipalLogo size="md" priority />
            </div>
            <h1 className="text-4xl font-bold text-fronteira-primary mb-3">
              Selecione seu Perfil de Acesso
            </h1>
            <p className="text-lg text-fronteira-gray-600 max-w-2xl mx-auto">
              Como você deseja acessar o sistema hoje? Escolha o perfil que melhor corresponde à sua função no sistema educacional.
            </p>
          </div>

          {/* Enhanced Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {roleOptions.map((option, index) => (
              <div
                key={option.role}
                className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2"
                onClick={() => handleRoleSelection(option.role)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="h-full bg-white/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl ring-1 ring-black/5 hover:ring-fronteira-primary/20 transition-all duration-300">
                  <CardContent className="p-6 text-center h-full flex flex-col">
                    {/* Enhanced Icon */}
                    <div className="relative mb-4">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${option.color} flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110`}>
                        <div className="text-white">
                          {option.icon}
                        </div>
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-3 w-3 text-fronteira-primary" />
                      </div>
                    </div>

                    {/* Enhanced Content */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-fronteira-gray-900 mb-2 group-hover:text-fronteira-primary transition-colors">
                          {option.title}
                        </h3>
                        <p className="text-sm text-fronteira-gray-600 leading-relaxed">
                          {option.description}
                        </p>
                      </div>

                      {/* Access Level Indicator */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-center space-x-1">
                          {[...Array(getRoleAccessLevel(option.role))].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-fronteira-primary/40"></div>
                          ))}
                          {[...Array(5 - getRoleAccessLevel(option.role))].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-gray-200"></div>
                          ))}
                        </div>
                        <span className="text-xs text-fronteira-gray-500 mt-1 block">
                          Nível de Acesso
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Enhanced Footer */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-fronteira-gray-600 hover:text-fronteira-primary hover:bg-white/50 px-6 py-3 rounded-lg transition-all duration-200"
            >
              ← Voltar ao Login
            </Button>

            {/* Municipal Footer */}
            <div className="mt-8 text-xs text-fronteira-gray-500">
              <p>Sistema de Gestão Educacional - Prefeitura de Fronteira/MG</p>
              <p className="mt-1">© 2024 Todos os direitos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}