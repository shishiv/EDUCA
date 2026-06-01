'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Download, BookOpen, CheckCircle, TrendingUp, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { PageHeader } from '@/components/ui/page-header'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { TurmaCard, TurmaCardGrid } from '@/components/turmas'
import { useEscola } from '@/contexts/escola-context'
import { useAuth } from '@/hooks/use-auth'
import { EscolaRequiredState } from '@/components/ui/escola-required-state'

interface Turma {
  id: string
  nome: string
  serie: string
  ano_letivo: number
  escola: {
    id: string
    nome: string
    tipo: string
  }
  professor: {
    id: string
    nome: string
    email: string
  } | null
  capacidade: number
  alunos_matriculados: number
  turno: 'matutino' | 'vespertino' | 'integral'
  ativo: boolean
  created_at: string
}

const mockTurmas: Turma[] = [
  {
    id: '1',
    nome: 'Bercario A',
    serie: 'Bercario',
    ano_letivo: 2024,
    escola: {
      id: '1',
      nome: 'CEMEI Pequenos Passos',
      tipo: 'creche'
    },
    professor: {
      id: '1',
      nome: 'Lucia Cardoso Oliveira',
      email: 'lucia.cardoso@municipio.edu.br'
    },
    capacidade: 15,
    alunos_matriculados: 12,
    turno: 'integral',
    ativo: true,
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: '2',
    nome: 'Maternal B',
    serie: 'Maternal',
    ano_letivo: 2024,
    escola: {
      id: '1',
      nome: 'CEMEI Pequenos Passos',
      tipo: 'creche'
    },
    professor: {
      id: '2',
      nome: 'Ana Paula Santos',
      email: 'ana.paula@municipio.edu.br'
    },
    capacidade: 20,
    alunos_matriculados: 18,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: '3',
    nome: 'Pre I A',
    serie: 'Pre I',
    ano_letivo: 2024,
    escola: {
      id: '2',
      nome: 'EMEI Jardim da Infancia',
      tipo: 'pre_escola'
    },
    professor: {
      id: '3',
      nome: 'Fernanda Alves Santos',
      email: 'fernanda.alves@municipio.edu.br'
    },
    capacidade: 25,
    alunos_matriculados: 23,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-10T09:00:00Z'
  },
  {
    id: '4',
    nome: 'Pre II B',
    serie: 'Pre II',
    ano_letivo: 2024,
    escola: {
      id: '2',
      nome: 'EMEI Jardim da Infancia',
      tipo: 'pre_escola'
    },
    professor: {
      id: '4',
      nome: 'Roberto Silva Lima',
      email: 'roberto.lima@municipio.edu.br'
    },
    capacidade: 25,
    alunos_matriculados: 20,
    turno: 'vespertino',
    ativo: true,
    created_at: '2024-01-10T09:00:00Z'
  },
  {
    id: '5',
    nome: '1 Ano A',
    serie: '1 Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor Joao Silva',
      tipo: 'fundamental'
    },
    professor: {
      id: '5',
      nome: 'Mariana Costa Pereira',
      email: 'mariana.costa@municipio.edu.br'
    },
    capacidade: 30,
    alunos_matriculados: 28,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-08T14:15:00Z'
  },
  {
    id: '6',
    nome: '5 Ano A',
    serie: '5 Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor Joao Silva',
      tipo: 'fundamental'
    },
    professor: {
      id: '6',
      nome: 'Jose Roberto Lima',
      email: 'jose.lima@municipio.edu.br'
    },
    capacidade: 30,
    alunos_matriculados: 25,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-08T14:15:00Z'
  },
  {
    id: '7',
    nome: '9 Ano B',
    serie: '9 Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor Joao Silva',
      tipo: 'fundamental'
    },
    professor: null,
    capacidade: 30,
    alunos_matriculados: 0,
    turno: 'vespertino',
    ativo: false,
    created_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '8',
    nome: 'Maternal C',
    serie: 'Maternal',
    ano_letivo: 2024,
    escola: {
      id: '1',
      nome: 'CEMEI Pequenos Passos',
      tipo: 'creche'
    },
    professor: {
      id: '7',
      nome: 'Patricia Souza Oliveira',
      email: 'patricia.souza@municipio.edu.br'
    },
    capacidade: 20,
    alunos_matriculados: 15,
    turno: 'vespertino',
    ativo: true,
    created_at: '2024-01-15T08:00:00Z'
  }
]

