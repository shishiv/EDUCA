/**
 * Multi-Guardian Management API Service
 *
 * Implements comprehensive guardian management for Brazilian educational compliance:
 * - Multiple guardians per student
 * - Different responsibility types
 * - Authorization levels
 * - LGPD compliance
 * - Communication preferences
 */

'use client'

import { BaseApiService } from './enhanced-base'
import { supabase } from '@/lib/supabase'

// ===== INTERFACES =====
export interface Guardian {
  id: string
  nome: string
  cpf: string
  rg?: string
  orgao_emissor_rg?: string
  data_nascimento?: string
  telefone?: string
  email?: string
  parentesco: string
  endereco?: string
  profissao?: string
  nacionalidade?: string
  estado_civil?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel'
  renda_familiar?: number
  escolaridade?: 'analfabeto' | 'fundamental_incompleto' | 'fundamental_completo' | 'medio_incompleto' | 'medio_completo' | 'superior_incompleto' | 'superior_completo' | 'pos_graduacao'

  // LGPD compliance
  lgpd_consentimento: boolean
  lgpd_data_consentimento?: string

  ativo: boolean
  created_at: string
}

export interface StudentGuardianRelationship {
  id: string
  aluno_id: string
  responsavel_id: string
  tipo_responsabilidade: 'responsavel_legal' | 'responsavel_educacional' | 'contato_emergencia' | 'autorizado_buscar' | 'responsavel_financeiro'
  prioridade: number
  pode_autorizar_saida: boolean
  pode_receber_comunicados: boolean
  ativo: boolean
  documento_autorizacao?: string
  data_inicio: string
  data_fim?: string
  created_at: string
  updated_at?: string
}

export interface GuardianWithRelationships extends Guardian {
  relationships?: Array<StudentGuardianRelationship & {
    aluno?: {
      id: string
      nome_completo: string
      data_nascimento: string
    }
    turma?: {
      id: string
      nome: string
      serie: string
    }
  }>
}

export interface StudentWithGuardians {
  id: string
  nome_completo: string
  data_nascimento: string
  guardians: Array<Guardian & {
    relationship: StudentGuardianRelationship
  }>
}

// ===== MULTI-GUARDIAN API SERVICE =====
export class MultiGuardianService extends BaseApiService {
  constructor() {
    super('responsaveis')
  }

  // ===== GUARDIAN MANAGEMENT =====

