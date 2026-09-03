import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import {
  loadCanonicalAttendanceFacts,
  type CanonicalAttendanceFact,
} from '@/lib/api/canonical-attendance-facts'
import { CONFORMIDADE, ATENCAO } from '@/lib/attendance/attendance-policy'
import type { Database, Tables } from '@/types/database'

interface TrendDataPoint {
  date: string
  attendancePercentage: number
  classAverage?: number
  absences: number
  presents: number
  totalStudents: number
}

interface DailyAttendance {
  presente: number
  total: number
}

type ClassEnrollment = Pick<Tables<'matriculas'>, 'id' | 'aluno_id'>
type ServerClient = SupabaseClient<Database>

const emptyComplianceStatus = {
  inep: false,
  bolsaFamilia: false,
  atencaoPreventiva: false,
}

function groupDailyAttendance(records: CanonicalAttendanceFact[]): Record<string, DailyAttendance> {
  const dailyData: Record<string, DailyAttendance> = {}

  for (const record of records) {
    const daily = dailyData[record.dataAula] ?? { presente: 0, total: 0 }
    daily.total++
    if (record.presente) daily.presente++
    dailyData[record.dataAula] = daily
  }

  return dailyData
}

function getComplianceStatus(overallPercentage: number) {
  return {
    inep: overallPercentage >= 75,
    bolsaFamilia: overallPercentage >= CONFORMIDADE,
    atencaoPreventiva: overallPercentage >= CONFORMIDADE && overallPercentage < ATENCAO,
  }
}

function getTrendStatistics(trendData: TrendDataPoint[]) {
  const totalPresent = trendData.reduce((sum, day) => sum + day.presents, 0)
  const totalStudents = trendData.reduce((sum, day) => sum + day.totalStudents, 0)
  const overallPercentage = totalStudents > 0
    ? Math.round((totalPresent / totalStudents) * 100)
    : 0

  return {
    overallPercentage,
    totalDays: trendData.length,
    totalPresent,
    totalAbsent: totalStudents - totalPresent,
    complianceStatus: getComplianceStatus(overallPercentage),
  }
}

async function loadClassAverages(
  supabase: ServerClient,
  turmaId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id')
    .eq('turma_id', turmaId)
    .eq('situacao', 'ativa')

  if (!matriculas || matriculas.length === 0) return {}

  const records = await loadCanonicalAttendanceFacts(
    supabase,
    matriculas.map(matricula => matricula.id),
    { startDate, endDate },
  )

  return Object.fromEntries(
    Object.entries(groupDailyAttendance(records)).map(([date, daily]) => [
      date,
      Math.round((daily.presente / daily.total) * 100),
    ]),
  )
}

function buildStudentTrendData(
  records: CanonicalAttendanceFact[],
  classAverages: Record<string, number>,
): TrendDataPoint[] {
  return Object.entries(groupDailyAttendance(records)).map(([date, daily]) => ({
    date,
    attendancePercentage: Math.round((daily.presente / daily.total) * 100),
    classAverage: classAverages[date],
    absences: daily.total - daily.presente,
    presents: daily.presente,
    totalStudents: daily.total,
  }))
}

async function getStudentTrends(
  supabase: ServerClient,
  studentId: string,
  turmaId: string | null,
  includeClassAverage: boolean,
  startDate: string,
  endDate: string,
) {
  const { data: matriculas, error } = await supabase
    .from('matriculas')
    .select('id, turma_id')
    .eq('aluno_id', studentId)
    .eq('situacao', 'ativa')

  if (error) {
    logger.error('Error fetching student matriculas', error.message, { metadata: { studentId } })
    return NextResponse.json({ error: 'Erro ao buscar matrículas do aluno' }, { status: 500 })
  }

  if (!matriculas || matriculas.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      statistics: {
        overallPercentage: 0,
        totalDays: 0,
        totalPresent: 0,
        totalAbsent: 0,
        complianceStatus: emptyComplianceStatus,
      },
    })
  }

  const records = await loadCanonicalAttendanceFacts(
    supabase,
    matriculas.map(matricula => matricula.id),
    { startDate, endDate },
  )
  const effectiveTurmaId = turmaId || matriculas[0].turma_id
  const classAverages = includeClassAverage && effectiveTurmaId
    ? await loadClassAverages(supabase, effectiveTurmaId, startDate, endDate)
    : {}
  const data = buildStudentTrendData(records, classAverages)

  return NextResponse.json({
    success: true,
    data,
    statistics: getTrendStatistics(data),
  })
}

