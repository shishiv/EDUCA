'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import {
  loadCanonicalAttendanceFacts,
  summarizeCanonicalAttendanceFacts,
  type CanonicalAttendanceFact,
} from '@/lib/api/canonical-attendance-facts'
import { ATENCAO, CONFORMIDADE, getFrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'
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

interface EnrollmentFormData {
  situacao: Matricula['situacao']
  observacoes: string
}

function deriveEnrollmentAttendance(facts: CanonicalAttendanceFact[], enrollmentId: string) {
  const summary = summarizeCanonicalAttendanceFacts(facts, [enrollmentId]).get(enrollmentId)
  const records = facts
    .map((fact) => ({
      id: fact.id,
      data_aula: fact.dataAula,
      presente: fact.presente,
      justificativa: fact.justificativa,
    }))
    .sort((a, b) => b.data_aula.localeCompare(a.data_aula))

  return {
    records,
    stats: {
      totalAulas: summary?.total ?? 0,
      presencas: summary ? summary.presencas + summary.atestados : 0,
      faltas: summary?.faltas ?? 0,
      percentualPresenca: summary?.percentual ?? 0,
    },
  }
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateString
  }
}

function EnrollmentSituationBadge({ situacao }: { situacao: Matricula['situacao'] }) {
  const t = useTranslations('registry')
  const situations = {
    ativa: { variant: 'default' as const, icon: CheckCircle2, label: t('labels.ativa'), color: 'text-green-600 bg-green-50' },
    transferida: { variant: 'secondary' as const, icon: TrendingUp, label: t('labels.transferida'), color: 'text-blue-600 bg-blue-50' },
    concluida: { variant: 'outline' as const, icon: CheckCircle2, label: t('labels.concluida'), color: 'text-gray-600 bg-gray-50' },
    cancelada: { variant: 'destructive' as const, icon: XCircle, label: t('labels.cancelada'), color: 'text-red-600 bg-red-50' },
  }
  const situation = situations[situacao as keyof typeof situations] || situations.ativa
  const Icon = situation.icon

  return (
    <Badge variant={situation.variant} className={situation.color}>
      <Icon className="h-3 w-3 mr-1" />
      {situation.label}
    </Badge>
  )
}

function MatriculaDetailsHeader({
  editMode,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editMode: boolean
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}) {
  const t = useTranslations('registry')

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/matriculas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('labels.detalhes-da-matricula')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.informacoes-completas-e-historico-de-frequencia')}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {!editMode ? (
          <Button onClick={onEdit} variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            {t('ui.editar')}
          </Button>
        ) : (
          <>
            <Button onClick={onCancel} variant="outline">
              <X className="h-4 w-4 mr-2" />
              {t('labels.cancelar')}
            </Button>
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : t('ui.salvar')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function MatriculaSummary({ matricula }: { matricula: Matricula }) {
  const t = useTranslations('registry')

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>{t('labels.status-da-matricula-2')}</strong> <EnrollmentSituationBadge situacao={matricula.situacao} />
        {' '}• <strong>{t('labels.ano-letivo-3')}</strong> {matricula.ano_letivo}
        {' '}• <strong>{t('labels.matricula-em')}</strong> {formatDate(matricula.data_matricula)}
      </AlertDescription>
    </Alert>
  )
}

