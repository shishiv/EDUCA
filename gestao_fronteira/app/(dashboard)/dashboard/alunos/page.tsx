'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase, Aluno } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Download, Eye, Edit, Trash2, Users, UserCheck, UserX, Heart, Search as SearchIcon } from 'lucide-react'
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

interface AlunoWithDetails extends Aluno {
  responsaveis?: {
    nome: string
  }
  matriculas?: {
    situacao: string
    turmas: {
      nome: string
      escolas: {
        nome: string
      }
    }
  }[]
}

export default function AlunosPage() {
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const { userProfile } = useAuth()
  const [alunos, setAlunos] = useState<AlunoWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sexoFilter, setSexoFilter] = useState('todos')

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
      // If we have an escola filter, get alunos via matriculas -> turmas
      if (escolaIdToUse) {
        // First get all turmas for the selected escola
        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', escolaIdToUse)

        if (turmasError) throw turmasError

        const turmaIds = turmasData?.map(t => t.id) || []

        if (turmaIds.length === 0) {
          setAlunos([])
          setLoading(false)
          return
        }

        // Get matriculas for those turmas
        const { data: matriculasData, error: matriculasError } = await supabase
          .from('matriculas')
          .select('aluno_id')
          .in('turma_id', turmaIds)

        if (matriculasError) throw matriculasError

        const alunoIds = [...new Set(matriculasData?.map(m => m.aluno_id) || [])]

        if (alunoIds.length === 0) {
          setAlunos([])
          setLoading(false)
          return
        }

        // Get alunos with their data
        const { data, error } = await supabase
          .from('alunos')
          .select(`
            *,
            responsaveis:responsavel_id (nome),
            matriculas (
              situacao,
              turmas (
                nome,
                escolas (nome)
              )
            )
          `)
          .in('id', alunoIds)
          .order('nome_completo')

        if (error) throw error

        const transformedData = data?.map(aluno => ({
          ...aluno,
          responsaveis: aluno.responsaveis || undefined
        })) || []
        setAlunos(transformedData)
      } else {
        // No escola filter - get all alunos
        const { data, error } = await supabase
          .from('alunos')
          .select(`
            *,
            responsaveis:responsavel_id (nome),
            matriculas (
              situacao,
              turmas (
                nome,
                escolas (nome)
              )
            )
          `)
          .order('nome_completo')

        if (error) throw error

        const transformedData = data?.map(aluno => ({
          ...aluno,
          responsaveis: aluno.responsaveis || undefined
        })) || []
        setAlunos(transformedData)
      }
    } catch (error: any) {
      logger.error('Erro ao carregar alunos:', error)
      toast.error('Erro ao carregar lista de alunos')
      setAlunos([])
    } finally {
      setLoading(false)
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
      return <Badge variant="secondary">Inativo</Badge>
    }
    
    if (matriculaAtiva) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Matriculado</Badge>
    }
    
    return <Badge variant="outline">Não Matriculado</Badge>
  }

  const getCurrentSchool = (aluno: AlunoWithDetails) => {
    const matriculaAtiva = aluno.matriculas?.find(m => m.situacao === 'ativa')
    return matriculaAtiva?.turmas?.escolas?.nome || 'Não matriculado'
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
          title="Alunos"
          description="Gerencie o cadastro de todos os alunos da rede municipal"
          actions={
            <>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button asChild className="gap-2">
                <Link href="/dashboard/alunos/novo">
                  <Plus className="h-4 w-4" />
                  Novo Aluno
                </Link>
              </Button>
            </>
          }
        />
        <EscolaRequiredState
          title="Selecione uma Escola"
          description="Para visualizar os alunos, selecione uma escola no seletor do menu lateral."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title="Alunos"
        description="Gerencie o cadastro de todos os alunos da rede municipal"
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/alunos/novo">
                <Plus className="h-4 w-4" />
                Novo Aluno
              </Link>
            </Button>
          </>
        }
      />

      {/* Estatísticas compactas */}
      <StatsBar
        stats={[
          { label: 'Total', value: alunos.length, icon: Users },
          { label: 'Matriculados', value: alunos.filter(a => a.matriculas?.some(m => m.situacao === 'ativa')).length, icon: UserCheck, variant: 'success' },
          { label: 'Não Matriculados', value: alunos.filter(a => !a.matriculas?.some(m => m.situacao === 'ativa')).length, icon: UserX, variant: 'warning' },
          { label: 'NEE', value: alunos.filter(a => a.necessidades_especiais).length, icon: Heart, variant: 'info' },
        ]}
      />

      {/* Lista de Alunos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">Alunos ({filteredAlunos.length})</CardTitle>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nome, CPF ou responsável...',
            }}
            filters={[
              {
                id: 'status',
                placeholder: 'Status',
                value: statusFilter,
                options: [
                  { value: 'todos', label: 'Todos os Status' },
                  { value: 'matriculado', label: 'Matriculados' },
                  { value: 'nao_matriculado', label: 'Não Matriculados' },
                  { value: 'ativo', label: 'Ativos' },
                  { value: 'inativo', label: 'Inativos' },
                ],
                onChange: setStatusFilter,
                width: 'w-full sm:w-44',
              },
              {
                id: 'sexo',
                placeholder: 'Sexo',
                value: sexoFilter,
                options: [
                  { value: 'todos', label: 'Todos' },
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Escola Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                            {aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}
                            {aluno.cpf && ` • CPF: ${aluno.cpf}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{calculateAge(aluno.data_nascimento)} anos</div>
                      <div className="text-sm text-gray-500">
                        {formatDateBR(aluno.data_nascimento)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {aluno.responsaveis?.nome || 'Não informado'}
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
                          <Link href={`/dashboard/alunos/${aluno.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/alunos/${aluno.id}/editar`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
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
                        ? 'Nenhum aluno encontrado'
                        : 'Nenhum aluno cadastrado'
                    }
                    description={
                      search || statusFilter !== 'todos' || sexoFilter !== 'todos'
                        ? 'Tente ajustar os filtros para encontrar o que procura.'
                        : 'Comece adicionando o primeiro aluno ao sistema.'
                    }
                    actions={
                      search || statusFilter !== 'todos' || sexoFilter !== 'todos'
                        ? [
                            {
                              label: 'Limpar filtros',
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
                              label: 'Novo Aluno',
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
    </div>
  )
}