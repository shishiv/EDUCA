'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatsCard } from './stats-card'
import { TeacherDashboardEnhanced } from './teacher-dashboard-enhanced'
import { useAuth } from '@/hooks/use-auth'
import { useNavigation } from '@/components/layout/navigation-provider'
import { PageHeader } from '@/components/layout/enhanced-breadcrumbs'
import { LoadingCenter, CardLoading } from '@/components/ui/loading-states'
import { supabase } from '@/lib/supabase'
import {
  Users,
  School,
  GraduationCap,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  Star,
  CheckCircle2,
  FileText,
  Shield,
  User,
  Home,
  Plus,
  ArrowRight,
  Activity,
  Target
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalMatriculas: number
  frequenciaMedia: number
  alunosComBaixaFrequencia: number
  totalProfessores?: number
  usuariosAtivos?: number
  relatoriosPendentes?: number
}

interface QuickAction {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description?: string
  badge?: string
  isNew?: boolean
}

// Admin Dashboard - Municipal overview and management
export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          alunosResult,
          escolasResult,
          turmasResult,
          matriculasResult,
          professoresResult,
          usuariosResult,
          frequenciaResult
        ] = await Promise.all([
          supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('escolas').select('id', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativa'),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario', 'professor'),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('ativo', true),
          // Get attendance for current month to calculate average
          supabase.from('frequencia')
            .select('presente, status_presenca')
            .gte('data_aula', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        ])

        // Calculate attendance rate
        const attendanceRecords = frequenciaResult.data || []
        const totalRecords = attendanceRecords.length
        const presentCount = attendanceRecords.filter(r =>
          r.presente || r.status_presenca === 'justificada' || r.status_presenca === 'atestado'
        ).length
        const frequenciaMedia = totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 1000) / 10
          : 0

        // Count students with low attendance (< 80%)
        // For now use 0 - full calculation would require per-student aggregation
        const alunosComBaixaFrequencia = 0 // TODO: Calculate properly in Phase 8

        setStats({
          totalAlunos: alunosResult.count || 0,
          totalEscolas: escolasResult.count || 0,
          totalTurmas: turmasResult.count || 0,
          totalMatriculas: matriculasResult.count || 0,
          frequenciaMedia,
          alunosComBaixaFrequencia,
          totalProfessores: professoresResult.count || 0,
          usuariosAtivos: usuariosResult.count || 0,
          relatoriosPendentes: 0 // No reports table yet
        })
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
        // Set zeros on error so UI doesn't break
        setStats({
          totalAlunos: 0,
          totalEscolas: 0,
          totalTurmas: 0,
          totalMatriculas: 0,
          frequenciaMedia: 0,
          alunosComBaixaFrequencia: 0,
          totalProfessores: 0,
          usuariosAtivos: 0,
          relatoriosPendentes: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const quickActions: QuickAction[] = [
    { name: 'Nova Escola', href: '/dashboard/escolas/nova', icon: School, color: 'bg-blue-100 text-blue-600', description: 'Cadastrar unidade escolar' },
    { name: 'Gerenciar Usuários', href: '/dashboard/usuarios', icon: Users, color: 'bg-green-100 text-green-600', description: 'Administrar perfis de acesso' },
    { name: 'Relatórios INEP', href: '/dashboard/relatorios/inep', icon: FileText, color: 'bg-purple-100 text-purple-600', description: 'Exportar dados educacionais', badge: 'Crítico' },
    { name: 'Configurar Sistema', href: '/dashboard/configuracoes', icon: Settings, color: 'bg-gray-100 text-gray-600', description: 'Configurações globais' },
    { name: 'Monitor de Performance', href: '/dashboard/monitoring', icon: Activity, color: 'bg-orange-100 text-orange-600', description: 'Monitorar sistema', isNew: true },
    { name: 'Auditoria', href: '/dashboard/auditoria', icon: Shield, color: 'bg-red-100 text-red-600', description: 'Logs e compliance' }
  ]

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <CardLoading key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Administrativo"
        description="Visão geral do sistema educacional municipal"
        action={
          <div className="flex gap-3">
            <Badge variant="outline" className="px-3 py-1">
              Município de Fronteira/MG
            </Badge>
            <Button asChild>
              <Link href="/dashboard/escolas/nova">
                <Plus className="h-4 w-4 mr-2" />
                Nova Escola
              </Link>
            </Button>
          </div>
        }
      />

      {/* Critical Alerts */}
      {stats && stats.relatoriosPendentes > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Atenção:</strong> {stats.relatoriosPendentes} relatórios INEP pendentes.
            <Button variant="link" className="p-0 ml-2 text-orange-800 underline" asChild>
              <Link href="/dashboard/relatorios">Ver relatórios</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Escolas"
          value={stats!.totalEscolas}
          icon={School}
          variant="primary"
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatsCard
          title="Total de Alunos"
          value={stats!.totalAlunos}
          icon={Users}
          variant="secondary"
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatsCard
          title="Professores Ativos"
          value={stats!.totalProfessores!}
          icon={GraduationCap}
          variant="accent"
        />
        <StatsCard
          title="Usuários do Sistema"
          value={stats!.usuariosAtivos!}
          icon={User}
          variant="default"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Municipal
            </CardTitle>
            <CardDescription>
              Indicadores educacionais do município
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Frequência Média Municipal</span>
                <span className="font-medium">{stats!.frequenciaMedia}%</span>
              </div>
              <Progress value={stats!.frequenciaMedia} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Meta Bolsa Família (75%)</span>
                <span className="font-medium text-green-600">Atingida</span>
              </div>
              <Progress value={87.5} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats!.totalMatriculas}</p>
                <p className="text-sm text-green-600">Matrículas Ativas</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats!.alunosComBaixaFrequencia}</p>
                <p className="text-sm text-orange-600">Alunos em Risco</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Itens de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-800">Relatórios INEP</p>
              <p className="text-sm text-yellow-600">{stats!.relatoriosPendentes} relatórios pendentes</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href="/dashboard/relatorios">Verificar</Link>
              </Button>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-800">Baixa Frequência</p>
              <p className="text-sm text-blue-600">{stats!.alunosComBaixaFrequencia} alunos abaixo de 75%</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href="/dashboard/frequencia">Acompanhar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas - Administração</CardTitle>
          <CardDescription>
            Principais funcionalidades administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <div className="group flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer relative">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${action.color} group-hover:scale-105 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.name}</span>
                  {action.description && (
                    <span className="text-xs text-gray-500 text-center mt-1">{action.description}</span>
                  )}
                  {action.badge && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 text-xs">
                      {action.badge}
                    </Badge>
                  )}
                  {action.isNew && (
                    <Badge variant="default" className="absolute -top-1 -right-1 text-xs bg-green-500">
                      Novo
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Director Dashboard - School-focused management
export function DiretorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        // Get director's escola_id from auth context
        const { data: { user } } = await supabase.auth.getUser()
        let escolaId: string | null = null

        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('escola_id')
            .eq('id', user.id)
            .single()
          escolaId = userData?.escola_id || null
        }

        // Build queries - filter by escola_id if available
        const baseQueries = [
          escolaId
            ? supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('escola_id', escolaId)
            : supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
          escolaId
            ? supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('escola_id', escolaId)
            : supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true),
          escolaId
            ? supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativa').eq('escola_id', escolaId)
            : supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativa'),
          escolaId
            ? supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario', 'professor').eq('escola_id', escolaId)
            : supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario', 'professor'),
          // Get attendance for current month
          supabase.from('frequencia')
            .select('presente, status_presenca')
            .gte('data_aula', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        ]

        const [
          alunosResult,
          turmasResult,
          matriculasResult,
          professoresResult,
          frequenciaResult
        ] = await Promise.all(baseQueries)

        // Calculate attendance rate
        const attendanceRecords = frequenciaResult.data || []
        const totalRecords = attendanceRecords.length
        const presentCount = attendanceRecords.filter((r: { presente: boolean; status_presenca: string | null }) =>
          r.presente || r.status_presenca === 'justificada' || r.status_presenca === 'atestado'
        ).length
        const frequenciaMedia = totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 1000) / 10
          : 0

        setStats({
          totalAlunos: alunosResult.count || 0,
          totalEscolas: 1, // Director sees their own school
          totalTurmas: turmasResult.count || 0,
          totalMatriculas: matriculasResult.count || 0,
          frequenciaMedia,
          alunosComBaixaFrequencia: 0, // TODO: Calculate properly in Phase 8
          totalProfessores: professoresResult.count || 0
        })
      } catch (error) {
        console.error('Error loading director dashboard stats:', error)
        setStats({
          totalAlunos: 0,
          totalEscolas: 1,
          totalTurmas: 0,
          totalMatriculas: 0,
          frequenciaMedia: 0,
          alunosComBaixaFrequencia: 0,
          totalProfessores: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const quickActions: QuickAction[] = [
    { name: 'Nova Turma', href: '/dashboard/turmas/nova', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
    { name: 'Gestão de Professores', href: '/dashboard/usuarios?role=professor', icon: GraduationCap, color: 'bg-green-100 text-green-600' },
    { name: 'Matrículas', href: '/dashboard/matriculas', icon: UserCheck, color: 'bg-purple-100 text-purple-600' },
    { name: 'Relatórios Escolares', href: '/dashboard/relatorios', icon: BarChart3, color: 'bg-orange-100 text-orange-600' }
  ]

  if (loading) return <LoadingCenter message="Carregando dashboard..." />

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard da Direção"
        description="Gestão da sua unidade escolar"
        action={
          <Button asChild>
            <Link href="/dashboard/turmas/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Link>
          </Button>
        }
      />

      {/* School Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Alunos"
          value={stats!.totalAlunos}
          icon={Users}
          variant="primary"
          trend={{ value: 3.2, isPositive: true }}
        />
        <StatsCard
          title="Turmas Ativas"
          value={stats!.totalTurmas}
          icon={BookOpen}
          variant="secondary"
        />
        <StatsCard
          title="Professores"
          value={stats!.totalProfessores!}
          icon={GraduationCap}
          variant="accent"
        />
        <StatsCard
          title="Frequência Média"
          value={stats!.frequenciaMedia}
          icon={CheckCircle2}
          variant="default"
          format="percentage"
        />
      </div>

      {/* Performance and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance da Escola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Frequência Geral</span>
                <span className="font-medium">{stats!.frequenciaMedia}%</span>
              </div>
              <Progress value={stats!.frequenciaMedia} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{stats!.totalMatriculas}</p>
                <p className="text-sm text-green-600">Matrículas</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-600">{stats!.alunosComBaixaFrequencia}</p>
                <p className="text-sm text-orange-600">Em Risco</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.name} href={action.href}>
                  <div className="flex flex-col items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-center">{action.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Secretary Dashboard - Administrative support
export function SecretarioDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        // Get secretary's escola_id from auth context
        const { data: { user } } = await supabase.auth.getUser()
        let escolaId: string | null = null

        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('escola_id')
            .eq('id', user.id)
            .single()
          escolaId = userData?.escola_id || null
        }

        // Build queries - filter by escola_id if available
        const baseQueries = [
          escolaId
            ? supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('escola_id', escolaId)
            : supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
          escolaId
            ? supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('escola_id', escolaId)
            : supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('ativo', true),
          escolaId
            ? supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativa').eq('escola_id', escolaId)
            : supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativa'),
          // Get attendance for current month
          supabase.from('frequencia')
            .select('presente, status_presenca')
            .gte('data_aula', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        ]

        const [
          alunosResult,
          turmasResult,
          matriculasResult,
          frequenciaResult
        ] = await Promise.all(baseQueries)

        // Calculate attendance rate
        const attendanceRecords = frequenciaResult.data || []
        const totalRecords = attendanceRecords.length
        const presentCount = attendanceRecords.filter((r: { presente: boolean; status_presenca: string | null }) =>
          r.presente || r.status_presenca === 'justificada' || r.status_presenca === 'atestado'
        ).length
        const frequenciaMedia = totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 1000) / 10
          : 0

        setStats({
          totalAlunos: alunosResult.count || 0,
          totalEscolas: 1, // Secretary sees their own school
          totalTurmas: turmasResult.count || 0,
          totalMatriculas: matriculasResult.count || 0,
          frequenciaMedia,
          alunosComBaixaFrequencia: 0 // TODO: Calculate properly in Phase 8
        })
      } catch (error) {
        console.error('Error loading secretary dashboard stats:', error)
        setStats({
          totalAlunos: 0,
          totalEscolas: 1,
          totalTurmas: 0,
          totalMatriculas: 0,
          frequenciaMedia: 0,
          alunosComBaixaFrequencia: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const quickActions: QuickAction[] = [
    { name: 'Novo Aluno', href: '/dashboard/alunos/novo', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { name: 'Nova Matrícula', href: '/dashboard/matriculas/nova', icon: UserCheck, color: 'bg-green-100 text-green-600' },
    { name: 'Consultar Frequência', href: '/dashboard/frequencia', icon: Calendar, color: 'bg-orange-100 text-orange-600' },
    { name: 'Gerar Relatórios', href: '/dashboard/relatorios', icon: FileText, color: 'bg-purple-100 text-purple-600' }
  ]

  if (loading) return <LoadingCenter message="Carregando dashboard..." />

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard da Secretaria"
        description="Gestão administrativa e matrículas"
        action={
          <Button asChild>
            <Link href="/dashboard/alunos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Aluno
            </Link>
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Alunos Matriculados"
          value={stats!.totalMatriculas}
          icon={UserCheck}
          variant="primary"
        />
        <StatsCard
          title="Total de Alunos"
          value={stats!.totalAlunos}
          icon={Users}
          variant="secondary"
        />
        <StatsCard
          title="Turmas Ativas"
          value={stats!.totalTurmas}
          icon={BookOpen}
          variant="accent"
        />
        <StatsCard
          title="Documentos Pendentes"
          value={12}
          icon={FileText}
          variant="default"
        />
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Frequentes</CardTitle>
          <CardDescription>
            Tarefas mais utilizadas na secretaria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <div className="flex flex-col items-center p-6 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Nova matrícula', student: 'Ana Silva Santos', time: '2 horas atrás' },
              { action: 'Documento atualizado', student: 'João Pedro Oliveira', time: '3 horas atrás' },
              { action: 'Transferência processada', student: 'Maria Eduarda Costa', time: '1 dia atrás' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.student}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Teacher Dashboard - Already exists, wrap it
export function ProfessorDashboard({ onNavigateToAttendance }: { onNavigateToAttendance: (classInfo: any, sessionData?: any) => void }) {
  return <TeacherDashboardEnhanced onNavigateToAttendance={onNavigateToAttendance} />
}

// Parent/Guardian Dashboard - Student-focused view
interface StudentInfo {
  id: string
  name: string
  class: string
  attendance: number
  grade: number
}

export function ResponsavelDashboard() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentInfo[]>([])

  useEffect(() => {
    async function loadStudentData() {
      try {
        // Get parent's user id
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Get children linked to this responsavel
          const { data: alunosData } = await supabase
            .from('alunos')
            .select(`
              id,
              nome_completo,
              matriculas!inner (
                id,
                turma_id,
                turmas (nome)
              )
            `)
            .eq('responsavel_id', user.id)
            .eq('ativo', true)
            .limit(10)

          if (alunosData && alunosData.length > 0) {
            // For each student, calculate their attendance
            const studentInfos: StudentInfo[] = await Promise.all(
              alunosData.map(async (aluno: {
                id: string
                nome_completo: string
                matriculas: Array<{
                  id: string
                  turma_id: string
                  turmas: { nome: string } | null
                }>
              }) => {
                // Get attendance for this student's matricula
                const matriculaId = aluno.matriculas?.[0]?.id
                let attendance = 0

                if (matriculaId) {
                  const { data: freqData } = await supabase
                    .from('frequencia')
                    .select('presente, status_presenca')
                    .eq('matricula_id', matriculaId)
                    .limit(100)

                  if (freqData && freqData.length > 0) {
                    const present = freqData.filter(f =>
                      f.presente || f.status_presenca === 'justificada' || f.status_presenca === 'atestado'
                    ).length
                    attendance = Math.round((present / freqData.length) * 100)
                  }
                }

                return {
                  id: aluno.id,
                  name: aluno.nome_completo,
                  class: aluno.matriculas?.[0]?.turmas?.nome || 'Sem turma',
                  attendance,
                  grade: 0 // TODO: Calculate from notas table when available
                }
              })
            )
            setStudents(studentInfos)
          }
        }
      } catch (error) {
        console.error('Error loading student data:', error)
        // Keep empty students array on error
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [])

  if (loading) return <LoadingCenter message="Carregando informacoes dos estudantes..." />

  // Show placeholder if no students linked
  if (students.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Portal do Responsavel"
          description="Acompanhe o desempenho dos seus filhos"
        />
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Nenhum aluno vinculado a esta conta.</p>
            <p className="text-sm text-gray-400 mt-2">
              Entre em contato com a secretaria para vincular seus filhos.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portal do Responsavel"
        description="Acompanhe o desempenho dos seus filhos"
      />

      {/* Student Cards */}
      <div className="grid gap-6">
        {students.map((student) => (
          <Card key={student.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{student.name}</CardTitle>
                  <CardDescription>{student.class}</CardDescription>
                </div>
                <Badge variant={student.attendance >= 90 ? 'default' : 'destructive'}>
                  {student.attendance}% Frequencia
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Frequencia</h4>
                  <Progress value={student.attendance} className="h-3" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Média Geral</h4>
                  <div className="text-2xl font-bold text-green-600">{student.grade}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Main component that routes to the appropriate dashboard
export function RoleSpecificDashboard({ onNavigateToAttendance }: { onNavigateToAttendance?: (classInfo: any, sessionData?: any) => void }) {
  const { userProfile } = useAuth()

  switch (userProfile?.tipo_usuario) {
    case 'admin':
      return <AdminDashboard />
    case 'diretor':
      return <DiretorDashboard />
    case 'secretario':
      return <SecretarioDashboard />
    case 'professor':
      return <ProfessorDashboard onNavigateToAttendance={onNavigateToAttendance!} />
    case 'responsavel':
      return <ResponsavelDashboard />
    default:
      return <AdminDashboard />
  }
}