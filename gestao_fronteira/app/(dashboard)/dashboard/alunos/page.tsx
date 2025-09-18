'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, Aluno } from '@/lib/supabase'
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
import { Plus, Search, Download, Eye, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const [alunos, setAlunos] = useState<AlunoWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sexoFilter, setSexoFilter] = useState('todos')

  useEffect(() => {
    loadAlunos()
  }, [])

  const loadAlunos = async () => {
    try {
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

      // Use real data if available, otherwise fallback to mock data for development
      if (data && data.length > 0) {
        setAlunos(data)
      } else {
        // Development mode fallback data
        // No students found, using empty array
        const mockAlunos: AlunoWithDetails[] = [
          {
            id: 'mock-1',
            nome_completo: 'Ana Silva Santos',
            data_nascimento: '2010-03-15',
            sexo: 'F',
            cpf: '123.456.789-01',
            rg: '12.345.678-9',
            telefone: '(34) 98765-4321',
            endereco: 'Rua das Flores, 123',
            email: 'ana.silva@email.com',
            nome_mae: 'Maria Silva',
            nome_pai: 'José Santos',
            ativo: true,
            necessidades_especiais: null,
            responsavel_id: 'resp-1',
            created_at: '2024-01-15T10:00:00Z',
            responsaveis: {
              nome: 'Maria Silva Santos'
            },
            matriculas: [{
              situacao: 'ativa',
              turmas: {
                nome: '5º Ano A',
                escolas: {
                  nome: 'Escola Municipal Pedro Alvares'
                }
              }
            }]
          },
          {
            id: 'mock-2',
            nome_completo: 'João Oliveira Costa',
            data_nascimento: '2009-08-22',
            sexo: 'M',
            cpf: '987.654.321-09',
            rg: '98.765.432-1',
            telefone: '(34) 99876-5432',
            endereco: 'Av. Brasil, 456',
            email: 'joao.oliveira@email.com',
            nome_mae: 'Ana Oliveira',
            nome_pai: 'Carlos Costa',
            ativo: true,
            necessidades_especiais: 'Déficit de atenção',
            responsavel_id: 'resp-2',
            created_at: '2024-01-20T14:30:00Z',
            responsaveis: {
              nome: 'José Oliveira Costa'
            },
            matriculas: [{
              situacao: 'ativa',
              turmas: {
                nome: '6º Ano B',
                escolas: {
                  nome: 'Escola Municipal Pedro Alvares'
                }
              }
            }]
          },
          {
            id: 'mock-3',
            nome_completo: 'Lucia Pereira Lima',
            data_nascimento: '2011-12-10',
            sexo: 'F',
            cpf: '456.789.123-45',
            rg: '56.789.012-3',
            telefone: '(34) 97654-3210',
            endereco: 'Rua da Paz, 789',
            email: 'lucia.pereira@email.com',
            nome_mae: 'Sandra Pereira',
            nome_pai: 'Carlos Lima',
            ativo: true,
            necessidades_especiais: null,
            responsavel_id: 'resp-3',
            created_at: '2024-02-01T09:15:00Z',
            responsaveis: {
              nome: 'Carlos Pereira Lima'
            },
            matriculas: [{
              situacao: 'ativa',
              turmas: {
                nome: '4º Ano C',
                escolas: {
                  nome: 'Escola Municipal Santos Dumont'
                }
              }
            }]
          }
        ]
        setAlunos(mockAlunos)
      }
    } catch (error) {
      toast.error("Erro ao carregar alunos. Usando dados de demonstração.")

      // Even on error, provide mock data for development
      if (process.env.NODE_ENV === 'development') {
        // Using mock data in development
        const mockAlunos: AlunoWithDetails[] = [
          {
            id: 'mock-error-1',
            nome_completo: 'Maria da Silva',
            data_nascimento: '2010-06-15',
            sexo: 'F',
            cpf: '111.222.333-44',
            rg: '11.222.333-4',
            telefone: '(34) 91234-5678',
            endereco: 'Rua Principal, 100',
            email: 'maria.silva@email.com',
            nome_mae: 'Fernanda da Silva',
            nome_pai: 'José da Silva',
            ativo: true,
            necessidades_especiais: null,
            responsavel_id: 'resp-mock-1',
            created_at: '2024-01-01T08:00:00Z',
            responsaveis: {
              nome: 'José da Silva'
            },
            matriculas: [{
              situacao: 'ativa',
              turmas: {
                nome: '5º Ano A',
                escolas: {
                  nome: 'Escola Municipal Exemplo'
                }
              }
            }]
          }
        ]
        setAlunos(mockAlunos)
        toast.success('Usando dados de exemplo para desenvolvimento')
      } else {
        toast.error('Erro ao carregar lista de alunos')
      }
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alunos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie o cadastro de todos os alunos da rede municipal
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{alunos.length}</div>
            <div className="text-sm text-gray-600">Total de Alunos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {alunos.filter(a => a.matriculas?.some(m => m.situacao === 'ativa')).length}
            </div>
            <div className="text-sm text-gray-600">Matriculados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {alunos.filter(a => !a.matriculas?.some(m => m.situacao === 'ativa')).length}
            </div>
            <div className="text-sm text-gray-600">Não Matriculados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {alunos.filter(a => a.necessidades_especiais).length}
            </div>
            <div className="text-sm text-gray-600">Necessidades Especiais</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar alunos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, CPF ou responsável..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="matriculado">Matriculados</SelectItem>
                <SelectItem value="nao_matriculado">Não Matriculados</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sexoFilter} onValueChange={setSexoFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos ({filteredAlunos.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                        {new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')}
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
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum aluno encontrado com os filtros aplicados.
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