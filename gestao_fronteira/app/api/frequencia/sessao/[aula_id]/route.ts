import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { aula_id: string } }
) {
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
    const { aula_id } = params

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
            message: 'Apenas professores podem consultar frequência'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se a aula existe e pertence ao professor
    const { data: aula } = await supabase
      .from('aulas_abertas')
      .select(`
        id,
        status,
        professor_id,
        turma_id,
        fechada_em,
        tempo_limite_minutos,
        turmas!inner(escola_id)
      `)
      .eq('id', aula_id)
      .single()

    if (!aula) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessão de aula não encontrada'
          },
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Verificar permissões
    if (aula.professor_id !== user.id || aula.turmas.escola_id !== usuario.escola_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para acessar esta sessão'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Calcular se pode alterar e tempo restante
    const agora = new Date()
    let podeAlterar = true
    let tempoRestante = null

    if (aula.status === 'travada') {
      podeAlterar = false
    } else if (aula.status === 'fechada' && aula.fechada_em && aula.tempo_limite_minutos) {
      const fechadaEm = new Date(aula.fechada_em)
      const seraTravadasEm = new Date(fechadaEm.getTime() + (aula.tempo_limite_minutos * 60 * 1000))
      const tempoRestanteMs = seraTravadasEm.getTime() - agora.getTime()

      if (tempoRestanteMs > 0) {
        const minutos = Math.floor(tempoRestanteMs / 60000)
        tempoRestante = `${minutos} minutos`
      } else {
        podeAlterar = false
      }
    }

    // Buscar alunos matriculados na turma
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select(`
        aluno_id,
        alunos!inner(
          id,
          nome,
          numero_chamada
        )
      `)
      .eq('turma_id', aula.turma_id)
      .eq('status', 'ativa')
      .order('alunos.numero_chamada', { ascending: true })

    if (!matriculas) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Erro ao buscar alunos'
          },
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Buscar frequências já marcadas para esta aula
    const alunoIds = matriculas.map(m => m.aluno_id)
    const { data: frequencias } = await supabase
      .from('frequencia')
      .select('aluno_id, presente, marcado_em, observacoes')
      .eq('aula_id', aula_id)
      .in('aluno_id', alunoIds)

    const frequenciasPorAluno = new Map(
      frequencias?.map(f => [f.aluno_id, f]) || []
    )

    // Buscar estatísticas de frequência geral dos alunos (último mês)
    const umMesAtras = new Date()
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)

    const { data: estatisticasGerais } = await supabase
      .from('frequencia')
      .select('aluno_id, presente')
      .in('aluno_id', alunoIds)
      .gte('data', umMesAtras.toISOString().split('T')[0])

    // Calcular estatísticas por aluno
    const estatisticasPorAluno = new Map()

    if (estatisticasGerais) {
      const estatisticasAgrupadas = estatisticasGerais.reduce((acc, freq) => {
        if (!acc[freq.aluno_id]) {
          acc[freq.aluno_id] = { total: 0, presencas: 0, faltas: 0 }
        }
        acc[freq.aluno_id].total++
        if (freq.presente) {
          acc[freq.aluno_id].presencas++
        } else {
          acc[freq.aluno_id].faltas++
        }
        return acc
      }, {} as Record<string, { total: number; presencas: number; faltas: number }>)

      Object.entries(estatisticasAgrupadas).forEach(([alunoId, stats]) => {
        const percentualPresenca = stats.total > 0 ? Math.round((stats.presencas / stats.total) * 100) : 100
        estatisticasPorAluno.set(alunoId, {
          percentual_presenca: percentualPresenca,
          total_faltas_mes: stats.faltas,
          em_risco: percentualPresenca < 80
        })
      })
    }

    // Montar resposta com dados dos alunos
    const alunos = matriculas.map(matricula => {
      const frequencia = frequenciasPorAluno.get(matricula.aluno_id)
      const estatisticas = estatisticasPorAluno.get(matricula.aluno_id) || {
        percentual_presenca: 100,
        total_faltas_mes: 0,
        em_risco: false
      }

      return {
        id: matricula.alunos.id,
        nome: matricula.alunos.nome,
        numero_chamada: matricula.alunos.numero_chamada,
        frequencia: {
          presente: frequencia?.presente ?? null,
          marcado_em: frequencia?.marcado_em ?? null,
          observacoes: frequencia?.observacoes ?? null
        },
        estatisticas
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        aula_id: aula.id,
        pode_alterar: podeAlterar,
        tempo_restante: tempoRestante,
        alunos
      }
    })

  } catch (error) {
    console.error('Erro inesperado em /api/frequencia/sessao/[aula_id]:', error)
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