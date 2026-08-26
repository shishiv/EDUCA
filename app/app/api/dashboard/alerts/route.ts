import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import { createAcademicYearService } from '@/lib/services/academic-year'
import {
  getAttendanceConditionality,
  filterBolsaFamiliaConditionality,
  isLegalAttendanceRisk,
  isMunicipalAttendanceRisk,
} from '@/lib/reports/attendance-conditionality'

export interface DashboardAlert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  priority: number // 1 = highest
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tipo_usuario, escola_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    const escolaFilter = request.nextUrl.searchParams.get('escolaId')
    const requestedYearParam = request.nextUrl.searchParams.get('year')
    if (!escolaFilter || !requestedYearParam || !/^\d{4}$/.test(requestedYearParam)) {
      return NextResponse.json({ error: 'Escola e ano letivo são obrigatórios' }, { status: 400 })
    }

    const requestedYear = Number(requestedYearParam)

    if (userProfile.escola_id && userProfile.escola_id !== escolaFilter) {
      return NextResponse.json({ error: 'Acesso negado para esta escola' }, { status: 403 })
    }

    const today = getTodaySaoPaulo()
    const academicYear = await createAcademicYearService(supabase).resolveCurrent(escolaFilter, today)
    if (academicYear.year !== requestedYear) {
      return NextResponse.json({ error: 'Ano letivo desatualizado' }, { status: 409 })
    }

    const alerts: DashboardAlert[] = []
    const todayInAcademicYear = today >= academicYear.startDate && today <= academicYear.endDate
    let turmasQuery = supabase
      .from('turmas')
      .select('id, nome')
      .eq('escola_id', escolaFilter)
      .eq('ano_letivo', academicYear.year)
      .eq('ativo', true)

    if (userProfile.tipo_usuario === 'professor') {
      turmasQuery = turmasQuery.eq('professor_id', userProfile.id)
    }

    const { data: turmas } = await turmasQuery
    const turmaIds = turmas?.map(t => t.id) || []
    const visibleTurmaIds = new Set(turmaIds)

    if (turmaIds.length > 0 && todayInAcademicYear) {
      // Get sessions done today
      const { data: sessoes } = await supabase
        .from('sessoes_aula')
        .select('turma_id')
        .in('turma_id', turmaIds)
        .eq('data_aula', today)

      const turmasComChamada = new Set(sessoes?.map(s => s.turma_id) || [])
      const turmasSemChamada = turmas?.filter(t => !turmasComChamada.has(t.id)) || []

      if (turmasSemChamada.length > 0) {
        const turmaNames = turmasSemChamada.slice(0, 3).map(t => t.nome).join(', ')
        const moreCount = turmasSemChamada.length > 3 ? ` e mais ${turmasSemChamada.length - 3}` : ''

        alerts.push({
          id: 'chamada-pendente',
          type: 'warning',
          title: 'Chamada pendente',
          description: `${turmasSemChamada.length} turma(s) sem chamada hoje: ${turmaNames}${moreCount}`,
          action: {
            label: 'Fazer chamada',
            href: '/dashboard/turmas'
          },
          priority: 1,
          createdAt: new Date().toISOString()
        })
      }
    }

    // 2. Resolve all Bolsa Família legal and municipality statuses from the
    // canonical read model. No threshold is reconstructed in this route.
    const canViewBolsaFamilia = ['admin', 'diretor', 'secretario'].includes(userProfile.tipo_usuario)
    if (canViewBolsaFamilia && todayInAcademicYear) {
      const monthConditionality = await getAttendanceConditionality(supabase, {
        startDate: academicYear.startDate > `${today.slice(0, 7)}-01`
          ? academicYear.startDate
          : `${today.slice(0, 7)}-01`,
        endDate: today,
        escolaId: escolaFilter,
      })

      if (monthConditionality.error) {
        logger.error('Error resolving dashboard attendance conditionality', new Error(monthConditionality.error), {
          feature: 'dashboard-alerts',
          action: 'resolve_attendance_conditionality',
        })
      } else {
        const bolsaFamiliaRows = filterBolsaFamiliaConditionality(monthConditionality.data)
        const atRiskRows = bolsaFamiliaRows.filter((row) => (
          isMunicipalAttendanceRisk(row) || isLegalAttendanceRisk(row)
        ))

        if (atRiskRows.length > 0) {
          const legalRiskCount = atRiskRows.filter(isLegalAttendanceRisk).length
          const municipalRiskCount = atRiskRows.filter(isMunicipalAttendanceRisk).length
          alerts.push({
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
          })
        }
      }
    }

    // 3. Check today's attendance against the resolved municipality margin.
    if (turmaIds.length > 0 && canViewBolsaFamilia && todayInAcademicYear) {
      const todayConditionality = await getAttendanceConditionality(supabase, {
        startDate: today,
        endDate: today,
        escolaId: escolaFilter,
      })
      const rowsBelowMargin = todayConditionality.data.filter((row) => (
        row.tem_dados_frequencia
        && visibleTurmaIds.has(row.turma_id)
        && row.is_bolsa_familia
        && isMunicipalAttendanceRisk(row)
      ))

      if (rowsBelowMargin.length > 0) {
        alerts.push({
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
        })
      }
    }

    // 4. Info alert if no classes assigned (for professors)
    if (userProfile.tipo_usuario === 'professor' && turmaIds.length === 0) {
      alerts.push({
        id: 'sem-turmas',
        type: 'info',
        title: 'Nenhuma turma atribuída',
        description: 'Entre em contato com a secretaria para atribuição de turmas.',
        priority: 2,
        createdAt: new Date().toISOString()
      })
    }

    // Sort by priority
    alerts.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length
    })

  } catch (error) {
    logger.error('Error in dashboard alerts API', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
