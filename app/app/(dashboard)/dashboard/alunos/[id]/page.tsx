'use client'
import { useTranslations } from 'next-intl'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
  ArrowLeft,
  Edit,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

// New student profile components
import {
  StudentProfileHeader,
  StudentTags,
  StudentInfoGrid,
} from '@/components/students'
import { isInfantilAge } from '@/lib/utils/faixa-etaria'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { loadCanonicalAttendanceSummaries } from '@/lib/api/canonical-attendance-facts'
import { getStudentBolsaFamilia } from '@/lib/reports/attendance-conditionality'
import {
  getAuthorizedStudentProfiles,
  type AuthorizedStudentProfile,
} from '@/lib/sensitive-family-access'

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
      turno?: string
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
    formatted: string
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
  // Optional fields for Infantil
  bolsa_familia?: boolean
  vivencias_count?: number
}

type StudentEnrollment = AlunoDetalhado['matriculas'][number]
type StudentAttendance = AlunoDetalhado['frequencia']

function emptyAttendance(): StudentAttendance {
  return {
    percentual: 0,
    total_aulas: 0,
    presencas: 0,
    faltas: 0,
    faltas_justificadas: 0,
    formatted: '0% (0/0 dias)',
  }
}

async function loadCurrentAttendance(matriculas: StudentEnrollment[]): Promise<StudentAttendance> {
  const today = new Date()
  const activeMatricula = matriculas.find(
    (matricula) => matricula.situacao === 'ativa' && matricula.ano_letivo === today.getFullYear(),
  )
  if (!activeMatricula) return emptyAttendance()

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const summary = (await loadCanonicalAttendanceSummaries(
    supabase,
    [activeMatricula.id],
    { startDate: monthStart, endDate: monthEnd },
  )).get(activeMatricula.id)

  if (!summary || summary.total <= 0) return emptyAttendance()

  const presencas = summary.presencas + summary.atestados
  return {
    percentual: summary.percentual,
    total_aulas: summary.total,
    presencas,
    faltas: summary.faltas,
    faltas_justificadas: summary.atestados,
    formatted: `${summary.percentual}% (${presencas}/${summary.total} dias)`,
  }
}

async function loadStudentRecord(studentId: string) {
  const [profiles, { data: relations, error }, bolsaFamilia] = await Promise.all([
    getAuthorizedStudentProfiles(supabase, { studentId }),
    supabase
      .from('alunos')
      .select(`
        id,
        matriculas:matriculas(
          id,
          ano_letivo,
          situacao,
          data_matricula,
          turma:turmas(
            nome,
            serie,
            turno,
            escola:escolas(nome)
          )
        )
      `)
      .eq('id', studentId)
      .single(),
    getStudentBolsaFamilia(supabase, studentId),
  ])

  if (error) throw error
  if (!profiles[0] || !relations) return null
  return {
    profile: profiles[0],
    matriculas: (relations.matriculas ?? []) as StudentEnrollment[],
    bolsaFamilia,
  }
}

function mapStudentDetails(
  profile: AuthorizedStudentProfile,
  matriculas: StudentEnrollment[],
  frequencia: StudentAttendance,
  bolsaFamilia: boolean | null,
  motherLabel: string,
  fatherLabel: string,
): AlunoDetalhado {
  return {
    id: profile.id,
    nome_completo: profile.nome_completo,
    data_nascimento: profile.data_nascimento,
    cpf: profile.cpf || undefined,
    sexo: profile.sexo as 'M' | 'F',
    endereco: profile.endereco || undefined,
    telefone: profile.telefone || undefined,
    nome_mae: profile.nome_mae || undefined,
    nome_pai: profile.nome_pai || undefined,
    necessidades_especiais: profile.necessidades_especiais || undefined,
    ativo: profile.ativo ?? true,
    created_at: profile.created_at ?? new Date().toISOString(),
    responsavel: {
      nome: profile.nome_mae || profile.nome_pai || 'Não informado',
      telefone: profile.telefone || 'Não informado',
      email: undefined,
      parentesco: profile.nome_mae ? motherLabel : fatherLabel,
    },
    matriculas,
    frequencia,
    notas: [],
    bolsa_familia: bolsaFamilia ?? false,
    vivencias_count: 0,
  }
}

