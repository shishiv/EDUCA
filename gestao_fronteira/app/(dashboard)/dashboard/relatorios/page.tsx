'use client'

import { useEffect, useState } from 'react'
import { reportsApi, Report } from '@/lib/api/reports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { 
  FileText, 
  Download, 
  Plus, 
  Calendar,
  Users,
  GraduationCap,
  ClipboardList,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newReport, setNewReport] = useState({
    tipo: '',
    parametros: {}
  })

  useEffect(() => {
    loadRelatorios()
  }, [])

  const loadRelatorios = async () => {
    try {
      const data = await reportsApi.getAll()
      setRelatorios(data)
    } catch (error) {
      // console.error('Erro ao carregar relatórios:', error)
      toast.error('Erro ao carregar lista de relatórios')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!newReport.tipo) {
      toast.error('Selecione o tipo de relatório')
      return
    }

    setIsGenerating(true)
    try {
      const report = await reportsApi.generateReport(newReport.tipo as any, newReport.parametros); setRelatorios(prev => [report, ...prev])
      toast.success('Relatório sendo gerado! Você será notificado quando estiver pronto.')
      loadRelatorios()
    } catch (error) {
      toast.error('Erro ao gerar relatório')
    } finally {
      setIsGenerating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processando':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>
      case 'processando':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Processando</Badge>
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'alunos':
        return <Users className="h-4 w-4" />
      case 'frequencia':
        return <Calendar className="h-4 w-4" />
      case 'notas':
        return <GraduationCap className="h-4 w-4" />
      case 'censo':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const tiposRelatorio = [
    { value: "usuarios", label: "Relatório de Usuários", icon: Users },
    { value: "escolas", label: "Relatório de Escolas", icon: GraduationCap },
    { value: "alunos", label: "Relatório de Alunos", icon: Users },
    { value: "frequencia", label: "Relatório de Frequência", icon: Calendar }
  ]

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
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Gere e gerencie relatórios do sistema educacional
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Gerar Relatório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Relatório</DialogTitle>
              <DialogDescription>
                Selecione o tipo de relatório que deseja gerar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Relatório</Label>
                <Select value={newReport.tipo} onValueChange={(value) => setNewReport({...newReport, tipo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposRelatorio.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center space-x-2">
                          <tipo.icon className="h-4 w-4" />
                          <span>{tipo.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancelar</Button>
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  'Gerar Relatório'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{relatorios.length}</div>
            <div className="text-sm text-gray-600">Total de Relatórios</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {relatorios.filter(r => r.status === 'concluido').length}
            </div>
            <div className="text-sm text-gray-600">Concluídos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {relatorios.filter(r => r.status === 'processando').length}
            </div>
            <div className="text-sm text-gray-600">Em Processamento</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {relatorios.filter(r => r.status === 'erro').length}
            </div>
            <div className="text-sm text-gray-600">Com Erro</div>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Rápidos</CardTitle>
          <CardDescription>
            Gere relatórios comuns com um clique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiposRelatorio.map((tipo) => (
              <Button
                key={tipo.value}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => {
                  setNewReport({ tipo: tipo.value, parametros: {} })
                  handleGenerateReport()
                }}
              >
                <tipo.icon className="h-6 w-6" />
                <span className="text-sm">{tipo.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5" />
            <span>Histórico de Relatórios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relatório</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Geração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((relatorio) => (
                  <TableRow key={relatorio.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{relatorio.titulo}</div>
                        <div className="text-sm text-gray-500">{relatorio.descricao}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTipoIcon(relatorio.tipo)}
                        <span className="capitalize">{relatorio.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(relatorio.data_geracao).toLocaleString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(relatorio.status)}
                        {getStatusBadge(relatorio.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {relatorio.status === 'concluido' && relatorio.arquivo_url && (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-700">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {relatorios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhum relatório encontrado. Gere seu primeiro relatório!
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