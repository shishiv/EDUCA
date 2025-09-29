import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Enhanced Supabase client with proper SSR cookie handling
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Alternative: Mock client for development (comment out when using real Supabase)

/*
// Mock Supabase client for development
export const mockSupabase = {
  auth: {
    getUser: () => Promise.resolve({ 
      data: { 
        user: { 
          id: '550e8400-e29b-41d4-a716-446655440010',
          email: 'admin@fronteira.mg.gov.br'
        } 
      } 
    }),
    signInWithPassword: ({ email, password }: { email: string, password: string }) => {
      // Mock authentication - accept any of the test accounts
      const validAccounts = [
        'admin@fronteira.mg.gov.br',
        'maria.santos@fronteira.mg.gov.br'
      ]
      
      if (validAccounts.includes(email) && password === '123456') {
        return Promise.resolve({
          data: {
            user: { 
              id: '550e8400-e29b-41d4-a716-446655440010',
              email 
            }
          }
        })
      }
      
      return Promise.reject(new Error('Credenciais inválidas'))
    },
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: Function) => {
      // Mock auth state change
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: { 
            id: '550e8400-e29b-41d4-a716-446655440010',
            email: 'admin@fronteira.mg.gov.br'
          }
        })
      }, 100)
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => {
          if (table === 'users') {
            return Promise.resolve({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440010',
                email: 'admin@fronteira.mg.gov.br',
                nome: 'Administrador do Sistema',
                tipo_usuario: 'admin',
                escola_id: null,
                ativo: true
              }
            })
          }
          return Promise.resolve({ data: null })
        },
        order: (column: string) => Promise.resolve({ 
          data: getMockData(table),
          error: null 
        })
      }),
      order: (column: string) => Promise.resolve({ 
        data: getMockData(table),
        error: null 
      }),
      head: true
    }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null }) }) }),
    update: () => ({ eq: () => Promise.resolve({ data: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null }) })
  })
}

// Mock data for development
function getMockData(table: string) {
  switch (table) {
    case 'alunos':
      return [
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          nome_completo: 'Pedro Silva Santos',
          data_nascimento: '2020-03-15',
          cpf: null,
          sexo: 'M',
          telefone: '(34) 99999-0001',
          nome_mae: 'Ana Silva',
          nome_pai: 'José Santos',
          ativo: true,
          necessidades_especiais: null,
          responsaveis: { nome: 'José da Silva' },
          matriculas: [{
            situacao: 'ativa',
            turmas: {
              nome: 'Berçário A',
              escolas: { nome: 'CEMEI Pequenos Passos' }
            }
          }]
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440002',
          nome_completo: 'Julia Oliveira Costa',
          data_nascimento: '2019-07-22',
          cpf: null,
          sexo: 'F',
          telefone: '(34) 99999-0002',
          nome_mae: 'Maria Oliveira',
          nome_pai: 'João Costa',
          ativo: true,
          necessidades_especiais: null,
          responsaveis: { nome: 'Maria Oliveira' },
          matriculas: [{
            situacao: 'ativa',
            turmas: {
              nome: 'Pré I A',
              escolas: { nome: 'EMEI Jardim da Infância' }
            }
          }]
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440003',
          nome_completo: 'Lucas Santos Pereira',
          data_nascimento: '2015-11-08',
          cpf: '12345678904',
          sexo: 'M',
          telefone: '(34) 99999-0003',
          nome_mae: 'Carmen Santos',
          nome_pai: 'Carlos Pereira',
          ativo: true,
          necessidades_especiais: 'Dislexia',
          responsaveis: { nome: 'Carlos Santos' },
          matriculas: [{
            situacao: 'ativa',
            turmas: {
              nome: '5º Ano A',
              escolas: { nome: 'EMEF Professor João Silva' }
            }
          }]
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440004',
          nome_completo: 'Ana Carolina Ferreira',
          data_nascimento: '2018-05-12',
          cpf: null,
          sexo: 'F',
          telefone: '(34) 99999-0004',
          nome_mae: 'Lucia Ferreira',
          nome_pai: 'Roberto Ferreira',
          ativo: true,
          necessidades_especiais: null,
          responsaveis: { nome: 'Lucia Ferreira' },
          matriculas: []
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440005',
          nome_completo: 'Gabriel Souza Lima',
          data_nascimento: '2016-09-30',
          cpf: '12345678905',
          sexo: 'M',
          telefone: '(34) 99999-0005',
          nome_mae: 'Patricia Souza',
          nome_pai: 'Fernando Lima',
          ativo: false,
          necessidades_especiais: null,
          responsaveis: { nome: 'Patricia Souza' },
          matriculas: []
        }
      ]
    
    case 'escolas':
      return [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          nome: 'CEMEI Pequenos Passos',
          codigo: 'FRT001',
          endereco: 'Rua das Flores, 123 - Centro',
          telefone: '(34) 3555-0001',
          tipo: 'creche',
          ativo: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          nome: 'EMEI Jardim da Infância',
          codigo: 'FRT002',
          endereco: 'Av. Educação, 456 - Vila Nova',
          telefone: '(34) 3555-0002',
          tipo: 'pre_escola',
          ativo: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          nome: 'EMEF Professor João Silva',
          codigo: 'FRT003',
          endereco: 'Praça da Escola, 789 - São José',
          telefone: '(34) 3555-0003',
          tipo: 'fundamental',
          ativo: true
        }
      ]
    
    default:
      return []
  }
}

*/

// Tipos para as tabelas principais
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Server-side Supabase client for API routes
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  )
}

// Aliases para facilitar o uso
export type User = Tables<'users'>
export type Escola = Tables<'escolas'>
export type Aluno = Tables<'alunos'>
export type Responsavel = Tables<'responsaveis'>
export type Turma = Tables<'turmas'>
export type Matricula = Tables<'matriculas'>
export type Frequencia = Tables<'frequencia'>
export type Nota = Tables<'notas'>