'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AbrirAulaButton } from '@/components/attendance/abrir-aula-button'
import { AulaStatusIndicatorEnhanced as AulaStatusIndicator } from '@/components/attendance/aula-status-indicator-enhanced'
import { classesApi, ClassWithDetails } from '@/lib/api/classes'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Play,
  School
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface TeacherStats {
  totalClasses: number
  activeClasses: number
  totalStudents: number
  averageAttendance: number
  todayActiveSessions: number
}

interface ClassCardProps {
  classInfo: ClassWithDetails
  teacherId: string
  onSessionOpened: (sessionData: any, classInfo: ClassWithDetails) => void
}

function ClassCard({ classInfo, teacherId, onSessionOpened }: ClassCardProps) {
  return (
    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header da turma */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {classInfo.nome} - {classInfo.serie}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <School className="h-3 w-3" />
                  {classInfo.escola?.nome}
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {classInfo._count?.students || 0} alunos
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {classInfo.turno}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-blue-600 hover:text-blue-700"
            >
              <Link href={`/dashboard/turmas/${classInfo.id}`}>
                Ver Detalhes
              </Link>
            </Button>
          </div>

          {/* Status da aula em tempo real */}
          <AulaStatusIndicator
            turmaId={classInfo.id}
            professorId={teacherId}
            className="bg-gray-50 rounded-lg p-3"
          />

          {/* Botão de ação principal */}
          <div className="pt-2">
            <AbrirAulaButton
              turmaId={classInfo.id}
              professorId={teacherId}
              turmaNome={`${classInfo.nome} - ${classInfo.serie}`}
              onSuccess={(sessionData) => onSessionOpened(sessionData, classInfo)}
              onError={(error) => {
                logger.error('Erro ao abrir aula:', { error: error })
                toast.error('Erro ao abrir aula. Tente novamente.')
              }}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TeacherDashboardEnhancedProps {
  onNavigateToAttendance?: (classInfo: ClassWithDetails, sessionData?: any) => void
}

export function TeacherDashboardEnhanced({ onNavigateToAttendance }: TeacherDashboardEnhancedProps) {
  const { user, userProfile } = useAuth()
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [stats, setStats] = useState<TeacherStats>({
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
    averageAttendance: 0,
    todayActiveSessions: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadTeacherData()
    }
  }, [user?.id])

  const loadTeacherData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Load teacher's classes
      const teacherClasses = await classesApi.getClassesByTeacher(user.id)
      setClasses(teacherClasses)

      // Calculate stats
      const totalStudents = teacherClasses.reduce((sum, c) => sum + (c._count?.students || 0), 0)
      const activeClasses = teacherClasses.filter(c => c.ativo).length

      // Get today's active sessions from aulas_abertas table
      const today = new Date().toISOString().split('T')[0]
      const { data: activeSessions } = await supabase
        .from('sessoes_aula')
        .select('id')
        .eq('professor_id', user.id)
        .eq('data_aula', today)
        .in('status', ['PLANEJADA', 'ABERTA'])

      const todayActiveSessions = activeSessions?.length || 0

      // Calculate average attendance from frequencia table
      const { data: attendanceData } = await supabase
        .from('frequencia')
        .select('presente')
        .eq('professor_id', user.id)
        .gte('data_aula', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days

      let averageAttendance = 85 // Default
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(a => a.presente).length
        averageAttendance = Math.round((presentCount / attendanceData.length) * 100)
      }

      setStats({
        totalClasses: teacherClasses.length,
        activeClasses,
        totalStudents,
        averageAttendance,
        todayActiveSessions
      })

    } catch (error) {
      logger.error('Error loading teacher data:', { error: error })
      toast.error('Erro ao carregar dados do professor')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionOpened = (sessionData: any, classInfo: ClassWithDetails) => {
    toast.success('Aula aberta com sucesso!')

    // Update today's active sessions count
    setStats(prev => ({ ...prev, todayActiveSessions: prev.todayActiveSessions + 1 }))

    // Navigate to attendance marking if callback provided
    onNavigateToAttendance?.(classInfo, sessionData)
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header do Professor */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {getGreeting()}, Prof. {userProfile?.nome?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-blue-100 mt-1">
              Gerencie suas turmas e controle a frequência dos alunos
            </p>
            <div className="flex items-center space-x-2 mt-2 text-sm text-blue-100">
              <Calendar className="h-4 w-4" />
              <span>{getCurrentDate()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" asChild>
              <Link href="/dashboard/frequencia">
                <Calendar className="h-4 w-4 mr-2" />
                Histórico de Frequência
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Minhas Turmas</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalClasses}</p>
                <p className="text-xs text-blue-600">{stats.activeClasses} ativas</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Alunos</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalStudents}</p>
                <p className="text-xs text-green-600">sob sua responsabilidade</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Frequência Média</p>
                <p className="text-2xl font-bold text-orange-900">{stats.averageAttendance}%</p>
                <p className="text-xs text-orange-600">suas turmas</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Aulas Hoje</p>
                <p className="text-2xl font-bold text-purple-900">{stats.todayActiveSessions}</p>
                <p className="text-xs text-purple-600">sessões abertas</p>
              </div>
              <Play className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Turmas com Ações Rápidas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Suas Turmas</h2>
            <p className="text-gray-600">
              Abra aulas e gerencie a frequência de seus alunos
            </p>
          </div>
          {classes.length > 0 && (
            <Badge variant="outline" className="px-3 py-1">
              {classes.length} turma{classes.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma turma atribuída
              </h3>
              <p className="text-gray-500 mb-4">
                Entre em contato com a coordenação para atribuição de turmas
              </p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/turmas">
                  Ver Todas as Turmas
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {classes.map((classInfo) => (
              <ClassCard
                key={classInfo.id}
                classInfo={classInfo}
                teacherId={user?.id || ''}
                onSessionOpened={handleSessionOpened}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso direto às principais funcionalidades do professor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Frequência Geral',
                href: '/dashboard/frequencia',
                icon: Calendar,
                color: 'bg-blue-100 text-blue-600',
                description: 'Ver todos os registros'
              },
              {
                name: 'Relatórios',
                href: '/dashboard/relatorios',
                icon: TrendingUp,
                color: 'bg-green-100 text-green-600',
                description: 'Análises e estatísticas'
              },
              {
                name: 'Histórico de Aulas',
                href: '/dashboard/aulas-historico',
                icon: Clock,
                color: 'bg-orange-100 text-orange-600',
                description: 'Aulas anteriores'
              },
              {
                name: 'Suporte',
                href: '/dashboard/suporte',
                icon: AlertTriangle,
                color: 'bg-purple-100 text-purple-600',
                description: 'Ajuda e documentação'
              },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                <div className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group">
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform",
                    item.color
                  )}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center mb-1">{item.name}</span>
                  <span className="text-xs text-gray-500 text-center">{item.description}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}