import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Type for matricula with aluno join
interface MatriculaWithAluno {
  aluno_id: string
  alunos: {
    id: string
    nome_completo: string
  } | null
}

// Type for frequencia record
interface FrequenciaRecord {
  matricula_id: string
  presente: boolean
  marcado_em: string | null
  observacoes: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ aula_id: string }> }
) {
  try {
    const cookieStore = await cookies()
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
    const { aula_id } = await params

    // Verificar autenticacao
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Autenticacao obrigatoria'
          },
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    // Verificar se o usuario e professor
    const { data: usuario } = await supabase
      .from('users')
      .select('tipo_usuario, escola_id')
      .eq('id', user.id)
      .single()

    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Apenas professores podem consultar frequencia'
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
        escola_id,
        fechada_em,
        tempo_limite_minutos
      `)
      .eq('id', aula_id)
      .single()

    if (!aula) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessao de aula nao encontrada'
          },
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Verificar permissoes - aula_abertas has escola_id directly
    if (aula.professor_id !== user.id || aula.escola_id !== usuario.escola_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Voce nao tem permissao para acessar esta sessao'
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
        id,
        aluno_id,
        alunos!inner(
          id,
          nome_completo
        )
      `)
      .eq('turma_id', aula.turma_id)
      .eq('situacao', 'ativa')

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

    // Type-safe matriculas
    const typedMatriculas = matriculas as unknown as MatriculaWithAluno[]
    const matriculaIds = typedMatriculas.map(m => m.aluno_id)

    // Buscar frequencias ja marcadas para esta aula - use matricula_id not aluno_id
    // frequencia table uses matricula_id, not aluno_id
    const matriculaIdList = matriculas.map(m => m.id)
    const { data: frequencias } = await supabase
      .from('frequencia')
      .select('matricula_id, presente, marcado_em, observacoes')
      .eq('aula_id', aula_id)
      .in('matricula_id', matriculaIdList)

    const frequenciasPorMatricula = new Map<string, FrequenciaRecord>(
      (frequencias || []).map(f => [f.matricula_id, f as FrequenciaRecord])
    )

    // Buscar estatisticas de frequencia geral dos alunos (ultimo mes)
    const umMesAtras = new Date()
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)

    const { data: estatisticasGerais } = await supabase
      .from('frequencia')
      .select('matricula_id, presente')
      .in('matricula_id', matriculaIdList)
      .gte('data_aula', umMesAtras.toISOString().split('T')[0])

    // Calcular estatisticas por matricula
    const estatisticasPorMatricula = new Map<string, { percentual_presenca: number; total_faltas_mes: number; em_risco: boolean }>()

    if (estatisticasGerais) {
      const estatisticasAgrupadas = estatisticasGerais.reduce((acc, freq) => {
        if (!acc[freq.matricula_id]) {
          acc[freq.matricula_id] = { total: 0, presencas: 0, faltas: 0 }
        }
        acc[freq.matricula_id].total++
        if (freq.presente) {
          acc[freq.matricula_id].presencas++
        } else {
          acc[freq.matricula_id].faltas++
        }
        return acc
      }, {} as Record<string, { total: number; presencas: number; faltas: number }>)

      Object.entries(estatisticasAgrupadas).forEach(([matriculaId, stats]) => {
        const percentualPresenca = stats.total > 0 ? Math.round((stats.presencas / stats.total) * 100) : 100
        estatisticasPorMatricula.set(matriculaId, {
          percentual_presenca: percentualPresenca,
          total_faltas_mes: stats.faltas,
          em_risco: percentualPresenca < 80
        })
      })
    }

    // Montar resposta com dados dos alunos
    const alunos = matriculas.map(matricula => {
      const frequencia = frequenciasPorMatricula.get(matricula.id)
      const estatisticas = estatisticasPorMatricula.get(matricula.id) || {
        percentual_presenca: 100,
        total_faltas_mes: 0,
        em_risco: false
      }

      // Type-safe access to alunos join
      const alunoData = matricula.alunos as unknown as { id: string; nome_completo: string } | null

      return {
        id: alunoData?.id || matricula.aluno_id,
        nome: alunoData?.nome_completo || 'Nome nao disponivel',
        numero_chamada: null, // alunos table doesn't have numero_chamada
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
    logger.error('Erro inesperado em /api/frequencia/sessao/[aula_id]:', error instanceof Error ? error.message : String(error))
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