export default function AlunoDetalhesPage() {
  const t = useTranslations('registry')
  const params = useParams()
  const [aluno, setAluno] = useState<AlunoDetalhado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStudent() {
      if (!params?.id) return

      try {
        setLoading(true)
        setError(null)

        const record = await loadStudentRecord(params.id as string)
        if (!record) {
          setError(t('ui.aluno-nao-encontrado'))
          return
        }
        const frequencia = await loadCurrentAttendance(record.matriculas)
        setAluno(mapStudentDetails(
          record.profile,
          record.matriculas,
          frequencia,
          record.bolsaFamilia,
          t('labels.mae'),
          t('labels.pai'),
        ))
      } catch (err) {
        logger.error('Error loading student', err as Error, {
          feature: 'alunos',
          action: 'load_student_profile',
          metadata: { studentId: params?.id }
        })
        setError(t('ui.erro-ao-carregar-dados-do-aluno'))
        toast.error(t('ui.erro-ao-carregar-dados-do-aluno'))
      } finally {
        setLoading(false)
      }
    }

    loadStudent()
  }, [params?.id, t])

  const getNotaColor = (nota: number) => {
    if (nota >= 8) return 'text-green-600 font-semibold'
    if (nota >= 6) return 'text-blue-600'
    if (nota >= 4) return 'text-orange-600'
    return 'text-red-600 font-semibold'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="flex items-start gap-6 mb-6">
            <div className="h-24 w-24 lg:h-[120px] lg:w-[120px] bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-6 bg-gray-200 rounded w-1/6" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Not found or error state
  if (!aluno || error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{error || t('ui.aluno-nao-encontrado')}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/alunos">{t('labels.voltar-para-lista')}</Link>
        </Button>
      </div>
    )
  }

  // Get current matricula info for tags
  const currentMatricula = aluno.matriculas.find(m => m.situacao === 'ativa')
  const isInfantil = isInfantilAge(aluno.data_nascimento)

  return (
    <div className="space-y-6">
      {/* Back button + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <Link href="/dashboard/alunos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {/* Diario Infantil button for young students */}
          {isInfantil && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/alunos/${aluno.id}/diario`}>
                <BookOpen className="h-4 w-4 mr-2" />
                {t('ui.ver-diario-infantil')}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/dashboard/alunos/${aluno.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              {t('ui.editar')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Header: Large Avatar + Name + Stats */}
      <StudentProfileHeader
        student={{
          id: aluno.id,
          nome_completo: aluno.nome_completo,
          data_nascimento: aluno.data_nascimento,
          foto_url: null,
        }}
        turma={currentMatricula?.turma ? {
          nome: currentMatricula.turma.nome,
          turno: currentMatricula.turma.turno,
        } : null}
        stats={{
          frequencia: aluno.frequencia.percentual,
          vivencias: aluno.vivencias_count,
        }}
      />

      {/* Tags: Turma, Turno, Bolsa Familia */}
      <StudentTags
        turma={currentMatricula?.turma.nome}
        turno={currentMatricula?.turma.turno}
        bolsaFamilia={aluno.bolsa_familia}
        showBolsaFamilia={aluno.bolsa_familia === true}
        ativo={aluno.ativo}
      />

      {/* Two-Column Info Grid + Tabs */}
      <div className="space-y-6">
        {/* Personal Data + History Grid */}
        <StudentInfoGrid
          student={{
            nome_completo: aluno.nome_completo,
            data_nascimento: aluno.data_nascimento,
            cpf: aluno.cpf,
            sexo: aluno.sexo,
            endereco: aluno.endereco,
            telefone: aluno.telefone,
            nome_mae: aluno.nome_mae,
            nome_pai: aluno.nome_pai,
            necessidades_especiais: aluno.necessidades_especiais,
            created_at: aluno.created_at,
          }}
          responsavel={aluno.responsavel}
          matriculas={aluno.matriculas}
          frequencia={aluno.frequencia}
        />

        {/* Academic Performance (only for Fundamental) */}
        {!isInfantil && aluno.notas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                {t('ui.desempenho-academico-2024')}
              </CardTitle>
              <CardDescription>
                Notas por disciplina e bimestre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('labels.disciplina')}</TableHead>
                      <TableHead className="text-center">{t('labels.1o-bim')}</TableHead>
                      <TableHead className="text-center">{t('labels.2o-bim')}</TableHead>
                      <TableHead className="text-center">{t('labels.3o-bim')}</TableHead>
                      <TableHead className="text-center">{t('labels.4o-bim')}</TableHead>
                      <TableHead className="text-center">{t('labels.media')}</TableHead>
                      <TableHead className="text-center">{t('labels.situacao')}</TableHead>
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
                          <Badge variant="outline">{t('labels.cursando')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
