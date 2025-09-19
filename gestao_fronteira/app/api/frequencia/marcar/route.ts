import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const marcarFrequenciaSchema = z.object({
  aula_id: z.string().uuid('ID da aula deve ser um UUID válido'),
  frequencias: z.array(z.object({
    aluno_id: z.string().uuid('ID do aluno deve ser um UUID válido'),
    presente: z.boolean(),
    observacoes: z.string().optional(),
  })).min(1, 'Deve haver pelo menos uma frequência para marcar')
})

export async function POST(request: NextRequest) {
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

    const { aula_id, frequencias } = validation.data

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
            message: 'Você não tem permissão para marcar frequência nesta sessão'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se a sessão está travada
    if (aula.status === 'travada') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_LOCKED',
            message: 'Esta sessão está travada e não pode ser alterada'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar tempo limite se a sessão está fechada
    if (aula.status === 'fechada' && aula.fechada_em && aula.tempo_limite_minutos) {
      const fechadaEm = new Date(aula.fechada_em)
      const seraTravadasEm = new Date(fechadaEm.getTime() + (aula.tempo_limite_minutos * 60 * 1000))
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
      .eq('turma_id', aula.turma_id)
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
        p_aula_id: aula_id,
        p_professor_id: user.id,
        p_frequencias: frequencias.map(f => ({
          aluno_id: f.aluno_id,
          presente: f.presente,
          observacoes: f.observacoes || null
        }))
      })

    if (sqlError) {
      console.error('Erro ao marcar frequência:', sqlError)
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
    const { data: estatisticas } = await supabase
      .from('frequencia')
      .select('presente')
      .eq('aula_id', aula_id)

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
    console.error('Erro inesperado em /api/frequencia/marcar:', error)
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