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
import { Plus, Search, Eye, Edit, Trash2, UserCheck, Calendar, School, Download } from 'lucide-react'
import { toast } from 'sonner'

interface Matricula {
  id: string
  aluno: {
    id: string
    nome_completo: string
    data_nascimento: string
    cpf?: string
    sexo: 'M' | 'F'
  }
  turma: {
    id: string
    nome: string
    serie: string
    escola: {
      nome: string
      tipo: string
    }
    professor?: {
      nome: string
    }
  }
  ano_letivo: number
  data_matricula: string
  situacao: 'ativa' | 'transferida' | 'concluida' | 'cancelada'
  observacoes?: string
  created_at: string
}

const mockMatriculas: Matricula[] = [
  {
    id: '1',
    aluno: {
      id: '1',
      nome_completo: 'Pedro Silva Santos',
      data_nascimento: '2020-03-15',
      sexo: 'M'
    },
    turma: {
      id: '1',
      nome: 'Berçário A',
      serie: 'Berçário',
      escola: {
        nome: 'CEMEI Pequenos Passos',
        tipo: 'creche'
      },
      professor: {
        nome: 'Lucia Cardoso Oliveira'
      }
    },
    ano_letivo: 2024,
    data_matricula: '2024-02-01',
    situacao: 'ativa',
    created_at: '2024-02-01T08:00:00Z'
  },
  {
    id: '2',
    aluno: {
      id: '2',
      nome_completo: 'Julia Oliveira Costa',
      data_nascimento: '2019-07-22',
      sexo: 'F'
    },
    turma: {
      id: '3',
      nome: 'Pré I A',
      serie: 'Pré I',
      escola: {
        nome: 'EMEI Jardim da Infância',
        tipo: 'pre_escola'
      },
      professor: {
        nome: 'Fernanda Alves Santos'
      }
    },
    ano_letivo: 2024,
    data_matricula: '2024-02-01',
    situacao: 'ativa',
    created_at: '2024-02-01T09:00:00Z'
  },
  {
    id: '3',
    aluno: {
      id: '3',
      nome_completo: 'Lucas Santos Pereira',
      data_nascimento: '2015-11-08',
      cpf: '12345678904',
      sexo: 'M'
    },
    turma: {
      id: '6',
      nome: '5º Ano A',
      serie: '5º Ano',
      escola: {
        nome: 'EMEF Professor João Silva',
        tipo: 'fundamental'
      },
      professor: {
        nome: 'José Roberto Lima'
      }
    },
    ano_letivo: 2024,
    data_matricula: '2024-02-01',
    situacao: 'ativa',
    created_at: '2024-02-01T10:00:00Z'
  },
  {
    id: '4',
    aluno: {
      id: '4',
      nome_completo: 'Ana Carolina Ferreira',
      data_nascimento: '2018-05-12',
      sexo: 'F'
    },
    turma: {
      id: '2',
      nome: 'Maternal B',
      serie: 'Maternal',
      escola: {
        nome: 'CEMEI Pequenos Passos',
        tipo: 'creche'
      },
      professor: {
        nome: 'Ana Paula Santos'
      }
    },
    ano_letivo: 2024,
    data_matricula: '2024-02-15',
    situacao: 'ativa',
    created_at: '2024-02-15T11:00:00Z'
  },
  {
    id: '5',
    aluno: {
      id: '5',
      nome_completo: 'Gabriel Souza Lima',
      data_nascimento: '2016-09-30',
      cpf: '12345678905',
      sexo: 'M'
    },
    turma: {
      id: '5',
      nome: '1º Ano A',
      serie: '1º Ano',
      escola: {
        nome: 'EMEF Professor João Silva',
        tipo: 'fundamental'
      },
      professor: {
        nome: 'Mariana Costa Pereira'
      }
    },
    ano_letivo: 2023,
    data_matricula: '2023-02-01',
    situacao: 'transferida',
    observacoes: 'Transferido para escola particular',
    created_at: '2023-02-01T08:00:00Z'
  },
  {
    id: '6',
    aluno: {
      id: '6',
      nome_completo: 'Beatriz Almeida Silva',
      data_nascimento: '2017-12-03',
      sexo: 'F'
    },
    turma: {
      id: '4',
      nome: 'Pré II B',
      serie: 'Pré II',
      escola: {
        nome: 'EMEI Jardim da Infância',
        tipo: 'pre_escola'
      },
      professor: {
        nome: 'Roberto Silva Lima'
      }
    },
    ano_letivo: 2023,
    data_matricula: '2023-02-01',
    situacao: 'concluida',
    created_at: '2023-02-01T09:00:00Z'
  }
]

