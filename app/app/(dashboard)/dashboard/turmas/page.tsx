'use client'

import { useClassroomTranslations } from '@/i18n/classroom'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Download, BookOpen, CheckCircle, TrendingUp, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { classFormSchema } from '@/lib/validation/brazilian'
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

function matchesTurma(turma: Turma, search: string, escola: string, serie: string, turno: string, status: string) {
  const needle = search.toLowerCase()
  const matchesSearch = [turma.nome, turma.serie, turma.escola.nome, turma.professor?.nome || '']
    .some(value => value.toLowerCase().includes(needle))
  return matchesSearch && matchesSchool(turma, escola) && matchesSerie(turma, serie) && matchesTurno(turma, turno) && matchesStatus(turma, status)
}

function matchesSchool(turma: Turma, filter: string) { return filter === 'todas' || turma.escola.id === filter }
function matchesSerie(turma: Turma, filter: string) { return filter === 'todas' || turma.serie === filter }
function matchesTurno(turma: Turma, filter: string) { return filter === 'todos' || turma.turno === filter }
function matchesStatus(turma: Turma, filter: string) { return filter === 'todos' || (filter === 'ativo' && turma.ativo) || (filter === 'inativo' && !turma.ativo) }

function resolveSchoolScope(showSelector: boolean, selected: string | null, assigned: string | null | undefined) {
  return showSelector ? selected : assigned ?? null
}

function uniqueSchools(turmas: Turma[]) {
  return Array.from(new Map(turmas.map(turma => [turma.escola.id, turma.escola])).values())
}

function uniqueSeries(turmas: Turma[]) {
  return Array.from(new Set(turmas.map(turma => turma.serie)))
}

async function fetchTurmas(escolaId: string | null, shouldShowSelector: boolean) {
  if (shouldShowSelector && !escolaId) return []
  let query = supabase.from('turmas').select(`*, escola:escolas(id, nome, tipo), professor:users!professor_id(id, nome, email)`).order('created_at', { ascending: false })
  if (escolaId) query = query.eq('escola_id', escolaId)
  const { data, error } = await query
  if (error) throw error
  const counts = await enrollmentCounts(data?.map(turma => turma.id) || [])
  return formatTurmas(data || [], counts)
}

function formatTurmas(data: Array<{ id: string; nome: string; ano_letivo: number; serie: string | null; turno: string; capacidade: number | null; ativo: boolean | null; created_at: string | null; escola: { id: string; nome: string; tipo: string } | null; professor: { id: string; nome: string; email: string | null } | null }>, counts: Map<string, number>) {
  return data.map(turma => formatTurma(turma, counts))
}

function formatTurma(turma: { id: string; nome: string; ano_letivo: number; serie: string | null; turno: string; capacidade: number | null; ativo: boolean | null; created_at: string | null; escola: { id: string; nome: string; tipo: string } | null; professor: { id: string; nome: string; email: string | null } | null }, counts: Map<string, number>): Turma {
  return {
    id: turma.id, nome: turma.nome, ano_letivo: turma.ano_letivo, serie: turma.serie || '', turno: classFormSchema.shape.turno.parse(turma.turno),
    capacidade: turma.capacidade || 0, alunos_matriculados: counts.get(turma.id) || 0, ativo: turma.ativo ?? true,
    created_at: turma.created_at || new Date().toISOString(), escola: formatSchool(turma.escola),
    professor: formatProfessor(turma.professor),
  }
}

function formatSchool(school: { id: string; nome: string; tipo: string } | null) { return { id: school?.id || '', nome: school?.nome || 'Sem escola', tipo: school?.tipo || 'escola' } }
function formatProfessor(professor: { id: string; nome: string; email: string | null } | null) { return professor ? { id: professor.id, nome: professor.nome, email: professor.email || '' } : null }

function TurmasLoadingState() {
  return <div className="space-y-6"><div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-lg" />)}</div></div></div>
}

function TurmasSchoolRequiredState({ t }: { t: ReturnType<typeof useClassroomTranslations> }) {
  return <div className="space-y-6"><PageHeader title={t('classes.title')} description={t('classes.subtitle')} actions={<><Button variant="outline" className="gap-2"><Download className="h-4 w-4" />{t('actions.export')}</Button><Button asChild className="gap-2"><Link href="/dashboard/turmas/nova"><Plus className="h-4 w-4" />{t('actions.newClass')}</Link></Button></>} /><EscolaRequiredState title={t('classes.selectSchool')} description={t('classes.selectSchoolHint')} /></div>
}

function TurmasResults({ turmas, hasActiveFilters, t, onClearFilters, onChamada, onDiario }: { turmas: Turma[]; hasActiveFilters: boolean; t: ReturnType<typeof useClassroomTranslations>; onClearFilters: () => void; onChamada: (id: string) => void; onDiario: (id: string) => void }) {
  return <CardContent className="pt-4">{turmas.length > 0 ? <TurmaCardGrid>{turmas.map(turma => <TurmaCard key={turma.id} turma={turma} onChamada={onChamada} onDiario={onDiario} />)}</TurmaCardGrid> : <div className="flex flex-col items-center justify-center py-12 text-center">{hasActiveFilters ? <><SearchIcon className="h-12 w-12 text-gray-300 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-1">{t('classes.noClasses')}</h3><p className="text-sm text-gray-500 mb-4">{t('classes.noClassesHint')}</p><Button variant="outline" onClick={onClearFilters}>{t('actions.clear')}</Button></> : <><BookOpen className="h-12 w-12 text-gray-300 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-1">{t('classes.empty')}</h3><p className="text-sm text-gray-500 mb-4">{t('classes.emptyHint')}</p><Button asChild><Link href="/dashboard/turmas/nova"><Plus className="h-4 w-4 mr-2" />{t('actions.newClass')}</Link></Button></>}</div>}</CardContent>
}

