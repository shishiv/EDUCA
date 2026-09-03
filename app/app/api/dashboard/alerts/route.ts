import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import {
  createAcademicYearService,
  type ResolvedAcademicYear,
} from '@/lib/services/academic-year'
import {
  getAttendanceConditionality,
  filterBolsaFamiliaConditionality,
  isLegalAttendanceRisk,
  isMunicipalAttendanceRisk,
} from '@/lib/reports/attendance-conditionality'
import type { Database, Tables } from '@/types/database'

export interface DashboardAlert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  priority: number
  createdAt: string
}

type UserProfile = Pick<Tables<'users'>, 'id' | 'tipo_usuario' | 'escola_id'>
type VisibleTurma = Pick<Tables<'turmas'>, 'id' | 'nome'>
type ServerClient = SupabaseClient<Database>

async function loadVisibleTurmas(
  supabase: ServerClient,
  userProfile: UserProfile,
  escolaId: string,
  year: number,
): Promise<VisibleTurma[]> {
  let query = supabase
    .from('turmas')
    .select('id, nome')
    .eq('escola_id', escolaId)
    .eq('ano_letivo', year)
    .eq('ativo', true)

  if (userProfile.tipo_usuario === 'professor') {
    query = query.eq('professor_id', userProfile.id)
  }

  const { data } = await query
  return data ?? []
}

async function loadPendingAttendanceAlert(
  supabase: ServerClient,
  turmas: VisibleTurma[],
  today: string,
  todayInAcademicYear: boolean,
): Promise<DashboardAlert | null> {
  if (turmas.length === 0 || !todayInAcademicYear) return null

  const { data: sessoes } = await supabase
    .from('sessoes_aula')
    .select('turma_id')
    .in('turma_id', turmas.map(turma => turma.id))
    .eq('data_aula', today)

  const turmasComChamada = new Set(sessoes?.map(sessao => sessao.turma_id) ?? [])
  const turmasSemChamada = turmas.filter(turma => !turmasComChamada.has(turma.id))
  if (turmasSemChamada.length === 0) return null

  const turmaNames = turmasSemChamada.slice(0, 3).map(turma => turma.nome).join(', ')
  const moreCount = turmasSemChamada.length > 3 ? ` e mais ${turmasSemChamada.length - 3}` : ''

  return {
    id: 'chamada-pendente',
    type: 'warning',
    title: 'Chamada pendente',
    description: `${turmasSemChamada.length} turma(s) sem chamada hoje: ${turmaNames}${moreCount}`,
    action: {
      label: 'Fazer chamada',
      href: '/dashboard/turmas',
    },
    priority: 1,
    createdAt: new Date().toISOString(),
  }
}

async function loadMonthlyConditionalityAlert(
  supabase: ServerClient,
  escolaId: string,
  academicYear: ResolvedAcademicYear,
  today: string,
  allowed: boolean,
): Promise<DashboardAlert | null> {
  if (!allowed) return null

  const monthStart = `${today.slice(0, 7)}-01`
  const conditionality = await getAttendanceConditionality(supabase, {
    startDate: academicYear.startDate > monthStart ? academicYear.startDate : monthStart,
    endDate: today,
    escolaId,
  })

  if (conditionality.error) {
    logger.error('Error resolving dashboard attendance conditionality', new Error(conditionality.error), {
      feature: 'dashboard-alerts',
      action: 'resolve_attendance_conditionality',
    })
    return null
  }

  const atRiskRows = filterBolsaFamiliaConditionality(conditionality.data).filter(row => (
    isMunicipalAttendanceRisk(row) || isLegalAttendanceRisk(row)
  ))
  if (atRiskRows.length === 0) return null

  const legalRiskCount = atRiskRows.filter(isLegalAttendanceRisk).length
  const municipalRiskCount = atRiskRows.filter(isMunicipalAttendanceRisk).length

  return {
    id: 'baixa-frequencia-bf',
    type: 'error',
    title: 'Alerta Bolsa Família',
    description: `${atRiskRows.length} aluno(s) com risco resolvido pelo modelo canônico` +
      ` (${legalRiskCount} condicionalidade legal, ${municipalRiskCount} margem municipal)`,
    action: {
      label: 'Ver relatório',
      href: '/relatorios/bolsa-familia',
    },
    priority: 1,
    createdAt: new Date().toISOString(),
  }
}

