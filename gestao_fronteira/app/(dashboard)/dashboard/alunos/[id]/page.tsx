'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Calendar, 
  School,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  GraduationCap,
  Heart
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface AlunoDetalhado {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf?: string
  sexo: 'M' | 'F'
  endereco?: string
  telefone?: string
  nome_mae?: string
  nome_pai?: string
  necessidades_especiais?: string
  ativo: boolean
  created_at: string
  responsavel: {
    nome: string
    telefone: string
    email?: string
    parentesco: string
  }
  matriculas: {
    id: string
    ano_letivo: number
    situacao: string
    turma: {
      nome: string
      serie: string
      escola: {
        nome: string
      }
    }
    data_matricula: string
  }[]
  frequencia: {
    percentual: number
    total_aulas: number
    presencas: number
    faltas: number
    faltas_justificadas: number
  }
  notas: {
    disciplina: string
    bimestre1?: number
    bimestre2?: number
    bimestre3?: number
    bimestre4?: number
    media: number
    situacao: string
  }[]
}

const mockAlunoDetalhado: AlunoDetalhado = {
  id: '1',
  nome_completo: 'Lucas Santos Pereira',
  data_nascimento: '2015-11-08',
  cpf: '12345678904',
  sexo: 'M',
  endereco: 'Rua das Flores, 456 - Centro - Fronteira/MG',
  telefone: '(34) 99999-0003',
  nome_mae: 'Carmen Santos',
  nome_pai: 'Carlos Pereira',
  necessidades_especiais: 'Dislexia - acompanhamento pedagógico especializado',
  ativo: true,
  created_at: '2024-01-15T08:00:00Z',
  responsavel: {
    nome: 'Carlos Santos Pereira',
    telefone: '(34) 99999-0003',
    email: 'carlos.santos@email.com',
    parentesco: 'Pai'
  },
  matriculas: [
    {
      id: '1',
      ano_letivo: 2024,
      situacao: 'ativa',
      turma: {
        nome: '5º Ano A',
        serie: '5º Ano',
        escola: {
          nome: 'EMEF Professor João Silva'
        }
      },
      data_matricula: '2024-02-01'
    },
    {
      id: '2',
      ano_letivo: 2023,
      situacao: 'concluida',
      turma: {
        nome: '4º Ano B',
        serie: '4º Ano',
        escola: {
          nome: 'EMEF Professor João Silva'
        }
      },
      data_matricula: '2023-02-01'
    }
  ],
  frequencia: {
    percentual: 92.5,
    total_aulas: 120,
    presencas: 111,
    faltas: 9,
    faltas_justificadas: 6
  },
  notas: [
    {
      disciplina: 'Português',
      bimestre1: 8.0,
      bimestre2: 7.5,
      bimestre3: 8.5,
      media: 8.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'Matemática',
      bimestre1: 9.0,
      bimestre2: 8.5,
      bimestre3: 9.5,
      media: 9.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'História',
      bimestre1: 7.5,
      bimestre2: 8.0,
      bimestre3: 7.0,
      media: 7.5,
      situacao: 'cursando'
    },
    {
      disciplina: 'Geografia',
      bimestre1: 8.5,
      bimestre2: 8.0,
      bimestre3: 8.5,
      media: 8.33,
      situacao: 'cursando'
    },
    {
      disciplina: 'Ciências',
      bimestre1: 9.5,
      bimestre2: 9.0,
      bimestre3: 9.5,
      media: 9.33,
      situacao: 'cursando'
    },
    {
      disciplina: 'Educação Física',
      bimestre1: 10.0,
      bimestre2: 10.0,
      bimestre3: 10.0,
      media: 10.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'Artes',
      bimestre1: 8.0,
      bimestre2: 8.5,
      bimestre3: 8.0,
      media: 8.17,
      situacao: 'cursando'
    }
  ]
}

