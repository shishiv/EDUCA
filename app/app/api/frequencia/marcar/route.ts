import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const marcarFrequenciaSchema = z.object({
  // Support both legacy aula_id and enhanced sessao_id
  aula_id: z.string().uuid('ID da aula deve ser um UUID válido').optional(),
  sessao_id: z.string().uuid('ID da sessão deve ser um UUID válido').optional(),
  frequencias: z.array(z.object({
    aluno_id: z.string().uuid('ID do aluno deve ser um UUID válido'),
    presente: z.boolean(),
    observacoes: z.string().optional(),
  })).min(1, 'Deve haver pelo menos uma frequência para marcar')
}).refine(data => data.aula_id || data.sessao_id, {
  message: 'Deve fornecer aula_id ou sessao_id'
})

export async function POST(request: NextRequest) {
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

    // Validar dados de entrada
    const body = await request.json()
    const validation = marcarFrequenciaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: validation.error.format()
          },
          timestamp: new Date().toISOString()
        },
        { status: 422 }
      )
    }

    const { aula_id, sessao_id, frequencias } = validation.data
    const sessionId = sessao_id || aula_id // Prefer sessao_id, fallback to aula_id

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
            message: 'Apenas professores podem marcar frequência'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se a sessão existe e pertence ao professor
    // Try enhanced sessoes_aula first, fallback to legacy aulas_abertas
    let sessao: any = null
    let turmaId: string = ''
    let sessionStatus: string = ''
    let isClosed: boolean = false

    if (sessao_id) {
      // Enhanced system - use sessoes_aula
      const { data } = await supabase
        .from('sessoes_aula')
        .select(`
          id,
          status,
          professor_id,
          turma_id,
          escola_id,
          fechada_em,
          turmas!inner(escola_id)
        `)
        .eq('id', sessao_id)
        .single()

      sessao = data
      if (sessao) {
        turmaId = sessao.turma_id
        sessionStatus = sessao.status
        isClosed = sessao.status === 'FECHADA' || sessao.status === 'CANCELADA'
      }
    } else {
      // Legacy system - use aulas_abertas
      const { data } = await supabase
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
        .eq('id', aula_id!)
        .single()

      sessao = data
      if (sessao) {
        turmaId = sessao.turma_id
        sessionStatus = sessao.status
        isClosed = sessao.status === 'fechada' || sessao.status === 'travada'
      }
    }

    if (!sessao) {
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
    if (sessao.professor_id !== user.id || sessao.turmas.escola_id !== usuario.escola_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para marcar frequência nesta sessão'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se a sessão está fechada ou cancelada (enhanced) or travada (legacy)
    if (isClosed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_CLOSED',
            message: `Esta sessão está ${sessionStatus} e não permite marcação de frequência. "Não existe o esquecer" - compliance brasileiro.`,
            details: { status: sessionStatus }
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // For enhanced system, ensure session is ABERTA
    if (sessao_id && sessionStatus !== 'ABERTA') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_OPEN',
            message: `Sessão está ${sessionStatus}. Apenas sessões ABERTA permitem marcação de frequência.`,
            details: { status: sessionStatus }
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Legacy time limit check for aulas_abertas
    if (aula_id && sessionStatus === 'fechada' && sessao.fechada_em && sessao.tempo_limite_minutos) {
      const fechadaEm = new Date(sessao.fechada_em)
      const seraTravadasEm = new Date(fechadaEm.getTime() + (sessao.tempo_limite_minutos * 60 * 1000))
      const agora = new Date()

      if (agora >= seraTravadasEm) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SESSION_LOCKED',
              message: 'O tempo limite para alterações expirou. A sessão foi travada automaticamente.'
            },
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        )
      }
    }

    // Verificar se todos os alunos pertencem à turma
    const alunoIds = frequencias.map(f => f.aluno_id)
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('turma_id', turmaId)
      .eq('status', 'ativa')
      .in('aluno_id', alunoIds)

    const alunosMatriculados = new Set(matriculas?.map(m => m.aluno_id) || [])
    const alunosInvalidos = alunoIds.filter(id => !alunosMatriculados.has(id))

    if (alunosInvalidos.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Alguns alunos não estão matriculados nesta turma',
            details: { alunos_invalidos: alunosInvalidos }
          },
          timestamp: new Date().toISOString()
        },
        { status: 422 }
      )
    }

    // Usar stored procedure para marcar frequência em lote
    const { data: resultado, error: sqlError } = await supabase
      .rpc('marcar_frequencia_lote', {
        p_aula_id: sessionId!, // Works for both systems (migration handles FK update)
        p_professor_id: user.id,
        p_frequencias: frequencias.map(f => ({
          aluno_id: f.aluno_id,
          presente: f.presente,
          observacoes: f.observacoes || null
        }))
      })

    if (sqlError) {
      logger.error('Erro ao marcar frequência:', sqlError?.message || 'Unknown error', { metadata: { sessao_id, aula_id } })
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

    // Buscar estatísticas atualizadas
    // Check both aula_id and sessao_id for statistics
    const { data: estatisticas } = await supabase
      .from('frequencia')
      .select('presente')
      .or(`aula_id.eq.${sessionId},sessao_id.eq.${sessionId}`)

    const resumo = {
      presentes: 0,
      ausentes: 0,
      total: 0
    }

    if (estatisticas) {
      resumo.presentes = estatisticas.filter(f => f.presente === true).length
      resumo.ausentes = estatisticas.filter(f => f.presente === false).length
      resumo.total = estatisticas.length
    }

    return NextResponse.json({
      success: true,
      data: {
        processados: frequencias.length,
        sucessos: frequencias.length, // Assumindo sucesso total por simplificação
        erros: [],
        resumo
      }
    })

  } catch (error) {
    logger.error('Erro inesperado em /api/frequencia/marcar:', error instanceof Error ? error.message : String(error))
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