import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import {
  getAttendanceConditionality,
  filterBolsaFamiliaConditionality,
  isLegalAttendanceRisk,
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

export async function GET(_request: NextRequest) {
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

    const alerts: DashboardAlert[] = []
    const today = getTodaySaoPaulo()

    // Build school filter based on role
    let escolaFilter: string | null = null
    if (userProfile.tipo_usuario === 'diretor' || userProfile.tipo_usuario === 'secretario') {
      escolaFilter = userProfile.escola_id
    }

    // 1. Check for classes without attendance today
    let turmasQuery = supabase
      .from('turmas')
      .select('id, nome')
      .eq('ativo', true)

    if (userProfile.tipo_usuario === 'professor') {
      turmasQuery = turmasQuery.eq('professor_id', userProfile.id)
    } else if (escolaFilter) {
      turmasQuery = turmasQuery.eq('escola_id', escolaFilter)
    }

    const { data: turmas } = await turmasQuery
    const turmaIds = turmas?.map(t => t.id) || []

    if (turmaIds.length > 0) {
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

    // 2. Resolve legal conditionality and municipal early-warning status from
    // the canonical read model. Each signal remains a separate alert.
    const monthConditionality = await getAttendanceConditionality(supabase, {
      startDate: `${today.slice(0, 7)}-01`,
      endDate: today,
      escolaId: escolaFilter ?? undefined,
    })

    if (monthConditionality.error) {
      logger.error('Error resolving dashboard attendance conditionality', new Error(monthConditionality.error), {
        feature: 'dashboard-alerts',
        action: 'resolve_attendance_conditionality',
      })
    } else if (['admin', 'diretor', 'secretario'].includes(userProfile.tipo_usuario)) {
      const rows = filterBolsaFamiliaConditionality(monthConditionality.data)
      const criticalRows = rows.filter((row) => (
        isLegalAttendanceRisk(row) || row.margem_municipal_status === 'CRITICO'
      ))
      const attentionRows = rows.filter((row) => (
        !isLegalAttendanceRisk(row)
        && row.margem_municipal_status === 'ALERTA'
      ))

      if (criticalRows.length > 0) {
        alerts.push({
          id: 'dashboard-bolsa-familia-nao-conforme',
          type: 'error',
          title: 'Não conformidade Bolsa Família',
          description: `${criticalRows.length} aluno(s) abaixo do piso legal ou da margem crítica resolvida.`,
          action: {
            label: 'Ver conformidade Bolsa Família',
            href: '/relatorios/bolsa-familia',
          },
          priority: 1,
          createdAt: new Date().toISOString(),
        })
      }

      if (attentionRows.length > 0) {
        alerts.push({
          id: 'dashboard-frequencia-atencao-preventiva',
          type: 'warning',
          title: 'Atenção preventiva de frequência',
          description: `${attentionRows.length} aluno(s) abaixo da margem municipal resolvida, com condicionalidade legal atendida.`,
          action: {
            label: 'Ver atenção preventiva',
            href: '/relatorios/bolsa-familia',
          },
          priority: 2,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 3. Info alert if no classes assigned (for professors)
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
