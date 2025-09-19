import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const fecharAulaSchema = z.object({
  aula_id: z.string().uuid('ID da aula deve ser um UUID válido'),
  observacoes_finais: z.string().optional(),
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
    const validation = fecharAulaSchema.safeParse(body)

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

    const { aula_id, observacoes_finais } = validation.data

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
            message: 'Apenas professores podem fechar aulas'
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
        aberta_em,
        fechada_em,
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
            message: 'Você não tem permissão para fechar esta aula'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Verificar se a aula já está fechada
    if (aula.status === 'fechada') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_ALREADY_CLOSED',
            message: 'Esta sessão de aula já foi fechada'
          },
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Verificar se a aula já está travada
    if (aula.status === 'travada') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_LOCKED',
            message: 'Esta sessão de aula está travada e não pode ser alterada'
          },
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Chamar stored procedure para fechar a aula
    const { data: resultado, error: sqlError } = await supabase
      .rpc('fechar_aula', {
        p_aula_id: aula_id,
        p_observacoes_finais: observacoes_finais
      })

    if (sqlError) {
      console.error('Erro ao fechar aula:', sqlError)
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

    // Buscar dados atualizados da aula
    const { data: aulaAtualizada } = await supabase
      .from('aulas_abertas')
      .select('id, status, fechada_em, tempo_limite_minutos')
      .eq('id', aula_id)
      .single()

    // Calcular quando será travada (fechada_em + tempo_limite_minutos)
    const fechadaEm = new Date(aulaAtualizada.fechada_em)
    const seraTravadasEm = new Date(fechadaEm.getTime() + (aulaAtualizada.tempo_limite_minutos * 60 * 1000))

    // Calcular tempo restante em formato amigável
    const agora = new Date()
    const tempoRestanteMs = seraTravadasEm.getTime() - agora.getTime()
    const tempoRestanteMinutos = Math.max(0, Math.floor(tempoRestanteMs / 60000))

    const podeAlterarAte = tempoRestanteMinutos > 0
      ? `${tempoRestanteMinutos} minutos`
      : 'Sessão será travada a qualquer momento'

    return NextResponse.json({
      success: true,
      data: {
        aula_id: aulaAtualizada.id,
        status: aulaAtualizada.status,
        fechada_em: aulaAtualizada.fechada_em,
        sera_travada_em: seraTravadasEm.toISOString(),
        pode_alterar_ate: podeAlterarAte
      }
    })

  } catch (error) {
    console.error('Erro inesperado em /api/aulas/fechar:', error)
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