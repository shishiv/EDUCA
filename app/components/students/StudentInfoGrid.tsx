'use client'

import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileText,
  GraduationCap,
  Heart,
  MapPin,
  School,
  User,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ATENCAO, CONFORMIDADE, getFrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'

interface Matricula {
  id: string
  ano_letivo: number
  situacao: string | null
  turma: {
    nome: string
    serie: string
    escola: { nome: string }
  }
  data_matricula: string | null
}

interface Frequencia {
  percentual: number
  total_aulas: number
  presencas: number
  faltas: number
  faltas_justificadas: number
}

interface Responsavel {
  nome: string
  telefone: string
  email?: string
  parentesco: string
}

interface StudentInfoGridProps {
  student: {
    nome_completo: string
    data_nascimento: string
    cpf?: string
    sexo: 'M' | 'F'
    endereco?: string
    telefone?: string
    nome_mae?: string
    nome_pai?: string
    necessidades_especiais?: string
    created_at: string
  }
  responsavel?: Responsavel | null
  matriculas?: Matricula[]
  frequencia?: Frequencia | null
  className?: string
}

function frequencyColor(percentual: number): string {
  const status = getFrequencyPolicyStatus(percentual)
  if (status === 'CONFORME') return 'text-green-600'
  if (status === 'ATENCAO') return 'text-amber-600'
  return 'text-red-600'
}

function EnrollmentStatusBadge({ status }: { status: string | null }) {
  const t = useTranslations('registry')
  if (status === 'ativa') return <Badge variant="success">{t('labels.ativa')}</Badge>
  if (status === 'concluida') return <Badge variant="outline">{t('labels.concluida')}</Badge>
  if (status === 'transferida') return <Badge variant="secondary">{t('labels.transferida')}</Badge>
  if (status === 'cancelada') return <Badge variant="destructive">{t('labels.cancelada')}</Badge>
  return <Badge variant="outline">{status}</Badge>
}

function PersonalDataCard({ student }: Pick<StudentInfoGridProps, 'student'>) {
  const t = useTranslations('registry')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{t('labels.dados-pessoais')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">{t('labels.data-de-nascimento')}</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{new Date(student.data_nascimento).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">{t('labels.sexo')}</label>
            <p className="mt-1">{student.sexo === 'M' ? t('labels.masculino') : t('labels.feminino')}</p>
          </div>
        </div>
        {student.cpf ? (
          <div>
            <label className="text-sm font-medium text-gray-500">{t('labels.cpf')}</label>
            <div className="flex items-center gap-2 mt-1"><FileText className="h-4 w-4 text-gray-400" /><span>{student.cpf}</span></div>
          </div>
        ) : null}
        {student.endereco ? (
          <div>
            <label className="text-sm font-medium text-gray-500">{t('labels.endereco')}</label>
            <div className="flex items-start gap-2 mt-1"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-sm">{student.endereco}</span></div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-gray-500">{t('labels.mae')}</label><p className="mt-1 text-sm">{student.nome_mae || 'Não informado'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">{t('labels.pai')}</label><p className="mt-1 text-sm">{student.nome_pai || 'Não informado'}</p></div>
        </div>
        {student.necessidades_especiais ? (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-red-500 mt-0.5" />
              <div><label className="text-sm font-medium text-red-700">Necessidades Especiais</label><p className="text-sm text-red-600 mt-1">{student.necessidades_especiais}</p></div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function GuardianCard({ guardian }: { guardian?: Responsavel | null }) {
  const t = useTranslations('registry')
  if (!guardian) return null
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Responsável</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><p className="font-medium">{guardian.nome}</p><p className="text-sm text-gray-500">{guardian.parentesco}</p></div>
        <div className="text-sm space-y-1">
          <p>Tel: {guardian.telefone}</p>
          {guardian.email ? <p>{t('ui.email')} {guardian.email}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function FrequencyStatus({ percentual }: { percentual: number }) {
  const status = getFrequencyPolicyStatus(percentual)
  if (status === 'CONFORME') {
    return <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-600">Condicionalidade Bolsa Família atendida (a partir de {CONFORMIDADE}%)</span></>
  }
  if (status === 'ATENCAO') {
    return <><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-amber-600">Atenção preventiva municipal (abaixo de {ATENCAO}%)</span></>
  }
  return <><AlertTriangle className="h-4 w-4 text-red-600" /><span className="text-red-600">Atenção: Frequência abaixo do mínimo</span></>
}

function FrequencyCard({ frequency }: { frequency?: Frequencia | null }) {
  const t = useTranslations('registry')
  if (!frequency) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />{t('ui.frequencia')}</CardTitle>
        <CardDescription>{t('ui.resumo-de-presencas-e-faltas')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg"><div className="text-xl font-bold text-blue-600">{frequency.total_aulas}</div><div className="text-xs text-blue-600">{t('labels.total')}</div></div>
          <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-600">{frequency.presencas}</div><div className="text-xs text-green-600">{t('labels.presencas')}</div></div>
          <div className="text-center p-3 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-600">{frequency.faltas}</div><div className="text-xs text-red-600">{t('labels.faltas')}</div></div>
          <div className="text-center p-3 bg-orange-50 rounded-lg"><div className="text-xl font-bold text-orange-600">{frequency.faltas_justificadas}</div><div className="text-xs text-orange-600">{t('labels.justificadas')}</div></div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('labels.percentual')}</span>
            <span className={`font-bold ${frequencyColor(frequency.percentual)}`}>{frequency.percentual}%</span>
          </div>
          <Progress value={frequency.percentual} className="h-2" />
          <div className="flex items-center gap-2 text-sm"><FrequencyStatus percentual={frequency.percentual} /></div>
        </div>
      </CardContent>
    </Card>
  )
}

function EnrollmentHistoryCard({ enrollments }: { enrollments: Matricula[] }) {
  const t = useTranslations('registry')
  if (enrollments.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><School className="h-5 w-5" />{t('ui.historico-de-matriculas')}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {enrollments.map(enrollment => (
            <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1 min-w-0">
                <p className="font-medium truncate">{enrollment.turma.nome} - {enrollment.turma.serie}</p>
                <p className="text-sm text-gray-600 truncate">{enrollment.turma.escola.nome}</p>
                <p className="text-xs text-gray-500">Matrícula: {enrollment.data_matricula ? new Date(enrollment.data_matricula).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div className="text-right space-y-1 shrink-0 ml-3">
                <p className="text-sm font-medium">{enrollment.ano_letivo}</p>
                <EnrollmentStatusBadge status={enrollment.situacao} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Two-column grid showing student personal data and enrollment history. */
export function StudentInfoGrid({
  student,
  responsavel,
  matriculas = [],
  frequencia,
  className,
}: StudentInfoGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className || ''}`}>
      <div className="space-y-6">
        <PersonalDataCard student={student} />
        <GuardianCard guardian={responsavel} />
      </div>
      <div className="space-y-6">
        <FrequencyCard frequency={frequencia} />
        <EnrollmentHistoryCard enrollments={matriculas} />
      </div>
    </div>
  )
}
