'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  BookOpen,
  AlertCircle,
  Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Sessao {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  inicio_aula: string
  hora_inicio?: string | null
  hora_fim?: string | null
  status: string
  criada_em?: string
  aberta_em: string | null
  fechada_em: string | null
  conteudo_programatico: string
  turmas?: {
    nome: string
    serie: string
    turno: string
    escolas: {
      nome: string
    }
  }
  users?: {
    nome: string
  }
}

interface StatsData {
  total: number
  planejadas: number
  abertas: number
  fechadas: number
  canceladas: number
}

export default function SessoesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [filteredSessoes, setFilteredSessoes] = useState<Sessao[]>([])
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    planejadas: 0,
    abertas: 0,
    fechadas: 0,
    canceladas: 0
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [dateFilter, setDateFilter] = useState<string>('')

  useEffect(() => {
    loadSessoes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, statusFilter, dateFilter, sessoes])

  const loadSessoes = async () => {
    setLoading(true)
    try {
      const { data: sessoesData, error } = await supabase
        .from('sessoes_aula')
        .select(`
          *,
          turmas (
            nome,
            serie,
            turno,
            escolas (nome)
          ),
          users:professor_id (nome)
        `)
        .order('data_aula', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      setSessoes(sessoesData || [])
      calculateStats(sessoesData || [])
    } catch (error: any) {
      logger.error('Erro ao carregar sessões:', error)
      toast.error('Erro ao carregar sessões de aula')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: Sessao[]) => {
    const statsData: StatsData = {
      total: data.length,
      planejadas: data.filter(s => s.status === 'PLANEJADA').length,
      abertas: data.filter(s => s.status === 'ABERTA').length,
      fechadas: data.filter(s => s.status === 'FECHADA').length,
      canceladas: data.filter(s => s.status === 'CANCELADA').length
    }
    setStats(statsData)
  }

  const applyFilters = () => {
    let filtered = [...sessoes]

    // Search filter (turma name, professor name, school)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.turmas?.nome.toLowerCase().includes(search) ||
          s.turmas?.serie.toLowerCase().includes(search) ||
          s.users?.nome.toLowerCase().includes(search) ||
          s.turmas?.escolas?.nome.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(s => s.data_aula === dateFilter)
    }

    setFilteredSessoes(filtered)
  }

  const getStatusBadge = (status: Sessao['status']) => {
    const statusConfig = {
      PLANEJADA: {
        variant: 'secondary' as const,
        icon: Calendar,
        label: 'Planejada',
        color: 'text-blue-600 bg-blue-50'
      },
      ABERTA: {
        variant: 'default' as const,
        icon: Play,
        label: 'Aberta',
        color: 'text-green-600 bg-green-50'
      },
      FECHADA: {
        variant: 'outline' as const,
        icon: CheckCircle2,
        label: 'Fechada',
        color: 'text-gray-600 bg-gray-50'
      },
      CANCELADA: {
        variant: 'destructive' as const,
        icon: XCircle,
        label: 'Cancelada',
        color: 'text-red-600 bg-red-50'
      }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PLANEJADA']
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getTurnoLabel = (turno: string) => {
    const labels: Record<string, string> = {
      matutino: 'Manhã',
      vespertino: 'Tarde',
      integral: 'Integral',
      noturno: 'Noite'
    }
    return labels[turno] || turno
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return timeString.substring(0, 5) // HH:MM
  }

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-'
    try {
      return format(new Date(dateTimeString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const handleViewDetails = (sessaoId: string) => {
    // Navigate to session details or open modal
    // For now, we'll just log it
    logger.info('View session details:', { metadata: { sessaoId } })
    toast.info('Visualização de detalhes em desenvolvimento')
  }

  const handleQuickAction = (sessao: Sessao) => {
    if (sessao.status === 'PLANEJADA') {
      // Open session
      toast.info('Funcionalidade "Abrir Aula" em desenvolvimento')
    } else if (sessao.status === 'ABERTA') {
      // Mark attendance or close
      router.push(`/dashboard/frequencia?sessao=${sessao.id}`)
    } else {
      // View only
      handleViewDetails(sessao.id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Sessões de Aula</h1>
          <p className="text-gray-600 mt-1">
            Controle completo de todas as sessões de aula do sistema
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Workflow de Sessões:</strong> PLANEJADA → ABERTA → FECHADA.
          Uma vez fechada, a sessão não pode ser modificada (compliance legal).
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">Planejadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{stats.planejadas}</span>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{stats.abertas}</span>
              <Play className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Fechadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-600">{stats.fechadas}</span>
              <CheckCircle2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{stats.canceladas}</span>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle>Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Turma, professor, escola..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PLANEJADA">Planejada</SelectItem>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="FECHADA">Fechada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Data da Aula</Label>
              <Input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Sessões de Aula ({filteredSessoes.length})
          </CardTitle>
          <CardDescription>
            Histórico completo de sessões cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessoes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma sessão encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessoes.map((sessao) => (
                    <TableRow key={sessao.id}>
                      <TableCell className="font-medium">
                        {formatDate(sessao.data_aula)}
                      </TableCell>
                      <TableCell>{sessao.turmas?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sessao.turmas?.serie || '-'}</Badge>
                      </TableCell>
                      <TableCell>{getTurnoLabel(sessao.turmas?.turno || '')}</TableCell>
                      <TableCell>{sessao.users?.nome || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {sessao.turmas?.escolas?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTime(sessao.hora_inicio || null)} - {formatTime(sessao.hora_fim || null)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sessao.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(sessao.criada_em || null)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sessao.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(sessao.status === 'PLANEJADA' || sessao.status === 'ABERTA') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleQuickAction(sessao)}
                            >
                              {sessao.status === 'PLANEJADA' ? (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Abrir
                                </>
                              ) : (
                                <>
                                  <Users className="h-4 w-4 mr-1" />
                                  Frequência
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
