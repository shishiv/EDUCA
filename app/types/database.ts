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
      Permission: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      Role: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      RolePermission: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "RolePermission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "Permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RolePermission_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
        ]
      }
      School: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "School"
            referencedColumns: ["id"]
          },
        ]
      }
      UserRole: {
        Row: {
          role_id: string
          user_id: string
        }
        Insert: {
          role_id: string
          user_id: string
        }
        Update: {
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserRole_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UserRole_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      aluno_responsaveis: {
        Row: {
          aluno_id: string
          ativo: boolean
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          documento_autorizacao: string | null
          id: string
          pode_autorizar_saida: boolean
          pode_receber_comunicados: boolean
          prioridade: number
          responsavel_id: string
          tipo_responsabilidade: string
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          ativo?: boolean
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          documento_autorizacao?: string | null
          id?: string
          pode_autorizar_saida?: boolean
          pode_receber_comunicados?: boolean
          prioridade?: number
          responsavel_id: string
          tipo_responsabilidade: string
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          ativo?: boolean
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          documento_autorizacao?: string | null
          id?: string
          pode_autorizar_saida?: boolean
          pode_receber_comunicados?: boolean
          prioridade?: number
          responsavel_id?: string
          tipo_responsabilidade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aluno_responsaveis_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_responsaveis_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aluno_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          ativo: boolean | null
          bolsa_familia: boolean | null
          cor_raca: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string
          email: string | null
          endereco: string | null
          id: string
          necessidades_especiais: string | null
          nis: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          responsavel_id: string | null
          rg: string | null
          sexo: string
          telefone: string | null
          tipo_deficiencia: string[] | null
          transporte_escolar: boolean | null
          zona_residencial: string | null
        }
        Insert: {
          ativo?: boolean | null
          bolsa_familia?: boolean | null
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento: string
          email?: string | null
          endereco?: string | null
          id?: string
          necessidades_especiais?: string | null
          nis?: string | null
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          rg?: string | null
          sexo: string
          telefone?: string | null
          tipo_deficiencia?: string[] | null
          transporte_escolar?: boolean | null
          zona_residencial?: string | null
        }
        Update: {
          ativo?: boolean | null
          bolsa_familia?: boolean | null
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string
          email?: string | null
          endereco?: string | null
          id?: string
          necessidades_especiais?: string | null
          nis?: string | null
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_id?: string | null
          rg?: string | null
          sexo?: string
          telefone?: string | null
          tipo_deficiencia?: string[] | null
          transporte_escolar?: boolean | null
          zona_residencial?: string | null
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          escola_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          escola_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          escola_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_escola_id"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_sessoes_aula: {
        Row: {
          acao: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          hash_verificacao: string
          id: string
          ip_usuario: unknown
          sessao_id: string
          timestamp_acao: string | null
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          acao: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          hash_verificacao: string
          id?: string
          ip_usuario?: unknown
          sessao_id: string
          timestamp_acao?: string | null
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          acao?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          hash_verificacao?: string
          id?: string
          ip_usuario?: unknown
          sessao_id?: string
          timestamp_acao?: string | null
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_sessoes_aula_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_aula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_sessoes_aula_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          campos_alterados: string[] | null
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          documento_legal: string | null
          escola_id: string | null
          id: string
          ip_address: unknown
          justificativa: string | null
          nivel_criticidade: string
          operacao: string
          registro_id: string
          sessao_id: string | null
          tabela: string
          timestamp_operacao: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          campos_alterados?: string[] | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          documento_legal?: string | null
          escola_id?: string | null
          id?: string
          ip_address?: unknown
          justificativa?: string | null
          nivel_criticidade?: string
          operacao: string
          registro_id: string
          sessao_id?: string | null
          tabela: string
          timestamp_operacao?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          campos_alterados?: string[] | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          documento_legal?: string | null
          escola_id?: string | null
          id?: string
          ip_address?: unknown
          justificativa?: string | null
          nivel_criticidade?: string
          operacao?: string
          registro_id?: string
          sessao_id?: string | null
          tabela?: string
          timestamp_operacao?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas_abertas: {
        Row: {
          aberta_em: string
          created_at: string
          data_aula: string
          disciplina: string | null
          escola_id: string
          fechada_em: string | null
          id: string
          observacoes_abertura: string | null
          observacoes_fechamento: string | null
          professor_id: string
          status: string
          tempo_limite_minutos: number
          travada_em: string | null
          turma_id: string
          updated_at: string
        }
        Insert: {
          aberta_em?: string
          created_at?: string
          data_aula?: string
          disciplina?: string | null
          escola_id: string
          fechada_em?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          professor_id: string
          status?: string
          tempo_limite_minutos?: number
          travada_em?: string | null
          turma_id: string
          updated_at?: string
        }
        Update: {
          aberta_em?: string
          created_at?: string
          data_aula?: string
          disciplina?: string | null
          escola_id?: string
          fechada_em?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          professor_id?: string
          status?: string
          tempo_limite_minutos?: number
          travada_em?: string | null
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_abertas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_abertas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_abertas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_escolar: {
        Row: {
          afeta_frequencia: boolean | null
          ano_letivo: number
          cor: string | null
          created_at: string | null
          criado_por: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          escola_id: string
          id: string
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          afeta_frequencia?: boolean | null
          ano_letivo?: number
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          escola_id: string
          id?: string
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          afeta_frequencia?: boolean | null
          ano_letivo?: number
          cor?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          escola_id?: string
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendario_escolar_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendario_escolar_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_inep: {
        Row: {
          codigo_inep: string
          created_at: string | null
          data_validacao: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          observacoes: string | null
          situacao: string
          updated_at: string | null
          validado_por: string | null
        }
        Insert: {
          codigo_inep: string
          created_at?: string | null
          data_validacao?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string | null
          validado_por?: string | null
        }
        Update: {
          codigo_inep?: string
          created_at?: string | null
          data_validacao?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codigos_inep_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      configs: {
        Row: {
          ativo: boolean | null
          categoria: string
          chave: string
          created_at: string | null
          criado_por: string | null
          descricao: string
          escola_id: string | null
          id: string
          tipo_valor: string
          updated_at: string | null
          valor: string
          valor_padrao: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          chave: string
          created_at?: string | null
          criado_por?: string | null
          descricao: string
          escola_id?: string | null
          id?: string
          tipo_valor?: string
          updated_at?: string | null
          valor: string
          valor_padrao?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          chave?: string
          created_at?: string | null
          criado_por?: string | null
          descricao?: string
          escola_id?: string | null
          id?: string
          tipo_valor?: string
          updated_at?: string | null
          valor?: string
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configs_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          ativa: boolean | null
          codigo: string
          created_at: string | null
          escola_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean | null
          codigo: string
          created_at?: string | null
          escola_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean | null
          codigo?: string
          created_at?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      educacenso_exports: {
        Row: {
          ano_referencia: number
          arquivo_gerado: string | null
          created_at: string | null
          data_envio: string | null
          data_geracao: string | null
          escola_id: string
          hash_arquivo: string | null
          id: string
          observacoes: string | null
          status_export: string
          tipo_export: string
          updated_at: string | null
        }
        Insert: {
          ano_referencia: number
          arquivo_gerado?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_geracao?: string | null
          escola_id: string
          hash_arquivo?: string | null
          id?: string
          observacoes?: string | null
          status_export?: string
          tipo_export: string
          updated_at?: string | null
        }
        Update: {
          ano_referencia?: number
          arquivo_gerado?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_geracao?: string | null
          escola_id?: string
          hash_arquivo?: string | null
          id?: string
          observacoes?: string | null
          status_export?: string
          tipo_export?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "educacenso_exports_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_feature_flags: {
        Row: {
          enabled: boolean | null
          escola_id: string
          flag_id: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean | null
          escola_id: string
          flag_id: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean | null
          escola_id?: string
          flag_id?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escola_feature_flags_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_feature_flags_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          email: string | null
          endereco: string | null
          id: string
          in_acessibilidade: boolean | null
          in_biblioteca: boolean | null
          in_internet: boolean | null
          in_laboratorio_informatica: boolean | null
          in_quadra_esportes: boolean | null
          in_refeitorio: boolean | null
          localizacao_diferenciada: string | null
          nome: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          diretor_id?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          in_acessibilidade?: boolean | null
          in_biblioteca?: boolean | null
          in_internet?: boolean | null
          in_laboratorio_informatica?: boolean | null
          in_quadra_esportes?: boolean | null
          in_refeitorio?: boolean | null
          localizacao_diferenciada?: string | null
          nome: string
          telefone?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          diretor_id?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          in_acessibilidade?: boolean | null
          in_biblioteca?: boolean | null
          in_internet?: boolean | null
          in_laboratorio_informatica?: boolean | null
          in_quadra_esportes?: boolean | null
          in_refeitorio?: boolean | null
          localizacao_diferenciada?: string | null
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
      feature_flags: {
        Row: {
          created_at: string | null
          description: string
          flag_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          flag_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          flag_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      frequencia: {
        Row: {
          aula_id: string | null
          bloqueado: boolean
          bloqueado_em: string | null
          bloqueado_por: string | null
          created_at: string | null
          data_aula: string
          documento_oficial: boolean
          hash_registro: string | null
          id: string
          justificativa: string | null
          marcado_em: string | null
          marcado_por: string | null
          matricula_id: string
          modificado_em: string | null
          observacoes: string | null
          observacoes_frequencia: string | null
          presente: boolean
          professor_id: string | null
          sessao_id: string | null
          status_presenca: string
          travado: boolean | null
        }
        Insert: {
          aula_id?: string | null
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string | null
          data_aula: string
          documento_oficial?: boolean
          hash_registro?: string | null
          id?: string
          justificativa?: string | null
          marcado_em?: string | null
          marcado_por?: string | null
          matricula_id: string
          modificado_em?: string | null
          observacoes?: string | null
          observacoes_frequencia?: string | null
          presente?: boolean
          professor_id?: string | null
          sessao_id?: string | null
          status_presenca?: string
          travado?: boolean | null
        }
        Update: {
          aula_id?: string | null
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string | null
          data_aula?: string
          documento_oficial?: boolean
          hash_registro?: string | null
          id?: string
          justificativa?: string | null
          marcado_em?: string | null
          marcado_por?: string | null
          matricula_id?: string
          modificado_em?: string | null
          observacoes?: string | null
          observacoes_frequencia?: string | null
          presente?: boolean
          professor_id?: string | null
          sessao_id?: string | null
          status_presenca?: string
          travado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_abertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_bloqueado_por_fkey"
            columns: ["bloqueado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_marcado_por_fkey"
            columns: ["marcado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "frequencia_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_aula"
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
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
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
          {
            foreignKeyName: "notas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      relatorios_descritivos: {
        Row: {
          ano_letivo: number
          campo_corpo_gestos: string | null
          campo_escuta_fala: string | null
          campo_espacos_tempos: string | null
          campo_eu_outro_nos: string | null
          campo_tracos_sons: string | null
          created_at: string | null
          created_by: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          matricula_id: string
          observacoes_gerais: string | null
          professor_id: string
          semestre: string
          status: string
          turma_id: string
          updated_at: string | null
        }
        Insert: {
          ano_letivo: number
          campo_corpo_gestos?: string | null
          campo_escuta_fala?: string | null
          campo_espacos_tempos?: string | null
          campo_eu_outro_nos?: string | null
          campo_tracos_sons?: string | null
          created_at?: string | null
          created_by?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          matricula_id: string
          observacoes_gerais?: string | null
          professor_id: string
          semestre: string
          status?: string
          turma_id: string
          updated_at?: string | null
        }
        Update: {
          ano_letivo?: number
          campo_corpo_gestos?: string | null
          campo_escuta_fala?: string | null
          campo_espacos_tempos?: string | null
          campo_eu_outro_nos?: string | null
          campo_tracos_sons?: string | null
          created_at?: string | null
          created_by?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          matricula_id?: string
          observacoes_gerais?: string | null
          professor_id?: string
          semestre?: string
          status?: string
          turma_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_descritivos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_finalizado_por_fkey"
            columns: ["finalizado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean
          cpf: string
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          escolaridade: string | null
          estado_civil: string | null
          id: string
          lgpd_consentimento: boolean
          lgpd_data_consentimento: string | null
          nacionalidade: string | null
          nome: string
          orgao_emissor_rg: string | null
          parentesco: string
          profissao: string | null
          renda_familiar: number | null
          rg: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cpf: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          id?: string
          lgpd_consentimento?: boolean
          lgpd_data_consentimento?: string | null
          nacionalidade?: string | null
          nome: string
          orgao_emissor_rg?: string | null
          parentesco: string
          profissao?: string | null
          renda_familiar?: number | null
          rg?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cpf?: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          id?: string
          lgpd_consentimento?: boolean
          lgpd_data_consentimento?: string | null
          nacionalidade?: string | null
          nome?: string
          orgao_emissor_rg?: string | null
          parentesco?: string
          profissao?: string | null
          renda_familiar?: number | null
          rg?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      sessoes_aula: {
        Row: {
          aberta_em: string | null
          auto_fechamento_agendado: string | null
          avaliacao_planejada: string | null
          cancelada_em: string | null
          conteudo_programatico: string
          created_at: string | null
          data_aula: string
          disciplina_id: string | null
          documento_oficial: boolean
          duracao_minutos: number
          escola_id: string
          fechada_em: string | null
          fim_aula: string | null
          hash_integridade: string | null
          hash_legal: string | null
          id: string
          inicio_aula: string
          metodologia: string | null
          objetivos_aprendizagem: string | null
          observacoes: string | null
          observacoes_fechamento: string | null
          professor_id: string
          recursos_utilizados: string | null
          status: string
          tempo_total_aula: unknown
          travada_em: string | null
          turma_id: string
          updated_at: string | null
        }
        Insert: {
          aberta_em?: string | null
          auto_fechamento_agendado?: string | null
          avaliacao_planejada?: string | null
          cancelada_em?: string | null
          conteudo_programatico: string
          created_at?: string | null
          data_aula?: string
          disciplina_id?: string | null
          documento_oficial?: boolean
          duracao_minutos?: number
          escola_id: string
          fechada_em?: string | null
          fim_aula?: string | null
          hash_integridade?: string | null
          hash_legal?: string | null
          id?: string
          inicio_aula?: string
          metodologia?: string | null
          objetivos_aprendizagem?: string | null
          observacoes?: string | null
          observacoes_fechamento?: string | null
          professor_id: string
          recursos_utilizados?: string | null
          status?: string
          tempo_total_aula?: unknown
          travada_em?: string | null
          turma_id: string
          updated_at?: string | null
        }
        Update: {
          aberta_em?: string | null
          auto_fechamento_agendado?: string | null
          avaliacao_planejada?: string | null
          cancelada_em?: string | null
          conteudo_programatico?: string
          created_at?: string | null
          data_aula?: string
          disciplina_id?: string | null
          documento_oficial?: boolean
          duracao_minutos?: number
          escola_id?: string
          fechada_em?: string | null
          fim_aula?: string | null
          hash_integridade?: string | null
          hash_legal?: string | null
          id?: string
          inicio_aula?: string
          metodologia?: string | null
          objetivos_aprendizagem?: string | null
          observacoes?: string | null
          observacoes_fechamento?: string | null
          professor_id?: string
          recursos_utilizados?: string | null
          status?: string
          tempo_total_aula?: unknown
          travada_em?: string | null
          turma_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_aula_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_aula_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_aula_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          capacidade: number
          created_at: string | null
          escola_id: string
          etapa_ensino: string | null
          id: string
          nome: string
          professor_id: string | null
          serie: string
          tempo_integral: boolean | null
          tipo_mediacao: string | null
          turno: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          capacidade?: number
          created_at?: string | null
          escola_id: string
          etapa_ensino?: string | null
          id?: string
          nome: string
          professor_id?: string | null
          serie: string
          tempo_integral?: boolean | null
          tipo_mediacao?: string | null
          turno: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          capacidade?: number
          created_at?: string | null
          escola_id?: string
          etapa_ensino?: string | null
          id?: string
          nome?: string
          professor_id?: string | null
          serie?: string
          tempo_integral?: boolean | null
          tipo_mediacao?: string | null
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
          data_ultimo_acesso: string | null
          email: string | null
          escola_id: string | null
          id: string
          nome: string
          primeiro_login: boolean | null
          senha_padrao: boolean | null
          tipo_usuario: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_ultimo_acesso?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          primeiro_login?: boolean | null
          senha_padrao?: boolean | null
          tipo_usuario: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_ultimo_acesso?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          primeiro_login?: boolean | null
          senha_padrao?: boolean | null
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
      audit_summary: {
        Row: {
          action: string | null
          primeira_operacao: string | null
          table_name: string | null
          total_operacoes: number | null
          ultima_operacao: string | null
          usuarios_distintos: number | null
        }
        Relationships: []
      }
      vw_alunos_risco_bolsa_familia: {
        Row: {
          aluno_id: string | null
          atestados: number | null
          bolsa_familia: boolean | null
          escola_id: string | null
          escola_nome: string | null
          faltas: number | null
          matricula_id: string | null
          nis: string | null
          nome_completo: string | null
          percentual_frequencia: number | null
          presencas: number | null
          serie: string | null
          total_aulas: number | null
          turma_id: string | null
          turma_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_frequencia_completa: {
        Row: {
          aluno_cpf: string | null
          aluno_id: string | null
          aluno_nome: string | null
          aula_id: string | null
          bloqueado: boolean | null
          bloqueado_em: string | null
          bloqueado_por: string | null
          escola_id: string | null
          escola_nome: string | null
          id: string | null
          marcado_em: string | null
          marcado_por: string | null
          matricula_id: string | null
          observacoes_frequencia: string | null
          sessao_id: string | null
          status_presenca: string | null
          turma_id: string | null
          turma_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_abertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_bloqueado_por_fkey"
            columns: ["bloqueado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_marcado_por_fkey"
            columns: ["marcado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "frequencia_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_aula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abrir_aula: {
        Args: {
          p_disciplina?: string
          p_escola_id: string
          p_observacoes?: string
          p_professor_id: string
          p_turma_id: string
        }
        Returns: string
      }
      auth_get_user_escola: { Args: never; Returns: string }
      auth_get_user_role: { Args: never; Returns: string }
      auth_has_role_or_higher: {
        Args: { required_role: string }
        Returns: boolean
      }
      auth_is_admin: { Args: never; Returns: boolean }
      contar_dias_letivos: {
        Args: { p_data_fim: string; p_data_inicio: string; p_escola_id: string }
        Returns: number
      }
      fechar_aula: {
        Args: { p_aula_id: string; p_observacoes?: string }
        Returns: boolean
      }
      fn_auto_fechar_sessoes_enhanced: { Args: never; Returns: number }
      get_aula_status: {
        Args: { p_aula_id: string }
        Returns: {
          minutos_restantes: number
          pode_modificar: boolean
          registros_pendentes: number
          status: string
          total_registros: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_current_user_school: { Args: never; Returns: string }
      get_estatisticas_aula: {
        Args: { p_aula_id: string }
        Returns: {
          ausentes: number
          justificados: number
          percentual_presenca: number
          presentes: number
          total_alunos: number
        }[]
      }
      get_session_phase: { Args: { session_id: string }; Returns: string }
      is_dia_letivo: {
        Args: { p_data: string; p_escola_id: string }
        Returns: boolean
      }
      is_onboarding: { Args: never; Returns: boolean }
      is_session_editable: { Args: { session_id: string }; Returns: boolean }
      marcar_frequencia_lote: {
        Args: { p_aula_id: string; p_registros: Json }
        Returns: number
      }
      pode_modificar_aula: { Args: { aula_id: string }; Returns: boolean }
      travar_aula_manual: {
        Args: { p_aula_id: string; p_motivo?: string }
        Returns: boolean
      }
      travar_frequencias_aula: { Args: { p_aula_id: string }; Returns: number }
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
