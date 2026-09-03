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
      aluno_responsaveis: {
        Row: {
          aluno_id: string
          ativo: boolean | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          documento_autorizacao: string | null
          id: string
          pilot_import_batch_id: string | null
          pode_autorizar_saida: boolean | null
          pode_receber_comunicados: boolean | null
          prioridade: number | null
          responsavel_id: string
          tipo_responsabilidade: string
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          documento_autorizacao?: string | null
          id?: string
          pilot_import_batch_id?: string | null
          pode_autorizar_saida?: boolean | null
          pode_receber_comunicados?: boolean | null
          prioridade?: number | null
          responsavel_id: string
          tipo_responsabilidade: string
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          documento_autorizacao?: string | null
          id?: string
          pilot_import_batch_id?: string | null
          pode_autorizar_saida?: boolean | null
          pode_receber_comunicados?: boolean | null
          prioridade?: number | null
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
            foreignKeyName: "aluno_responsaveis_pilot_import_batch_id_fkey"
            columns: ["pilot_import_batch_id"]
            isOneToOne: false
            referencedRelation: "pilot_import_batches"
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
          bolsa_familia: boolean | null
          cor_raca: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string
          email: string | null
          endereco: string | null
          escola_id: string | null
          id: string
          import_source_id: string | null
          necessidades_especiais: string | null
          nis: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          pilot_import_batch_id: string | null
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
          escola_id?: string | null
          id?: string
          import_source_id?: string | null
          necessidades_especiais?: string | null
          nis?: string | null
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          pilot_import_batch_id?: string | null
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
          escola_id?: string | null
          id?: string
          import_source_id?: string | null
          necessidades_especiais?: string | null
          nis?: string | null
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          pilot_import_batch_id?: string | null
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
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "alunos_pilot_import_batch_id_fkey"
            columns: ["pilot_import_batch_id"]
            isOneToOne: false
            referencedRelation: "pilot_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      anos_letivos: {
        Row: {
          ano: number
          created_at: string
          data_fim: string
          data_inicio: string
          escola_id: string
          id: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          data_fim: string
          data_inicio: string
          escola_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          data_fim?: string
          data_inicio?: string
          escola_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anos_letivos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anos_letivos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      attendance_municipal_threshold_audit: {
        Row: {
          id: string
          municipality_id: string
          operation: string
          performed_at: string
          performed_by: string | null
          snapshot: Json
          threshold_id: string
        }
        Insert: {
          id?: string
          municipality_id: string
          operation: string
          performed_at?: string
          performed_by?: string | null
          snapshot: Json
          threshold_id: string
        }
        Update: {
          id?: string
          municipality_id?: string
          operation?: string
          performed_at?: string
          performed_by?: string | null
          snapshot?: Json
          threshold_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_municipal_threshold_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_municipal_thresholds: {
        Row: {
          created_at: string
          defined_at: string
          defined_by: string | null
          fallback_reason: string | null
          id: string
          is_fallback: boolean
          municipal_critical_percent: number
          municipal_warning_percent: number
          municipality_id: string
          precedence: number
          scope: string
          source: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          defined_at?: string
          defined_by?: string | null
          fallback_reason?: string | null
          id?: string
          is_fallback?: boolean
          municipal_critical_percent: number
          municipal_warning_percent: number
          municipality_id: string
          precedence?: number
          scope?: string
          source: string
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          defined_at?: string
          defined_by?: string | null
          fallback_reason?: string | null
          id?: string
          is_fallback?: boolean
          municipal_critical_percent?: number
          municipal_warning_percent?: number
          municipality_id?: string
          precedence?: number
          scope?: string
          source?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_municipal_thresholds_defined_by_fkey"
            columns: ["defined_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_municipal_thresholds_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "pilot_municipality_config"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_reopen_requests: {
        Row: {
          after_state: Json | null
          before_state: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          escola_id: string
          id: string
          request_reason: string
          requested_at: string
          requested_by: string
          sessao_id: string
          status: string
          updated_at: string
        }
        Insert: {
          after_state?: Json | null
          before_state: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          escola_id: string
          id?: string
          request_reason: string
          requested_at?: string
          requested_by: string
          sessao_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          after_state?: Json | null
          before_state?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          escola_id?: string
          id?: string
          request_reason?: string
          requested_at?: string
          requested_by?: string
          sessao_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_reopen_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reopen_requests_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reopen_requests_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "attendance_reopen_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reopen_requests_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_aula"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          escola_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          escola_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          escola_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
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
          nivel_criticidade: string | null
          operacao: string
          registro_id: string
          sessao_id: string | null
          tabela: string
          timestamp_operacao: string | null
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
          nivel_criticidade?: string | null
          operacao: string
          registro_id: string
          sessao_id?: string | null
          tabela: string
          timestamp_operacao?: string | null
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
          nivel_criticidade?: string | null
          operacao?: string
          registro_id?: string
          sessao_id?: string | null
          tabela?: string
          timestamp_operacao?: string | null
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
            foreignKeyName: "audit_trail_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          aberta_em: string | null
          created_at: string | null
          data_aula: string | null
          disciplina: string | null
          escola_id: string
          fechada_em: string | null
          id: string
          observacoes_abertura: string | null
          observacoes_fechamento: string | null
          professor_id: string
          status: string | null
          tempo_limite_minutos: number | null
          travada_em: string | null
          turma_id: string
          updated_at: string | null
        }
        Insert: {
          aberta_em?: string | null
          created_at?: string | null
          data_aula?: string | null
          disciplina?: string | null
          escola_id: string
          fechada_em?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          professor_id: string
          status?: string | null
          tempo_limite_minutos?: number | null
          travada_em?: string | null
          turma_id: string
          updated_at?: string | null
        }
        Update: {
          aberta_em?: string | null
          created_at?: string | null
          data_aula?: string | null
          disciplina?: string | null
          escola_id?: string
          fechada_em?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          professor_id?: string
          status?: string | null
          tempo_limite_minutos?: number | null
          travada_em?: string | null
          turma_id?: string
          updated_at?: string | null
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
            foreignKeyName: "aulas_abertas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          {
            foreignKeyName: "aulas_abertas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      calendario_escolar: {
        Row: {
          afeta_frequencia: boolean | null
          ano_letivo: number | null
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
          ano_letivo?: number | null
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
          ano_letivo?: number | null
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
          {
            foreignKeyName: "calendario_escolar_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      certificado_atividade_sessoes: {
        Row: {
          atividade_id: string
          sessao_id: string
        }
        Insert: {
          atividade_id: string
          sessao_id: string
        }
        Update: {
          atividade_id?: string
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_atividade_sessoes_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "certificado_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_atividade_sessoes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: true
            referencedRelation: "sessoes_aula"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_atividades: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo: string
          turma_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_atividades_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_atividades_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      certificado_emissores: {
        Row: {
          created_at: string
          escola_id: string
          id: string
          identificador_institucional: string
          nome_institucional: string
        }
        Insert: {
          created_at?: string
          escola_id: string
          id?: string
          identificador_institucional: string
          nome_institucional: string
        }
        Update: {
          created_at?: string
          escola_id?: string
          id?: string
          identificador_institucional?: string
          nome_institucional?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_emissores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_emissores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      certificados_emitidos: {
        Row: {
          aluno_id: string
          ano_letivo: number
          atividade_id: string
          carga_horaria_comprovada_minutos: number
          codigo_verificacao: string
          created_at: string
          emissor_id: string
          emitido_em: string
          fonte_fingerprint_sha256: string
          frequencias_comprovadas: number
          hash_verificacao_sha256: string
          id: string
          matricula_id: string
          sessoes_comprovadas: number
          turma_id: string
        }
        Insert: {
          aluno_id: string
          ano_letivo: number
          atividade_id: string
          carga_horaria_comprovada_minutos: number
          codigo_verificacao: string
          created_at?: string
          emissor_id: string
          emitido_em?: string
          fonte_fingerprint_sha256: string
          frequencias_comprovadas: number
          hash_verificacao_sha256: string
          id?: string
          matricula_id: string
          sessoes_comprovadas: number
          turma_id: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          atividade_id?: string
          carga_horaria_comprovada_minutos?: number
          codigo_verificacao?: string
          created_at?: string
          emissor_id?: string
          emitido_em?: string
          fonte_fingerprint_sha256?: string
          frequencias_comprovadas?: number
          hash_verificacao_sha256?: string
          id?: string
          matricula_id?: string
          sessoes_comprovadas?: number
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_emitidos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_emitidos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "certificados_emitidos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "certificado_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_emitidos_emissor_id_fkey"
            columns: ["emissor_id"]
            isOneToOne: false
            referencedRelation: "certificado_emissores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_emitidos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_emitidos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "certificados_emitidos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_emitidos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
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
          situacao: string | null
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
          situacao?: string | null
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
          situacao?: string | null
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
          tipo_valor: string | null
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
          tipo_valor?: string | null
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
          tipo_valor?: string | null
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
          {
            foreignKeyName: "configs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      conteudo_aula: {
        Row: {
          created_at: string
          created_by: string | null
          habilidades_bncc: string[]
          id: string
          metodologia: string | null
          objetivo: string
          observacoes: string | null
          recursos: string | null
          sessao_id: string
          tema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          habilidades_bncc?: string[]
          id?: string
          metodologia?: string | null
          objetivo: string
          observacoes?: string | null
          recursos?: string | null
          sessao_id: string
          tema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          habilidades_bncc?: string[]
          id?: string
          metodologia?: string | null
          objetivo?: string
          observacoes?: string | null
          recursos?: string | null
          sessao_id?: string
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_aula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_aula_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: true
            referencedRelation: "sessoes_aula"
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
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          status_export: string | null
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
          status_export?: string | null
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
          status_export?: string | null
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
          {
            foreignKeyName: "educacenso_exports_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
            foreignKeyName: "escola_feature_flags_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          municipio_id: string
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
          municipio_id: string
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
          municipio_id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "escolas_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "pilot_municipality_config"
            referencedColumns: ["id"]
          },
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
          bloqueado: boolean | null
          bloqueado_em: string | null
          bloqueado_por: string | null
          created_at: string | null
          data_aula: string
          documento_oficial: boolean | null
          hash_registro: string | null
          id: string
          justificativa: string | null
          marcado_em: string | null
          marcado_por: string | null
          matricula_id: string
          modificado_em: string | null
          observacoes: string | null
          observacoes_frequencia: string | null
          presente: boolean | null
          professor_id: string | null
          sessao_id: string | null
          status_presenca: string
          travado: boolean | null
        }
        Insert: {
          aula_id?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string | null
          data_aula: string
          documento_oficial?: boolean | null
          hash_registro?: string | null
          id?: string
          justificativa?: string | null
          marcado_em?: string | null
          marcado_por?: string | null
          matricula_id: string
          modificado_em?: string | null
          observacoes?: string | null
          observacoes_frequencia?: string | null
          presente?: boolean | null
          professor_id?: string | null
          sessao_id?: string | null
          status_presenca?: string
          travado?: boolean | null
        }
        Update: {
          aula_id?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string | null
          data_aula?: string
          documento_oficial?: boolean | null
          hash_registro?: string | null
          id?: string
          justificativa?: string | null
          marcado_em?: string | null
          marcado_por?: string | null
          matricula_id?: string
          modificado_em?: string | null
          observacoes?: string | null
          observacoes_frequencia?: string | null
          presente?: boolean | null
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
          data_matricula: string | null
          id: string
          observacoes: string | null
          pilot_import_batch_id: string | null
          situacao: string | null
          turma_id: string
        }
        Insert: {
          aluno_id: string
          ano_letivo: number
          created_at?: string | null
          data_matricula?: string | null
          id?: string
          observacoes?: string | null
          pilot_import_batch_id?: string | null
          situacao?: string | null
          turma_id: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          created_at?: string | null
          data_matricula?: string | null
          id?: string
          observacoes?: string | null
          pilot_import_batch_id?: string | null
          situacao?: string | null
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
            foreignKeyName: "matriculas_pilot_import_batch_id_fkey"
            columns: ["pilot_import_batch_id"]
            isOneToOne: false
            referencedRelation: "pilot_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
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
      pilot_audit_log: {
        Row: {
          actor_user_id: string | null
          correlation_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          escola_id: string | null
          event_type: string
          id: string
          redacted_metadata: Json
        }
        Insert: {
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          escola_id?: string | null
          event_type: string
          id?: string
          redacted_metadata?: Json
        }
        Update: {
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          escola_id?: string | null
          event_type?: string
          id?: string
          redacted_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pilot_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_audit_log_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_audit_log_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      pilot_data_tombstones: {
        Row: {
          created_at: string
          created_by: string | null
          entity_type: string
          id: string
          reason_code: string
          source_fingerprint: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_type: string
          id?: string
          reason_code: string
          source_fingerprint: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          reason_code?: string
          source_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_data_tombstones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_data_treatment_agreements: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          escola_id: string
          id: string
          reference: string
          updated_at: string
          version: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          escola_id: string
          id?: string
          reference: string
          updated_at?: string
          version: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          escola_id?: string
          id?: string
          reference?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_data_treatment_agreements_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_data_treatment_agreements_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_data_treatment_agreements_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      pilot_import_approvals: {
        Row: {
          approved_by: string
          batch_id: string
          decided_at: string
          decision: string
          escola_id: string
          id: string
          report_sha256: string
          submitted_by: string
        }
        Insert: {
          approved_by: string
          batch_id: string
          decided_at?: string
          decision: string
          escola_id: string
          id?: string
          report_sha256: string
          submitted_by: string
        }
        Update: {
          approved_by?: string
          batch_id?: string
          decided_at?: string
          decision?: string
          escola_id?: string
          id?: string
          report_sha256?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_import_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_approvals_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "pilot_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_approvals_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_approvals_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "pilot_import_approvals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_import_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          auth_tag: string | null
          canonical_counts: Json
          canonical_expires_at: string | null
          canonical_fingerprint_sha256: string | null
          cleaned_at: string | null
          content_sha256: string
          created_at: string
          database_fingerprint_sha256: string | null
          dataset: string
          encrypted_payload: string | null
          encryption_algorithm: string
          encryption_key_id: string
          escola_id: string
          governance_fingerprint_sha256: string | null
          governance_metadata: Json
          governance_owner_authorized_at: string | null
          governance_owner_email: string | null
          governance_owner_name: string | null
          governance_owner_user_id: string | null
          id: string
          idempotency_key: string
          import_target: string
          iv: string | null
          processing_agreement_confirmed: boolean
          processing_agreement_id: string | null
          processing_agreement_recorded_at: string | null
          processing_agreement_recorded_by: string | null
          processing_agreement_recorded_by_email: string | null
          processing_agreement_recorded_by_name: string | null
          processing_agreement_reference: string | null
          processing_agreement_version: string | null
          published_at: string | null
          raw_expires_at: string
          retention_policy: string | null
          rollback_reason: string | null
          rollback_until: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          source_mode: string
          source_row_count: number | null
          status: string
          submitted_by: string
          submitted_by_email: string | null
          submitted_by_name: string | null
          validation_report: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          auth_tag?: string | null
          canonical_counts?: Json
          canonical_expires_at?: string | null
          canonical_fingerprint_sha256?: string | null
          cleaned_at?: string | null
          content_sha256: string
          created_at?: string
          database_fingerprint_sha256?: string | null
          dataset?: string
          encrypted_payload?: string | null
          encryption_algorithm?: string
          encryption_key_id: string
          escola_id: string
          governance_fingerprint_sha256?: string | null
          governance_metadata?: Json
          governance_owner_authorized_at?: string | null
          governance_owner_email?: string | null
          governance_owner_name?: string | null
          governance_owner_user_id?: string | null
          id?: string
          idempotency_key: string
          import_target?: string
          iv?: string | null
          processing_agreement_confirmed?: boolean
          processing_agreement_id?: string | null
          processing_agreement_recorded_at?: string | null
          processing_agreement_recorded_by?: string | null
          processing_agreement_recorded_by_email?: string | null
          processing_agreement_recorded_by_name?: string | null
          processing_agreement_reference?: string | null
          processing_agreement_version?: string | null
          published_at?: string | null
          raw_expires_at?: string
          retention_policy?: string | null
          rollback_reason?: string | null
          rollback_until?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_mode?: string
          source_row_count?: number | null
          status?: string
          submitted_by: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          validation_report: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          auth_tag?: string | null
          canonical_counts?: Json
          canonical_expires_at?: string | null
          canonical_fingerprint_sha256?: string | null
          cleaned_at?: string | null
          content_sha256?: string
          created_at?: string
          database_fingerprint_sha256?: string | null
          dataset?: string
          encrypted_payload?: string | null
          encryption_algorithm?: string
          encryption_key_id?: string
          escola_id?: string
          governance_fingerprint_sha256?: string | null
          governance_metadata?: Json
          governance_owner_authorized_at?: string | null
          governance_owner_email?: string | null
          governance_owner_name?: string | null
          governance_owner_user_id?: string | null
          id?: string
          idempotency_key?: string
          import_target?: string
          iv?: string | null
          processing_agreement_confirmed?: boolean
          processing_agreement_id?: string | null
          processing_agreement_recorded_at?: string | null
          processing_agreement_recorded_by?: string | null
          processing_agreement_recorded_by_email?: string | null
          processing_agreement_recorded_by_name?: string | null
          processing_agreement_reference?: string | null
          processing_agreement_version?: string | null
          published_at?: string | null
          raw_expires_at?: string
          retention_policy?: string | null
          rollback_reason?: string | null
          rollback_until?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_mode?: string
          source_row_count?: number | null
          status?: string
          submitted_by?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          validation_report?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pilot_import_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "pilot_import_batches_governance_owner_user_id_fkey"
            columns: ["governance_owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_processing_agreement_id_fkey"
            columns: ["processing_agreement_id"]
            isOneToOne: false
            referencedRelation: "pilot_data_treatment_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_processing_agreement_recorded_by_fkey"
            columns: ["processing_agreement_recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_rolled_back_by_fkey"
            columns: ["rolled_back_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_metric_events: {
        Row: {
          actor_user_id: string | null
          dimensions: Json
          escola_id: string | null
          event_name: string
          id: string
          metric_value: number
          occurred_at: string
        }
        Insert: {
          actor_user_id?: string | null
          dimensions?: Json
          escola_id?: string | null
          event_name: string
          id?: string
          metric_value?: number
          occurred_at?: string
        }
        Update: {
          actor_user_id?: string | null
          dimensions?: Json
          escola_id?: string | null
          event_name?: string
          id?: string
          metric_value?: number
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_metric_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_metric_events_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_metric_events_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      pilot_municipality_config: {
        Row: {
          attendance_capture_target_percent: number
          backup_cadence: string
          backup_rpo_hours: number
          backup_rto_hours: number
          controller_name: string | null
          cpad_or_archive_authority: string | null
          created_at: string
          critical_incident_target: number
          data_classification: string
          deployment_model: string
          dpa_status: string
          external_deploy_allowed: boolean
          id: string
          incident_contact: string | null
          legal_approval_status: string
          municipality_slug: string
          operator_name: string
          primary_region: string
          processors: Json
          rights_request_channel: string | null
          ripd_status: string
          satisfaction_target: number
          support_critical_channel: string
          support_critical_response_business_hours: number
          support_normal_channel: string
          support_normal_response_business_days: number
          ttd_status: string
          updated_at: string
          weekly_active_schools_target_percent: number
        }
        Insert: {
          attendance_capture_target_percent?: number
          backup_cadence?: string
          backup_rpo_hours?: number
          backup_rto_hours?: number
          controller_name?: string | null
          cpad_or_archive_authority?: string | null
          created_at?: string
          critical_incident_target?: number
          data_classification?: string
          deployment_model?: string
          dpa_status?: string
          external_deploy_allowed?: boolean
          id?: string
          incident_contact?: string | null
          legal_approval_status?: string
          municipality_slug: string
          operator_name?: string
          primary_region?: string
          processors?: Json
          rights_request_channel?: string | null
          ripd_status?: string
          satisfaction_target?: number
          support_critical_channel?: string
          support_critical_response_business_hours?: number
          support_normal_channel?: string
          support_normal_response_business_days?: number
          ttd_status?: string
          updated_at?: string
          weekly_active_schools_target_percent?: number
        }
        Update: {
          attendance_capture_target_percent?: number
          backup_cadence?: string
          backup_rpo_hours?: number
          backup_rto_hours?: number
          controller_name?: string | null
          cpad_or_archive_authority?: string | null
          created_at?: string
          critical_incident_target?: number
          data_classification?: string
          deployment_model?: string
          dpa_status?: string
          external_deploy_allowed?: boolean
          id?: string
          incident_contact?: string | null
          legal_approval_status?: string
          municipality_slug?: string
          operator_name?: string
          primary_region?: string
          processors?: Json
          rights_request_channel?: string | null
          ripd_status?: string
          satisfaction_target?: number
          support_critical_channel?: string
          support_critical_response_business_hours?: number
          support_normal_channel?: string
          support_normal_response_business_days?: number
          ttd_status?: string
          updated_at?: string
          weekly_active_schools_target_percent?: number
        }
        Relationships: []
      }
      pilot_user_invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string
          created_at: string
          email: string
          escola_id: string | null
          id: string
          invited_by: string
          invited_role: string
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id: string
          created_at?: string
          email: string
          escola_id?: string | null
          id?: string
          invited_by: string
          invited_role: string
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string
          created_at?: string
          email?: string
          escola_id?: string | null
          id?: string
          invited_by?: string
          invited_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_user_invitations_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_user_invitations_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "pilot_user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "relatorios_descritivos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      relatorios_descritivos_vivencias: {
        Row: {
          created_at: string
          created_by: string
          escola_id: string
          id: string
          relatorio_id: string
          vivencia_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          escola_id: string
          id?: string
          relatorio_id: string
          vivencia_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          escola_id?: string
          id?: string
          relatorio_id?: string
          vivencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_descritivos_vivencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_vivencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_vivencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_vivencias_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios_descritivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_descritivos_vivencias_vivencia_id_fkey"
            columns: ["vivencia_id"]
            isOneToOne: false
            referencedRelation: "vivencias"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          escola_id: string | null
          escolaridade: string | null
          estado_civil: string | null
          id: string
          import_source_id: string | null
          lgpd_consentimento: boolean | null
          lgpd_data_consentimento: string | null
          nacionalidade: string | null
          nome: string
          orgao_emissor_rg: string | null
          parentesco: string
          pilot_import_batch_id: string | null
          profissao: string | null
          renda_familiar: number | null
          rg: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escola_id?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          id?: string
          import_source_id?: string | null
          lgpd_consentimento?: boolean | null
          lgpd_data_consentimento?: string | null
          nacionalidade?: string | null
          nome: string
          orgao_emissor_rg?: string | null
          parentesco: string
          pilot_import_batch_id?: string | null
          profissao?: string | null
          renda_familiar?: number | null
          rg?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escola_id?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          id?: string
          import_source_id?: string | null
          lgpd_consentimento?: boolean | null
          lgpd_data_consentimento?: string | null
          nacionalidade?: string | null
          nome?: string
          orgao_emissor_rg?: string | null
          parentesco?: string
          pilot_import_batch_id?: string | null
          profissao?: string | null
          renda_familiar?: number | null
          rg?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsaveis_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "responsaveis_pilot_import_batch_id_fkey"
            columns: ["pilot_import_batch_id"]
            isOneToOne: false
            referencedRelation: "pilot_import_batches"
            referencedColumns: ["id"]
          },
        ]
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
      school_schema_registry: {
        Row: {
          created_at: string
          is_synthetic: boolean
          routing_state: string
          schema_name: string
          schema_version: number
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_synthetic?: boolean
          routing_state?: string
          schema_name: string
          schema_version?: number
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_synthetic?: boolean
          routing_state?: string
          schema_name?: string
          schema_version?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_schema_registry_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_schema_registry_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      school_schema_versions: {
        Row: {
          applied_at: string
          checksum: string
          school_id: string
          version: number
        }
        Insert: {
          applied_at?: string
          checksum: string
          school_id: string
          version: number
        }
        Update: {
          applied_at?: string
          checksum?: string
          school_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_schema_versions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_schema_registry"
            referencedColumns: ["school_id"]
          },
        ]
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
          documento_oficial: boolean | null
          duracao_minutos: number | null
          escola_id: string
          fechada_em: string | null
          fim_aula: string | null
          hash_integridade: string | null
          hash_legal: string | null
          id: string
          inicio_aula: string | null
          metodologia: string | null
          objetivos_aprendizagem: string | null
          observacoes: string | null
          observacoes_fechamento: string | null
          professor_id: string
          recursos_utilizados: string | null
          status: string
          tempo_total_aula: string | null
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
          documento_oficial?: boolean | null
          duracao_minutos?: number | null
          escola_id: string
          fechada_em?: string | null
          fim_aula?: string | null
          hash_integridade?: string | null
          hash_legal?: string | null
          id?: string
          inicio_aula?: string | null
          metodologia?: string | null
          objetivos_aprendizagem?: string | null
          observacoes?: string | null
          observacoes_fechamento?: string | null
          professor_id: string
          recursos_utilizados?: string | null
          status?: string
          tempo_total_aula?: string | null
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
          documento_oficial?: boolean | null
          duracao_minutos?: number | null
          escola_id?: string
          fechada_em?: string | null
          fim_aula?: string | null
          hash_integridade?: string | null
          hash_legal?: string | null
          id?: string
          inicio_aula?: string | null
          metodologia?: string | null
          objetivos_aprendizagem?: string | null
          observacoes?: string | null
          observacoes_fechamento?: string | null
          professor_id?: string
          recursos_utilizados?: string | null
          status?: string
          tempo_total_aula?: string | null
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
            foreignKeyName: "sessoes_aula_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          {
            foreignKeyName: "sessoes_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          capacidade: number | null
          created_at: string | null
          escola_id: string
          etapa_ensino: string | null
          id: string
          import_source_id: string | null
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
          capacidade?: number | null
          created_at?: string | null
          escola_id: string
          etapa_ensino?: string | null
          id?: string
          import_source_id?: string | null
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
          capacidade?: number | null
          created_at?: string | null
          escola_id?: string
          etapa_ensino?: string | null
          id?: string
          import_source_id?: string | null
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
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
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
          {
            foreignKeyName: "fk_users_escola"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "users_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      vivencias: {
        Row: {
          aluno_id: string
          campos_experiencia: string[]
          created_at: string
          created_by: string
          data_vivencia: string
          descricao: string
          escola_id: string
          escopo: string
          id: string
          matricula_id: string
          observacoes: string | null
          professor_id: string
          turma_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          aluno_id: string
          campos_experiencia: string[]
          created_at?: string
          created_by: string
          data_vivencia: string
          descricao: string
          escola_id: string
          escopo?: string
          id?: string
          matricula_id: string
          observacoes?: string | null
          professor_id: string
          turma_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          aluno_id?: string
          campos_experiencia?: string[]
          created_at?: string
          created_by?: string
          data_vivencia?: string
          descricao?: string
          escola_id?: string
          escopo?: string
          id?: string
          matricula_id?: string
          observacoes?: string | null
          professor_id?: string
          turma_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "vivencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "vivencias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "vivencias_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "vivencias_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vivencias_campos_experiencia: {
        Row: {
          campo: string
          created_at: string
          escola_id: string
          id: string
          vivencia_id: string
        }
        Insert: {
          campo: string
          created_at?: string
          escola_id: string
          id?: string
          vivencia_id: string
        }
        Update: {
          campo?: string
          created_at?: string
          escola_id?: string
          id?: string
          vivencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivencias_campos_experiencia_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vivencias_campos_experiencia_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "vivencias_campos_experiencia_vivencia_id_fkey"
            columns: ["vivencia_id"]
            isOneToOne: false
            referencedRelation: "vivencias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_messages: {
        Row: {
          aluno_id: string
          bloqueado_em: string | null
          bloqueado_motivo: string | null
          created_at: string
          criado_por: string | null
          data_aula: string
          entregue_em: string | null
          escola_id: string
          external_message_id: string | null
          falhou_em: string | null
          id: string
          idempotency_key: string
          lido_em: string | null
          proxima_tentativa: string
          responsavel_id: string
          status: string
          tentativas: number
          tipo: string
          ultimo_erro_codigo: string | null
          ultimo_status_em: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          bloqueado_em?: string | null
          bloqueado_motivo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aula: string
          entregue_em?: string | null
          escola_id: string
          external_message_id?: string | null
          falhou_em?: string | null
          id?: string
          idempotency_key: string
          lido_em?: string | null
          proxima_tentativa?: string
          responsavel_id: string
          status?: string
          tentativas?: number
          tipo: string
          ultimo_erro_codigo?: string | null
          ultimo_status_em?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          bloqueado_em?: string | null
          bloqueado_motivo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aula?: string
          entregue_em?: string | null
          escola_id?: string
          external_message_id?: string | null
          falhou_em?: string | null
          id?: string
          idempotency_key?: string
          lido_em?: string | null
          proxima_tentativa?: string
          responsavel_id?: string
          status?: string
          tentativas?: number
          tipo?: string
          ultimo_erro_codigo?: string | null
          ultimo_status_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_messages_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_messages_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "vw_alunos_risco_bolsa_familia"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "whatsapp_notification_messages_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_messages_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_messages_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "whatsapp_notification_messages_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_optins: {
        Row: {
          canal: string
          cancelado_em: string | null
          consentido_em: string | null
          created_at: string
          escola_id: string
          id: string
          opt_in: boolean
          registrado_por: string | null
          responsavel_id: string
          updated_at: string
        }
        Insert: {
          canal?: string
          cancelado_em?: string | null
          consentido_em?: string | null
          created_at?: string
          escola_id: string
          id?: string
          opt_in?: boolean
          registrado_por?: string | null
          responsavel_id: string
          updated_at?: string
        }
        Update: {
          canal?: string
          cancelado_em?: string | null
          consentido_em?: string | null
          created_at?: string
          escola_id?: string
          id?: string
          opt_in?: boolean
          registrado_por?: string | null
          responsavel_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_optins_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_optins_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "whatsapp_notification_optins_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_optins_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
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
            foreignKeyName: "audit_logs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
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
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "vw_frequencia_completa"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      vw_frequencia_completa: {
        Row: {
          aluno_id: string | null
          aluno_nome: string | null
          ano_letivo: number | null
          aula_id: string | null
          data_aula: string | null
          escola_id: string | null
          escola_nome: string | null
          id: string | null
          marcado_em: string | null
          matricula_id: string | null
          modificado_em: string | null
          presente: boolean | null
          professor_id: string | null
          professor_nome: string | null
          situacao_matricula: string | null
          status_presenca: string | null
          travado: boolean | null
          turma_id: string | null
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
        ]
      }
      vw_frequencia_condicionalidade: {
        Row: {
          aluno_id: string | null
          aluno_nome: string | null
          atestados: number | null
          condicionalidade_legal: string | null
          condicionalidade_legal_status: string | null
          data_nascimento: string | null
          educacao_basica_concluida: boolean | null
          escola_id: string | null
          escola_nome: string | null
          etapa_ensino: string | null
          faltas: number | null
          idade_anos: number | null
          is_bolsa_familia: boolean | null
          margem_municipal_alerta_percent: number | null
          margem_municipal_critica_percent: number | null
          margem_municipal_definida_em: string | null
          margem_municipal_definida_por: string | null
          margem_municipal_fallback: boolean | null
          margem_municipal_fallback_motivo: string | null
          margem_municipal_id: string | null
          margem_municipal_origem: string | null
          margem_municipal_precedencia: number | null
          margem_municipal_status: string | null
          margem_municipal_vigencia_fim: string | null
          margem_municipal_vigencia_inicio: string | null
          matricula_id: string | null
          municipio_id: string | null
          nis: string | null
          percentual_frequencia: number | null
          piso_legal_percent: number | null
          presencas: number | null
          tem_dados_frequencia: boolean | null
          total_aulas: number | null
          turma_id: string | null
          turma_nome: string | null
          turma_serie: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_whatsapp_delivery_status: {
        Args: {
          p_error_code?: string
          p_external_message_id: string
          p_status: string
          p_timestamp: string
        }
        Returns: boolean
      }
      attendance_can_access_class: {
        Args: { target_class_id: string }
        Returns: boolean
      }
      attendance_current_role: { Args: never; Returns: string }
      attendance_current_school_id: { Args: never; Returns: string }
      attendance_reopen_session_state: {
        Args: { p_session_id: string }
        Returns: Json
      }
      auth_get_user_escola: { Args: never; Returns: string }
      auth_get_user_role: { Args: never; Returns: string }
      auth_has_role_or_higher: {
        Args: { required_role: string }
        Returns: boolean
      }
      auth_is_admin: { Args: never; Returns: boolean }
      can_access_class: { Args: { target_class_id: string }; Returns: boolean }
      can_access_enrollment: {
        Args: { target_enrollment_id: string }
        Returns: boolean
      }
      can_access_school: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      certificado_calcular_fonte: {
        Args: {
          p_atividade_id: string
          p_emissor_id: string
          p_exigir_matricula_ativa?: boolean
          p_matricula_id: string
        }
        Returns: {
          aluno_id: string
          ano_letivo: number
          carga_horaria_comprovada_minutos: number
          fonte_fingerprint_sha256: string
          frequencias_comprovadas: number
          sessoes_comprovadas: number
          turma_id: string
        }[]
      }
      certificado_verificar_fonte: {
        Args: { p_certificado_id: string }
        Returns: boolean
      }
      create_student_admission: {
        Args: {
          p_cpf?: string
          p_data_nascimento: string
          p_email?: string
          p_endereco?: string
          p_escola_id: string
          p_necessidades_especiais?: string
          p_nome_completo: string
          p_nome_mae?: string
          p_nome_pai?: string
          p_responsavel?: Json
          p_rg?: string
          p_sexo: string
          p_telefone?: string
        }
        Returns: {
          ativo: boolean | null
          bolsa_familia: boolean | null
          cor_raca: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string
          email: string | null
          endereco: string | null
          escola_id: string | null
          id: string
          import_source_id: string | null
          necessidades_especiais: string | null
          nis: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          pilot_import_batch_id: string | null
          responsavel_id: string | null
          rg: string | null
          sexo: string
          telefone: string | null
          tipo_deficiencia: string[] | null
          transporte_escolar: boolean | null
          zona_residencial: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "alunos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_user_role: { Args: never; Returns: string }
      current_user_school_id: { Args: never; Returns: string }
      decide_attendance_reopen: {
        Args: { p_decision: string; p_reason?: string; p_request_id: string }
        Returns: {
          after_state: Json | null
          before_state: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          escola_id: string
          id: string
          request_reason: string
          requested_at: string
          requested_by: string
          sessao_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_reopen_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_attendance_conditionality: {
        Args: {
          p_end_date: string
          p_escola_id?: string
          p_start_date: string
          p_turma_id?: string
        }
        Returns: {
          aluno_id: string
          aluno_nome: string
          atestados: number
          condicionalidade_legal: string
          condicionalidade_legal_status: string
          data_nascimento: string
          educacao_basica_concluida: boolean
          escola_id: string
          escola_nome: string
          etapa_ensino: string
          faltas: number
          idade_anos: number
          is_bolsa_familia: boolean
          margem_municipal_alerta_percent: number
          margem_municipal_critica_percent: number
          margem_municipal_definida_em: string
          margem_municipal_definida_por: string
          margem_municipal_fallback: boolean
          margem_municipal_fallback_motivo: string
          margem_municipal_id: string
          margem_municipal_origem: string
          margem_municipal_precedencia: number
          margem_municipal_status: string
          margem_municipal_vigencia_fim: string
          margem_municipal_vigencia_inicio: string
          matricula_id: string
          municipio_id: string
          nis: string
          percentual_frequencia: number
          piso_legal_percent: number
          presencas: number
          tem_dados_frequencia: boolean
          total_aulas: number
          turma_id: string
          turma_nome: string
          turma_serie: string
        }[]
      }
      get_attendance_conditionality_unrestricted: {
        Args: {
          p_end_date: string
          p_escola_id?: string
          p_start_date: string
          p_turma_id?: string
        }
        Returns: {
          aluno_id: string
          aluno_nome: string
          atestados: number
          condicionalidade_legal: string
          condicionalidade_legal_status: string
          data_nascimento: string
          educacao_basica_concluida: boolean
          escola_id: string
          escola_nome: string
          etapa_ensino: string
          faltas: number
          idade_anos: number
          is_bolsa_familia: boolean
          margem_municipal_alerta_percent: number
          margem_municipal_critica_percent: number
          margem_municipal_definida_em: string
          margem_municipal_definida_por: string
          margem_municipal_fallback: boolean
          margem_municipal_fallback_motivo: string
          margem_municipal_id: string
          margem_municipal_origem: string
          margem_municipal_precedencia: number
          margem_municipal_status: string
          margem_municipal_vigencia_fim: string
          margem_municipal_vigencia_inicio: string
          matricula_id: string
          municipio_id: string
          nis: string
          percentual_frequencia: number
          piso_legal_percent: number
          presencas: number
          tem_dados_frequencia: boolean
          total_aulas: number
          turma_id: string
          turma_nome: string
          turma_serie: string
        }[]
      }
      get_authorized_guardian_profiles: {
        Args: { p_guardian_id?: string; p_school_id?: string }
        Returns: {
          ativo: boolean
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          endereco: string
          escola_id: string
          escolaridade: string
          estado_civil: string
          id: string
          lgpd_consentimento: boolean
          lgpd_data_consentimento: string
          nacionalidade: string
          nome: string
          orgao_emissor_rg: string
          parentesco: string
          profissao: string
          renda_familiar: number
          rg: string
          telefone: string
        }[]
      }
      get_authorized_student_profiles: {
        Args: { p_school_id?: string; p_student_id?: string }
        Returns: {
          ativo: boolean
          cor_raca: string
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          endereco: string
          escola_id: string
          id: string
          necessidades_especiais: string
          nome_completo: string
          nome_mae: string
          nome_pai: string
          responsavel_id: string
          rg: string
          sexo: string
          telefone: string
          tipo_deficiencia: string[]
          transporte_escolar: boolean
          zona_residencial: string
        }[]
      }
      get_school_academic_year: {
        Args: { p_ano: number; p_escola_id: string }
        Returns: {
          ano: number
          created_at: string
          data_fim: string
          data_inicio: string
          escola_id: string
          id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "anos_letivos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_session_phase: { Args: { session_id: string }; Returns: string }
      get_student_bolsa_familia: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      has_any_role: { Args: { roles: string[] }; Returns: boolean }
      is_session_editable: { Args: { session_id: string }; Returns: boolean }
      pilot_audit_metadata_allowed: {
        Args: { p_event_type: string; p_metadata: Json }
        Returns: boolean
      }
      pilot_can_access_school: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      pilot_can_insert_matricula: {
        Args: { target_aluno_id: string; target_turma_id: string }
        Returns: boolean
      }
      pilot_can_manage_school: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      pilot_can_view_bolsa_familia: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      pilot_can_view_sensitive_family: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      pilot_cleanup_import_retention: { Args: never; Returns: number }
      pilot_cleanup_import_staging: { Args: never; Returns: number }
      pilot_current_role: { Args: never; Returns: string }
      pilot_current_school_id: { Args: never; Returns: string }
      pilot_dashboard_metrics: {
        Args: { p_escola_id?: string }
        Returns: {
          metric: string
          target: number
          target_met: boolean
          value: number
        }[]
      }
      pilot_is_secretariat: { Args: never; Returns: boolean }
      pilot_publish_synthetic_import_batch: {
        Args: {
          p_approver_user_id: string
          p_batch_id: string
          p_canonical_counts: Json
          p_canonical_fingerprint_sha256: string
          p_governance_fingerprint_sha256: string
          p_governance_metadata: Json
          p_report_sha256: string
          p_rows: Json
        }
        Returns: {
          batch_id: string
          cleaned_at: string
          published_at: string
          raw_expires_at: string
          status: string
        }[]
      }
      pilot_rollback_import_batch: {
        Args: { p_actor_user_id: string; p_batch_id: string; p_reason: string }
        Returns: {
          batch_id: string
          deleted_enrollments: number
          deleted_guardians: number
          deleted_relationships: number
          deleted_storage_objects: number
          deleted_students: number
          final_status: string
          storage_object_fingerprints: string[]
        }[]
      }
      pilot_rollback_synthetic_import_batch: {
        Args: { p_actor_user_id: string; p_batch_id: string; p_reason: string }
        Returns: {
          batch_id: string
          deleted_enrollments: number
          deleted_guardians: number
          deleted_relationships: number
          deleted_students: number
          final_status: string
        }[]
      }
      pilot_teacher_owns_class: {
        Args: { target_class_id: string }
        Returns: boolean
      }
      record_pilot_metric_event: {
        Args: {
          p_dimensions?: Json
          p_escola_id?: string
          p_event_name: string
          p_metric_value?: number
        }
        Returns: string
      }
      request_attendance_reopen: {
        Args: { p_reason: string; p_session_id: string }
        Returns: {
          after_state: Json | null
          before_state: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          escola_id: string
          id: string
          request_reason: string
          requested_at: string
          requested_by: string
          sessao_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_reopen_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_municipal_attendance_margin: {
        Args: { p_municipality_id: string; p_reference_date: string }
        Returns: {
          defined_at: string
          defined_by: string
          fallback_reason: string
          is_fallback: boolean
          municipal_critical_percent: number
          municipal_warning_percent: number
          municipality_id: string
          precedence: number
          scope: string
          source: string
          threshold_id: string
          valid_from: string
          valid_until: string
        }[]
      }
      set_school_academic_year: {
        Args: {
          p_ano: number
          p_data_fim: string
          p_data_inicio: string
          p_escola_id: string
        }
        Returns: {
          ano: number
          created_at: string
          data_fim: string
          data_inicio: string
          escola_id: string
          id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "anos_letivos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      vivencias_valid_campos: {
        Args: { input_campos: string[] }
        Returns: boolean
      }
      whatsapp_delivery_status_rank: {
        Args: { status: string }
        Returns: number
      }
      write_attendance_reopen_pilot_audit: {
        Args: {
          p_event_type: string
          p_metadata: Json
          p_request_id: string
          p_school_id: string
          p_session_id: string
        }
        Returns: undefined
      }
      write_pilot_audit_event: {
        Args: {
          p_entity_id?: string
          p_entity_type: string
          p_escola_id?: string
          p_event_type: string
          p_metadata?: Json
        }
        Returns: string
      }
      write_pilot_user_revocation_audit: {
        Args: {
          p_escola_id: string
          p_reason: string
          p_release: string
          p_role: string
          p_user_id: string
        }
        Returns: string
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

