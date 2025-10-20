'use client'

import { useState, useEffect } from 'react'
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
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Database,
  FileText,
  Shield,
  AlertCircle,
  Clock,
  Info,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_values: any
  new_values: any
  timestamp: string
  ip_address: string | null
  user_agent: string | null
  escola_id: string | null
  details: any
  users?: {
    nome: string
    tipo_usuario: string
  }
  escolas?: {
    nome: string
  }
}

interface StatsData {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
}

const ITEMS_PER_PAGE = 20

export default function AtividadesPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<StatsData>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('todos')
  const [tableFilter, setTableFilter] = useState<string>('todos')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  useEffect(() => {
    loadAuditLogs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, actionFilter, tableFilter, dateFilter, logs])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id (nome, tipo_usuario),
          escolas:escola_id (nome)
        `)
        .order('timestamp', { ascending: false })
        .limit(500) // Limit to last 500 logs for performance

      if (error) throw error

      setLogs(logsData || [])
      calculateStats(logsData || [])
    } catch (error: any) {
      logger.error('Erro ao carregar logs de auditoria:', error)
      toast.error('Erro ao carregar histórico de atividades')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: AuditLog[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const statsData: StatsData = {
      today: data.filter(l => new Date(l.timestamp) >= today).length,
      thisWeek: data.filter(l => new Date(l.timestamp) >= weekAgo).length,
      thisMonth: data.filter(l => new Date(l.timestamp) >= monthAgo).length,
      total: data.length
    }
    setStats(statsData)
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Search filter (user name, table, action)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        l =>
          l.users?.nome.toLowerCase().includes(search) ||
          l.table_name.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search) ||
          l.escolas?.nome?.toLowerCase().includes(search)
      )
    }

    // Action filter
    if (actionFilter !== 'todos') {
      filtered = filtered.filter(l => l.action.includes(actionFilter))
    }

    // Table filter
    if (tableFilter !== 'todos') {
      filtered = filtered.filter(l => l.table_name === tableFilter)
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(l => {
        const logDate = new Date(l.timestamp)
        return logDate.toDateString() === filterDate.toDateString()
      })
    }

    setFilteredLogs(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const getActionBadge = (action: string) => {
    const actionType = action.split('_').pop() || ''

    const config: Record<string, { variant: any; label: string; color: string }> = {
      created: { variant: 'default', label: 'Criado', color: 'bg-green-50 text-green-600' },
      updated: { variant: 'secondary', label: 'Atualizado', color: 'bg-blue-50 text-blue-600' },
      deleted: { variant: 'destructive', label: 'Excluído', color: 'bg-red-50 text-red-600' },
      default: { variant: 'outline', label: 'Ação', color: 'bg-gray-50 text-gray-600' }
    }

    const cfg = config[actionType] || config.default

    return (
      <Badge variant={cfg.variant} className={cfg.color}>
        {cfg.label}
      </Badge>
    )
  }

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      users: 'Usuários',
      alunos: 'Alunos',
      frequencia: 'Frequência',
      notas: 'Notas',
      matriculas: 'Matrículas',
      turmas: 'Turmas',
      escolas: 'Escolas',
      responsaveis: 'Responsáveis',
      sessoes_aula: 'Sessões de Aula'
    }
    return labels[tableName] || tableName
  }

  const formatDateTime = (dateTimeString: string) => {
    try {
      return format(new Date(dateTimeString), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
    } catch {
      return dateTimeString
    }
  }

  const handleExport = () => {
    // Export filtered logs to CSV
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tabela', 'Escola', 'IP']
    const rows = filteredLogs.map(log => [
      formatDateTime(log.timestamp),
      log.users?.nome || 'Sistema',
      log.action,
      getTableLabel(log.table_name),
      log.escolas?.nome || '-',
      log.ip_address || '-'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `atividades_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Exportação concluída com sucesso!')
  }

  const handleViewDetails = (log: AuditLog) => {
    // Show modal with full log details
    logger.info('View log details:', log)
    toast.info('Visualização de detalhes em desenvolvimento')
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
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Atividades</h1>
          <p className="text-gray-600 mt-1">
            Auditoria completa de todas as ações realizadas no sistema
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Compliance LGPD:</strong> Logs de auditoria são imutáveis e retidos por 7 anos conforme legislação brasileira.
          Exibindo os últimos 500 registros.
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.today}</span>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.thisWeek}</span>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.thisMonth}</span>
              <Activity className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <Database className="h-8 w-8 text-orange-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Registros carregados</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Usuário, tabela, ação..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action">Tipo de Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="created">Criação</SelectItem>
                  <SelectItem value="updated">Atualização</SelectItem>
                  <SelectItem value="deleted">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="table">Tabela</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="users">Usuários</SelectItem>
                  <SelectItem value="alunos">Alunos</SelectItem>
                  <SelectItem value="frequencia">Frequência</SelectItem>
                  <SelectItem value="notas">Notas</SelectItem>
                  <SelectItem value="matriculas">Matrículas</SelectItem>
                  <SelectItem value="turmas">Turmas</SelectItem>
                  <SelectItem value="escolas">Escolas</SelectItem>
                  <SelectItem value="responsaveis">Responsáveis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
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

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Registros de Auditoria ({filteredLogs.length})
              </CardTitle>
              <CardDescription>
                Página {currentPage} de {totalPages} • {ITEMS_PER_PAGE} itens por página
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma atividade encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{log.users?.nome || 'Sistema'}</p>
                            <p className="text-xs text-gray-500">{log.users?.tipo_usuario || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm">{log.action}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTableLabel(log.table_name)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.escolas?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 font-mono">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
