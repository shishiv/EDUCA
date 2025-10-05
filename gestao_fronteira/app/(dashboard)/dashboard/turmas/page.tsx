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
import { Plus, Search, Eye, Edit, Trash2, GraduationCap, Users, School, Clock, Download } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

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
    nome: 'Berçário A',
    serie: 'Berçário',
    ano_letivo: 2024,
    escola: {
      id: '1',
      nome: 'CEMEI Pequenos Passos',
      tipo: 'creche'
    },
    professor: {
      id: '1',
      nome: 'Lucia Cardoso Oliveira',
      email: 'lucia.cardoso@fronteira.mg.gov.br'
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
      email: 'ana.paula@fronteira.mg.gov.br'
    },
    capacidade: 20,
    alunos_matriculados: 18,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: '3',
    nome: 'Pré I A',
    serie: 'Pré I',
    ano_letivo: 2024,
    escola: {
      id: '2',
      nome: 'EMEI Jardim da Infância',
      tipo: 'pre_escola'
    },
    professor: {
      id: '3',
      nome: 'Fernanda Alves Santos',
      email: 'fernanda.alves@fronteira.mg.gov.br'
    },
    capacidade: 25,
    alunos_matriculados: 23,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-10T09:00:00Z'
  },
  {
    id: '4',
    nome: 'Pré II B',
    serie: 'Pré II',
    ano_letivo: 2024,
    escola: {
      id: '2',
      nome: 'EMEI Jardim da Infância',
      tipo: 'pre_escola'
    },
    professor: {
      id: '4',
      nome: 'Roberto Silva Lima',
      email: 'roberto.lima@fronteira.mg.gov.br'
    },
    capacidade: 25,
    alunos_matriculados: 20,
    turno: 'vespertino',
    ativo: true,
    created_at: '2024-01-10T09:00:00Z'
  },
  {
    id: '5',
    nome: '1º Ano A',
    serie: '1º Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor João Silva',
      tipo: 'fundamental'
    },
    professor: {
      id: '5',
      nome: 'Mariana Costa Pereira',
      email: 'mariana.costa@fronteira.mg.gov.br'
    },
    capacidade: 30,
    alunos_matriculados: 28,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-08T14:15:00Z'
  },
  {
    id: '6',
    nome: '5º Ano A',
    serie: '5º Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor João Silva',
      tipo: 'fundamental'
    },
    professor: {
      id: '6',
      nome: 'José Roberto Lima',
      email: 'jose.lima@fronteira.mg.gov.br'
    },
    capacidade: 30,
    alunos_matriculados: 25,
    turno: 'matutino',
    ativo: true,
    created_at: '2024-01-08T14:15:00Z'
  },
  {
    id: '7',
    nome: '9º Ano B',
    serie: '9º Ano',
    ano_letivo: 2024,
    escola: {
      id: '3',
      nome: 'EMEF Professor João Silva',
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
      email: 'patricia.souza@fronteira.mg.gov.br'
    },
    capacidade: 20,
    alunos_matriculados: 15,
    turno: 'vespertino',
    ativo: true,
    created_at: '2024-01-15T08:00:00Z'
  }
]

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [escolaFilter, setEscolaFilter] = useState('todas')
  const [serieFilter, setSerieFilter] = useState('todas')
  const [turnoFilter, setTurnoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    loadTurmas()
  }, [])

  const loadTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          *,
          escola:escolas(id, nome),
          professor:users!professor_id(id, nome, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to match component interface
      const formattedTurmas = data?.map(turma => ({
        id: turma.id,
        nome: turma.nome,
        ano_letivo: turma.ano_letivo,
        serie: turma.serie || '',
        turno: turma.turno,
        capacidade: turma.capacidade || 0,
        alunos_matriculados: 0, // TODO: Count from matriculas table
        escola: {
          id: turma.escola?.id || '',
          nome: turma.escola?.nome || 'Sem escola'
        },
        professor: turma.professor ? {
          id: turma.professor.id,
          nome: turma.professor.nome,
          email: turma.professor.email
        } : null
      })) || []

      setTurmas(formattedTurmas)
    } catch (error) {
      logger.error('Error loading turmas', { error })
      toast.error('Erro ao carregar lista de turmas')
      setTurmas([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTurma = async (turmaId: string, turmaNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a turma "${turmaNome}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', turmaId)

      if (error) throw error

      toast.success(`Turma "${turmaNome}" excluída com sucesso!`)
      await loadTurmas() // Reload the list
    } catch (error: any) {
      logger.error('Error deleting turma', {
        error,
        errorMessage: error.message || 'Unknown error',
        errorCode: error.code || 'NO_CODE',
        errorDetails: error.details || 'No details',
        errorHint: error.hint || 'No hint',
        turmaId,
        turmaNome
      })

      // User-friendly error messages
      if (error.code === '23503') {
        toast.error('Não é possível excluir esta turma pois existem alunos matriculados ou outros registros vinculados.')
      } else if (error.code === '42501' || error.message?.includes('permission')) {
        toast.error('Você não tem permissão para excluir esta turma.')
      } else {
        toast.error(`Erro ao excluir turma: ${error.message || 'Tente novamente.'}`)
      }
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

  const getTurnoLabel = (turno: string) => {
    const turnos = {
      matutino: 'Matutino',
      vespertino: 'Vespertino',
      integral: 'Integral'
    }
    return turnos[turno as keyof typeof turnos] || turno
  }

  const getTurnoBadgeVariant = (turno: string) => {
    switch (turno) {
      case 'matutino': return 'default'
      case 'vespertino': return 'secondary'
      case 'integral': return 'outline'
      default: return 'outline'
    }
  }

  const getOcupacaoPercentual = (turma: Turma) => {
    if (turma.capacidade === 0) return 0
    return Math.round((turma.alunos_matriculados / turma.capacidade) * 100)
  }

  const getOcupacaoColor = (percentual: number) => {
    if (percentual >= 90) return 'text-red-600'
    if (percentual >= 75) return 'text-orange-600'
    return 'text-green-600'
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Turmas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as turmas e classes da rede municipal
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalTurmas}</div>
            <div className="text-sm text-gray-600">Total de Turmas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{turmasAtivas}</div>
            <div className="text-sm text-gray-600">Turmas Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{totalAlunos}</div>
            <div className="text-sm text-gray-600">Alunos Matriculados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((totalAlunos / capacidadeTotal) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Ocupação Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar turmas específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, série, escola ou professor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={escolaFilter} onValueChange={setEscolaFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as escolas</SelectItem>
                {escolas.map((escola) => (
                  <SelectItem key={escola?.id} value={escola?.id || ''}>
                    {escola?.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serieFilter} onValueChange={setSerieFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {series.map((serie) => (
                  <SelectItem key={serie} value={serie}>
                    {serie}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={turnoFilter} onValueChange={setTurnoFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="matutino">Matutino</SelectItem>
                <SelectItem value="vespertino">Vespertino</SelectItem>
                <SelectItem value="integral">Integral</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativas</SelectItem>
                <SelectItem value="inativo">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Turmas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Turmas ({filteredTurmas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurmas.map((turma) => {
                  const ocupacaoPercentual = getOcupacaoPercentual(turma)
                  return (
                    <TableRow key={turma.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{turma.nome}</div>
                            <div className="text-sm text-gray-500">
                              {turma.serie} • {turma.ano_letivo}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {turma.professor ? (
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(turma.professor.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{turma.professor.nome}</div>
                              <div className="text-xs text-gray-500">{turma.professor.email}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Sem professor</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <School className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-sm">{turma.escola.nome}</div>
                            <div className="text-xs text-gray-500 capitalize">{turma.escola.tipo.replace('_', ' ')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {turma.alunos_matriculados}/{turma.capacidade}
                            </span>
                          </div>
                          <div className={`text-xs font-medium ${getOcupacaoColor(ocupacaoPercentual)}`}>
                            {ocupacaoPercentual}% ocupação
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <Badge variant={getTurnoBadgeVariant(turma.turno)}>
                            {getTurnoLabel(turma.turno)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={turma.ativo ? 'default' : 'secondary'}>
                          {turma.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/turmas/${turma.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/turmas/${turma.id}/editar`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteTurma(turma.id, turma.nome)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredTurmas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhuma turma encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}