export default function MatriculasPage() {
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('todas')
  const [anoFilter, setAnoFilter] = useState('todos')
  const [escolaFilter, setEscolaFilter] = useState('todas')

  useEffect(() => {
    loadMatriculas()
  }, [])

  const loadMatriculas = async () => {
    try {
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMatriculas(mockMatriculas)
    } catch (error) {
      // console.error('Erro ao carregar matrículas:', error)
      toast.error('Erro ao carregar lista de matrículas')
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

  const getSituacaoLabel = (situacao: string) => {
    const situacoes = {
      ativa: 'Ativa',
      transferida: 'Transferida',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    }
    return situacoes[situacao as keyof typeof situacoes] || situacao
  }

  const getSituacaoBadgeVariant = (situacao: string) => {
    switch (situacao) {
      case 'ativa': return 'default'
      case 'transferida': return 'secondary'
      case 'concluida': return 'outline'
      case 'cancelada': return 'destructive'
      default: return 'outline'
    }
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

  const filteredMatriculas = matriculas.filter(matricula => {
    const matchesSearch = matricula.aluno.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
                         matricula.aluno.cpf?.includes(search) ||
                         matricula.turma.nome.toLowerCase().includes(search.toLowerCase()) ||
                         matricula.turma.escola.nome.toLowerCase().includes(search.toLowerCase())
    
    const matchesSituacao = situacaoFilter === 'todas' || matricula.situacao === situacaoFilter
    const matchesAno = anoFilter === 'todos' || matricula.ano_letivo.toString() === anoFilter
    const matchesEscola = escolaFilter === 'todas' || matricula.turma.escola.nome === escolaFilter

    return matchesSearch && matchesSituacao && matchesAno && matchesEscola
  })

  const totalMatriculas = matriculas.length
  const matriculasAtivas = matriculas.filter(m => m.situacao === 'ativa').length
  const matriculasTransferidas = matriculas.filter(m => m.situacao === 'transferida').length
  const matriculasConcluidas = matriculas.filter(m => m.situacao === 'concluida').length

  const anos = Array.from(new Set(matriculas.map(m => m.ano_letivo))).sort((a, b) => b - a)
  const escolas = Array.from(new Set(matriculas.map(m => m.turma.escola.nome)))

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
          <h1 className="text-3xl font-bold text-gray-900">Matrículas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as matrículas dos alunos na rede municipal
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/matriculas/nova">
              <Plus className="h-4 w-4" />
              Nova Matrícula
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalMatriculas}</div>
            <div className="text-sm text-gray-600">Total de Matrículas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{matriculasAtivas}</div>
            <div className="text-sm text-gray-600">Matrículas Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{matriculasTransferidas}</div>
            <div className="text-sm text-gray-600">Transferidas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{matriculasConcluidas}</div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar matrículas específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por aluno, CPF, turma ou escola..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="transferida">Transferidas</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={escolaFilter} onValueChange={setEscolaFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {escolas.map((escola) => (
                  <SelectItem key={escola} value={escola}>
                    {escola}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Matrículas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Matrículas ({filteredMatriculas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma/Escola</TableHead>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Data Matrícula</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatriculas.map((matricula) => (
                  <TableRow key={matricula.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(matricula.aluno.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{matricula.aluno.nome_completo}</div>
                          <div className="text-sm text-gray-500">
                            {calculateAge(matricula.aluno.data_nascimento)} anos • 
                            {matricula.aluno.sexo === 'M' ? ' Masculino' : ' Feminino'}
                            {matricula.aluno.cpf && ` • CPF: ${matricula.aluno.cpf}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{matricula.turma.nome}</div>
                        <div className="text-sm text-gray-500">
                          {matricula.turma.serie} • {matricula.turma.escola.nome}
                        </div>
                        {matricula.turma.professor && (
                          <div className="text-xs text-gray-400">
                            Prof. {matricula.turma.professor.nome}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{matricula.ano_letivo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(matricula.data_matricula).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSituacaoBadgeVariant(matricula.situacao)}>
                        {getSituacaoLabel(matricula.situacao)}
                      </Badge>
                      {matricula.observacoes && (
                        <div className="text-xs text-gray-500 mt-1 max-w-32 truncate">
                          {matricula.observacoes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/matriculas/${matricula.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/matriculas/${matricula.id}/editar`}>
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
                {filteredMatriculas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma matrícula encontrada com os filtros aplicados.
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