export default function TurmasPage() {
  const router = useRouter()
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const { userProfile } = useAuth()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [escolaFilter, setEscolaFilter] = useState('todas')
  const [serieFilter, setSerieFilter] = useState('todas')
  const [turnoFilter, setTurnoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

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
    loadTurmas()
  }, [escolaIdToUse])

  const loadTurmas = async () => {
    // If admin needs escola selected but hasn't selected one, don't fetch
    if (shouldShowSelector && !escolaIdToUse) {
      setTurmas([])
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('turmas')
        .select(`
          *,
          escola:escolas(id, nome, tipo),
          professor:users!professor_id(id, nome, email)
        `)
        .order('created_at', { ascending: false })

      // Filter by escola if we have one
      if (escolaIdToUse) {
        query = query.eq('escola_id', escolaIdToUse)
      }

      const { data, error } = await query

      if (error) throw error

      // Get enrollment counts for each turma
      const turmaIds = data?.map(t => t.id) || []
      const enrollmentCounts = new Map<string, number>()

      if (turmaIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('matriculas')
          .select('turma_id')
          .in('turma_id', turmaIds)
          .eq('situacao', 'ativa')

        enrollments?.forEach(enrollment => {
          const count = enrollmentCounts.get(enrollment.turma_id) || 0
          enrollmentCounts.set(enrollment.turma_id, count + 1)
        })
      }

      // Transform data to match component interface
      const formattedTurmas = data?.map(turma => ({
        id: turma.id,
        nome: turma.nome,
        ano_letivo: turma.ano_letivo,
        serie: turma.serie || '',
        turno: turma.turno,
        capacidade: turma.capacidade || 0,
        alunos_matriculados: enrollmentCounts.get(turma.id) || 0,
        ativo: turma.ativo ?? true,
        created_at: turma.created_at || new Date().toISOString(),
        escola: {
          id: turma.escola?.id || '',
          nome: turma.escola?.nome || 'Sem escola',
          tipo: turma.escola?.tipo || 'escola'
        },
        professor: turma.professor ? {
          id: turma.professor.id,
          nome: turma.professor.nome,
          email: turma.professor.email || ''
        } : null
      })) || []

      setTurmas(formattedTurmas as Turma[])
    } catch (error: unknown) {
      logger.error('Error loading turmas', error as Error)
      toast.error('Erro ao carregar lista de turmas')
      setTurmas([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = turma.nome.toLowerCase().includes(search.toLowerCase()) ||
                         turma.serie.toLowerCase().includes(search.toLowerCase()) ||
                         turma.escola.nome.toLowerCase().includes(search.toLowerCase()) ||
                         turma.professor?.nome.toLowerCase().includes(search.toLowerCase())

    const matchesEscola = escolaFilter === 'todas' || turma.escola.id === escolaFilter
    const matchesSerie = serieFilter === 'todas' || turma.serie === serieFilter
    const matchesTurno = turnoFilter === 'todos' || turma.turno === turnoFilter
    const matchesStatus = statusFilter === 'todos' ||
                         (statusFilter === 'ativo' && turma.ativo) ||
                         (statusFilter === 'inativo' && !turma.ativo)

    return matchesSearch && matchesEscola && matchesSerie && matchesTurno && matchesStatus
  })

  const totalTurmas = turmas.length
  const turmasAtivas = turmas.filter(t => t.ativo).length
  const totalAlunos = turmas.reduce((sum, t) => sum + t.alunos_matriculados, 0)
  const capacidadeTotal = turmas.reduce((sum, t) => sum + t.capacidade, 0)

  const escolas = Array.from(new Set(turmas.map(t => t.escola.nome))).map(nome => {
    const escola = turmas.find(t => t.escola.nome === nome)?.escola
    return escola
  }).filter(Boolean)

  const series = Array.from(new Set(turmas.map(t => t.serie)))

  const clearFilters = () => {
    setSearch('')
    setEscolaFilter('todas')
    setSerieFilter('todas')
    setTurnoFilter('todos')
    setStatusFilter('todos')
  }

  const hasActiveFilters = search || escolaFilter !== 'todas' || serieFilter !== 'todas' || turnoFilter !== 'todos' || statusFilter !== 'todos'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
          title="Turmas"
          description="Gerencie as turmas e classes da rede municipal"
          actions={
            <>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button asChild className="gap-2">
                <Link href="/dashboard/turmas/nova">
                  <Plus className="h-4 w-4" />
                  Nova Turma
                </Link>
              </Button>
            </>
          }
        />
        <EscolaRequiredState
          title="Selecione uma Escola"
          description="Para visualizar as turmas, selecione uma escola no seletor do menu lateral."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <PageHeader
        title="Turmas"
        description="Gerencie as turmas e classes da rede municipal"
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/turmas/nova">
                <Plus className="h-4 w-4" />
                Nova Turma
              </Link>
            </Button>
          </>
        }
      />

      {/* Estatisticas compactas */}
      <StatsBar
        stats={[
          { label: 'Total', value: totalTurmas, icon: BookOpen },
          { label: 'Ativas', value: turmasAtivas, icon: CheckCircle, variant: 'success' },
          { label: 'Alunos', value: totalAlunos, icon: Users, variant: 'info' },
          { label: 'Ocupacao', value: `${capacidadeTotal > 0 ? Math.round((totalAlunos / capacidadeTotal) * 100) : 0}%`, icon: TrendingUp, variant: 'warning' },
        ]}
      />

      {/* Filtros e Grid de Turmas */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">Turmas ({filteredTurmas.length})</CardTitle>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nome, serie, escola ou professor...',
            }}
            filters={[
              {
                id: 'escola',
                placeholder: 'Escola',
                value: escolaFilter,
                options: [
                  { value: 'todas', label: 'Todas as escolas' },
                  ...escolas.filter(Boolean).map(escola => ({
                    value: escola?.id || '',
                    label: escola?.nome || '',
                  })),
                ],
                onChange: setEscolaFilter,
                width: 'w-full sm:w-48',
              },
              {
                id: 'serie',
                placeholder: 'Serie',
                value: serieFilter,
                options: [
                  { value: 'todas', label: 'Todas' },
                  ...series.map(serie => ({ value: serie, label: serie })),
                ],
                onChange: setSerieFilter,
                width: 'w-full sm:w-32',
              },
              {
                id: 'turno',
                placeholder: 'Turno',
                value: turnoFilter,
                options: [
                  { value: 'todos', label: 'Todos' },
                  { value: 'matutino', label: 'Matutino' },
                  { value: 'vespertino', label: 'Vespertino' },
                  { value: 'integral', label: 'Integral' },
                ],
                onChange: setTurnoFilter,
                width: 'w-full sm:w-32',
              },
              {
                id: 'status',
                placeholder: 'Status',
                value: statusFilter,
                options: [
                  { value: 'todos', label: 'Todos' },
                  { value: 'ativo', label: 'Ativas' },
                  { value: 'inativo', label: 'Inativas' },
                ],
                onChange: setStatusFilter,
                width: 'w-full sm:w-32',
              },
            ]}
            onClearAll={clearFilters}
          />
        </CardHeader>
        <CardContent className="pt-4">
          {filteredTurmas.length > 0 ? (
            <TurmaCardGrid>
              {filteredTurmas.map((turma) => (
                <TurmaCard
                  key={turma.id}
                  turma={turma}
                  onChamada={(id) => router.push(`/dashboard/turmas/${id}/chamada`)}
                  onDiario={(id) => router.push(`/dashboard/turmas/${id}/diario`)}
                />
              ))}
            </TurmaCardGrid>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {hasActiveFilters ? (
                <>
                  <SearchIcon className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma turma encontrada</h3>
                  <p className="text-sm text-gray-500 mb-4">Tente ajustar os filtros para encontrar o que procura.</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </>
              ) : (
                <>
                  <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma turma cadastrada</h3>
                  <p className="text-sm text-gray-500 mb-4">Comece adicionando a primeira turma.</p>
                  <Button asChild>
                    <Link href="/dashboard/turmas/nova">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Turma
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
