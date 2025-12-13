'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Save,
  Edit2,
  X,
  User,
  BookOpen,
  Calendar,
  School,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Matricula {
  id: string
  aluno_id: string
  turma_id: string
  ano_letivo: number
  data_matricula: string
  situacao: string
  observacoes: string | null
  created_at: string | null
  alunos: {
    id: string
    nome_completo: string
    data_nascimento: string
    cpf: string | null
    sexo: string
    ativo: boolean | null
  }
  turmas: {
    id: string
    nome: string
    serie: string
    turno: string
    ano_letivo: number
    escolas: {
      nome: string
    }
  }
}

interface FrequenciaRecord {
  id: string
  data_aula: string
  presente: boolean
  justificativa: string | null
}

interface AttendanceStats {
  totalAulas: number
  presencas: number
  faltas: number
  percentualPresenca: number
}

export default function MatriculaDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [matricula, setMatricula] = useState<Matricula | null>(null)
  const [frequencia, setFrequencia] = useState<FrequenciaRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalAulas: 0,
    presencas: 0,
    faltas: 0,
    percentualPresenca: 0
  })

  const [formData, setFormData] = useState({
    situacao: 'ativa' as Matricula['situacao'],
    observacoes: ''
  })

  useEffect(() => {
    if (id) {
      loadMatriculaDetails()
    }
  }, [id])

  const loadMatriculaDetails = async () => {
    setLoading(true)
    try {
      // Load enrollment data
      const { data: matriculaData, error: matriculaError } = await supabase
        .from('matriculas')
        .select(`
          *,
          alunos (
            id,
            nome_completo,
            data_nascimento,
            cpf,
            sexo,
            ativo
          ),
          turmas (
            id,
            nome,
            serie,
            turno,
            ano_letivo,
            escolas (nome)
          )
        `)
        .eq('id', id)
        .single()

      if (matriculaError) throw matriculaError
      if (!matriculaData) {
        toast.error('Matrícula não encontrada')
        router.push('/dashboard/matriculas')
        return
      }

      setMatricula(matriculaData)
      setFormData({
        situacao: matriculaData.situacao,
        observacoes: matriculaData.observacoes || ''
      })

      // Load attendance history
      const { data: frequenciaData, error: frequenciaError } = await supabase
        .from('frequencia')
        .select('id, data_aula, presente, justificativa')
        .eq('matricula_id', id)
        .order('data_aula', { ascending: false })

      if (frequenciaError) {
        logger.error('Erro ao carregar frequência:', frequenciaError)
      } else {
        setFrequencia(frequenciaData || [])
        calculateAttendanceStats(frequenciaData || [])
      }
    } catch (error: any) {
      logger.error('Erro ao carregar matrícula:', error)
      toast.error('Erro ao carregar detalhes da matrícula')
      router.push('/dashboard/matriculas')
    } finally {
      setLoading(false)
    }
  }

  const calculateAttendanceStats = (records: FrequenciaRecord[]) => {
    const totalAulas = records.length
    const presencas = records.filter(r => r.presente).length
    const faltas = totalAulas - presencas
    const percentualPresenca = totalAulas > 0 ? (presencas / totalAulas) * 100 : 0

    setAttendanceStats({
      totalAulas,
      presencas,
      faltas,
      percentualPresenca
    })
  }

  const handleSave = async () => {
    if (!matricula) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('matriculas')
        .update({
          situacao: formData.situacao,
          observacoes: formData.observacoes || null
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Matrícula atualizada com sucesso!')
      setEditMode(false)
      loadMatriculaDetails()
    } catch (error: any) {
      logger.error('Erro ao atualizar matrícula:', error)
      toast.error('Erro ao atualizar matrícula')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (matricula) {
      setFormData({
        situacao: matricula.situacao,
        observacoes: matricula.observacoes || ''
      })
    }
    setEditMode(false)
  }

  const getSituacaoBadge = (situacao: Matricula['situacao']) => {
    const config: Record<string, { variant: any; icon: any; label: string; color: string }> = {
      ativa: { variant: 'default' as const, icon: CheckCircle2, label: 'Ativa', color: 'text-green-600 bg-green-50' },
      transferida: { variant: 'secondary' as const, icon: TrendingUp, label: 'Transferida', color: 'text-blue-600 bg-blue-50' },
      concluida: { variant: 'outline' as const, icon: CheckCircle2, label: 'Concluída', color: 'text-gray-600 bg-gray-50' },
      cancelada: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelada', color: 'text-red-600 bg-red-50' }
    }

    const cfg = config[situacao] || config['ativa']
    const Icon = cfg.icon

    return (
      <Badge variant={cfg.variant} className={cfg.color}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    )
  }

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateString
    }
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

  const getAttendanceStatusColor = (percentual: number) => {
    if (percentual >= 85) return 'text-green-600'
    if (percentual >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!matricula) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Matrícula não encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/matriculas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detalhes da Matrícula</h1>
            <p className="text-gray-600 mt-1">
              Informações completas e histórico de frequência
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <>
              <Button onClick={handleCancel} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Status da Matrícula:</strong> {getSituacaoBadge(matricula.situacao)}
          {' '}• <strong>Ano Letivo:</strong> {matricula.ano_letivo}
          {' '}• <strong>Matrícula em:</strong> {formatDate(matricula.data_matricula)}
        </AlertDescription>
      </Alert>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Dados do Aluno</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">Nome Completo</Label>
              <p className="font-medium text-lg">{matricula.alunos?.nome_completo || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Data de Nascimento</Label>
                <p className="font-medium">{formatDate(matricula.alunos?.data_nascimento || '')}</p>
              </div>
              <div>
                <Label className="text-gray-600">Idade</Label>
                <p className="font-medium">
                  {calculateAge(matricula.alunos?.data_nascimento || '')} anos
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Sexo</Label>
                <p className="font-medium">{matricula.alunos?.sexo === 'M' ? 'Masculino' : 'Feminino'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Status</Label>
                <Badge variant={matricula.alunos?.ativo ? 'default' : 'secondary'}>
                  {matricula.alunos?.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/alunos/${matricula.aluno_id}`)}
              >
                Ver Perfil Completo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Class Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <CardTitle>Dados da Turma</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">Turma</Label>
              <p className="font-medium text-lg">{matricula.turmas?.nome || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Série</Label>
                <Badge variant="outline">{matricula.turmas?.serie || '-'}</Badge>
              </div>
              <div>
                <Label className="text-gray-600">Turno</Label>
                <p className="font-medium">{getTurnoLabel(matricula.turmas?.turno || '')}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Escola</Label>
              <p className="font-medium">{matricula.turmas?.escolas?.nome || '-'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Ano Letivo</Label>
              <p className="font-medium">{matricula.turmas?.ano_letivo || '-'}</p>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/turmas/${matricula.turma_id}`)}
              >
                Ver Detalhes da Turma
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <CardTitle>Status da Matrícula</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="situacao">Situação</Label>
              {editMode ? (
                <Select value={formData.situacao} onValueChange={(value: any) => setFormData({ ...formData, situacao: value })}>
                  <SelectTrigger id="situacao">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="transferida">Transferida</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-2">
                  {getSituacaoBadge(matricula.situacao)}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              {editMode ? (
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a matrícula..."
                  rows={4}
                />
              ) : (
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                  {matricula.observacoes || 'Nenhuma observação registrada'}
                </p>
              )}
            </div>
            <div className="pt-2 border-t">
              <Label className="text-gray-600">Data de Cadastro</Label>
              <p className="text-sm text-gray-600">{formatDate(matricula.created_at || '')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <CardTitle>Estatísticas de Frequência</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Label className="text-blue-600 text-sm">Total de Aulas</Label>
                <p className="text-2xl font-bold text-blue-600">{attendanceStats.totalAulas}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <Label className="text-green-600 text-sm">Presenças</Label>
                <p className="text-2xl font-bold text-green-600">{attendanceStats.presencas}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <Label className="text-red-600 text-sm">Faltas</Label>
                <p className="text-2xl font-bold text-red-600">{attendanceStats.faltas}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <Label className="text-purple-600 text-sm">% Presença</Label>
                <p className={`text-2xl font-bold ${getAttendanceStatusColor(attendanceStats.percentualPresenca)}`}>
                  {attendanceStats.percentualPresenca.toFixed(1)}%
                </p>
              </div>
            </div>
            {attendanceStats.percentualPresenca < 75 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Frequência abaixo do mínimo legal de 75%
                </AlertDescription>
              </Alert>
            )}
            {attendanceStats.percentualPresenca >= 75 && attendanceStats.percentualPresenca < 85 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aviso: Frequência próxima ao limite mínimo (75%)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle>Histórico de Frequência</CardTitle>
            </div>
            <CardDescription>
              {frequencia.length} registros de aula
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {frequencia.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum registro de frequência encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data da Aula</TableHead>
                    <TableHead>Presença</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequencia.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {formatDate(record.data_aula)}
                      </TableCell>
                      <TableCell>
                        {record.presente ? (
                          <Badge variant="default" className="bg-green-50 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Presente
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-50 text-red-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Falta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.justificativa || '-'}
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
