'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { supabase, Aluno } from '@/lib/supabase'
import { studentsApi } from '@/lib/api/students'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Eye, Edit, Trash2, Users, UserCheck, UserX, Heart, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { PageHeader } from '@/components/ui/page-header'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { TableEmptyState } from '@/components/ui/table-empty-state'
import { formatDateBR } from '@/lib/date-utils'
import { useEscola } from '@/contexts/escola-context'
import { useAuth } from '@/hooks/use-auth'
import { EscolaRequiredState } from '@/components/ui/escola-required-state'
import { getStudentManagementProfiles } from '@/lib/sensitive-family-access'
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

interface AlunoWithDetails extends Pick<Aluno,
  'id' | 'nome_completo' | 'data_nascimento' | 'sexo' | 'cpf' |
  'telefone' | 'necessidades_especiais' | 'ativo'
> {
  responsaveis?: {
    nome: string
  }
  matriculas?: {
    situacao: string | null
    turmas: {
      nome: string
      escolas: {
        nome: string
      } | null
    } | null
  }[]
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

  useEffect(() => {
    loadAlunos()
  }, [escolaIdToUse])

  const loadAlunos = async () => {
    // If admin needs escola selected but hasn't selected one, don't fetch
    if (shouldShowSelector && !escolaIdToUse) {
      setAlunos([])
      setLoading(false)
      return
    }

    try {
      setAlunos(await getStudentManagementProfiles(supabase, { schoolId: escolaIdToUse ?? undefined }))
    } catch (error: any) {
      logger.error('Erro ao carregar alunos:', error)
      toast.error(t('ui.erro-ao-carregar-lista-de-alunos'))
      setAlunos([])
    } finally {
      setLoading(false)
    }
  }

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const getStatusBadge = (aluno: AlunoWithDetails) => {
    const matriculaAtiva = aluno.matriculas?.find(m => m.situacao === 'ativa')

    if (!aluno.ativo) {
      return <Badge variant="secondary">{t('studentsList.inactive')}</Badge>
    }

    if (matriculaAtiva) {
      return <Badge variant="default" className="bg-green-100 text-green-800">{t('studentsList.enrolled')}</Badge>
    }

    return <Badge variant="outline">{t('studentsList.notEnrolled')}</Badge>
  }

  const getCurrentSchool = (aluno: AlunoWithDetails) => {
    const matriculaAtiva = aluno.matriculas?.find(m => m.situacao === 'ativa')
    return matriculaAtiva?.turmas?.escolas?.nome || t('studentsList.notEnrolled')
  }

  const filteredAlunos = alunos.filter(aluno => {
    const matchesSearch = aluno.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
                         aluno.cpf?.includes(search) ||
                         aluno.responsaveis?.nome?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'todos' ||
                         (statusFilter === 'ativo' && aluno.ativo) ||
                         (statusFilter === 'inativo' && !aluno.ativo) ||
                         (statusFilter === 'matriculado' && aluno.matriculas?.some(m => m.situacao === 'ativa')) ||
                         (statusFilter === 'nao_matriculado' && !aluno.matriculas?.some(m => m.situacao === 'ativa'))

    const matchesSexo = sexoFilter === 'todos' || aluno.sexo === sexoFilter

    return matchesSearch && matchesStatus && matchesSexo
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
            onClearAll={() => {
              setSearch('')
              setStatusFilter('todos')
              setSexoFilter('todos')
            }}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table className="responsive-stack-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('studentsList.student')}</TableHead>
                  <TableHead>{t('studentsList.age')}</TableHead>
                  <TableHead>{t('studentsList.guardian')}</TableHead>
                  <TableHead>{t('studentsList.currentSchool')}</TableHead>
                  <TableHead>{t('studentsList.status')}</TableHead>
                  <TableHead className="text-right">{t('studentsList.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlunos.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(aluno.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{aluno.nome_completo}</div>
                          <div className="text-sm text-gray-500">
                            {aluno.sexo === 'M' ? t('studentsList.male') : t('studentsList.female')}
                            {aluno.cpf && ` • CPF: ${aluno.cpf}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{calculateAge(aluno.data_nascimento)} {t('studentsList.years')}</div>
                      <div className="text-sm text-gray-500">
                        {formatDateBR(aluno.data_nascimento)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {aluno.responsaveis?.nome || t('studentsList.notProvided')}
                      </div>
                      {aluno.telefone && (
                        <div className="text-sm text-gray-500">{aluno.telefone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{getCurrentSchool(aluno)}</div>
                      {aluno.matriculas?.find(m => m.situacao === 'ativa')?.turmas?.nome && (
                        <div className="text-sm text-gray-500">
                          {aluno.matriculas.find(m => m.situacao === 'ativa')?.turmas?.nome}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(aluno)}
                      {aluno.necessidades_especiais && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          NEE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/dashboard/alunos/${aluno.id}`}
                            aria-label={t('studentsList.view', { name: aluno.nome_completo })}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/dashboard/alunos/${aluno.id}/editar`}
                            aria-label={t('studentsList.edit', { name: aluno.nome_completo })}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          aria-label={t('studentsList.deactivate', { name: aluno.nome_completo })}
                          onClick={() => setStudentToDeactivate(aluno)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAlunos.length === 0 && (
                  <TableEmptyState
                    colSpan={6}
                    icon={search || statusFilter !== 'todos' || sexoFilter !== 'todos' ? SearchIcon : Users}
                    title={
                      search || statusFilter !== 'todos' || sexoFilter !== 'todos'
                        ? t('ui.nenhum-aluno-encontrado')
                        : t('labels.nenhum-aluno-cadastrado')
                    }
                    description={
                      search || statusFilter !== 'todos' || sexoFilter !== 'todos'
                        ? t('ui.tente-ajustar-os-filtros-para-encontrar-o-que-procura')
                        : t('ui.comece-adicionando-o-primeiro-aluno-ao-sistema')
                    }
                    actions={
                      search || statusFilter !== 'todos' || sexoFilter !== 'todos'
                        ? [
                            {
                              label: t('studentsList.clearFilters'),
                              variant: 'outline',
                              onClick: () => {
                                setSearch('')
                                setStatusFilter('todos')
                                setSexoFilter('todos')
                              },
                            },
                          ]
                        : [
                            {
                              label: t('labels.novo-aluno'),
                              href: '/dashboard/alunos/novo',
                              icon: Plus,
                            },
                          ]
                    }
                  />
                )}
              </TableBody>
            </Table>
          </div>
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