  /**
   * Create new guardian with LGPD compliance
   */
  async createGuardian(guardianData: Omit<Guardian, 'id' | 'created_at'>): Promise<Guardian> {
    try {
      // Validate CPF uniqueness
      const { data: existingGuardian, error: checkError } = await supabase
        .from('responsaveis')
        .select('id')
        .eq('cpf', guardianData.cpf)
        .single()

      if (!checkError && existingGuardian) {
        throw new Error('ERRO_DUPLICACAO: Já existe um responsável cadastrado com este CPF.')
      }

      // Validate LGPD consent
      if (!guardianData.lgpd_consentimento) {
        throw new Error('ERRO_LGPD: Consentimento LGPD é obrigatório para cadastro de responsáveis.')
      }

      const guardianWithTimestamp = {
        ...guardianData,
        lgpd_data_consentimento: guardianData.lgpd_consentimento ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('responsaveis')
        .insert(guardianWithTimestamp)
        .select()
        .single()

      if (error) throw error
      return data as Guardian
    } catch (error) {
      console.error('Error creating guardian:', error)
      throw error
    }
  }

  /**
   * Update guardian information
   */
  async updateGuardian(guardianId: string, updates: Partial<Guardian>): Promise<Guardian> {
    try {
      // If updating LGPD consent, add timestamp
      if (updates.lgpd_consentimento !== undefined) {
        updates.lgpd_data_consentimento = updates.lgpd_consentimento
          ? new Date().toISOString()
          : null
      }

      const { data, error } = await supabase
        .from('responsaveis')
        .update(updates)
        .eq('id', guardianId)
        .select()
        .single()

      if (error) throw error
      return data as Guardian
    } catch (error) {
      console.error('Error updating guardian:', error)
      throw error
    }
  }

  /**
   * Get guardian by ID with relationships
   */
  async getGuardianById(guardianId: string): Promise<GuardianWithRelationships | null> {
    try {
      const { data, error } = await supabase
        .from('responsaveis')
        .select(`
          *,
          relationships:aluno_responsaveis(
            *,
            aluno:alunos(
              id,
              nome_completo,
              data_nascimento
            ),
            turma:matriculas(
              turma:turmas(
                id,
                nome,
                serie
              )
            )
          )
        `)
        .eq('id', guardianId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as GuardianWithRelationships | null
    } catch (error) {
      console.error('Error fetching guardian by ID:', error)
      throw error
    }
  }

  /**
   * Search guardians by criteria
   */
  async searchGuardians(criteria: {
    nome?: string
    cpf?: string
    telefone?: string
    email?: string
    limit?: number
  }): Promise<Guardian[]> {
    try {
      let query = supabase
        .from('responsaveis')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (criteria.nome) {
        query = query.ilike('nome', `%${criteria.nome}%`)
      }
      if (criteria.cpf) {
        query = query.eq('cpf', criteria.cpf.replace(/[^\d]/g, ''))
      }
      if (criteria.telefone) {
        query = query.ilike('telefone', `%${criteria.telefone}%`)
      }
      if (criteria.email) {
        query = query.ilike('email', `%${criteria.email}%`)
      }
      if (criteria.limit) {
        query = query.limit(criteria.limit)
      }

      const { data, error } = await query
      if (error) throw error

      return data as Guardian[]
    } catch (error) {
      console.error('Error searching guardians:', error)
      throw error
    }
  }

  // ===== STUDENT-GUARDIAN RELATIONSHIPS =====

  /**
   * Add guardian to student with specific responsibilities
   */
  async addGuardianToStudent(
    studentId: string,
    guardianId: string,
    relationshipData: Omit<StudentGuardianRelationship, 'id' | 'aluno_id' | 'responsavel_id' | 'created_at' | 'updated_at'>
  ): Promise<StudentGuardianRelationship> {
    try {
      // Validate student exists
      const { data: student, error: studentError } = await supabase
        .from('alunos')
        .select('id')
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        throw new Error('ERRO_ESTUDANTE: Estudante não encontrado.')
      }

      // Validate guardian exists
      const { data: guardian, error: guardianError } = await supabase
        .from('responsaveis')
        .select('id, ativo')
        .eq('id', guardianId)
        .single()

      if (guardianError || !guardian) {
        throw new Error('ERRO_RESPONSAVEL: Responsável não encontrado.')
      }

      if (!guardian.ativo) {
        throw new Error('ERRO_RESPONSAVEL: Responsável inativo.')
      }

      // Check for existing relationship of same type
      const { data: existingRelation, error: relationError } = await supabase
        .from('aluno_responsaveis')
        .select('id')
        .eq('aluno_id', studentId)
        .eq('responsavel_id', guardianId)
        .eq('tipo_responsabilidade', relationshipData.tipo_responsabilidade)
        .eq('ativo', true)
        .single()

      if (!relationError && existingRelation) {
        throw new Error('ERRO_DUPLICACAO: Já existe uma relação ativa deste tipo entre o estudante e responsável.')
      }

      // Validate priority constraints
      if (relationshipData.tipo_responsabilidade === 'responsavel_legal' && relationshipData.prioridade !== 1) {
        throw new Error('ERRO_PRIORIDADE: Responsável legal deve ter prioridade 1.')
      }

      // Create relationship
      const relationshipWithIds = {
        ...relationshipData,
        aluno_id: studentId,
        responsavel_id: guardianId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('aluno_responsaveis')
        .insert(relationshipWithIds)
        .select()
        .single()

      if (error) throw error
      return data as StudentGuardianRelationship
    } catch (error) {
      console.error('Error adding guardian to student:', error)
      throw error
    }
  }

  /**
   * Update guardian-student relationship
   */
  async updateGuardianRelationship(
    relationshipId: string,
    updates: Partial<StudentGuardianRelationship>
  ): Promise<StudentGuardianRelationship> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('aluno_responsaveis')
        .update(updateData)
        .eq('id', relationshipId)
        .select()
        .single()

      if (error) throw error
      return data as StudentGuardianRelationship
    } catch (error) {
      console.error('Error updating guardian relationship:', error)
      throw error
    }
  }

