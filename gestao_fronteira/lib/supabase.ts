import { createBrowserClient, createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Enhanced Supabase client with proper SSR cookie handling
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos para as tabelas principais
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// NOTA: Para clientes server-side, use:
// - lib/supabase/server.ts createClient() para Server Components e Server Actions
// - lib/supabase/server.ts createAdminClient() para operações admin (bypass RLS)
// NUNCA crie clientes server-side diretamente neste arquivo!

// Aliases para facilitar o uso
export type User = Tables<'users'>
export type Escola = Tables<'escolas'>
export type Aluno = Tables<'alunos'>
export type Responsavel = Tables<'responsaveis'>
export type Turma = Tables<'turmas'>
export type Matricula = Tables<'matriculas'>
export type Frequencia = Tables<'frequencia'>
export type Nota = Tables<'notas'>
