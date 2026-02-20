import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

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

    const alerts: DashboardAlert[] = []
    const today = new Date().toISOString().split('T')[0]

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
            href: '/chamada'
          },
          priority: 1,
          createdAt: new Date().toISOString()
        })
      }
    }

    // 2. Check for students with low attendance (Bolsa Família - NIS required)
    // Only show for admin, diretor, secretario
    if (['admin', 'diretor', 'secretario'].includes(userProfile.tipo_usuario)) {
      let alunosQuery = supabase
        .from('alunos')
        .select(`
          id,
          nome,
          nis,
          escola_id
        `)
        .eq('ativo', true)
        .not('nis', 'is', null)

      if (escolaFilter) {
        alunosQuery = alunosQuery.eq('escola_id', escolaFilter)
      }

      const { data: alunosNis } = await alunosQuery

      if (alunosNis && alunosNis.length > 0) {
        // Get attendance stats for these students
        const alunoIds = alunosNis.map(a => a.id)

        // Get attendance records for current month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        const startDate = startOfMonth.toISOString().split('T')[0]

        const { data: frequencias } = await (supabase as any)
          .from('frequencias')
          .select('aluno_id, presente')
          .in('aluno_id', alunoIds)
          .gte('data', startDate)

        // Calculate attendance per student
        const attendanceByStudent: Record<string, { total: number; present: number }> = {}

        for (const freq of frequencias || []) {
          if (!attendanceByStudent[freq.aluno_id]) {
            attendanceByStudent[freq.aluno_id] = { total: 0, present: 0 }
          }
          attendanceByStudent[freq.aluno_id].total++
          if (freq.presente) {
            attendanceByStudent[freq.aluno_id].present++
          }
        }

        // Find students below 85%
        const lowAttendance = alunosNis.filter(aluno => {
          const stats = attendanceByStudent[aluno.id]
          if (!stats || stats.total === 0) return false
          const percentage = (stats.present / stats.total) * 100
          return percentage < 85
        })

        if (lowAttendance.length > 0) {
          alerts.push({
            id: 'baixa-frequencia-bf',
            type: 'error',
            title: 'Alerta Bolsa Família',
            description: `${lowAttendance.length} aluno(s) com NIS abaixo de 85% de frequência`,
            action: {
              label: 'Ver relatório',
              href: '/relatorios/frequencia'
            },
            priority: 1,
            createdAt: new Date().toISOString()
          })
        }
      }
    }

    // 3. Check overall attendance average
    if (turmaIds.length > 0) {
      const { data: frequenciasHoje } = await (supabase as any)
        .from('frequencias')
        .select('presente')
        .in('turma_id', turmaIds)
        .eq('data', today)

      if (frequenciasHoje && frequenciasHoje.length > 0) {
        const presentes = frequenciasHoje.filter(f => f.presente).length
        const total = frequenciasHoje.length
        const percentage = Math.round((presentes / total) * 100)

        if (percentage >= 95) {
          alerts.push({
            id: 'frequencia-excelente',
            type: 'success',
            title: 'Frequência excelente',
            description: `${percentage}% de presença hoje. Parabéns!`,
            priority: 3,
            createdAt: new Date().toISOString()
          })
        } else if (percentage < 80) {
          alerts.push({
            id: 'frequencia-baixa',
            type: 'warning',
            title: 'Frequência abaixo do esperado',
            description: `${percentage}% de presença hoje. Verificar motivos.`,
            action: {
              label: 'Ver detalhes',
              href: '/relatorios/frequencia'
            },
            priority: 2,
            createdAt: new Date().toISOString()
          })
        }
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
    logger.error('Error in dashboard alerts API', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
