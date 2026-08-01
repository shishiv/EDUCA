import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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

export async function GET(request: NextRequest) {
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

    // WARNING 1: Check for open attendance sessions nearing auto-lock time
    const today = now.toISOString().split('T')[0]
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
          actionUrl: '/dashboard/frequencia',
          actionText: 'Verificar Frequência',
          deadline: lockTime,
          count: openSessions.length
        })
      }
    }

    // WARNING 2 and 3 (Bolsa Família and INEP attendance thresholds) were
    // previously backed by rpc('get_students_below_attendance_threshold'), a
    // function absent from the committed schema. At runtime PostgREST rejected
    // it, so these warnings never rendered; the calls are removed until a real
    // threshold function or query exists in supabase/migrations.

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
