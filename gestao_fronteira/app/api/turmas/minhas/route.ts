import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface TurmaWithDetails {
  id: string
  nome: string
  serie: string
  turno: 'matutino' | 'vespertino' | 'integral'
  ano_letivo: number
  capacidade: number
  escola: {
    id: string
    nome: string
  }
  total_alunos: number
  chamada_hoje: boolean
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query based on user role
    let turmasQuery = supabase
      .from('turmas')
      .select(`
        id,
        nome,
        serie,
        turno,
        ano_letivo,
        capacidade,
        escola:escolas!turmas_escola_id_fkey(id, nome),
        matriculas:matriculas(count)
      `)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(limit)

    // Filter based on role
    if (userProfile.tipo_usuario === 'professor') {
      // Professor sees only their classes
      turmasQuery = turmasQuery.eq('professor_id', userProfile.id)
    } else if (userProfile.tipo_usuario === 'diretor' || userProfile.tipo_usuario === 'secretario') {
      // Directors and secretaries see classes from their school
      if (userProfile.escola_id) {
        turmasQuery = turmasQuery.eq('escola_id', userProfile.escola_id)
      }
    }
    // Admin sees all classes (no filter)

    const { data: turmas, error: turmasError } = await turmasQuery

    if (turmasError) {
      logger.error('Error fetching turmas', turmasError)
      return NextResponse.json({ error: 'Erro ao buscar turmas' }, { status: 500 })
    }

    // Get today's attendance sessions to check if chamada was done
    const today = new Date().toISOString().split('T')[0]
    const turmaIds = turmas?.map(t => t.id) || []

    const { data: sessoes } = await supabase
      .from('sessoes_aula')
      .select('turma_id')
      .in('turma_id', turmaIds)
      .eq('data_aula', today)

    const turmasComChamada = new Set(sessoes?.map(s => s.turma_id) || [])

    // Format response
    const turmasFormatted: TurmaWithDetails[] = (turmas || []).map((turma: any) => ({
      id: turma.id,
      nome: turma.nome,
      serie: turma.serie,
      turno: turma.turno,
      ano_letivo: turma.ano_letivo,
      capacidade: turma.capacidade,
      escola: turma.escola || { id: '', nome: 'Sem escola' },
      total_alunos: turma.matriculas?.[0]?.count || 0,
      chamada_hoje: turmasComChamada.has(turma.id)
    }))

    return NextResponse.json({
      success: true,
      turmas: turmasFormatted,
      total: turmasFormatted.length
    })

  } catch (error) {
    logger.error('Error in minhas turmas API', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