async function enrollmentCounts(ids: string[]) {
  const counts = new Map<string, number>()
  if (!ids.length) return counts
  const { data: enrollments, error } = await supabase.from('matriculas').select('turma_id').in('turma_id', ids).eq('situacao', 'ativa')
  if (error) throw error
  enrollments?.forEach(({ turma_id }) => counts.set(turma_id, (counts.get(turma_id) || 0) + 1))
  return counts
}

export default function TurmasPage() {
  const t = useClassroomTranslations()

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

  const escolaIdToUse = resolveSchoolScope(shouldShowSelector, selectedEscolaId, userProfile?.escola_id)

  const loadTurmas = useCallback(async () => {
    try {
      setTurmas(await fetchTurmas(escolaIdToUse, shouldShowSelector))
    } catch (error) {
      logger.error('Error loading turmas', error instanceof Error ? error : String(error))
      toast.error('Erro ao carregar lista de turmas')
      setTurmas([])
    } finally {
      setLoading(false)
    }
  }, [escolaIdToUse, shouldShowSelector])

  useEffect(() => {
    void loadTurmas()
  }, [loadTurmas])

  const filteredTurmas = turmas.filter(turma => matchesTurma(turma, search, escolaFilter, serieFilter, turnoFilter, statusFilter))

  const totalTurmas = turmas.length
  const turmasAtivas = turmas.filter(t => t.ativo).length
  const totalAlunos = turmas.reduce((sum, t) => sum + t.alunos_matriculados, 0)
  const capacidadeTotal = turmas.reduce((sum, t) => sum + t.capacidade, 0)

  const escolas = uniqueSchools(turmas)
  const series = uniqueSeries(turmas)

  const clearFilters = () => {
    setSearch('')
    setEscolaFilter('todas')
    setSerieFilter('todas')
    setTurnoFilter('todos')
    setStatusFilter('todos')
  }

  const hasActiveFilters = search || escolaFilter !== 'todas' || serieFilter !== 'todas' || turnoFilter !== 'todos' || statusFilter !== 'todos'

  if (loading) {
    return <TurmasLoadingState />
  }

  // Show escola required state for admin users without selection
  if (shouldShowSelector && !selectedEscolaId) {
    return <TurmasSchoolRequiredState t={t} />
  }

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <PageHeader
        title={t('classes.title')}
        description={t('classes.subtitle')}
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('actions.export')}
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/turmas/nova">
                <Plus className="h-4 w-4" />
                {t('classes.newTitle')}
              </Link>
            </Button>
          </>
        }
      />

      {/* Estatisticas compactas */}
      <StatsBar
        stats={[
          { label: t('labels.total'), value: totalTurmas, icon: BookOpen },
          { label: t('status.active'), value: turmasAtivas, icon: CheckCircle, variant: 'success' },
          { label: t('labels.students'), value: totalAlunos, icon: Users, variant: 'info' },
          { label: t('labels.capacity'), value: `${capacidadeTotal > 0 ? Math.round((totalAlunos / capacidadeTotal) * 100) : 0}%`, icon: TrendingUp, variant: 'warning' },
        ]}
      />

      {/* Filtros e Grid de Turmas */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">{t('labels.classes')} ({filteredTurmas.length})</CardTitle>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search by name, series, school or teacher...',
            }}
            filters={[
              {
                id: 'escola',
                placeholder: t('labels.school'),
                value: escolaFilter,
                options: [
                  { value: 'todas', label: t('classes.selectSchool') },
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
                placeholder: t('labels.series'),
                value: serieFilter,
                options: [
                  { value: 'todas', label: t('labels.allF') },
                  ...series.map(serie => ({ value: serie, label: serie })),
                ],
                onChange: setSerieFilter,
                width: 'w-full sm:w-32',
              },
              {
                id: 'turno',
                placeholder: t('labels.shift'),
                value: turnoFilter,
                options: [
                  { value: 'todos', label: t('labels.all') },
                  { value: 'matutino', label: 'Matutino' },
                  { value: 'vespertino', label: 'Vespertino' },
                  { value: 'integral', label: 'Integral' },
                ],
                onChange: setTurnoFilter,
                width: 'w-full sm:w-32',
              },
              {
                id: 'status',
                placeholder: t('labels.status'),
                value: statusFilter,
                options: [
                  { value: 'todos', label: t('labels.all') },
                  { value: 'ativo', label: t('status.active') },
                  { value: 'inativo', label: t('status.inactive') },
                ],
                onChange: setStatusFilter,
                width: 'w-full sm:w-32',
              },
            ]}
            onClearAll={clearFilters}
          />
        </CardHeader>
        <TurmasResults turmas={filteredTurmas} hasActiveFilters={Boolean(hasActiveFilters)} t={t} onClearFilters={clearFilters} onChamada={id => router.push(`/dashboard/turmas/${id}/chamada`)} onDiario={id => router.push(`/diario?turma=${encodeURIComponent(id)}`)} />
      </Card>
    </div>
  )
}
