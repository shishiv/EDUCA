import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import { loadCanonicalAttendanceFacts, summarizeCanonicalAttendanceFacts } from '@/lib/api/canonical-attendance-facts'
import { CONFORMIDADE, ATENCAO } from '@/lib/attendance/attendance-policy'

export interface ComplianceWarning {
  id: string
  title: string
  message: string
  type: 'critical' | 'warning' | 'info'
  icon: string
  actionUrl: string
  actionText: string
  deadline?: Date
  count?: number
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ warnings: [] }, { status: 401 })
    }

    // Get user profile to check role and escola_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('tipo_usuario, escola_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ warnings: [] }, { status: 403 })
    }

    const warnings: ComplianceWarning[] = []
    const now = new Date()
    const today = getTodaySaoPaulo()

    // WARNING 1: Check for open attendance sessions nearing auto-lock time
    const { data: openSessions } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, aberta_em')
      .eq('status', 'ABERTA')
      .gte('aberta_em', `${today}T00:00:00`)
      .lte('aberta_em', `${today}T23:59:59`)

    if (openSessions && openSessions.length > 0) {
      const lockTime = new Date()
      lockTime.setHours(18, 0, 0, 0) // 18:00 lock time

      if (now < lockTime) {
        const hoursRemaining = Math.floor((lockTime.getTime() - now.getTime()) / (1000 * 60 * 60))

        warnings.push({
          id: 'attendance-lock-pending',
          title: 'Bloqueio Automático de Frequência',
          message: `${openSessions.length} sessão(ões) aberta(s) será(ão) bloqueada(s) automaticamente em ${hoursRemaining}h. Confirme toda a frequência antes deste horário.`,
          type: hoursRemaining <= 2 ? 'critical' : 'warning',
          icon: 'Clock',
          actionUrl: '/dashboard/turmas',
          actionText: 'Verificar Frequência',
          deadline: lockTime,
          count: openSessions.length
        })
      }
    }

    // WARNING 2: Bolsa Família attendance below the legal threshold.
    // NIS alone is not a benefit enrollment, so this starts from the explicit
    // bolsa_familia flag on active enrollments and canonical session records.
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
        logger.error('Error fetching Bolsa Familia enrollments for compliance warnings', matriculasBolsaError)
      } else {
        const bolsaMatriculaIds = (matriculasBolsa ?? [])
          .filter(matricula => matricula.alunos?.bolsa_familia === true)
          .map(matricula => matricula.id)

        if (bolsaMatriculaIds.length > 0) {
          const startOfMonth = `${today.slice(0, 7)}-01`
          const canonicalFacts = await loadCanonicalAttendanceFacts(supabase, bolsaMatriculaIds, {
            startDate: startOfMonth,
            endDate: today,
          })
          const attendanceByMatricula = summarizeCanonicalAttendanceFacts(
            canonicalFacts,
            bolsaMatriculaIds
          )
          const criticalCount = bolsaMatriculaIds.filter((matriculaId) => {
            const attendance = attendanceByMatricula.get(matriculaId)
            return Boolean(attendance && attendance.total > 0 && attendance.percentual < CONFORMIDADE)
          }).length
          const attentionCount = bolsaMatriculaIds.filter((matriculaId) => {
            const attendance = attendanceByMatricula.get(matriculaId)
            return Boolean(
              attendance &&
              attendance.total > 0 &&
              attendance.percentual >= CONFORMIDADE &&
              attendance.percentual < ATENCAO
            )
          }).length

            if (criticalCount > 0) {
              warnings.push({
                id: 'bolsa-familia-baixa-frequencia',
                title: 'Não conformidade Bolsa Família',
                message: `${criticalCount} aluno(s) do Bolsa Família estão abaixo de ${CONFORMIDADE}% neste mês. A condicionalidade do benefício não foi atendida.`,
                type: 'critical',
                icon: 'AlertTriangle',
                actionUrl: '/relatorios/bolsa-familia',
                actionText: 'Ver relatório Bolsa Família',
                count: criticalCount,
              })
            }
            if (attentionCount > 0) {
              warnings.push({
                id: 'bolsa-familia-atencao-preventiva',
                title: 'Atenção preventiva de frequência',
                message: `${attentionCount} aluno(s) do Bolsa Família estão entre ${CONFORMIDADE}% e menos de ${ATENCAO}%. A condicionalidade permanece atendida, mas requer margem preventiva municipal.`,
                type: 'warning',
                icon: 'AlertCircle',
                actionUrl: '/relatorios/bolsa-familia',
                actionText: 'Ver relatório Bolsa Família',
                count: attentionCount,
              })
            }
        }
      }
    }

    // WARNING 4: Educacenso deadline approaching (if within 30 days)
    const educacensoDeadline = new Date('2025-07-31')
    const daysUntilDeadline = Math.floor((educacensoDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDeadline > 0 && daysUntilDeadline <= 30 && userProfile.tipo_usuario !== 'professor') {
      warnings.push({
        id: 'educacenso-deadline',
        title: 'Prazo Educacenso 2025',
        message: `Primeira etapa de coleta termina em ${daysUntilDeadline} dias. Verifique se todos os dados de matrícula estão atualizados.`,
        type: daysUntilDeadline <= 7 ? 'critical' : 'warning',
        icon: 'FileText',
        actionUrl: '/dashboard/relatorios/educacenso',
        actionText: 'Revisar Dados',
        deadline: educacensoDeadline
      })
    }

    // WARNING 5: Incomplete student registrations (missing CPF, responsaveis, etc.)
    if (userProfile.tipo_usuario === 'secretario' || userProfile.tipo_usuario === 'admin') {
      const { data: incompleteRegistrations } = await supabase
        .from('alunos')
        .select('id')
        .is('cpf', null)
        .eq('ativo', true)

      if (incompleteRegistrations && incompleteRegistrations.length > 0) {
        warnings.push({
          id: 'incomplete-registrations',
          title: 'Cadastros Incompletos',
          message: `${incompleteRegistrations.length} aluno(s) sem CPF cadastrado. Necessário para conformidade INEP.`,
          type: 'warning',
          icon: 'AlertCircle',
          actionUrl: '/dashboard/alunos?filter=incomplete',
          actionText: 'Completar Cadastros',
          count: incompleteRegistrations.length
        })
      }
    }

    // Sort by priority: critical first, then by deadline
    warnings.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1
      if (a.type !== 'critical' && b.type === 'critical') return 1
      if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime()
      return 0
    })

    return NextResponse.json({
      success: true,
      warnings,
      total: warnings.length,
      timestamp: now.toISOString()
    })

  } catch (error) {
    logger.error('Error fetching compliance warnings', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        warnings: [],
        error: 'Failed to fetch compliance warnings'
      },
      { status: 500 }
    )
  }
}
