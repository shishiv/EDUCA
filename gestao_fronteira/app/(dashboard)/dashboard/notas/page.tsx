'use client'

import { useEffect, useState } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, GraduationCap, Edit, Eye, Download, Save, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

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

const mockTurmasNotas: TurmaNotas[] = [
  {
    id: '1',
    nome: 'Pré I A',
    serie: 'Pré I',
    escola: 'EMEI Jardim da Infância',
    professor: 'Fernanda Alves Santos',
    ano_letivo: 2024,
    disciplinas: ['Linguagem', 'Matemática', 'Natureza', 'Artes', 'Movimento'],
    alunos: [
      {
        id: '1',
        aluno: { id: '1', nome_completo: 'Julia Oliveira Costa' },
        matricula_id: '1',
        disciplinas: {
          'Linguagem': { bimestre1: 8.5, bimestre2: 9.0, media: 8.75, situacao: 'cursando' },
          'Matemática': { bimestre1: 7.5, bimestre2: 8.0, media: 7.75, situacao: 'cursando' },
          'Natureza': { bimestre1: 9.0, bimestre2: 8.5, media: 8.75, situacao: 'cursando' },
          'Artes': { bimestre1: 10.0, bimestre2: 9.5, media: 9.75, situacao: 'cursando' },
          'Movimento': { bimestre1: 8.0, bimestre2: 8.5, media: 8.25, situacao: 'cursando' }
        }
      },
      {
        id: '2',
        aluno: { id: '2', nome_completo: 'Gabriel Souza Lima' },
        matricula_id: '2',
        disciplinas: {
          'Linguagem': { bimestre1: 7.0, bimestre2: 7.5, media: 7.25, situacao: 'cursando' },
          'Matemática': { bimestre1: 6.5, bimestre2: 7.0, media: 6.75, situacao: 'cursando' },
          'Natureza': { bimestre1: 8.0, bimestre2: 7.5, media: 7.75, situacao: 'cursando' },
          'Artes': { bimestre1: 9.0, bimestre2: 8.5, media: 8.75, situacao: 'cursando' },
          'Movimento': { bimestre1: 7.5, bimestre2: 8.0, media: 7.75, situacao: 'cursando' }
        }
      }
    ]
  },
  {
    id: '2',
    nome: '5º Ano A',
    serie: '5º Ano',
    escola: 'EMEF Professor João Silva',
    professor: 'José Roberto Lima',
    ano_letivo: 2024,
    disciplinas: ['Português', 'Matemática', 'História', 'Geografia', 'Ciências', 'Educação Física', 'Artes'],
    alunos: [
      {
        id: '3',
        aluno: { id: '3', nome_completo: 'Lucas Santos Pereira' },
        matricula_id: '3',
        disciplinas: {
          'Português': { bimestre1: 8.0, bimestre2: 7.5, bimestre3: 8.5, media: 8.0, situacao: 'cursando' },
          'Matemática': { bimestre1: 9.0, bimestre2: 8.5, bimestre3: 9.5, media: 9.0, situacao: 'cursando' },
          'História': { bimestre1: 7.5, bimestre2: 8.0, bimestre3: 7.0, media: 7.5, situacao: 'cursando' },
          'Geografia': { bimestre1: 8.5, bimestre2: 8.0, bimestre3: 8.5, media: 8.33, situacao: 'cursando' },
          'Ciências': { bimestre1: 9.5, bimestre2: 9.0, bimestre3: 9.5, media: 9.33, situacao: 'cursando' },
          'Educação Física': { bimestre1: 10.0, bimestre2: 10.0, bimestre3: 10.0, media: 10.0, situacao: 'cursando' },
          'Artes': { bimestre1: 8.0, bimestre2: 8.5, bimestre3: 8.0, media: 8.17, situacao: 'cursando' }
        }
      },
      {
        id: '4',
        aluno: { id: '4', nome_completo: 'Amanda Silva Costa' },
        matricula_id: '4',
        disciplinas: {
          'Português': { bimestre1: 7.0, bimestre2: 6.5, bimestre3: 7.5, media: 7.0, situacao: 'cursando' },
          'Matemática': { bimestre1: 6.0, bimestre2: 5.5, bimestre3: 6.5, media: 6.0, situacao: 'recuperacao' },
          'História': { bimestre1: 8.0, bimestre2: 7.5, bimestre3: 8.5, media: 8.0, situacao: 'cursando' },
          'Geografia': { bimestre1: 7.5, bimestre2: 7.0, bimestre3: 7.5, media: 7.33, situacao: 'cursando' },
          'Ciências': { bimestre1: 8.5, bimestre2: 8.0, bimestre3: 8.5, media: 8.33, situacao: 'cursando' },
          'Educação Física': { bimestre1: 9.0, bimestre2: 9.5, bimestre3: 9.0, media: 9.17, situacao: 'cursando' },
          'Artes': { bimestre1: 9.5, bimestre2: 9.0, bimestre3: 9.5, media: 9.33, situacao: 'cursando' }
        }
      },
      {
        id: '5',
        aluno: { id: '5', nome_completo: 'Bruno Oliveira Santos' },
        matricula_id: '5',
        disciplinas: {
          'Português': { bimestre1: 5.5, bimestre2: 5.0, bimestre3: 6.0, media: 5.5, situacao: 'recuperacao' },
          'Matemática': { bimestre1: 5.0, bimestre2: 4.5, bimestre3: 5.5, media: 5.0, situacao: 'recuperacao' },
          'História': { bimestre1: 6.5, bimestre2: 6.0, bimestre3: 7.0, media: 6.5, situacao: 'cursando' },
          'Geografia': { bimestre1: 6.0, bimestre2: 5.5, bimestre3: 6.5, media: 6.0, situacao: 'cursando' },
          'Ciências': { bimestre1: 7.0, bimestre2: 6.5, bimestre3: 7.5, media: 7.0, situacao: 'cursando' },
          'Educação Física': { bimestre1: 8.0, bimestre2: 8.5, bimestre3: 8.0, media: 8.17, situacao: 'cursando' },
          'Artes': { bimestre1: 7.5, bimestre2: 7.0, bimestre3: 7.5, media: 7.33, situacao: 'cursando' }
        }
      }
    ]
  }
]

