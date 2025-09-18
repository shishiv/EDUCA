export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string
          email: string | null
          endereco: string | null
          id: string
          necessidades_especiais: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          responsavel_id: string | null
          rg: string | null
          sexo: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento: string
          email?: string | null
          endereco?: string | null
          id?: string
          necessidades_especiais?: string | null
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          rg?: string | null
          sexo: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string
          email?: string | null
          endereco?: string | null
          id?: string
          necessidades_especiais?: string | null
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          rg?: string | null
          sexo?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      escolas: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          diretor_id: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_escolas_diretor"
            columns: ["diretor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      frequencia: {
        Row: {
          created_at: string | null
          data_aula: string
          id: string
          justificativa: string | null
          matricula_id: string
          presente: boolean
        }
        Insert: {
          created_at?: string | null
          data_aula: string
          id?: string
          justificativa?: string | null
          matricula_id: string
          presente?: boolean
        }
        Update: {
          created_at?: string | null
          data_aula?: string
          id?: string
          justificativa?: string | null
          matricula_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          ano_letivo: number
          created_at: string | null
          data_matricula: string
          id: string
          observacoes: string | null
          situacao: string
          turma_id: string
        }
        Insert: {
          aluno_id: string
          ano_letivo: number
          created_at?: string | null
          data_matricula?: string
          id?: string
          observacoes?: string | null
          situacao?: string
          turma_id: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          created_at?: string | null
          data_matricula?: string
          id?: string
          observacoes?: string | null
          situacao?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          bimestre: number
          created_at: string | null
          data_avaliacao: string
          disciplina: string
          id: string
          matricula_id: string
          nota: number
          observacoes: string | null
          tipo_avaliacao: string
        }
        Insert: {
          bimestre: number
          created_at?: string | null
          data_avaliacao: string
          disciplina: string
          id?: string
          matricula_id: string
          nota: number
          observacoes?: string | null
          tipo_avaliacao: string
        }
        Update: {
          bimestre?: number
          created_at?: string | null
          data_avaliacao?: string
          disciplina?: string
          id?: string
          matricula_id?: string
          nota?: number
          observacoes?: string | null
          tipo_avaliacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          cpf: string
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          parentesco: string
          profissao: string | null
          telefone: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          parentesco: string
          profissao?: string | null
          telefone?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          parentesco?: string
          profissao?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          capacidade: number
          created_at: string | null
          escola_id: string
          id: string
          nome: string
          professor_id: string | null
          serie: string
          turno: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          capacidade?: number
          created_at?: string | null
          escola_id: string
          id?: string
          nome: string
          professor_id?: string | null
          serie: string
          turno: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          capacidade?: number
          created_at?: string | null
          escola_id?: string
          id?: string
          nome?: string
          professor_id?: string | null
          serie?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          escola_id: string | null
          id: string
          nome: string
          tipo_usuario: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          tipo_usuario: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          tipo_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_escola"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const