export default function AlunoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [aluno, setAluno] = useState<AlunoDetalhado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAluno()
  }, [params.id])

  const loadAluno = async () => {
    try {
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAluno(mockAlunoDetalhado)
    } catch (error) {
      // logger.error('Erro ao carregar aluno:', { error: error })
      toast.error('Erro ao carregar dados do aluno')
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

  const getSituacaoMatriculaBadge = (situacao: string) => {
    switch (situacao) {
      case 'ativa': return <Badge className="bg-green-100 text-green-800">Ativa</Badge>
      case 'concluida': return <Badge variant="outline">Concluída</Badge>
      case 'transferida': return <Badge variant="secondary">Transferida</Badge>
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>
      default: return <Badge variant="outline">{situacao}</Badge>
    }
  }

  const getNotaColor = (nota: number) => {
    if (nota >= 8) return 'text-green-600 font-semibold'
    if (nota >= 6) return 'text-blue-600'
    if (nota >= 4) return 'text-orange-600'
    return 'text-red-600 font-semibold'
  }

  const getFrequenciaColor = (percentual: number) => {
    if (percentual >= 85) return 'text-green-600'
    if (percentual >= 75) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!aluno) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aluno não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/alunos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Perfil do Aluno</h1>
          <p className="text-gray-600 mt-1">
            Informações completas e histórico acadêmico
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/alunos/${aluno.id}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Aluno */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary text-white">
                    {getInitials(aluno.nome_completo)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{aluno.nome_completo}</CardTitle>
              <CardDescription>
                {calculateAge(aluno.data_nascimento)} anos • {aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')}</span>
              </div>
              
              {aluno.cpf && (
                <div className="flex items-center space-x-3 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span>CPF: {aluno.cpf}</span>
                </div>
              )}
              
              {aluno.endereco && (
                <div className="flex items-center space-x-3 text-sm">
                  <School className="h-4 w-4 text-gray-500" />
                  <span className="text-xs">{aluno.endereco}</span>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={aluno.ativo ? 'default' : 'secondary'}>
                    {aluno.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              {aluno.necessidades_especiais && (
                <div className="pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <Heart className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-700">Necessidades Especiais</div>
                      <div className="text-xs text-red-600 mt-1">{aluno.necessidades_especiais}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsável */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Responsável</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">{aluno.responsavel.nome}</div>
                <div className="text-sm text-gray-500">{aluno.responsavel.parentesco}</div>
              </div>
              <div className="text-sm">
                <div>📞 {aluno.responsavel.telefone}</div>
                {aluno.responsavel.email && (
                  <div>✉️ {aluno.responsavel.email}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumo Acadêmico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Resumo Acadêmico</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Frequência</span>
                <span className={`font-semibold ${getFrequenciaColor(aluno.frequencia.percentual)}`}>
                  {aluno.frequencia.percentual}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Média Geral</span>
                <span className={`font-semibold ${getNotaColor(
                  aluno.notas.reduce((sum, n) => sum + n.media, 0) / aluno.notas.length
                )}`}>
                  {(aluno.notas.reduce((sum, n) => sum + n.media, 0) / aluno.notas.length).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Situação</span>
                <Badge className="bg-blue-100 text-blue-800">Cursando</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="academico" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="academico" className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span>Acadêmico</span>
              </TabsTrigger>
              <TabsTrigger value="frequencia" className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Frequência</span>
              </TabsTrigger>
              <TabsTrigger value="matriculas" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Matrículas</span>
              </TabsTrigger>
              <TabsTrigger value="pessoal" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Pessoal</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="academico">
              <Card>
                <CardHeader>
                  <CardTitle>Desempenho Acadêmico - 2024</CardTitle>
                  <CardDescription>
                    Notas por disciplina e bimestre
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Disciplina</TableHead>
                          <TableHead className="text-center">1º Bim</TableHead>
                          <TableHead className="text-center">2º Bim</TableHead>
                          <TableHead className="text-center">3º Bim</TableHead>
                          <TableHead className="text-center">4º Bim</TableHead>
                          <TableHead className="text-center">Média</TableHead>
                          <TableHead className="text-center">Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aluno.notas.map((nota) => (
                          <TableRow key={nota.disciplina}>
                            <TableCell className="font-medium">{nota.disciplina}</TableCell>
                            <TableCell className={`text-center ${nota.bimestre1 ? getNotaColor(nota.bimestre1) : 'text-gray-400'}`}>
                              {nota.bimestre1?.toFixed(1) || '-'}
                            </TableCell>
                            <TableCell className={`text-center ${nota.bimestre2 ? getNotaColor(nota.bimestre2) : 'text-gray-400'}`}>
                              {nota.bimestre2?.toFixed(1) || '-'}
                            </TableCell>
                            <TableCell className={`text-center ${nota.bimestre3 ? getNotaColor(nota.bimestre3) : 'text-gray-400'}`}>
                              {nota.bimestre3?.toFixed(1) || '-'}
                            </TableCell>
                            <TableCell className={`text-center ${nota.bimestre4 ? getNotaColor(nota.bimestre4) : 'text-gray-400'}`}>
                              {nota.bimestre4?.toFixed(1) || '-'}
                            </TableCell>
                            <TableCell className={`text-center font-semibold ${getNotaColor(nota.media)}`}>
                              {nota.media.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">Cursando</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="frequencia">
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Frequência</CardTitle>
                  <CardDescription>
                    Acompanhamento de presença e faltas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{aluno.frequencia.total_aulas}</div>
                      <div className="text-sm text-blue-600">Total de Aulas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{aluno.frequencia.presencas}</div>
                      <div className="text-sm text-green-600">Presenças</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{aluno.frequencia.faltas}</div>
                      <div className="text-sm text-red-600">Faltas</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{aluno.frequencia.faltas_justificadas}</div>
                      <div className="text-sm text-orange-600">Justificadas</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Percentual de Frequência</span>
                      <span className={`text-lg font-bold ${getFrequenciaColor(aluno.frequencia.percentual)}`}>
                        {aluno.frequencia.percentual}%
                      </span>
                    </div>
                    <Progress 
                      value={aluno.frequencia.percentual} 
                      className="h-3"
                    />
                    <div className="flex items-center space-x-2 text-sm">
                      {aluno.frequencia.percentual >= 75 ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Frequência adequada (mínimo 75%)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-red-600">Atenção: Frequência abaixo do mínimo</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matriculas">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Matrículas</CardTitle>
                  <CardDescription>
                    Todas as matrículas do aluno no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aluno.matriculas.map((matricula) => (
                      <div key={matricula.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {matricula.turma.nome} - {matricula.turma.serie}
                          </div>
                          <div className="text-sm text-gray-600">
                            {matricula.turma.escola.nome}
                          </div>
                          <div className="text-xs text-gray-500">
                            Matrícula: {new Date(matricula.data_matricula).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-sm font-medium">{matricula.ano_letivo}</div>
                          {getSituacaoMatriculaBadge(matricula.situacao)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pessoal">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Dados pessoais e familiares do aluno
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                        <div className="text-sm text-gray-600">{aluno.nome_completo}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
                        <div className="text-sm text-gray-600">
                          {new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">CPF</label>
                        <div className="text-sm text-gray-600">{aluno.cpf || 'Não informado'}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Sexo</label>
                        <div className="text-sm text-gray-600">
                          {aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Endereço</label>
                      <div className="text-sm text-gray-600">{aluno.endereco || 'Não informado'}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome da Mãe</label>
                        <div className="text-sm text-gray-600">{aluno.nome_mae || 'Não informado'}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome do Pai</label>
                        <div className="text-sm text-gray-600">{aluno.nome_pai || 'Não informado'}</div>
                      </div>
                    </div>

                    {aluno.necessidades_especiais && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Necessidades Especiais</label>
                        <div className="text-sm text-gray-600 p-3 bg-red-50 border border-red-200 rounded-lg">
                          {aluno.necessidades_especiais}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Data de Cadastro</label>
                      <div className="text-sm text-gray-600">
                        {new Date(aluno.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}