'use client'

import { useClassroomTranslations } from '@/i18n/classroom'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, GraduationCap, Download, Save, BookOpen, AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { getTurmasForNotas, createGrade, updateGrade, type Bimester, type TurmaNotasData } from '@/lib/api/grades'
import { useEscola } from '@/contexts/escola-context'
import { useAuth } from '@/hooks/use-auth'

// Transform TurmaNotasData to match the component's expected interface
interface NotaAluno {
  id: string
  aluno: {
    id: string
    nome_completo: string
  }
  matricula_id: string
  disciplinas: {
    [disciplina: string]: {
      bimestre1?: number
      bimestre2?: number
      bimestre3?: number
      bimestre4?: number
      media?: number
      situacao?: 'aprovado' | 'reprovado' | 'recuperacao' | 'cursando'
    }
  }
}

interface TurmaNotas {
  id: string
  nome: string
  serie: string
  escola: string
  professor: string
  ano_letivo: number
  disciplinas: string[]
  alunos: NotaAluno[]
}

type BimestreKey = 'bimestre1' | 'bimestre2' | 'bimestre3' | 'bimestre4'
type DisciplinaNota = NotaAluno['disciplinas'][string]
type SituacaoNota = NonNullable<DisciplinaNota['situacao']>

interface EditingNote {
  open: boolean
  turmaId: string
  alunoId: string
  alunoNome: string
  matriculaId: string
  disciplina: string
  bimestre: Bimester | null
  nota: string
  observacoes: string
}

interface SituationLabels {
  readonly approved: string
  readonly failed: string
  readonly recovery: string
  readonly enrolled: string
}

type ClassroomTranslations = ReturnType<typeof useClassroomTranslations>

const EMPTY_EDITING_NOTE: EditingNote = {
  open: false,
  turmaId: '',
  alunoId: '',
  alunoNome: '',
  matriculaId: '',
  disciplina: '',
  bimestre: null,
  nota: '',
  observacoes: '',
}

const BIMESTERS: Bimester[] = [1, 2, 3, 4]

function parseBimester(value: string): Bimester | null {
  switch (value) {
    case '1': return 1
    case '2': return 2
    case '3': return 3
    case '4': return 4
    default: return null
  }
}

