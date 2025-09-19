import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const abrirAulaSchema = z.object({
  turma_id: z.string().uuid('ID da turma deve ser um UUID válido'),
  disciplina: z.string().optional(),
  observacoes: z.string().optional(),
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
    const validation = abrirAulaSchema.safeParse(body)

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

    const { turma_id, disciplina, observacoes } = validation.data

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
            message: 'Apenas professores podem abrir aulas'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se o professor está atribuído à turma
    const { data: atribuicao } = await supabase
      .from('turmas')
      .select('id, nome, ano, escola_id')
      .eq('id', turma_id)
      .eq('professor_id', user.id)
      .eq('escola_id', usuario.escola_id)
      .single()

    if (!atribuicao) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Professor não está atribuído a esta turma'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se já existe uma aula aberta para esta turma hoje
    const hoje = new Date().toISOString().split('T')[0]
    const { data: aulaExistente } = await supabase
      .from('aulas_abertas')
      .select('id, status')
      .eq('turma_id', turma_id)
      .eq('professor_id', user.id)
      .gte('aberta_em', `${hoje}T00:00:00`)
      .lt('aberta_em', `${hoje}T23:59:59`)
      .eq('status', 'aberta')
      .single()

    if (aulaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_ALREADY_OPEN',
            message: 'Já existe uma aula aberta para esta turma hoje'
          },
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Chamar stored procedure para abrir a aula
    const { data: resultado, error: sqlError } = await supabase
      .rpc('abrir_aula', {
        p_turma_id: turma_id,
        p_professor_id: user.id,
        p_disciplina: disciplina,
        p_observacoes: observacoes
      })

    if (sqlError) {
      console.error('Erro ao abrir aula:', sqlError)
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

    // Buscar dados completos da aula criada
    const { data: aulaCompleta } = await supabase
      .from('aulas_abertas')
      .select(`
        id,
        turma_id,
        professor_id,
        status,
        aberta_em,
        disciplina,
        observacoes,
        turmas!inner(nome, ano, escola_id)
      `)
      .eq('id', resultado)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        aula_id: aulaCompleta.id,
        turma_id: aulaCompleta.turma_id,
        professor_id: aulaCompleta.professor_id,
        status: aulaCompleta.status,
        aberta_em: aulaCompleta.aberta_em,
        pode_marcar_frequencia: true,
        turma: {
          nome: aulaCompleta.turmas.nome,
          ano: aulaCompleta.turmas.ano
        }
      }
    })

  } catch (error) {
    console.error('Erro inesperado em /api/aulas/abrir:', error)
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