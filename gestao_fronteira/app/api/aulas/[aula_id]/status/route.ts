import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ aula_id: string }> }
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
    const { aula_id } = await params

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
            message: 'Apenas professores podem consultar status de aulas'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Buscar dados completos da aula
    const { data: aula, error: aulaError } = await supabase
      .from('aulas_abertas')
      .select(`
        id,
        turma_id,
        professor_id,
        status,
        aberta_em,
        fechada_em,
        travada_em,
        tempo_limite_minutos,
        disciplina,
        observacoes,
        observacoes_finais,
        turmas!inner(
          id,
          nome,
          ano,
          escola_id
        ),
        users!inner(
          id,
          name
        )
      `)
      .eq('id', aula_id)
      .single()

    if (aulaError || !aula) {
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

    // Buscar estatísticas de frequência para esta aula
    const { data: frequencias } = await supabase
      .from('frequencia')
      .select('presente')
      .eq('aula_id', aula_id)

    const estatisticas = {
      total_alunos: 0,
      presencas_marcadas: 0,
      faltas_marcadas: 0,
      nao_marcados: 0
    }

    if (frequencias) {
      estatisticas.presencas_marcadas = frequencias.filter(f => f.presente === true).length
      estatisticas.faltas_marcadas = frequencias.filter(f => f.presente === false).length
      estatisticas.total_alunos = frequencias.length
      estatisticas.nao_marcados = 0 // Assumindo que se está na frequencia, foi marcado
    }

    // Buscar total de alunos matriculados na turma
    const { data: totalMatriculas } = await supabase
      .from('matriculas')
      .select('id')
      .eq('turma_id', aula.turma_id)
      .eq('status', 'ativa')

    if (totalMatriculas) {
      estatisticas.total_alunos = totalMatriculas.length
      estatisticas.nao_marcados = Math.max(0, estatisticas.total_alunos - (estatisticas.presencas_marcadas + estatisticas.faltas_marcadas))
    }

    // Calcular configurações de tempo limite
    const agora = new Date()
    let podeAlterar = true

    if (aula.status === 'fechada' && aula.fechada_em && aula.tempo_limite_minutos) {
      const fechadaEm = new Date(aula.fechada_em)
      const seraTravadasEm = new Date(fechadaEm.getTime() + (aula.tempo_limite_minutos * 60 * 1000))
      podeAlterar = agora < seraTravadasEm
    } else if (aula.status === 'travada') {
      podeAlterar = false
    }

    return NextResponse.json({
      success: true,
      data: {
        aula_id: aula.id,
        turma: {
          id: aula.turmas.id,
          nome: aula.turmas.nome,
          ano: aula.turmas.ano
        },
        status: aula.status,
        aberta_em: aula.aberta_em,
        fechada_em: aula.fechada_em,
        travada_em: aula.travada_em,
        professor: {
          id: aula.users.id,
          nome: aula.users.name
        },
        configuracao: {
          tempo_limite_minutos: aula.tempo_limite_minutos,
          pode_alterar: podeAlterar
        },
        estatisticas,
        disciplina: aula.disciplina,
        observacoes: aula.observacoes,
        observacoes_finais: aula.observacoes_finais
      }
    })

  } catch (error) {
    console.error('Erro inesperado em /api/aulas/[aula_id]/status:', error)
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