function buildClassTrendData(
  records: CanonicalAttendanceFact[],
  matriculas: ClassEnrollment[],
): TrendDataPoint[] {
  const matriculaToAluno = new Map(matriculas.map(matricula => [matricula.id, matricula.aluno_id]))
  const dailyData: Record<string, DailyAttendance & { students: Set<string> }> = {}

  for (const record of records) {
    const daily = dailyData[record.dataAula] ?? { presente: 0, total: 0, students: new Set<string>() }
    daily.total++
    const alunoId = matriculaToAluno.get(record.matriculaId)
    if (alunoId) daily.students.add(alunoId)
    if (record.presente) daily.presente++
    dailyData[record.dataAula] = daily
  }

  return Object.entries(dailyData).map(([date, daily]) => ({
    date,
    attendancePercentage: Math.round((daily.presente / daily.total) * 100),
    absences: daily.total - daily.presente,
    presents: daily.presente,
    totalStudents: daily.students.size,
  }))
}

async function getClassTrends(
  supabase: ServerClient,
  turmaId: string,
  startDate: string,
  endDate: string,
) {
  const { data: matriculas, error } = await supabase
    .from('matriculas')
    .select('id, aluno_id')
    .eq('turma_id', turmaId)
    .eq('situacao', 'ativa')

  if (error) {
    logger.error('Error fetching turma matriculas', error.message, { metadata: { turmaId } })
    return NextResponse.json({ error: 'Erro ao buscar matrículas da turma' }, { status: 500 })
  }

  if (!matriculas || matriculas.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      statistics: {
        overallPercentage: 0,
        totalDays: 0,
        totalPresent: 0,
        totalAbsent: 0,
        averageStudentsPerDay: 0,
        complianceStatus: emptyComplianceStatus,
      },
    })
  }

  const records = await loadCanonicalAttendanceFacts(
    supabase,
    matriculas.map(matricula => matricula.id),
    { startDate, endDate },
  )
  const data = buildClassTrendData(records, matriculas)
  const statistics = getTrendStatistics(data)

  return NextResponse.json({
    success: true,
    data,
    statistics: {
      overallPercentage: statistics.overallPercentage,
      totalDays: statistics.totalDays,
      totalPresent: statistics.totalPresent,
      totalAbsent: statistics.totalAbsent,
      averageStudentsPerDay: Math.round(
        data.reduce((sum, day) => sum + day.totalStudents, 0) / data.length,
      ),
      complianceStatus: statistics.complianceStatus,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const turmaId = searchParams.get('turma_id')
    const days = parseInt(searchParams.get('days') || '30')
    const includeClassAverage = searchParams.get('class_average') === 'true'

    if (!studentId && !turmaId) {
      return NextResponse.json({
        error: 'student_id ou turma_id é obrigatório',
      }, { status: 400 })
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    if (studentId) {
      return getStudentTrends(
        supabase,
        studentId,
        turmaId,
        includeClassAverage,
        startDateStr,
        endDateStr,
      )
    }

    return getClassTrends(supabase, turmaId!, startDateStr, endDateStr)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error('Error in attendance trends API', errorMessage)
    return NextResponse.json({
      error: 'Erro ao processar solicitação',
    }, { status: 500 })
  }
}
