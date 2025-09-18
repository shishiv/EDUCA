export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alunos: {
        Row: {
          id: string
          nome_completo: string
          data_nascimento: string
          cpf: string | null
          rg: string | null
          sexo: string
          endereco: string | null
          telefone: string | null
          email: string | null
          nome_mae: string | null
          nome_pai: string | null
          responsavel_id: string | null
          necessidades_especiais: string | null
          ativo: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          nome_completo: string
          data_nascimento: string
          cpf?: string | null
          rg?: string | null
          sexo: string
          endereco?: string | null
          telefone?: string | null
          email?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          necessidades_especiais?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          nome_completo?: string
          data_nascimento?: string
          cpf?: string | null
          rg?: string | null
          sexo?: string
          endereco?: string | null
          telefone?: string | null
          email?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          necessidades_especiais?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
      }
      escolas: {
        Row: {
          id: string
          nome: string
          codigo: string
          endereco: string | null
          telefone: string | null
          tipo: string
          diretor_id: string | null
          ativo: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          codigo: string
          endereco?: string | null
          telefone?: string | null
          tipo: string
          diretor_id?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          codigo?: string
          endereco?: string | null
          telefone?: string | null
          tipo?: string
          diretor_id?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string | null
          nome: string
          tipo_usuario: string
          escola_id: string | null
          ativo: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          nome: string
          tipo_usuario: string
          escola_id?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          nome?: string
          tipo_usuario?: string
          escola_id?: string | null
          ativo?: boolean | null
          created_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_values: Json | null
          new_values: Json | null
          timestamp: string
          ip_address: string | null
          user_agent: string | null
          escola_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_values?: Json | null
          new_values?: Json | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          escola_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string
          old_values?: Json | null
          new_values?: Json | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          escola_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']