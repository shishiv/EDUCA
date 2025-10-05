import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          }
        }
      }
    )

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Autenticação obrigatória'
          },
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    // Verificar se o usuário é professor
    const { data: usuario } = await supabase
      .from('users')
      .select('role, escola_id')
      .eq('id', user.id)
      .single()

    if (!usuario || usuario.role !== 'professor') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Apenas professores podem consultar aulas ativas'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Buscar aulas ativas do professor (status aberta ou fechada, mas não travada)
    const { data: aulasAtivas, error: sqlError } = await supabase
      .from('aulas_abertas')
      .select(`
        id,
        turma_id,
        status,
        aberta_em,
        fechada_em,
        tempo_limite_minutos,
        turmas!inner(
          id,
          nome,
          ano,
          escola_id
        )
      `)
      .eq('professor_id', user.id)
      .eq('turmas.escola_id', usuario.escola_id)
      .in('status', ['aberta', 'fechada'])
      .order('aberta_em', { ascending: false })

    if (sqlError) {
      logger.error('Erro ao buscar aulas ativas:', { error: sqlError })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Erro interno do servidor'
          },
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Buscar total de alunos por turma
    const turmaIds = aulasAtivas.map(aula => aula.turma_id)

    const { data: totalAlunos } = await supabase
      .from('matriculas')
      .select('turma_id, aluno_id')
      .in('turma_id', turmaIds)
      .eq('status', 'ativa')

    const totalAlunosPorTurma = totalAlunos?.reduce((acc, matricula) => {
      acc[matricula.turma_id] = (acc[matricula.turma_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Processar dados das aulas ativas
    const agora = new Date()
    const aulasProcessadas = aulasAtivas.map(aula => {
      let tempoRestante = null
      let podeMarcarFrequencia = true

      if (aula.status === 'fechada' && aula.fechada_em && aula.tempo_limite_minutos) {
        const fechadaEm = new Date(aula.fechada_em)
        const seraTravadasEm = new Date(fechadaEm.getTime() + (aula.tempo_limite_minutos * 60 * 1000))
        const tempoRestanteMs = seraTravadasEm.getTime() - agora.getTime()

        if (tempoRestanteMs > 0) {
          const minutos = Math.floor(tempoRestanteMs / 60000)
          tempoRestante = `${minutos} minutos`
        } else {
          podeMarcarFrequencia = false
          tempoRestante = null
        }
      }

      return {
        aula_id: aula.id,
        turma: {
          id: aula.turmas.id,
          nome: aula.turmas.nome,
          ano: aula.turmas.ano,
          total_alunos: totalAlunosPorTurma[aula.turma_id] || 0
        },
        status: aula.status,
        aberta_em: aula.aberta_em,
        fechada_em: aula.fechada_em,
        tempo_restante: tempoRestante,
        pode_marcar_frequencia: podeMarcarFrequencia
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        aulas_ativas: aulasProcessadas
      }
    })

  } catch (error) {
    logger.error('Erro inesperado em /api/aulas/ativas:', { error: error })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}