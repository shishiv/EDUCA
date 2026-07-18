'use client'

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
import { getTurmasForNotas, createGrade, updateGrade, type TurmaNotasData } from '@/lib/api/grades'
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
  const [editingNote, setEditingNote] = useState<{
    open: boolean
    turmaId: string
    alunoId: string
    alunoNome: string
    matriculaId: string
    disciplina: string
    bimestre: string
    nota: string
    observacoes: string
  }>({
    open: false,
    turmaId: '',
    alunoId: '',
    alunoNome: '',
    matriculaId: '',
    disciplina: '',
    bimestre: '',
    nota: '',
    observacoes: ''
  })

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

      const transformedTurmas = (result.data || []).map(transformTurmaData)
      setTurmas(transformedTurmas)

      logger.info('Notas loaded successfully', {
        feature: 'grades',
        action: 'notas_loaded',
        metadata: { turmasCount: transformedTurmas.length },
      })
    } catch (err) {
      const errorMessage = 'Erro ao carregar dados de notas'
      logger.error('Error loading notas', err as Error, {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getSituacaoBadge = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
      case 'reprovado': return <Badge variant="destructive">Reprovado</Badge>
      case 'recuperacao': return <Badge className="bg-orange-100 text-orange-800">Recuperacao</Badge>
      case 'cursando': return <Badge variant="outline">Cursando</Badge>
      default: return <Badge variant="secondary">-</Badge>
    }
  }

  const getNotaColor = (nota: number) => {
    if (nota >= 8) return 'text-green-600 font-semibold'
    if (nota >= 6) return 'text-blue-600'
    if (nota >= 4) return 'text-orange-600'
    return 'text-red-600 font-semibold'
  }

  const openEditNote = (turmaId: string, alunoId: string, disciplina: string, bimestre: string) => {
    const turma = turmas.find(t => t.id === turmaId)
    const aluno = turma?.alunos.find(a => a.id === alunoId)
    const notaAtual = aluno?.disciplinas[disciplina]?.[`bimestre${bimestre}` as keyof (typeof aluno.disciplinas)[string]]

    if (aluno) {
      setEditingNote({
        open: true,
        turmaId,
        alunoId,
        alunoNome: aluno.aluno.nome_completo,
        matriculaId: aluno.matricula_id,
        disciplina,
        bimestre,
        nota: notaAtual?.toString() || '',
        observacoes: ''
      })
    }
  }

  const saveNote = async () => {
    const nota = parseFloat(editingNote.nota)

    if (isNaN(nota) || nota < 0 || nota > 10) {
      toast.error('Nota deve ser um numero entre 0 e 10')
      return
    }

    setSaving(true)

    try {
      // Check if grade exists for this matricula/disciplina/bimestre
      const { data: existingGrade } = await supabase
        .from('notas')
        .select('id')
        .eq('matricula_id', editingNote.matriculaId)
        .eq('disciplina', editingNote.disciplina)
        .eq('bimestre', parseInt(editingNote.bimestre))
        .single()

      if (existingGrade) {
        // Update existing grade
        const result = await updateGrade(supabase, existingGrade.id, {
          nota,
          observacoes: editingNote.observacoes || undefined,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }
      } else {
        // Create new grade
        const result = await createGrade(supabase, {
          matricula_id: editingNote.matriculaId,
          disciplina: editingNote.disciplina,
          bimestre: parseInt(editingNote.bimestre) as 1 | 2 | 3 | 4,
          nota,
          tipo_avaliacao: 'bimestral',
          data_avaliacao: new Date().toISOString().split('T')[0],
          observacoes: editingNote.observacoes || undefined,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }
      }

      // Update local state
      setTurmas(turmas.map(turma => {
        if (turma.id === editingNote.turmaId) {
          return {
            ...turma,
            alunos: turma.alunos.map(aluno => {
              if (aluno.id === editingNote.alunoId) {
                const disciplinaAtual = aluno.disciplinas[editingNote.disciplina] || {}
                const novasDisciplinas = {
                  ...aluno.disciplinas,
                  [editingNote.disciplina]: {
                    ...disciplinaAtual,
                    [`bimestre${editingNote.bimestre}`]: nota
                  }
                }

                // Recalculate media
                const notas = Object.keys(novasDisciplinas[editingNote.disciplina])
                  .filter(key => key.startsWith('bimestre'))
                  .map(key => novasDisciplinas[editingNote.disciplina][key as keyof (typeof novasDisciplinas)[string]])
                  .filter(n => typeof n === 'number') as number[]

                const media = notas.length > 0 ? notas.reduce((sum, n) => sum + n, 0) / notas.length : 0
                novasDisciplinas[editingNote.disciplina].media = Math.round(media * 100) / 100

                // Determine situacao
                if (notas.length >= 4) {
                  if (media >= 6) {
                    novasDisciplinas[editingNote.disciplina].situacao = 'aprovado'
                  } else if (media >= 4) {
                    novasDisciplinas[editingNote.disciplina].situacao = 'recuperacao'
                  } else {
                    novasDisciplinas[editingNote.disciplina].situacao = 'reprovado'
                  }
                } else {
                  novasDisciplinas[editingNote.disciplina].situacao = 'cursando'
                }

                return {
                  ...aluno,
                  disciplinas: novasDisciplinas
                }
              }
              return aluno
            })
          }
        }
        return turma
      }))

      setEditingNote({
        open: false,
        turmaId: '',
        alunoId: '',
        alunoNome: '',
        matriculaId: '',
        disciplina: '',
        bimestre: '',
        nota: '',
        observacoes: ''
      })

      toast.success('Nota salva com sucesso!')
    } catch (err) {
      logger.error('Error saving grade', err as Error, {
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
    toast.info('Todas as notas ja estao salvas no banco de dados')
  }

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = turma.nome.toLowerCase().includes(search.toLowerCase()) ||
                         turma.escola.toLowerCase().includes(search.toLowerCase()) ||
                         turma.professor.toLowerCase().includes(search.toLowerCase())

    const matchesTurma = turmaFilter === 'todas' || turma.id === turmaFilter

    return matchesSearch && matchesTurma
  })

  const todasDisciplinas = Array.from(new Set(turmas.flatMap(t => t.disciplinas)))

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
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Notas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as avaliacoes e notas dos alunos
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={loadNotas} variant="outline">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state - no turmas
  if (turmas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Notas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as avaliacoes e notas dos alunos
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma turma encontrada
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {shouldShowSelector && !selectedEscolaId
                ? 'Selecione uma escola no menu superior para visualizar as turmas e notas.'
                : 'Ainda nao ha turmas cadastradas. Crie uma turma para comecar a lancar notas.'}
            </p>
            {!shouldShowSelector || selectedEscolaId ? (
              <Button asChild>
                <Link href="/dashboard/turmas/nova">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Turma
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Notas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as avaliacoes e notas dos alunos
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Boletins
          </Button>
          <Button onClick={saveAllNotas} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Todas
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {turmas.reduce((sum, t) => sum + t.alunos.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total de Alunos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {turmas.reduce((sum, t) => sum + t.disciplinas.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Disciplinas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {turmas.flatMap(t => t.alunos).flatMap(a =>
                Object.values(a.disciplinas).filter(d => d.situacao === 'recuperacao')
              ).length}
            </div>
            <div className="text-sm text-gray-600">Em Recuperacao</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {(() => {
                const allMedias = turmas.flatMap(t => t.alunos)
                  .flatMap(a => Object.values(a.disciplinas))
                  .filter(d => d.media !== undefined)
                  .map(d => d.media!)
                return allMedias.length > 0
                  ? (Math.round(allMedias.reduce((sum, m) => sum + m, 0) / allMedias.length * 100) / 100).toFixed(1)
                  : '-'
              })()}
            </div>
            <div className="text-sm text-gray-600">Media Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
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
                  placeholder="Buscar por turma, escola ou professor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.serie}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {todasDisciplinas.map((disciplina) => (
                  <SelectItem key={disciplina} value={disciplina}>
                    {disciplina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bimestreFilter} onValueChange={setBimestreFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Bimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1 Bim</SelectItem>
                <SelectItem value="2">2 Bim</SelectItem>
                <SelectItem value="3">3 Bim</SelectItem>
                <SelectItem value="4">4 Bim</SelectItem>
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
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/notas/${turma.id}/boletim`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Boletim
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {turma.alunos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum aluno matriculado nesta turma.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        {turma.disciplinas
                          .filter(d => disciplinaFilter === 'todas' || d === disciplinaFilter)
                          .map((disciplina) => (
                          <TableHead key={disciplina} className="text-center min-w-32">
                            {disciplina}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Situacao Geral</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turma.alunos.map((aluno) => (
                        <TableRow key={aluno.id}>
                          <TableCell>
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
                                    {['1', '2', '3', '4'].filter(b =>
                                      bimestreFilter === 'todos' || b === bimestreFilter
                                    ).map((bimestre) => {
                                      const nota = notasDisciplina?.[`bimestre${bimestre}` as keyof typeof notasDisciplina] as number
                                      return (
                                        <button
                                          key={bimestre}
                                          onClick={() => openEditNote(turma.id, aluno.id, disciplina, bimestre)}
                                          className={`p-1 rounded border hover:bg-gray-50 ${
                                            nota ? getNotaColor(nota) : 'text-gray-400'
                                          }`}
                                        >
                                          {nota ? nota.toFixed(1) : '-'}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {notasDisciplina?.media && (
                                    <div className={`text-sm font-semibold ${getNotaColor(notasDisciplina.media)}`}>
                                      Media: {notasDisciplina.media.toFixed(1)}
                                    </div>
                                  )}
                                  {notasDisciplina?.situacao && (
                                    <div className="mt-1">
                                      {getSituacaoBadge(notasDisciplina.situacao)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center">
                            {(() => {
                              const situacoes = Object.values(aluno.disciplinas).map(d => d.situacao)
                              const temRecuperacao = situacoes.includes('recuperacao')
                              const temReprovacao = situacoes.includes('reprovado')

                              if (temReprovacao) return getSituacaoBadge('reprovado')
                              if (temRecuperacao) return getSituacaoBadge('recuperacao')
                              if (situacoes.every(s => s === 'aprovado')) return getSituacaoBadge('aprovado')
                              return getSituacaoBadge('cursando')
                            })()}
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
                Nenhuma turma encontrada para os filtros aplicados.
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
            <DialogTitle>Editar Nota</DialogTitle>
            <DialogDescription>
              Lancar nota para {editingNote.alunoNome} - {editingNote.disciplina} - {editingNote.bimestre} Bimestre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nota">Nota (0 a 10)</Label>
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
                placeholder="Digite a nota"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observacoes (opcional)</Label>
              <Textarea
                id="observacoes"
                value={editingNote.observacoes}
                onChange={(e) => setEditingNote(prev => ({
                  ...prev,
                  observacoes: e.target.value
                }))}
                placeholder="Observacoes sobre a avaliacao..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() =>
              setEditingNote(prev => ({ ...prev, open: false }))
            }>
              Cancelar
            </Button>
            <Button onClick={saveNote} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