async function loadTodayConditionalityAlert(
  supabase: ServerClient,
  escolaId: string,
  turmaIds: string[],
  today: string,
  allowed: boolean,
): Promise<DashboardAlert | null> {
  if (!allowed || turmaIds.length === 0) return null

  const conditionality = await getAttendanceConditionality(supabase, {
    startDate: today,
    endDate: today,
    escolaId,
  })
  const visibleTurmaIds = new Set(turmaIds)
  const rowsBelowMargin = conditionality.data.filter(row => (
    row.tem_dados_frequencia
    && visibleTurmaIds.has(row.turma_id)
    && row.is_bolsa_familia
    && isMunicipalAttendanceRisk(row)
  ))
  if (rowsBelowMargin.length === 0) return null

  return {
    id: 'frequencia-baixa',
    type: 'warning',
    title: 'Frequência abaixo da margem municipal',
    description: `${rowsBelowMargin.length} aluno(s) abaixo da margem municipal resolvida hoje.`,
    action: {
      label: 'Ver detalhes',
      href: '/relatorios/bolsa-familia',
    },
    priority: 2,
    createdAt: new Date().toISOString(),
  }
}

function getUnassignedTeacherAlert(userProfile: UserProfile, turmaCount: number): DashboardAlert | null {
  if (userProfile.tipo_usuario !== 'professor' || turmaCount !== 0) return null

  return {
    id: 'sem-turmas',
    type: 'info',
    title: 'Nenhuma turma atribuída',
    description: 'Entre em contato com a secretaria para atribuição de turmas.',
    priority: 2,
    createdAt: new Date().toISOString(),
  }
}

async function loadDashboardAlerts(
  supabase: ServerClient,
  userProfile: UserProfile,
  escolaId: string,
  academicYear: ResolvedAcademicYear,
  today: string,
): Promise<DashboardAlert[]> {
  const turmas = await loadVisibleTurmas(supabase, userProfile, escolaId, academicYear.year)
  const turmaIds = turmas.map(turma => turma.id)
  const todayInAcademicYear = today >= academicYear.startDate && today <= academicYear.endDate
  const canViewBolsaFamilia = ['admin', 'diretor', 'secretario'].includes(userProfile.tipo_usuario)

  const alerts = [
    await loadPendingAttendanceAlert(supabase, turmas, today, todayInAcademicYear),
    await loadMonthlyConditionalityAlert(
      supabase,
      escolaId,
      academicYear,
      today,
      canViewBolsaFamilia && todayInAcademicYear,
    ),
    await loadTodayConditionalityAlert(
      supabase,
      escolaId,
      turmaIds,
      today,
      canViewBolsaFamilia && todayInAcademicYear,
    ),
    getUnassignedTeacherAlert(userProfile, turmaIds.length),
  ].filter((alert): alert is DashboardAlert => alert !== null)

  return alerts.sort((a, b) => a.priority - b.priority)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tipo_usuario, escola_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    const escolaId = request.nextUrl.searchParams.get('escolaId')
    const requestedYearParam = request.nextUrl.searchParams.get('year')
    if (!escolaId || !requestedYearParam || !/^\d{4}$/.test(requestedYearParam)) {
      return NextResponse.json({ error: 'Escola e ano letivo são obrigatórios' }, { status: 400 })
    }

    if (userProfile.escola_id && userProfile.escola_id !== escolaId) {
      return NextResponse.json({ error: 'Acesso negado para esta escola' }, { status: 403 })
    }

    const today = getTodaySaoPaulo()
    const academicYear = await createAcademicYearService(supabase).resolveCurrent(escolaId, today)
    if (academicYear.year !== Number(requestedYearParam)) {
      return NextResponse.json({ error: 'Ano letivo desatualizado' }, { status: 409 })
    }

    const alerts = await loadDashboardAlerts(supabase, userProfile, escolaId, academicYear, today)

    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length,
    })
  } catch (error) {
    logger.error('Error in dashboard alerts API', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