function MatriculaStudentCard({
  matricula,
  onOpenStudent,
}: {
  matricula: Matricula
  onOpenStudent: () => void
}) {
  const t = useTranslations('registry')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle>{t('labels.dados-do-aluno')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-600">{t('labels.nome-completo')}</Label>
          <p className="font-medium text-lg">{matricula.alunos?.nome_completo || '-'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-600">{t('labels.data-de-nascimento')}</Label>
            <p className="font-medium">{formatDate(matricula.alunos?.data_nascimento || '')}</p>
          </div>
          <div>
            <Label className="text-gray-600">{t('labels.idade')}</Label>
            <p className="font-medium">
              {calculateAge(matricula.alunos?.data_nascimento || '')} {t('ui.anos')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-600">{t('labels.sexo')}</Label>
            <p className="font-medium">{matricula.alunos?.sexo === 'M' ? t('labels.masculino') : t('labels.feminino')}</p>
          </div>
          <div>
            <Label className="text-gray-600">{t('labels.status')}</Label>
            <Badge variant={matricula.alunos?.ativo ? 'default' : 'secondary'}>
              {matricula.alunos?.ativo ? t('ui.ativo') : t('labels.inativo')}
            </Badge>
          </div>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={onOpenStudent}>
            {t('ui.ver-perfil-completo')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MatriculaClassCard({
  matricula,
  onOpenClass,
}: {
  matricula: Matricula
  onOpenClass: () => void
}) {
  const t = useTranslations('registry')
  const turnLabels: Record<string, string> = {
    matutino: 'Manhã',
    vespertino: 'Tarde',
    integral: t('labels.integral'),
    noturno: 'Noite',
  }
  const turn = matricula.turmas?.turno || ''

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-green-600" />
          <CardTitle>{t('labels.dados-da-turma')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-600">{t('labels.turma')}</Label>
          <p className="font-medium text-lg">{matricula.turmas?.nome || '-'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-600">{t('labels.serie')}</Label>
            <Badge variant="outline">{matricula.turmas?.serie || '-'}</Badge>
          </div>
          <div>
            <Label className="text-gray-600">{t('labels.turno')}</Label>
            <p className="font-medium">{turnLabels[turn] || turn}</p>
          </div>
        </div>
        <div>
          <Label className="text-gray-600">{t('labels.escola')}</Label>
          <p className="font-medium">{matricula.turmas?.escolas?.nome || '-'}</p>
        </div>
        <div>
          <Label className="text-gray-600">{t('labels.ano-letivo')}</Label>
          <p className="font-medium">{matricula.turmas?.ano_letivo || '-'}</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={onOpenClass}>
            {t('ui.ver-detalhes-da-turma')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MatriculaStatusCard({
  matricula,
  editMode,
  formData,
  onSituationChange,
  onObservationsChange,
}: {
  matricula: Matricula
  editMode: boolean
  formData: EnrollmentFormData
  onSituationChange: (value: string) => void
  onObservationsChange: (value: string) => void
}) {
  const t = useTranslations('registry')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-purple-600" />
          <CardTitle>{t('labels.status-da-matricula')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="situacao">{t('labels.situacao')}</Label>
          {editMode ? (
            <Select value={formData.situacao} onValueChange={onSituationChange}>
              <SelectTrigger id="situacao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">{t('labels.ativa')}</SelectItem>
                <SelectItem value="transferida">{t('labels.transferida')}</SelectItem>
                <SelectItem value="concluida">{t('labels.concluida')}</SelectItem>
                <SelectItem value="cancelada">{t('labels.cancelada')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-2">
              <EnrollmentSituationBadge situacao={matricula.situacao} />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="observacoes">{t('labels.observacoes')}</Label>
          {editMode ? (
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(event) => onObservationsChange(event.target.value)}
              placeholder={t('labels.observacoes-sobre-a-matricula-2')}
              rows={4}
            />
          ) : (
            <p className="text-gray-700 mt-2 whitespace-pre-wrap">
              {matricula.observacoes || 'Nenhuma observação registrada'}
            </p>
          )}
        </div>
        <div className="pt-2 border-t">
          <Label className="text-gray-600">{t('labels.data-de-cadastro')}</Label>
          <p className="text-sm text-gray-600">{formatDate(matricula.created_at || '')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function deriveAttendancePresentation(percentual: number) {
  const status = getFrequencyPolicyStatus(percentual)
  if (status === 'CONFORME') return { status, color: 'text-green-600' }
  if (status === 'ATENCAO') return { status, color: 'text-yellow-600' }
  return { status, color: 'text-red-600' }
}

function MatriculaAttendanceCard({ stats }: { stats: AttendanceStats }) {
  const t = useTranslations('registry')
  const presentation = deriveAttendancePresentation(stats.percentualPresenca)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-orange-600" />
          <CardTitle>{t('labels.estatisticas-de-frequencia')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <Label className="text-blue-600 text-sm">{t('labels.total-de-aulas')}</Label>
            <p className="text-2xl font-bold text-blue-600">{stats.totalAulas}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <Label className="text-green-600 text-sm">{t('labels.presencas')}</Label>
            <p className="text-2xl font-bold text-green-600">{stats.presencas}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <Label className="text-red-600 text-sm">{t('labels.faltas')}</Label>
            <p className="text-2xl font-bold text-red-600">{stats.faltas}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <Label className="text-purple-600 text-sm">{t('labels.presenca')}</Label>
            <p className={`text-2xl font-bold ${presentation.color}`}>
              {stats.percentualPresenca.toFixed(1)}%
            </p>
          </div>
        </div>
        {presentation.status === 'CRITICO' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não conformidade Bolsa Família: frequência abaixo de {CONFORMIDADE}%.
            </AlertDescription>
          </Alert>
        )}
        {presentation.status === 'ATENCAO' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Atenção preventiva municipal: frequência abaixo de {ATENCAO}%; condicionalidade atendida a partir de {CONFORMIDADE}%.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function AttendancePresenceBadge({ presente }: { presente: boolean }) {
  const t = useTranslations('registry')

  if (presente) {
    return (
      <Badge variant="default" className="bg-green-50 text-green-600">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {t('ui.presente')}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="bg-red-50 text-red-600">
      <XCircle className="h-3 w-3 mr-1" />
      {t('ui.falta')}
    </Badge>
  )
}

function MatriculaAttendanceHistory({ records }: { records: FrequenciaRecord[] }) {
  const t = useTranslations('registry')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle>{t('labels.historico-de-frequencia')}</CardTitle>
          </div>
          <CardDescription>
            {records.length} {t('ui.registros-de-aula')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('labels.nenhum-registro-de-frequencia-encontrado')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('labels.data-da-aula')}</TableHead>
                  <TableHead>{t('labels.presenca-2')}</TableHead>
                  <TableHead>{t('labels.justificativa')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{formatDate(record.data_aula)}</TableCell>
                    <TableCell>
                      <AttendancePresenceBadge presente={record.presente} />
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
  )
}

function MatriculaDetailsPresentation({
  matricula,
  frequencia,
  attendanceStats,
  editMode,
  saving,
  formData,
  onEdit,
  onCancel,
  onSave,
  onSituationChange,
  onObservationsChange,
  onOpenStudent,
  onOpenClass,
}: {
  matricula: Matricula
  frequencia: FrequenciaRecord[]
  attendanceStats: AttendanceStats
  editMode: boolean
  saving: boolean
  formData: EnrollmentFormData
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onSituationChange: (value: string) => void
  onObservationsChange: (value: string) => void
  onOpenStudent: () => void
  onOpenClass: () => void
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <MatriculaDetailsHeader
        editMode={editMode}
        saving={saving}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
      />
      <MatriculaSummary matricula={matricula} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MatriculaStudentCard matricula={matricula} onOpenStudent={onOpenStudent} />
        <MatriculaClassCard matricula={matricula} onOpenClass={onOpenClass} />
        <MatriculaStatusCard
          matricula={matricula}
          editMode={editMode}
          formData={formData}
          onSituationChange={onSituationChange}
          onObservationsChange={onObservationsChange}
        />
        <MatriculaAttendanceCard stats={attendanceStats} />
      </div>
      <MatriculaAttendanceHistory records={frequencia} />
    </div>
  )
}

export default function MatriculaDetailsPage() {
  const t = useTranslations('registry')
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
        toast.error(t('labels.matricula-nao-encontrada'))
        router.push('/dashboard/matriculas')
        return
      }

      setMatricula(matriculaData)
      setFormData({
        situacao: matriculaData.situacao,
        observacoes: matriculaData.observacoes || ''
      })

      const attendanceFacts = await loadCanonicalAttendanceFacts(supabase, [id])
      const attendance = deriveEnrollmentAttendance(attendanceFacts, id)
      setFrequencia(attendance.records)
      setAttendanceStats(attendance.stats)
    } catch (error: any) {
      logger.error('Erro ao carregar matrícula:', error)
      toast.error(t('ui.erro-ao-carregar-detalhes-da-matricula'))
      router.push('/dashboard/matriculas')
    } finally {
      setLoading(false)
    }
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

      toast.success(t('ui.matricula-atualizada-com-sucesso'))
      setEditMode(false)
      loadMatriculaDetails()
    } catch (error: any) {
      logger.error('Erro ao atualizar matrícula:', error)
      toast.error(t('ui.erro-ao-atualizar-matricula'))
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
        <p className="text-gray-600">{t('labels.matricula-nao-encontrada')}</p>
      </div>
    )
  }

  return (
    <MatriculaDetailsPresentation
      matricula={matricula}
      frequencia={frequencia}
      attendanceStats={attendanceStats}
      editMode={editMode}
      saving={saving}
      formData={formData}
      onEdit={() => setEditMode(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      onSituationChange={(situacao) => setFormData({ ...formData, situacao })}
      onObservationsChange={(observacoes) => setFormData({ ...formData, observacoes })}
      onOpenStudent={() => router.push(`/dashboard/alunos/${matricula.aluno_id}`)}
      onOpenClass={() => router.push(`/dashboard/turmas/${matricula.turma_id}`)}
    />
  )
}