  /**
   * Remove guardian from student (deactivate relationship)
   */
  async removeGuardianFromStudent(relationshipId: string): Promise<void> {
    try {
      // Check if this is the only legal guardian
      const { data: relationship, error: relationError } = await supabase
        .from('aluno_responsaveis')
        .select('aluno_id, tipo_responsabilidade')
        .eq('id', relationshipId)
        .single()

      if (relationError || !relationship) {
        throw new Error('ERRO_RELACAO: Relação não encontrada.')
      }

      if (relationship.tipo_responsabilidade === 'responsavel_legal') {
        const { data: otherLegalGuardians, error: otherError } = await supabase
          .from('aluno_responsaveis')
          .select('id')
          .eq('aluno_id', relationship.aluno_id)
          .eq('tipo_responsabilidade', 'responsavel_legal')
          .eq('ativo', true)
          .neq('id', relationshipId)

        if (otherError) throw otherError

        if (otherLegalGuardians.length === 0) {
          throw new Error('ERRO_RESPONSAVEL_LEGAL: Não é possível remover o único responsável legal. Adicione outro responsável legal primeiro.')
        }
      }

      // Deactivate relationship
      const { error } = await supabase
        .from('aluno_responsaveis')
        .update({
          ativo: false,
          data_fim: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', relationshipId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing guardian from student:', error)
      throw error
    }
  }

  // ===== STUDENT QUERIES =====

  /**
   * Get student with all guardians
   */
  async getStudentWithGuardians(studentId: string): Promise<StudentWithGuardians | null> {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          relationships:aluno_responsaveis(
            *,
            responsavel:responsaveis(*)
          )
        `)
        .eq('id', studentId)
        .eq('relationships.ativo', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (!data) return null

      // Transform data structure
      const studentWithGuardians: StudentWithGuardians = {
        id: data.id,
        nome_completo: data.nome_completo,
        data_nascimento: data.data_nascimento,
        guardians: data.relationships?.map(rel => ({
          ...rel.responsavel,
          relationship: {
            id: rel.id,
            aluno_id: rel.aluno_id,
            responsavel_id: rel.responsavel_id,
            tipo_responsabilidade: rel.tipo_responsabilidade,
            prioridade: rel.prioridade,
            pode_autorizar_saida: rel.pode_autorizar_saida,
            pode_receber_comunicados: rel.pode_receber_comunicados,
            ativo: rel.ativo,
            documento_autorizacao: rel.documento_autorizacao,
            data_inicio: rel.data_inicio,
            data_fim: rel.data_fim,
            created_at: rel.created_at,
            updated_at: rel.updated_at
          }
        })) || []
      }

      // Sort guardians by priority
      studentWithGuardians.guardians.sort((a, b) => a.relationship.prioridade - b.relationship.prioridade)

      return studentWithGuardians
    } catch (error) {
      console.error('Error fetching student with guardians:', error)
      throw error
    }
  }

  /**
   * Get all students for a guardian
   */
  async getStudentsForGuardian(guardianId: string): Promise<Array<{
    id: string
    nome_completo: string
    data_nascimento: string
    relationship: StudentGuardianRelationship
    turma?: {
      id: string
      nome: string
      serie: string
    }
  }>> {
    try {
      const { data, error } = await supabase
        .from('aluno_responsaveis')
        .select(`
          *,
          aluno:alunos(
            id,
            nome_completo,
            data_nascimento,
            matricula:matriculas(
              turma:turmas(
                id,
                nome,
                serie
              )
            )
          )
        `)
        .eq('responsavel_id', guardianId)
        .eq('ativo', true)
        .order('prioridade')

      if (error) throw error

      return data.map(rel => ({
        id: rel.aluno.id,
        nome_completo: rel.aluno.nome_completo,
        data_nascimento: rel.aluno.data_nascimento,
        relationship: {
          id: rel.id,
          aluno_id: rel.aluno_id,
          responsavel_id: rel.responsavel_id,
          tipo_responsabilidade: rel.tipo_responsabilidade,
          prioridade: rel.prioridade,
          pode_autorizar_saida: rel.pode_autorizar_saida,
          pode_receber_comunicados: rel.pode_receber_comunicados,
          ativo: rel.ativo,
          documento_autorizacao: rel.documento_autorizacao,
          data_inicio: rel.data_inicio,
          data_fim: rel.data_fim,
          created_at: rel.created_at,
          updated_at: rel.updated_at
        },
        turma: rel.aluno.matricula?.[0]?.turma
      }))
    } catch (error) {
      console.error('Error fetching students for guardian:', error)
      throw error
    }
  }

  // ===== COMMUNICATION MANAGEMENT =====

  /**
   * Get guardians for communication by student
   */
  async getGuardiansForCommunication(studentId: string): Promise<Array<Guardian & {
    relationship: StudentGuardianRelationship
  }>> {
    try {
      const { data, error } = await supabase
        .from('aluno_responsaveis')
        .select(`
          *,
          responsavel:responsaveis(*)
        `)
        .eq('aluno_id', studentId)
        .eq('ativo', true)
        .eq('pode_receber_comunicados', true)
        .order('prioridade')

      if (error) throw error

      return data.map(rel => ({
        ...rel.responsavel,
        relationship: {
          id: rel.id,
          aluno_id: rel.aluno_id,
          responsavel_id: rel.responsavel_id,
          tipo_responsabilidade: rel.tipo_responsabilidade,
          prioridade: rel.prioridade,
          pode_autorizar_saida: rel.pode_autorizar_saida,
          pode_receber_comunicados: rel.pode_receber_comunicados,
          ativo: rel.ativo,
          documento_autorizacao: rel.documento_autorizacao,
          data_inicio: rel.data_inicio,
          data_fim: rel.data_fim,
          created_at: rel.created_at,
          updated_at: rel.updated_at
        }
      }))
    } catch (error) {
      console.error('Error fetching guardians for communication:', error)
      throw error
    }
  }

  /**
   * Get emergency contacts for student
   */
  async getEmergencyContacts(studentId: string): Promise<Array<Guardian & {
    relationship: StudentGuardianRelationship
  }>> {
    try {
      const { data, error } = await supabase
        .from('aluno_responsaveis')
        .select(`
          *,
          responsavel:responsaveis(*)
        `)
        .eq('aluno_id', studentId)
        .eq('ativo', true)
        .in('tipo_responsabilidade', ['responsavel_legal', 'contato_emergencia'])
        .order('prioridade')

      if (error) throw error

      return data.map(rel => ({
        ...rel.responsavel,
        relationship: {
          id: rel.id,
          aluno_id: rel.aluno_id,
          responsavel_id: rel.responsavel_id,
          tipo_responsabilidade: rel.tipo_responsabilidade,
          prioridade: rel.prioridade,
          pode_autorizar_saida: rel.pode_autorizar_saida,
          pode_receber_comunicados: rel.pode_receber_comunicados,
          ativo: rel.ativo,
          documento_autorizacao: rel.documento_autorizacao,
          data_inicio: rel.data_inicio,
          data_fim: rel.data_fim,
          created_at: rel.created_at,
          updated_at: rel.updated_at
        }
      }))
    } catch (error) {
      console.error('Error fetching emergency contacts:', error)
      throw error
    }
  }

  // ===== VALIDATION METHODS =====

  /**
   * Validate guardian can perform action for student
   */
  async validateGuardianAction(
    guardianId: string,
    studentId: string,
    action: 'authorize_exit' | 'receive_communication' | 'emergency_contact'
  ): Promise<boolean> {
    try {
      const actionMap = {
        authorize_exit: 'pode_autorizar_saida',
        receive_communication: 'pode_receber_comunicados',
        emergency_contact: 'tipo_responsabilidade'
      }

      let query = supabase
        .from('aluno_responsaveis')
        .select('id, tipo_responsabilidade, pode_autorizar_saida, pode_receber_comunicados')
        .eq('aluno_id', studentId)
        .eq('responsavel_id', guardianId)
        .eq('ativo', true)

      const { data, error } = await query.single()
      if (error || !data) return false

      switch (action) {
        case 'authorize_exit':
          return data.pode_autorizar_saida
        case 'receive_communication':
          return data.pode_receber_comunicados
        case 'emergency_contact':
          return ['responsavel_legal', 'contato_emergencia'].includes(data.tipo_responsabilidade)
        default:
          return false
      }
    } catch (error) {
      console.error('Error validating guardian action:', error)
      return false
    }
  }
}

export const multiGuardianApi = new MultiGuardianService()