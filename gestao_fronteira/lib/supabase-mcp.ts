// Temporary MCP Supabase integration for demo purposes
// This bridges the gap between the demo keys and real MCP functionality

export interface Session {
  id: string
  turma_id: string
  professor_id: string
  disciplina_id?: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  criada_em: string
  aberta_em?: string
  fechada_em?: string
  cancelada_em?: string
  conteudo_ministrado?: string
  observacoes_fechamento?: string
  hash_legal?: string
  tempo_total_aula?: string
  auto_fechamento_agendado: string
  turmas: {
    id: string
    nome: string
    ano_letivo: string
  }
  disciplinas?: {
    id: string
    nome: string
    codigo: string
  }
}

export interface Student {
  id: string
  nome_completo: string
  matricula_id: string
  situacao: string
}

export interface AttendanceRecord {
  id: string
  matricula_id: string
  presente: boolean
  data_aula: string
  status_presenca: 'presente' | 'falta' | 'justificada' | 'atestado_medico'
}

// Real data that we know exists in the database
const REAL_DATA = {
  turma_id: '33333333-3333-3333-3333-333333333333',
  professor_id: '22222222-2222-2222-2222-222222222222',
  escola_id: '11111111-1111-1111-1111-111111111111',
  disciplina_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  session_id: '4a50d1e3-4265-4101-b553-fed8a6cd2156',
  students: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      nome_completo: 'João Silva Santos',
      matricula_id: '99999999-1111-1111-1111-111111111111',
      situacao: 'ativa'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      nome_completo: 'Maria Oliveira Costa',
      matricula_id: '99999999-2222-2222-2222-222222222222',
      situacao: 'ativa'
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      nome_completo: 'Pedro Ferreira Lima',
      matricula_id: '99999999-3333-3333-3333-333333333333',
      situacao: 'ativa'
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      nome_completo: 'Ana Carolina Souza',
      matricula_id: '99999999-4444-4444-4444-444444444444',
      situacao: 'ativa'
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      nome_completo: 'Lucas Pereira Dias',
      matricula_id: '99999999-5555-5555-5555-555555555555',
      situacao: 'ativa'
    }
  ]
}

// Mock client that simulates real Supabase operations
export const mcpSupabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        maybeSingle: async () => {
          if (table === 'sessoes_aula' && column === 'turma_id' && value === REAL_DATA.turma_id) {
            return {
              data: {
                id: REAL_DATA.session_id,
                turma_id: REAL_DATA.turma_id,
                professor_id: REAL_DATA.professor_id,
                disciplina_id: REAL_DATA.disciplina_id,
                data_aula: '2025-09-29',
                status: 'PLANEJADA',
                criada_em: new Date().toISOString(),
                aberta_em: null,
                fechada_em: null,
                cancelada_em: null,
                conteudo_ministrado: null,
                observacoes_fechamento: null,
                hash_legal: null,
                tempo_total_aula: null,
                auto_fechamento_agendado: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                turmas: {
                  id: REAL_DATA.turma_id,
                  nome: '5º Ano A',
                  ano_letivo: '2025'
                },
                disciplinas: {
                  id: REAL_DATA.disciplina_id,
                  nome: 'Matemática',
                  codigo: 'MAT-5A'
                }
              },
              error: null
            }
          }
          return { data: null, error: null }
        },
        single: async () => {
          if (table === 'disciplinas') {
            return {
              data: {
                id: REAL_DATA.disciplina_id
              },
              error: null
            }
          }
          return { data: null, error: null }
        }
      }),
      limit: (num: number) => ({
        single: async () => {
          if (table === 'disciplinas') {
            return {
              data: {
                id: REAL_DATA.disciplina_id
              },
              error: null
            }
          }
          return { data: null, error: null }
        }
      })
    }),
    insert: (data: any) => ({
      select: (columns?: string) => ({
        single: async () => {
          if (table === 'sessoes_aula') {
            return {
              data: {
                id: `new-session-${Date.now()}`,
                ...data,
                criada_em: new Date().toISOString(),
                turmas: {
                  id: data.turma_id,
                  nome: '5º Ano A',
                  ano_letivo: '2025'
                },
                disciplinas: {
                  id: data.disciplina_id,
                  nome: 'Matemática',
                  codigo: 'MAT-5A'
                }
              },
              error: null
            }
          }
          return { data: null, error: null }
        }
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: (columns?: string) => ({
          single: async () => {
            if (table === 'sessoes_aula') {
              return {
                data: {
                  id: value,
                  turma_id: REAL_DATA.turma_id,
                  professor_id: REAL_DATA.professor_id,
                  disciplina_id: REAL_DATA.disciplina_id,
                  data_aula: '2025-09-29',
                  ...data,
                  turmas: {
                    id: REAL_DATA.turma_id,
                    nome: '5º Ano A',
                    ano_letivo: '2025'
                  },
                  disciplinas: {
                    id: REAL_DATA.disciplina_id,
                    nome: 'Matemática',
                    codigo: 'MAT-5A'
                  }
                },
                error: null
              }
            }
            return { data: null, error: null }
          }
        })
      })
    })
  })
}

// Mock function to get students for the real turma
export const getStudentsForTurma = async (turmaId: string): Promise<Student[]> => {
  if (turmaId === REAL_DATA.turma_id) {
    return REAL_DATA.students
  }
  return []
}

// Mock function to get attendance records
export const getAttendanceForSession = async (sessionId: string): Promise<AttendanceRecord[]> => {
  // Return empty for demo - no attendance marked yet
  return []
}