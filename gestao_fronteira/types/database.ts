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
          ip_usuario: unknown | null
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
          ip_usuario?: unknown | null
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
          ip_usuario?: unknown | null
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      escolas: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          diretor_id: string | null
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      Permission: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
      Role: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
          tempo_total_aula: unknown | null
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
          tempo_total_aula?: unknown | null
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
          tempo_total_aula?: unknown | null
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
      User: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          school_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          school_id: string
        }
        Update: {
          created_at?: string
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
      users: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          escola_id: string | null
          id: string
          nome: string
          tipo_usuario: string
          wizard_completed: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          tipo_usuario: string
          wizard_completed?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          tipo_usuario?: string
          wizard_completed?: boolean | null
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
          escola_id: string | null
          event_count: number | null
          first_event: string | null
          last_event: string | null
          log_date: string | null
          unique_users: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_escola_id"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_frequencia_completa: {
        Row: {
          aberta_em: string | null
          aluno_cpf: string | null
          aluno_nome: string | null
          ano_letivo: number | null
          aula_id: string | null
          aula_status: string | null
          data_aula: string | null
          disciplina: string | null
          escola_codigo: string | null
          escola_nome: string | null
          fechada_em: string | null
          id: string | null
          justificativa: string | null
          marcado_em: string | null
          matricula_id: string | null
          minutos_restantes: number | null
          modificado_em: string | null
          observacoes: string | null
          pode_modificar: boolean | null
          presente: boolean | null
          professor_email: string | null
          professor_id: string | null
          professor_nome: string | null
          situacao_matricula: string | null
          tempo_limite_minutos: number | null
          travada_em: string | null
          travado: boolean | null
          turma_nome: string | null
          turma_serie: string | null
          turma_turno: string | null
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
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abrir_aula: {
        Args: {
          p_disciplina?: string
          p_observacoes?: string
          p_professor_id: string
          p_tempo_limite_minutos?: number
          p_turma_id: string
        }
        Returns: {
          aberta_em: string
          aula_id: string
          pode_marcar_frequencia: boolean
          status: string
          total_alunos: number
        }[]
      }
      fechar_aula: {
        Args: {
          p_aula_id: string
          p_observacoes?: string
          p_professor_id: string
        }
        Returns: {
          aula_id: string
          fechada_em: string
          sera_travada_em: string
          status: string
          tempo_restante_minutos: number
        }[]
      }
      fn_auto_fechar_sessoes_enhanced: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_aula_status: {
        Args: { p_aula_id: string }
        Returns: {
          aberta_em: string
          aula_id: string
          disciplina: string
          faltas_marcadas: number
          fechada_em: string
          minutos_restantes: number
          nao_marcados: number
          percentual_presenca: number
          pode_alterar: boolean
          presencas_marcadas: number
          professor_nome: string
          status: string
          tempo_limite_minutos: number
          total_alunos: number
          travada_em: string
          turma_nome: string
          turma_serie: string
        }[]
      }
      get_estatisticas_aula: {
        Args: { aula_id: string }
        Returns: {
          faltas_marcadas: number
          nao_marcados: number
          percentual_presenca: number
          presencas_marcadas: number
          total_alunos: number
        }[]
      }
      get_session_phase: {
        Args: { session_id: string }
        Returns: string
      }
      is_session_editable: {
        Args: { session_id: string }
        Returns: boolean
      }
      marcar_frequencia_lote: {
        Args: { p_aula_id: string; p_frequencias: Json; p_professor_id: string }
        Returns: {
          erros: Json
          processados: number
          sucessos: number
        }[]
      }
      pode_modificar_aula: {
        Args: { aula_id: string }
        Returns: boolean
      }
      travar_aula_manual: {
        Args: { p_aula_id: string; p_motivo?: string; p_user_id: string }
        Returns: boolean
      }
      travar_frequencias_aula: {
        Args: { aula_id: string }
        Returns: number
      }
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
