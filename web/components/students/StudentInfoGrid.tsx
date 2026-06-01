'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  User,
  Calendar,
  FileText,
  MapPin,
  Users,
  School,
  GraduationCap,
  CheckCircle,
  AlertTriangle,
  Heart,
} from 'lucide-react'

interface Matricula {
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

/**
 * Two-column grid showing student personal data and enrollment history.
 * Responsive: stacks to single column on mobile.
 */
export function StudentInfoGrid({
  student,
  responsavel,
  matriculas = [],
  frequencia,
  className,
}: StudentInfoGridProps) {
  const getFrequenciaColor = (percentual: number) => {
    if (percentual >= 75) return 'text-green-600'
    if (percentual >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getSituacaoMatriculaBadge = (situacao: string) => {
    switch (situacao) {
      case 'ativa':
        return <Badge variant="success">Ativa</Badge>
      case 'concluida':
        return <Badge variant="outline">Concluida</Badge>
      case 'transferida':
        return <Badge variant="secondary">Transferida</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">{situacao}</Badge>
    }
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className || ''}`}>
      {/* Left Column: Dados Pessoais */}
      <div className="space-y-6">
        {/* Personal Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Data de Nascimento
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {new Date(student.data_nascimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Sexo</label>
                <p className="mt-1">{student.sexo === 'M' ? 'Masculino' : 'Feminino'}</p>
              </div>
            </div>

            {student.cpf && (
              <div>
                <label className="text-sm font-medium text-gray-500">CPF</label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>{student.cpf}</span>
                </div>
              </div>
            )}

            {student.endereco && (
              <div>
                <label className="text-sm font-medium text-gray-500">Endereco</label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-sm">{student.endereco}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Mae</label>
                <p className="mt-1 text-sm">{student.nome_mae || 'Nao informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Pai</label>
                <p className="mt-1 text-sm">{student.nome_pai || 'Nao informado'}</p>
              </div>
            </div>

            {student.necessidades_especiais && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-red-700">
                      Necessidades Especiais
                    </label>
                    <p className="text-sm text-red-600 mt-1">
                      {student.necessidades_especiais}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responsavel Card */}
        {responsavel && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Responsavel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{responsavel.nome}</p>
                <p className="text-sm text-gray-500">{responsavel.parentesco}</p>
              </div>
              <div className="text-sm space-y-1">
                <p>Tel: {responsavel.telefone}</p>
                {responsavel.email && <p>Email: {responsavel.email}</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Historico */}
      <div className="space-y-6">
        {/* Frequencia Summary Card */}
        {frequencia && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Frequencia
              </CardTitle>
              <CardDescription>
                Resumo de presencas e faltas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {frequencia.total_aulas}
                  </div>
                  <div className="text-xs text-blue-600">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {frequencia.presencas}
                  </div>
                  <div className="text-xs text-green-600">Presencas</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">
                    {frequencia.faltas}
                  </div>
                  <div className="text-xs text-red-600">Faltas</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {frequencia.faltas_justificadas}
                  </div>
                  <div className="text-xs text-orange-600">Justificadas</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Percentual</span>
                  <span
                    className={`font-bold ${getFrequenciaColor(frequencia.percentual)}`}
                  >
                    {frequencia.percentual}%
                  </span>
                </div>
                <Progress value={frequencia.percentual} className="h-2" />
                <div className="flex items-center gap-2 text-sm">
                  {frequencia.percentual >= 75 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">
                        Frequencia adequada (minimo 75%)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">
                        Atencao: Frequencia abaixo do minimo
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matriculas History Card */}
        {matriculas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Historico de Matriculas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matriculas.map((matricula) => (
                  <div
                    key={matricula.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium truncate">
                        {matricula.turma.nome} - {matricula.turma.serie}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {matricula.turma.escola.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        Matricula:{' '}
                        {new Date(matricula.data_matricula).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right space-y-1 shrink-0 ml-3">
                      <p className="text-sm font-medium">{matricula.ano_letivo}</p>
                      {getSituacaoMatriculaBadge(matricula.situacao)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
