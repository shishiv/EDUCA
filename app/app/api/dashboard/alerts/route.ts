import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import { loadCanonicalAttendanceFacts, summarizeCanonicalAttendanceFacts } from '@/lib/api/canonical-attendance-facts'
import { CONFORMIDADE, ATENCAO } from '@/lib/attendance/attendance-policy'

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

    // Bolsa Família and preventive attendance alerts use the same canonical
    // session-backed read as the reports and compliance endpoint.
    if (['admin', 'diretor', 'secretario'].includes(userProfile.tipo_usuario)) {
      let bolsaMatriculasQuery = supabase
        .from('matriculas')
        .select(`
          id,
          alunos!inner(
            bolsa_familia
          ),
          turmas!inner(
            escola_id
          )
        `)
        .eq('situacao', 'ativa')

      if (userProfile.tipo_usuario !== 'admin' && userProfile.escola_id) {
        bolsaMatriculasQuery = bolsaMatriculasQuery.eq('turmas.escola_id', userProfile.escola_id)
      }

      const { data: matriculasBolsa, error: matriculasBolsaError } = await bolsaMatriculasQuery
      if (matriculasBolsaError) {
        logger.error('Error fetching Bolsa Familia enrollments for dashboard alerts', matriculasBolsaError)
      } else {
        const bolsaMatriculaIds = (matriculasBolsa ?? [])
          .filter((matricula) => matricula.alunos?.bolsa_familia === true)
          .map((matricula) => matricula.id)

        if (bolsaMatriculaIds.length > 0) {
          const monthStart = `${today.slice(0, 7)}-01`
          const canonicalFacts = await loadCanonicalAttendanceFacts(supabase, bolsaMatriculaIds, {
            startDate: monthStart,
            endDate: today,
          })
          const summaries = summarizeCanonicalAttendanceFacts(canonicalFacts, bolsaMatriculaIds)
          const criticalCount = bolsaMatriculaIds.filter((matriculaId) => {
            const summary = summaries.get(matriculaId)
            return Boolean(summary && summary.total > 0 && summary.percentual < CONFORMIDADE)
          }).length
          const attentionCount = bolsaMatriculaIds.filter((matriculaId) => {
            const summary = summaries.get(matriculaId)
            return Boolean(
              summary &&
              summary.total > 0 &&
              summary.percentual >= CONFORMIDADE &&
              summary.percentual < ATENCAO
            )
          }).length

          if (criticalCount > 0) {
            alerts.push({
              id: 'dashboard-bolsa-familia-nao-conforme',
              type: 'error',
              title: 'Não conformidade Bolsa Família',
              description: `${criticalCount} aluno(s) abaixo de ${CONFORMIDADE}% de frequência. A condicionalidade do benefício não foi atendida.`,
              action: {
                label: 'Ver conformidade Bolsa Família',
                href: '/relatorios/bolsa-familia',
              },
              priority: 1,
              createdAt: new Date().toISOString(),
            })
          }

          if (attentionCount > 0) {
            alerts.push({
              id: 'dashboard-frequencia-atencao-preventiva',
              type: 'warning',
              title: 'Atenção preventiva de frequência',
              description: `${attentionCount} aluno(s) entre ${CONFORMIDADE}% e menos de ${ATENCAO}%. A condicionalidade permanece atendida, mas a margem municipal pede acompanhamento.`,
              action: {
                label: 'Ver atenção preventiva',
                href: '/relatorios/bolsa-familia',
              },
              priority: 2,
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
    }

    // 2. Info alert if no classes assigned (for professors)
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