export default function NotasPage() {
  const [turmas, setTurmas] = useState<TurmaNotas[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('todas')
  const [disciplinaFilter, setDisciplinaFilter] = useState('todas')
  const [bimestreFilter, setBimestreFilter] = useState('todos')
  const [selectedTurma, setSelectedTurma] = useState<TurmaNotas | null>(null)
  const [editingNote, setEditingNote] = useState<{
    open: boolean
    alunoId: string
    alunoNome: string
    disciplina: string
    bimestre: string
    nota: string
    observacoes: string
  }>({
    open: false,
    alunoId: '',
    alunoNome: '',
    disciplina: '',
    bimestre: '',
    nota: '',
    observacoes: ''
  })

  useEffect(() => {
    loadNotas()
  }, [])

  const loadNotas = async () => {
    try {
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTurmas(mockTurmasNotas)
    } catch (error) {
      // logger.error('Erro ao carregar notas:', error)
      toast.error('Erro ao carregar dados de notas')
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

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'text-green-600'
      case 'reprovado': return 'text-red-600'
      case 'recuperacao': return 'text-orange-600'
      case 'cursando': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getSituacaoBadge = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
      case 'reprovado': return <Badge variant="destructive">Reprovado</Badge>
      case 'recuperacao': return <Badge className="bg-orange-100 text-orange-800">Recuperação</Badge>
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
        alunoId: `${turmaId}-${alunoId}`,
        alunoNome: aluno.aluno.nome_completo,
        disciplina,
        bimestre,
        nota: notaAtual?.toString() || '',
        observacoes: ''
      })
    }
  }

  const saveNote = () => {
    const [turmaId, alunoId] = editingNote.alunoId.split('-')
    const nota = parseFloat(editingNote.nota)
    
    if (isNaN(nota) || nota < 0 || nota > 10) {
      toast.error('Nota deve ser um número entre 0 e 10')
      return
    }

    setTurmas(turmas.map(turma => {
      if (turma.id === turmaId) {
        return {
          ...turma,
          alunos: turma.alunos.map(aluno => {
            if (aluno.id === alunoId) {
              const disciplinaAtual = aluno.disciplinas[editingNote.disciplina] || {}
              const novasDisciplinas = {
                ...aluno.disciplinas,
                [editingNote.disciplina]: {
                  ...disciplinaAtual,
                  [`bimestre${editingNote.bimestre}`]: nota
                }
              }
              
              // Recalcular média
              const notas = Object.keys(novasDisciplinas[editingNote.disciplina])
                .filter(key => key.startsWith('bimestre'))
                .map(key => novasDisciplinas[editingNote.disciplina][key as keyof (typeof novasDisciplinas)[string]])
                .filter(n => typeof n === 'number') as number[]
              
              const media = notas.length > 0 ? notas.reduce((sum, n) => sum + n, 0) / notas.length : 0
              novasDisciplinas[editingNote.disciplina].media = Math.round(media * 100) / 100
              
              // Determinar situação
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
      alunoId: '',
      alunoNome: '',
      disciplina: '',
      bimestre: '',
      nota: '',
      observacoes: ''
    })

    toast.success('Nota salva com sucesso!')
  }

  const saveAllNotas = async () => {
    setSaving(true)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Todas as notas foram salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar notas')
    } finally {
      setSaving(false)
    }
  }

  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = turma.nome.toLowerCase().includes(search.toLowerCase()) ||
                         turma.escola.toLowerCase().includes(search.toLowerCase()) ||
                         turma.professor.toLowerCase().includes(search.toLowerCase())
    
    const matchesTurma = turmaFilter === 'todas' || turma.id === turmaFilter

    return matchesSearch && matchesTurma
  })

  const todasDisciplinas = Array.from(new Set(turmas.flatMap(t => t.disciplinas)))

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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Notas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as avaliações e notas dos alunos
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

      {/* Estatísticas */}
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
            <div className="text-sm text-gray-600">Em Recuperação</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(
                turmas.flatMap(t => t.alunos)
                  .flatMap(a => Object.values(a.disciplinas))
                  .filter(d => d.media)
                  .reduce((sum, d, _, arr) => sum + (d.media || 0) / arr.length, 0) * 100
              ) / 100}
            </div>
            <div className="text-sm text-gray-600">Média Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros para encontrar turmas e disciplinas específicas
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
                <SelectItem value="1">1º Bim</SelectItem>
                <SelectItem value="2">2º Bim</SelectItem>
                <SelectItem value="3">3º Bim</SelectItem>
                <SelectItem value="4">4º Bim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Turmas com Notas */}
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
                    {turma.escola} • Prof. {turma.professor} • {turma.ano_letivo}
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
                      <TableHead className="text-center">Situação Geral</TableHead>
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
                                    Média: {notasDisciplina.media.toFixed(1)}
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
            </CardContent>
          </Card>
        ))}

        {filteredTurmas.length === 0 && (
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

      {/* Dialog de Edição de Nota */}
      <Dialog open={editingNote.open} onOpenChange={(open) => 
        setEditingNote(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nota</DialogTitle>
            <DialogDescription>
              Lançar nota para {editingNote.alunoNome} - {editingNote.disciplina} - {editingNote.bimestre}º Bimestre
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
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={editingNote.observacoes}
                onChange={(e) => setEditingNote(prev => ({
                  ...prev,
                  observacoes: e.target.value
                }))}
                placeholder="Observações sobre a avaliação..."
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
            <Button onClick={saveNote}>
              Salvar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}