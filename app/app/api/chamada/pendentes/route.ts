import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

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

    const today = new Date().toISOString().split('T')[0]

    // Build query based on user role
    let turmasQuery = supabase
      .from('turmas')
      .select('id')
      .eq('ativo', true)

    // Filter based on role
    if (userProfile.tipo_usuario === 'professor') {
      turmasQuery = turmasQuery.eq('professor_id', userProfile.id)
    } else if (userProfile.tipo_usuario === 'diretor' || userProfile.tipo_usuario === 'secretario') {
      if (userProfile.escola_id) {
        turmasQuery = turmasQuery.eq('escola_id', userProfile.escola_id)
      }
    }
    // Admin sees all classes (no filter)

    const { data: turmas } = await turmasQuery
    const turmaIds = turmas?.map(t => t.id) || []

    if (turmaIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0
      })
    }

    // Get sessions done today
    const { data: sessoes } = await supabase
      .from('sessoes_aula')
      .select('turma_id')
      .in('turma_id', turmaIds)
      .eq('data_aula', today)

    const turmasComChamada = new Set(sessoes?.map(s => s.turma_id) || [])
    const pendingCount = turmaIds.filter(id => !turmasComChamada.has(id)).length

    return NextResponse.json({
      success: true,
      count: pendingCount
    })

  } catch (error) {
    logger.error('Error in chamada pendentes API', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
