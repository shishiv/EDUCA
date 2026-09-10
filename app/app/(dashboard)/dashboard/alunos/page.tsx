'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { studentsApi } from '@/lib/api/students'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Users, UserCheck, UserX, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { PageHeader } from '@/components/ui/page-header'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { useEscola } from '@/contexts/escola-context'
import { useAuth } from '@/hooks/use-auth'
import { EscolaRequiredState } from '@/components/ui/escola-required-state'
import {
  getStudentManagementProfiles,
  type StudentManagementProfile,
} from '@/lib/sensitive-family-access'
import { StudentListTable } from '@/components/students/StudentListTable'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type AlunoWithDetails = StudentManagementProfile

type StudentFilters = {
  search: string
  status: string
  sex: string
}

function hasActiveEnrollment(student: AlunoWithDetails): boolean {
  return student.matriculas?.some(enrollment => enrollment.situacao === 'ativa') ?? false
}

function matchesStudentStatus(student: AlunoWithDetails, status: string): boolean {
  if (status === 'todos') return true
  if (status === 'ativo') return student.ativo
  if (status === 'inativo') return !student.ativo
  if (status === 'matriculado') return hasActiveEnrollment(student)
  if (status === 'nao_matriculado') return !hasActiveEnrollment(student)
  return false
}

function matchesStudentSearch(student: AlunoWithDetails, search: string): boolean {
  const normalizedSearch = search.toLocaleLowerCase()
  return student.nome_completo.toLocaleLowerCase().includes(normalizedSearch)
    || student.cpf?.includes(search)
    || student.responsavel?.nome.toLocaleLowerCase().includes(normalizedSearch)
    || false
}

function filterStudents(students: AlunoWithDetails[], filters: StudentFilters): AlunoWithDetails[] {
  return students.filter(student => matchesStudentSearch(student, filters.search)
    && matchesStudentStatus(student, filters.status)
    && (filters.sex === 'todos' || student.sexo === filters.sex))
}

function StudentsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 bg-gray-200 rounded" />)}
        </div>
      </div>
    </div>
  )
}

export default function AlunosPage() {
  const t = useTranslations('registry')
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const { userProfile } = useAuth()
  const [alunos, setAlunos] = useState<AlunoWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sexoFilter, setSexoFilter] = useState('todos')
  const [studentToDeactivate, setStudentToDeactivate] = useState<AlunoWithDetails | null>(null)

  // Determine which escola_id to use for filtering
  const escolaIdToUse = useMemo(() => {
    // Admin users with selector: use selected escola (may be null)
    if (shouldShowSelector) {
      return selectedEscolaId
    }
    // Non-admin users: use their assigned escola
    return userProfile?.escola_id || null
  }, [shouldShowSelector, selectedEscolaId, userProfile?.escola_id])

  const loadAlunos = useCallback(async () => {
    // If admin needs escola selected but hasn't selected one, don't fetch
    if (shouldShowSelector && !escolaIdToUse) {
      setAlunos([])
      setLoading(false)
      return
    }

    try {
      setAlunos(await getStudentManagementProfiles(supabase, { schoolId: escolaIdToUse ?? undefined }))
    } catch (error) {
      logger.error('Erro ao carregar alunos:', error instanceof Error ? error : String(error))
      toast.error(t('ui.erro-ao-carregar-lista-de-alunos'))
      setAlunos([])
    } finally {
      setLoading(false)
    }
  }, [escolaIdToUse, shouldShowSelector, t])

  useEffect(() => {
    void loadAlunos()
  }, [loadAlunos])

  const handleDeactivate = async () => {
    if (!studentToDeactivate) return

    try {
      await studentsApi.updateStudentStatus(studentToDeactivate.id, false)
      setStudentToDeactivate(null)
      toast.success(t('ui.aluno-desativado-com-sucesso'))
      await loadAlunos()
    } catch (error) {
      logger.error('Erro ao desativar aluno:', error instanceof Error ? error : String(error))
      toast.error(t('ui.nao-foi-possivel-desativar-o-aluno'))
    }
  }

  const filteredAlunos = filterStudents(alunos, { search, status: statusFilter, sex: sexoFilter })
  const hasFilters = Boolean(search || statusFilter !== 'todos' || sexoFilter !== 'todos')

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('todos')
    setSexoFilter('todos')
  }

  if (loading) return <StudentsLoadingState />

  // Show escola required state for admin users without selection
  if (shouldShowSelector && !selectedEscolaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('labels.alunos')}
          description={t('labels.gerencie-o-cadastro-de-todos-os-alunos-da-rede-municipa')}
          actions={
            <>
              <Button asChild className="app-primary-action gap-2">
                <Link href="/dashboard/alunos/novo">
                  <Plus className="h-4 w-4" />
                  {t('labels.novo-aluno')}
                </Link>
              </Button>
            </>
          }
        />
        <EscolaRequiredState
          title={t('labels.selecione-uma-escola')}
          description={t('labels.para-visualizar-os-alunos-selecione-uma-escola-no-selet')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title={t('labels.alunos')}
        description={t('labels.gerencie-o-cadastro-de-todos-os-alunos-da-rede-municipa')}
        actions={
          <>
            <Button asChild className="app-primary-action gap-2">
              <Link href="/dashboard/alunos/novo">
                <Plus className="h-4 w-4" />
                {t('labels.novo-aluno')}
              </Link>
            </Button>
          </>
        }
      />

      {/* Estatísticas compactas */}
      <StatsBar
        stats={[
          { label: t('studentsList.total'), value: alunos.length, icon: Users },
          { label: t('studentsList.enrolledPlural'), value: alunos.filter(a => a.matriculas?.some(m => m.situacao === 'ativa')).length, icon: UserCheck, variant: 'success' },
          { label: t('studentsList.notEnrolledPlural'), value: alunos.filter(a => !a.matriculas?.some(m => m.situacao === 'ativa')).length, icon: UserX, variant: 'warning' },
          { label: t('studentsList.specialNeeds'), value: alunos.filter(a => a.necessidades_especiais).length, icon: Heart, variant: 'info' },
        ]}
      />

      {/* Lista de Alunos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-gray-900">{t('studentsList.studentsCount', { count: filteredAlunos.length })}</h2>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: t('studentsList.search'),
            }}
            filters={[
              {
                id: 'status',
                placeholder: t('studentsList.status'),
                value: statusFilter,
                options: [
                  { value: 'todos', label: t('studentsList.allStatuses') },
                  { value: 'matriculado', label: t('studentsList.enrolledPlural') },
                  { value: 'nao_matriculado', label: t('studentsList.notEnrolledPlural') },
                  { value: 'ativo', label: t('studentsList.active') },
                  { value: 'inativo', label: t('studentsList.inactivePlural') },
                ],
                onChange: setStatusFilter,
                width: 'w-full sm:w-44',
              },
              {
                id: 'sexo',
                placeholder: t('labels.sexo'),
                value: sexoFilter,
                options: [
                  { value: 'todos', label: t('studentsList.all') },
                  { value: 'M', label: t('studentsList.male') },
                  { value: 'F', label: t('studentsList.female') },
                ],
                onChange: setSexoFilter,
                width: 'w-full sm:w-32',
              },
            ]}
            onClearAll={clearFilters}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <StudentListTable
            students={filteredAlunos}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onDeactivate={setStudentToDeactivate}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(studentToDeactivate)}
        onOpenChange={(open) => {
          if (!open) setStudentToDeactivate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('labels.desativar-aluno')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('studentsList.confirm', { name: studentToDeactivate?.nome_completo ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('labels.cancelar')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>{t('labels.desativar')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
