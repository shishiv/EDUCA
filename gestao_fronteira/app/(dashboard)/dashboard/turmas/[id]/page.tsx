'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Edit, Users, Calendar, BookOpen, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface Turma {
  id: string
  nome: string
  ano_letivo: number
  serie: string
  capacidade: number
  turno: string
  ativo: boolean | null
  created_at: string | null
  escola_id: string
  professor_id: string | null
  escolas: {
    nome: string
  }
  users: {
    nome: string
  } | null
}

interface Matricula {
  id: string
  situacao: string
  alunos: {
    id: string
    nome_completo: string
    data_nascimento: string
    sexo: string
    ativo: boolean | null
  }
}

interface SessaoAula {
  id: string
  data_aula: string
  hora_inicio: string
  hora_fim: string | null
  status: string
  conteudo_planejado: string | null
  presentes: number
  ausentes: number
  created_at: string
}

export default function TurmaDetalhesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [turma, setTurma] = useState<Turma | null>(null)
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [sessoes, setSessoes] = useState<SessaoAula[]>([])
  const [frequenciaStats, setFrequenciaStats] = useState({
    totalAlunos: 0,
    matriculados: 0,
    vagasDisponiveis: 0,
    frequenciaMedia: 0
  })

  useEffect(() => {
    if (id) {
      loadTurmaDetails()
    }
  }, [id])

  const loadTurmaDetails = async () => {
    try {
      setLoading(true)

      // Load turma data
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select(`
          *,
          escolas (nome),
          users:professor_id (nome)
        `)
        .eq('id', id)
        .single()

      if (turmaError) throw turmaError
      setTurma(turmaData)

      // Load matriculas (students enrolled)
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          situacao,
          alunos (
            id,
            nome_completo,
            data_nascimento,
            sexo,
            ativo
          )
        `)
        .eq('turma_id', id)
        .eq('ano_letivo', turmaData.ano_letivo)
        .order('alunos(nome_completo)')

      if (matriculasError) throw matriculasError
      setMatriculas(matriculasData || [])

      // Load sessoes de aula
      const { data: sessoesData, error: sessoesError } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', id)
        .order('data_aula', { ascending: false })
        .limit(10)

      if (sessoesError) throw sessoesError

      // Transform sessoes data to match interface
      const transformedSessoes = (sessoesData || []).map(sessao => ({
        ...sessao,
        presentes: 0, // Will be calculated from frequencia
        ausentes: 0
      }))

      setSessoes(transformedSessoes as any)

      // Calculate frequency stats
      const matriculasAtivas = matriculasData?.filter(m => m.situacao === 'ativa') || []
      const stats = {
        totalAlunos: matriculasData?.length || 0,
        matriculados: matriculasAtivas.length,
        vagasDisponiveis: turmaData.capacidade - matriculasAtivas.length,
        frequenciaMedia: 87.5 // Placeholder - calculate from real data
      }
      setFrequenciaStats(stats)

      logger.info('Detalhes da turma carregados:', {
        metadata: {
          turma: turmaData.nome,
          matriculas: matriculasData?.length || 0,
          sessoes: sessoesData?.length || 0
        }
      })
    } catch (error) {
      logger.error('Erro ao carregar detalhes da turma:', error as any)
      toast.error('Erro ao carregar dados da turma')
      router.push('/dashboard/turmas')
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

  const getTurnoLabel = (turno: string) => {
    const turnos: Record<string, string> = {
      'matutino': 'Manhã',
      'vespertino': 'Tarde',
      'integral': 'Integral',
      'noturno': 'Noite'
    }
    return turnos[turno.toLowerCase()] || turno
  }

  const getStatusBadge = (situacao: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      'ativa': { variant: 'default', label: 'Ativa' },
      'transferida': { variant: 'secondary', label: 'Transferido' },
      'concluida': { variant: 'secondary', label: 'Concluída' },
      'cancelada': { variant: 'destructive', label: 'Cancelada' }
    }

    const config = badges[situacao] || { variant: 'secondary', label: situacao }

    return (
      <Badge variant={config.variant as any} className={
        situacao === 'ativa' ? 'bg-green-100 text-green-800' : ''
      }>
        {config.label}
      </Badge>
    )
  }

  const getSessaoStatusBadge = (status: string) => {
    const badges: Record<string, { icon: any; color: string; label: string }> = {
      'PLANEJADA': { icon: Calendar, color: 'bg-blue-100 text-blue-800', label: 'Planejada' },
      'ABERTA': { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'Aberta' },
      'FECHADA': { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Fechada' }
    }

    const config = badges[status] || { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: status }
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

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

  if (!turma) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Turma não encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/turmas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {turma.nome}
            </h1>
            <p className="text-gray-600 mt-1">
              {turma.escolas.nome} • Ano Letivo {turma.ano_letivo}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/frequencia?turma=${id}`}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Marcar Frequência
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/turmas/${id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Alunos Matriculados</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              {frequenciaStats.matriculados}
              <span className="text-sm text-gray-500 ml-2">/ {turma.capacidade}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={(frequenciaStats.matriculados / turma.capacidade) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vagas Disponíveis</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {frequenciaStats.vagasDisponiveis}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {Math.round((frequenciaStats.vagasDisponiveis / turma.capacidade) * 100)}% livre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Frequência Média</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {frequenciaStats.frequenciaMedia}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
              Acima da meta (75%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sessões de Aula</CardDescription>
            <CardTitle className="text-3xl">{sessoes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {sessoes.filter(s => s.status === 'FECHADA').length} concluídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Turma Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Turma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Série</p>
              <p className="text-lg font-medium">{turma.serie}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Turno</p>
              <Badge variant="secondary">{getTurnoLabel(turma.turno)}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Professor Responsável</p>
              <p className="text-lg font-medium">{turma.users?.nome || 'Não atribuído'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Capacidade</p>
              <p className="text-lg font-medium">{turma.capacidade} alunos</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ano Letivo</p>
              <p className="text-lg font-medium">{turma.ano_letivo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              {turma.ativo ? (
                <Badge className="bg-green-100 text-green-800">Ativa</Badge>
              ) : (
                <Badge variant="secondary">Inativa</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Alunos Matriculados</CardTitle>
            </div>
            <Badge variant="secondary">
              {matriculas.filter(m => m.situacao === 'ativa').length} ativos
            </Badge>
          </div>
          <CardDescription>
            Lista de alunos matriculados nesta turma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matriculas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum aluno matriculado nesta turma
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Status da Matrícula</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matriculas.map((matricula) => (
                  <TableRow key={matricula.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {getInitials(matricula.alunos.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{matricula.alunos.nome_completo}</span>
                      </div>
                    </TableCell>
                    <TableCell>{calculateAge(matricula.alunos.data_nascimento)} anos</TableCell>
                    <TableCell>{matricula.alunos.sexo === 'M' ? 'Masculino' : 'Feminino'}</TableCell>
                    <TableCell>{getStatusBadge(matricula.situacao)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/alunos/${matricula.alunos.id}`}>
                          Ver Perfil
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <CardTitle>Sessões de Aula Recentes</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/frequencia?turma=${id}`}>
                Ver Todas
              </Link>
            </Button>
          </div>
          <CardDescription>
            Últimas 10 sessões de aula registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessoes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhuma sessão de aula registrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((sessao) => (
                  <TableRow key={sessao.id}>
                    <TableCell>{formatDate(sessao.data_aula)}</TableCell>
                    <TableCell>
                      {sessao.hora_inicio}
                      {sessao.hora_fim && ` - ${sessao.hora_fim}`}
                    </TableCell>
                    <TableCell>{getSessaoStatusBadge(sessao.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {sessao.conteudo_planejado || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/frequencia?turma=${id}&sessao=${sessao.id}`}>
                          Ver Detalhes
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