function bimestreKey(bimestre: Bimester): BimestreKey {
  switch (bimestre) {
    case 1: return 'bimestre1'
    case 2: return 'bimestre2'
    case 3: return 'bimestre3'
    case 4: return 'bimestre4'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getNotaColor(nota: number): string {
  if (nota >= 8) return 'text-green-600 font-semibold'
  if (nota >= 6) return 'text-blue-600'
  if (nota >= 4) return 'text-orange-600'
  return 'text-red-600 font-semibold'
}

function SituationBadge({ situacao, labels }: { situacao: SituacaoNota | undefined; labels: SituationLabels }) {
  switch (situacao) {
    case 'aprovado': return <Badge className="bg-green-100 text-green-800">{labels.approved}</Badge>
    case 'reprovado': return <Badge variant="destructive">{labels.failed}</Badge>
    case 'recuperacao': return <Badge className="bg-orange-100 text-orange-800">{labels.recovery}</Badge>
    case 'cursando': return <Badge variant="outline">{labels.enrolled}</Badge>
    default: return <Badge variant="secondary">-</Badge>
  }
}

function findEditingNote(
  turmas: TurmaNotas[],
  turmaId: string,
  alunoId: string,
  disciplina: string,
  bimestreValue: string
): EditingNote | null {
  const bimestre = parseBimester(bimestreValue)
  const aluno = turmas.find((turma) => turma.id === turmaId)?.alunos.find((student) => student.id === alunoId)
  if (!aluno || !bimestre) return null

  return {
    open: true,
    turmaId,
    alunoId,
    alunoNome: aluno.aluno.nome_completo,
    matriculaId: aluno.matricula_id,
    disciplina,
    bimestre,
    nota: aluno.disciplinas[disciplina]?.[bimestreKey(bimestre)]?.toString() ?? '',
    observacoes: '',
  }
}

function subjectValues(subject: DisciplinaNota): number[] {
  return BIMESTERS.flatMap((bimestre) => {
    const nota = subject[bimestreKey(bimestre)]
    return nota === undefined ? [] : [nota]
  })
}

function subjectSituation(notas: number[], media: number): SituacaoNota {
  if (notas.length < 4) return 'cursando'
  if (media >= 6) return 'aprovado'
  return media >= 4 ? 'recuperacao' : 'reprovado'
}

function updateSubjectGrade(subject: DisciplinaNota | undefined, bimestre: Bimester, nota: number): DisciplinaNota {
  const updated: DisciplinaNota = { ...subject }
  updated[bimestreKey(bimestre)] = nota
  const notas = subjectValues(updated)
  const media = notas.reduce((sum, current) => sum + current, 0) / notas.length
  updated.media = Math.round(media * 100) / 100
  updated.situacao = subjectSituation(notas, media)
  return updated
}

function updateTurmasWithGrade(turmas: TurmaNotas[], editing: EditingNote, nota: number, bimestre: Bimester): TurmaNotas[] {
  return turmas.map((turma) => {
    if (turma.id !== editing.turmaId) return turma
    return {
      ...turma,
      alunos: turma.alunos.map((aluno) => aluno.id === editing.alunoId
        ? {
            ...aluno,
            disciplinas: {
              ...aluno.disciplinas,
              [editing.disciplina]: updateSubjectGrade(aluno.disciplinas[editing.disciplina], bimestre, nota),
            },
          }
        : aluno),
    }
  })
}

function filterTurmas(turmas: TurmaNotas[], search: string, turmaFilter: string): TurmaNotas[] {
  const normalizedSearch = search.toLowerCase()
  return turmas.filter((turma) => {
    const matchesSearch = [turma.nome, turma.escola, turma.professor]
      .some((value) => value.toLowerCase().includes(normalizedSearch))
    return matchesSearch && (turmaFilter === 'todas' || turma.id === turmaFilter)
  })
}

function averageDisplay(turmas: TurmaNotas[]): string {
  const medias = turmas
    .flatMap((turma) => turma.alunos)
    .flatMap((aluno) => Object.values(aluno.disciplinas))
    .flatMap((disciplina) => disciplina.media === undefined ? [] : [disciplina.media])
  return medias.length > 0
    ? (Math.round(medias.reduce((sum, media) => sum + media, 0) / medias.length * 100) / 100).toFixed(1)
    : '-'
}

function overallSituation(aluno: NotaAluno): SituacaoNota {
  const situacoes = Object.values(aluno.disciplinas).map((disciplina) => disciplina.situacao)
  if (situacoes.includes('reprovado')) return 'reprovado'
  if (situacoes.includes('recuperacao')) return 'recuperacao'
  return situacoes.every((situacao) => situacao === 'aprovado') ? 'aprovado' : 'cursando'
}

async function persistGrade(editing: EditingNote, bimestre: Bimester, nota: number): Promise<string | null> {
  const { data: existingGrade } = await supabase
    .from('notas')
    .select('id')
    .eq('matricula_id', editing.matriculaId)
    .eq('disciplina', editing.disciplina)
    .eq('bimestre', bimestre)
    .single()

  if (existingGrade) {
    const result = await updateGrade(supabase, existingGrade.id, {
      nota,
      observacoes: editing.observacoes || undefined,
    })
    return result.error
  }

  const result = await createGrade(supabase, {
    matricula_id: editing.matriculaId,
    disciplina: editing.disciplina,
    bimestre,
    nota,
    tipo_avaliacao: 'bimestral',
    data_avaliacao: new Date().toISOString().split('T')[0],
    observacoes: editing.observacoes || undefined,
  })
  return result.error
}

function EmptyGradesState({
  t,
  shouldShowSelector,
  selectedEscolaId,
}: {
  t: ClassroomTranslations
  shouldShowSelector: boolean
  selectedEscolaId: string | null
}) {
  const needsSchool = shouldShowSelector && !selectedEscolaId
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('grades.title')}</h1>
        <p className="text-gray-600 mt-1">{t('grades.subtitle')}</p>
      </div>
      <Card>
        <CardContent className="text-center py-12">
          <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('classes.noClasses')}</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {needsSchool
              ? 'Selecione uma escola no menu superior para visualizar as turmas e notas.'
              : 'Ainda nao ha turmas cadastradas. Crie uma turma para comecar a lancar notas.'}
          </p>
          {!needsSchool && (
            <Button asChild>
              <Link href="/dashboard/turmas/nova">
                <Plus className="h-4 w-4 mr-2" />
                {t('actions.newClass')}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SaveAllGradesButton({ saving, onSave, t }: { saving: boolean; onSave: () => Promise<void>; t: ClassroomTranslations }) {
  return (
    <Button onClick={onSave} disabled={saving} className="gap-2">
      {saving ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {t('actions.saving')}
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {t('grades.saveAll')}
        </>
      )}
    </Button>
  )
}

function SaveEditedGradeButton({ saving, onSave, t }: { saving: boolean; onSave: () => Promise<void>; t: ClassroomTranslations }) {
  return (
    <Button onClick={onSave} disabled={saving}>
      {saving ? t('actions.saving') : `${t('actions.save')} ${t('grades.edit').replace('Edit', 'Grade')}`}
    </Button>
  )
}

// Convert TurmaNotasData to TurmaNotas for component compatibility
function transformTurmaData(data: TurmaNotasData): TurmaNotas {
  return {
    id: data.id,
    nome: data.nome,
    serie: data.serie,
    escola: data.escola,
    professor: data.professor,
    ano_letivo: data.ano_letivo,
    disciplinas: data.disciplinas,
    alunos: data.alunos.map(aluno => ({
      id: aluno.id,
      aluno: {
        id: aluno.aluno_id,
        nome_completo: aluno.nome_completo,
      },
      matricula_id: aluno.matricula_id,
      disciplinas: aluno.disciplinas,
    })),
  }
}

export default function NotasPage() {
  const t = useClassroomTranslations()
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const { userProfile } = useAuth()

  const [turmas, setTurmas] = useState<TurmaNotas[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('todas')
  const [disciplinaFilter, setDisciplinaFilter] = useState('todas')
  const [bimestreFilter, setBimestreFilter] = useState('todos')
  const [editingNote, setEditingNote] = useState<EditingNote>(EMPTY_EDITING_NOTE)

  // Determine which escola to filter by
  const escolaIdToUse = shouldShowSelector
    ? selectedEscolaId
    : userProfile?.escola_id

  const loadNotas = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      logger.info('Loading notas data', {
        feature: 'grades',
        action: 'load_notas',
        metadata: { escolaId: escolaIdToUse },
      })

      const result = await getTurmasForNotas(supabase, escolaIdToUse || undefined)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      const transformedTurmas = (result.data ?? []).map(transformTurmaData)
      setTurmas(transformedTurmas)

      logger.info('Notas loaded successfully', {
        feature: 'grades',
        action: 'notas_loaded',
        metadata: { turmasCount: transformedTurmas.length },
      })
    } catch (err) {
      const errorMessage = 'Erro ao carregar dados de notas'
      logger.error('Error loading notas', err instanceof Error ? err : String(err), {
        feature: 'grades',
        action: 'load_notas_error',
      })
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [escolaIdToUse])

  useEffect(() => {
    loadNotas()
  }, [loadNotas])

  const openEditNote = (turmaId: string, alunoId: string, disciplina: string, bimestre: string) => {
    const note = findEditingNote(turmas, turmaId, alunoId, disciplina, bimestre)
    if (note) setEditingNote(note)
  }

  const saveNote = async () => {
    const nota = Number(editingNote.nota)
    const bimestre = editingNote.bimestre

    if (!bimestre || !Number.isFinite(nota) || nota < 0 || nota > 10) {
      toast.error('Nota deve ser um número entre 0 e 10')
      return
    }

    setSaving(true)

    try {
      const resultError = await persistGrade(editingNote, bimestre, nota)
      if (resultError) {
        toast.error(resultError)
        return
      }

      setTurmas((current) => updateTurmasWithGrade(current, editingNote, nota, bimestre))
      setEditingNote(EMPTY_EDITING_NOTE)

      toast.success('Nota salva com sucesso!')
    } catch (err) {
      logger.error('Error saving grade', err instanceof Error ? err : String(err), {
        feature: 'grades',
        action: 'save_grade_error',
      })
      toast.error('Erro ao salvar nota')
    } finally {
      setSaving(false)
    }
  }

  const saveAllNotas = async () => {
    // This would trigger a full sync - for now just show success
    toast.info('Todas as notas já estão salvas no banco de dados')
  }

  const filteredTurmas = filterTurmas(turmas, search, turmaFilter)

  const todasDisciplinas = Array.from(new Set(turmas.flatMap((turma) => turma.disciplinas)))
  const situationLabels: SituationLabels = {
    approved: t('status.approved'),
    failed: t('status.failed'),
    recovery: 'Recuperacao',
    enrolled: t('status.enrolled'),
  }
  const turmaAverage = averageDisplay(turmas)

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('grades.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('grades.subtitle')}
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={loadNotas} variant="outline">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (turmas.length === 0) {
    return <EmptyGradesState t={t} shouldShowSelector={shouldShowSelector} selectedEscolaId={selectedEscolaId} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('grades.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('grades.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('grades.reports')}
          </Button>
          <SaveAllGradesButton saving={saving} onSave={saveAllNotas} t={t} />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {turmas.reduce((sum, t) => sum + t.alunos.length, 0)}
            </div>
            <div className="text-sm text-gray-600">{t('grades.totalStudents')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {turmas.reduce((sum, t) => sum + t.disciplinas.length, 0)}
            </div>
            <div className="text-sm text-gray-600">{t('grades.subjects')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {turmas.flatMap(t => t.alunos).flatMap(a =>
                Object.values(a.disciplinas).filter(d => d.situacao === 'recuperacao')
              ).length}
            </div>
            <div className="text-sm text-gray-600">{t('grades.inRecovery')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {turmaAverage}
            </div>
            <div className="text-sm text-gray-600">{t('grades.average')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('actions.filter')}</CardTitle>
          <CardDescription>
            Use os filtros para encontrar turmas e disciplinas especificas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('grades.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger className="w-full lg:w-48" aria-label={t('labels.class')}>
                <SelectValue placeholder={t('labels.class')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{t('grades.allClasses')}</SelectItem>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.serie}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
              <SelectTrigger className="w-full lg:w-40" aria-label={t('labels.subject')}>
                <SelectValue placeholder={t('labels.subject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{t('labels.allF')}</SelectItem>
                {todasDisciplinas.map((disciplina) => (
                  <SelectItem key={disciplina} value={disciplina}>
                    {disciplina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bimestreFilter} onValueChange={setBimestreFilter}>
              <SelectTrigger className="w-full lg:w-32" aria-label={t('grades.term')}>
                <SelectValue placeholder={t('grades.term')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('labels.all')}</SelectItem>
                {BIMESTERS.map((bimestre) => (
                  <SelectItem key={bimestre} value={String(bimestre)}>{bimestre} Bim</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Turmas with Grades */}
      <div className="space-y-6">
        {filteredTurmas.map((turma) => (
          <Card key={turma.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <span>{turma.nome} - {turma.serie}</span>
                  </CardTitle>
                  <CardDescription>
                    {turma.escola} - Prof. {turma.professor} - {turma.ano_letivo}
                  </CardDescription>
                </div>
                {turma.alunos[0] ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/alunos/${turma.alunos[0].aluno.id}/boletim`}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t('grades.report')}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('grades.report')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {turma.alunos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('grades.noStudents')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-20 bg-white border-r border-gray-200">{t('labels.student')}</TableHead>
                        {turma.disciplinas
                          .filter(d => disciplinaFilter === 'todas' || d === disciplinaFilter)
                          .map((disciplina) => (
                          <TableHead key={disciplina} className="text-center min-w-32">
                            {disciplina}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">{t('grades.generalStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turma.alunos.map((aluno) => (
                        <TableRow key={aluno.id}>
                          <TableCell className="sticky left-0 z-10 bg-white border-r border-gray-200">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {getInitials(aluno.aluno.nome_completo)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{aluno.aluno.nome_completo}</div>
                              </div>
                            </div>
                          </TableCell>
                          {turma.disciplinas
                            .filter(d => disciplinaFilter === 'todas' || d === disciplinaFilter)
                            .map((disciplina) => {
                            const notasDisciplina = aluno.disciplinas[disciplina]
                            return (
                              <TableCell key={disciplina} className="text-center">
                                <div className="space-y-1">
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    {BIMESTERS.filter((bimestre) =>
                                      bimestreFilter === 'todos' || String(bimestre) === bimestreFilter
                                    ).map((bimestre) => {
                                      const nota = notasDisciplina?.[bimestreKey(bimestre)]
                                      return (
                                        <button
                                          key={bimestre}
                                          onClick={() => openEditNote(turma.id, aluno.id, disciplina, String(bimestre))}
                                          aria-label={`Editar nota de ${aluno.aluno.nome_completo} em ${disciplina}, ${bimestre}º bimestre`}
                                          className={`p-1 rounded border hover:bg-gray-50 ${
                                            nota === undefined ? 'text-gray-400' : getNotaColor(nota)
                                          }`}
                                        >
                                          {nota === undefined ? '-' : nota.toFixed(1)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {notasDisciplina?.media !== undefined && (
                                    <div className={`text-sm font-semibold ${getNotaColor(notasDisciplina.media)}`}>
                                      Media: {notasDisciplina.media.toFixed(1)}
                                    </div>
                                  )}
                                  {notasDisciplina?.situacao && (
                                    <div className="mt-1">
                                      <SituationBadge situacao={notasDisciplina.situacao} labels={situationLabels} />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center">
                            <SituationBadge situacao={overallSituation(aluno)} labels={situationLabels} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTurmas.length === 0 && turmas.length > 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {t('classes.noClasses')} para os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Note Dialog */}
      <Dialog open={editingNote.open} onOpenChange={(open) =>
        setEditingNote(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('grades.edit')}</DialogTitle>
            <DialogDescription>
              Lancar nota para {editingNote.alunoNome} - {editingNote.disciplina} - {editingNote.bimestre} {t('grades.term')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nota">{t('grades.grade')}</Label>
              <Input
                id="nota"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={editingNote.nota}
                onChange={(e) => setEditingNote(prev => ({
                  ...prev,
                  nota: e.target.value
                }))}
                placeholder={t('grades.gradePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">{t('labels.observations')} ({t('labels.optional')})</Label>
              <Textarea
                id="observacoes"
                value={editingNote.observacoes}
                onChange={(e) => setEditingNote(prev => ({
                  ...prev,
                  observacoes: e.target.value
                }))}
                placeholder={t('grades.observationsPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() =>
              setEditingNote(prev => ({ ...prev, open: false }))
            }>
              {t('actions.cancel')}
            </Button>
            <SaveEditedGradeButton saving={saving} onSave={saveNote} t={t} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
