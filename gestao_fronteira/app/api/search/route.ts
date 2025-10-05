import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { fuzzySearchStudent, fuzzySearchBrazilianName, similarityScore } from '@/lib/utils/fuzzy-search'

export interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'school' | 'class'
  data: any
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: Date
  status: string
}

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get user profile for RLS filtering
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tipo_usuario, escola_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const type = searchParams.get('type') as 'student' | 'teacher' | 'school' | 'class' | 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const fuzzy = searchParams.get('fuzzy') === 'true' // Enable fuzzy search

    // Advanced filters
    const statusFilter = searchParams.get('status') // 'active' | 'inactive'
    const escolaFilter = searchParams.get('escola_id')
    const dateFromFilter = searchParams.get('date_from')
    const dateToFilter = searchParams.get('date_to')
    const serieFilter = searchParams.get('serie')
    const turnoFilter = searchParams.get('turno')

    const results: SearchResult[] = []

    // Search students if type is 'student' or 'all'
    if (!type || type === 'all' || type === 'student') {
      let studentQuery = supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          cpf,
          data_nascimento,
          telefone_contato,
          endereco_rua,
          endereco_bairro,
          ativo,
          created_at,
          matriculas(
            turma:turmas(
              nome,
              serie,
              turno,
              escola:escolas(id, nome)
            )
          )
        `)
        .or(`nome_completo.ilike.%${query}%,cpf.ilike.%${query}%`)

      // Apply status filter
      if (statusFilter) {
        studentQuery = studentQuery.eq('ativo', statusFilter === 'active')
      } else {
        studentQuery = studentQuery.eq('ativo', true)
      }

      // Apply date range filter
      if (dateFromFilter) {
        studentQuery = studentQuery.gte('created_at', dateFromFilter)
      }
      if (dateToFilter) {
        studentQuery = studentQuery.lte('created_at', dateToFilter)
      }

      const { data: students } = await studentQuery
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (students) {
        students.forEach((student: any) => {
          const matricula = student.matriculas?.[0]
          results.push({
            id: student.id,
            type: 'student',
            data: {
              nome_completo: student.nome_completo,
              cpf: student.cpf || 'Não informado',
              data_nascimento: student.data_nascimento,
              serie_ano: matricula?.turma?.serie || 'Sem matrícula',
              turno: matricula?.turma?.turno || '',
              escola: matricula?.turma?.escola?.nome || 'Sem escola',
              telefone: student.telefone_contato || 'Não informado',
              endereco: student.endereco_rua || 'Não informado',
              bairro: student.endereco_bairro || 'Não informado'
            },
            relevanceScore: calculateRelevance(query, [student.nome_completo, student.cpf]),
            matchedFields: getMatchedFields(query, student),
            lastUpdated: new Date(student.created_at),
            status: student.ativo ? 'active' : 'inactive'
          })
        })
      }
    }

    // Search teachers if type is 'teacher' or 'all'
    if (!type || type === 'all' || type === 'teacher') {
      const { data: teachers } = await supabase
        .from('users')
        .select(`
          id,
          nome_completo,
          email,
          telefone,
          cpf,
          ativo,
          created_at,
          escola:escolas(nome)
        `)
        .eq('tipo_usuario', 'professor')
        .or(`nome_completo.ilike.%${query}%,email.ilike.%${query}%,cpf.ilike.%${query}%`)
        .eq('ativo', true)
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (teachers) {
        teachers.forEach((teacher: any) => {
          results.push({
            id: teacher.id,
            type: 'teacher',
            data: {
              nome_completo: teacher.nome_completo,
              cpf: teacher.cpf || 'Não informado',
              email: teacher.email,
              escola: teacher.escola?.nome || 'Sem escola',
              telefone: teacher.telefone || 'Não informado'
            },
            relevanceScore: calculateRelevance(query, [teacher.nome_completo, teacher.email]),
            matchedFields: getMatchedFields(query, teacher),
            lastUpdated: new Date(teacher.created_at),
            status: teacher.ativo ? 'active' : 'inactive'
          })
        })
      }
    }

    // Search schools if type is 'school' or 'all'
    if (!type || type === 'all' || type === 'school') {
      const { data: schools } = await supabase
        .from('escolas')
        .select(`
          id,
          nome,
          codigo_inep,
          endereco,
          telefone,
          ativo,
          created_at
        `)
        .or(`nome.ilike.%${query}%,codigo_inep.ilike.%${query}%`)
        .eq('ativo', true)
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (schools) {
        schools.forEach((school: any) => {
          results.push({
            id: school.id,
            type: 'school',
            data: {
              nome: school.nome,
              codigo_inep: school.codigo_inep || 'Não informado',
              endereco: school.endereco || 'Não informado',
              telefone: school.telefone || 'Não informado'
            },
            relevanceScore: calculateRelevance(query, [school.nome, school.codigo_inep]),
            matchedFields: getMatchedFields(query, school),
            lastUpdated: new Date(school.created_at),
            status: school.ativo ? 'active' : 'inactive'
          })
        })
      }
    }

    // Search classes if type is 'class' or 'all'
    if (!type || type === 'all' || type === 'class') {
      const { data: classes } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          turno,
          ano_letivo,
          capacidade,
          created_at,
          escola:escolas(nome),
          professor:users!professor_id(nome_completo)
        `)
        .or(`nome.ilike.%${query}%,serie.ilike.%${query}%`)
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (classes) {
        classes.forEach((turma: any) => {
          results.push({
            id: turma.id,
            type: 'class',
            data: {
              nome: turma.nome,
              serie: turma.serie || 'Não informado',
              turno: turma.turno,
              ano_letivo: turma.ano_letivo,
              capacidade: turma.capacidade || 0,
              escola: turma.escola?.nome || 'Sem escola',
              professor: turma.professor?.nome_completo || 'Sem professor'
            },
            relevanceScore: calculateRelevance(query, [turma.nome, turma.serie]),
            matchedFields: getMatchedFields(query, turma),
            lastUpdated: new Date(turma.created_at),
            status: 'active'
          })
        })
      }
    }

    // Apply fuzzy search post-processing if enabled
    if (fuzzy && query.length >= 2) {
      // Enhance relevance scores with fuzzy matching
      results.forEach(result => {
        if (result.type === 'student' && result.data.nome_completo) {
          // Use fuzzy name matching for students
          if (fuzzySearchBrazilianName(query, result.data.nome_completo)) {
            const fuzzyScore = similarityScore(query, result.data.nome_completo)
            // Boost score if fuzzy match is strong
            result.relevanceScore = Math.max(result.relevanceScore, fuzzyScore * 0.95)
          }
        } else if (result.type === 'teacher' && result.data.nome_completo) {
          // Use fuzzy name matching for teachers
          if (fuzzySearchBrazilianName(query, result.data.nome_completo)) {
            const fuzzyScore = similarityScore(query, result.data.nome_completo)
            result.relevanceScore = Math.max(result.relevanceScore, fuzzyScore * 0.95)
          }
        }
      })
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({
      success: true,
      results,
      totalCount: results.length,
      query,
      type: type || 'all',
      fuzzySearch: fuzzy
    })

  } catch (error) {
    logger.error('Error in search API', { error })
    return NextResponse.json(
      { error: 'Erro ao realizar busca' },
      { status: 500 }
    )
  }
}

// Calculate relevance score based on query match
function calculateRelevance(query: string, fields: (string | null)[]): number {
  if (!query) return 0.5

  const lowerQuery = query.toLowerCase()
  let score = 0

  fields.forEach(field => {
    if (!field) return

    const lowerField = field.toLowerCase()

    // Exact match
    if (lowerField === lowerQuery) {
      score = Math.max(score, 1.0)
    }
    // Starts with query
    else if (lowerField.startsWith(lowerQuery)) {
      score = Math.max(score, 0.9)
    }
    // Contains query
    else if (lowerField.includes(lowerQuery)) {
      score = Math.max(score, 0.7)
    }
  })

  return score || 0.3 // Default low score if no match
}

// Get list of matched fields
function getMatchedFields(query: string, record: any): string[] {
  if (!query) return []

  const lowerQuery = query.toLowerCase()
  const matched: string[] = []

  Object.entries(record).forEach(([key, value]) => {
    if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
      matched.push(key)
    }
  })

  return matched
}
