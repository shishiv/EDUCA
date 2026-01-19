/**
 * INEP Integration API Service
 *
 * Implements Brazilian educational data integration patterns:
 * - INEP code management
 * - Educacenso data export
 * - Census data validation
 * - IDEB integration preparation
 * - Ministry of Education compliance
 */

'use client'

import { BaseApiService } from './enhanced-base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// ===== INTERFACES =====
export interface INEPCode {
  id: string
  entidade_tipo: 'escola' | 'aluno' | 'professor' | 'turma'
  entidade_id: string
  codigo_inep: string
  situacao: 'ativo' | 'inativo' | 'pendente'
  data_validacao?: string
  validado_por?: string
  observacoes?: string
  created_at: string
  updated_at?: string
}

export interface EducacensoExport {
  id: string
  ano_referencia: number
  escola_id: string
  tipo_export: 'situacao_aluno' | 'dados_escola' | 'turma' | 'docente' | 'gestor'
  status_export: 'pendente' | 'processando' | 'concluido' | 'erro'
  arquivo_gerado?: string
  data_geracao?: string
  data_envio?: string
  hash_arquivo?: string
  observacoes?: string
  created_at: string
  updated_at?: string
}

export interface StudentCensusData {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf?: string
  sexo: 'M' | 'F'
  raca_cor?: string
  necessidades_especiais?: string
  transporte_escolar?: boolean
  bolsa_familia?: boolean
  codigo_inep?: string
  situacao_matricula: 'ativa' | 'transferida' | 'concluida' | 'cancelada'
  turma: {
    id: string
    nome: string
    serie: string
    codigo_inep?: string
  }
  escola: {
    id: string
    nome: string
    codigo_inep?: string
  }
}

export interface SchoolCensusData {
  id: string
  nome: string
  codigo_inep?: string
  endereco?: string
  telefone?: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
  dependencia_administrativa: 'municipal' | 'estadual' | 'federal' | 'privada'
  situacao_funcionamento: 'ativa' | 'inativa' | 'extinta'

  // Infrastructure data for census
  internet: boolean
  biblioteca: boolean
  laboratorio_informatica: boolean
  quadra_esporte: boolean
  patio_coberto: boolean
  patio_descoberto: boolean
  alimentacao_escolar: boolean

  // Enrollment statistics
  total_matriculas: number
  total_turmas: number
  total_docentes: number
}

// ===== INEP INTEGRATION SERVICE =====
export class INEPIntegrationService extends BaseApiService {
  constructor() {
    super('codigos_inep')
  }

  // ===== INEP CODE MANAGEMENT =====

  /**
   * Register INEP code for entity
   */
  async registerINEPCode(
    entityType: 'escola' | 'aluno' | 'professor' | 'turma',
    entityId: string,
    inepCode: string,
    validatedBy?: string
  ): Promise<INEPCode> {
    try {
      // Validate INEP code format
      if (!this.validateINEPCodeFormat(inepCode, entityType)) {
        throw new Error('ERRO_FORMATO: Código INEP inválido para o tipo de entidade.')
      }

      // Check for duplicates
      const { data: existing, error: existingError } = await supabase
        .from('codigos_inep')
        .select('id')
        .eq('codigo_inep', inepCode)
        .single()

      if (!existingError && existing) {
        throw new Error('ERRO_DUPLICACAO: Código INEP já está em uso.')
      }

      // Create INEP code record
      const inepData = {
        entidade_tipo: entityType,
        entidade_id: entityId,
        codigo_inep: inepCode,
        situacao: validatedBy ? 'ativo' : 'pendente',
        data_validacao: validatedBy ? new Date().toISOString() : null,
        validado_por: validatedBy,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('codigos_inep')
        .insert(inepData)
        .select()
        .single()

      if (error) throw error
      return data as INEPCode
    } catch (error) {
      logger.error('Error registering INEP code', error as Error, {
        feature: 'inep-integration',
        action: 'register_inep_code'
      })
      throw error
    }
  }

  /**
   * Validate INEP code with Ministry of Education
   */
  async validateINEPCode(codeId: string, validatedBy: string): Promise<INEPCode> {
    try {
      // In production, this would integrate with MEC's validation service
      // For now, we simulate validation

      const { data, error } = await supabase
        .from('codigos_inep')
        .update({
          situacao: 'ativo',
          data_validacao: new Date().toISOString(),
          validado_por: validatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', codeId)
        .select()
        .single()

      if (error) throw error
      return data as INEPCode
    } catch (error) {
      logger.error('Error validating INEP code', error as Error, {
        feature: 'inep-integration',
        action: 'validate_inep_code'
      })
      throw error
    }
  }

  /**
   * Get INEP code for entity
   */
  async getINEPCodeForEntity(entityType: string, entityId: string): Promise<INEPCode | null> {
    try {
      const { data, error } = await supabase
        .from('codigos_inep')
        .select('*')
        .eq('entidade_tipo', entityType)
        .eq('entidade_id', entityId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as INEPCode | null
    } catch (error) {
      logger.error('Error fetching INEP code', error as Error, {
        feature: 'inep-integration',
        action: 'get_inep_code_for_entity'
      })
      throw error
    }
  }

  // ===== EDUCACENSO EXPORT =====

  /**
   * Generate Educacenso export for school
   */
  async generateEducacensoExport(
    schoolId: string,
    exportType: 'situacao_aluno' | 'dados_escola' | 'turma' | 'docente' | 'gestor',
    yearReference: number = new Date().getFullYear()
  ): Promise<EducacensoExport> {
    try {
      // Create export record
      const exportData = {
        ano_referencia: yearReference,
        escola_id: schoolId,
        tipo_export: exportType,
        status_export: 'pendente' as const,
        created_at: new Date().toISOString()
      }

      const { data: exportRecord, error: exportError } = await supabase
        .from('educacenso_exports')
        .insert(exportData)
        .select()
        .single()

      if (exportError) throw exportError

      // Process export based on type
      let exportResult: any
      switch (exportType) {
        case 'situacao_aluno':
          exportResult = await this.generateStudentSituationExport(schoolId, yearReference)
          break
        case 'dados_escola':
          exportResult = await this.generateSchoolDataExport(schoolId)
          break
        case 'turma':
          exportResult = await this.generateClassDataExport(schoolId, yearReference)
          break
        case 'docente':
          exportResult = await this.generateTeacherDataExport(schoolId)
          break
        case 'gestor':
          exportResult = await this.generateManagerDataExport(schoolId)
          break
        default:
          throw new Error('ERRO_TIPO: Tipo de exportação não suportado.')
      }

      // Update export record with results
      const { data: updatedExport, error: updateError } = await supabase
        .from('educacenso_exports')
        .update({
          status_export: 'concluido',
          arquivo_gerado: `educacenso_${exportType}_${schoolId}_${yearReference}.json`,
          data_geracao: new Date().toISOString(),
          hash_arquivo: await this.generateFileHash(JSON.stringify(exportResult)),
          updated_at: new Date().toISOString()
        })
        .eq('id', exportRecord.id)
        .select()
        .single()

      if (updateError) throw updateError

      return updatedExport as EducacensoExport
    } catch (error) {
      logger.error('Error generating Educacenso export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_educacenso_export'
      })
      throw error
    }
  }

  /**
   * Generate student situation export (Situação do Aluno)
   */
  private async generateStudentSituationExport(schoolId: string, year: number): Promise<StudentCensusData[]> {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          cpf,
          sexo,
          necessidades_especiais,
          matriculas!inner(
            situacao,
            turma:turmas!inner(
              id,
              nome,
              serie,
              escola_id
            )
          ),
          codigo_inep:codigos_inep(codigo_inep)
        `)
        .eq('matriculas.turma.escola_id', schoolId)
        .eq('matriculas.ano_letivo', year)
        .eq('ativo', true)

      if (error) throw error

      return data.map(student => ({
        id: student.id,
        nome_completo: student.nome_completo,
        data_nascimento: student.data_nascimento,
        cpf: student.cpf,
        sexo: student.sexo,
        necessidades_especiais: student.necessidades_especiais,
        codigo_inep: student.codigo_inep?.[0]?.codigo_inep,
        situacao_matricula: student.matriculas[0]?.situacao || 'ativa',
        turma: {
          id: student.matriculas[0]?.turma.id,
          nome: student.matriculas[0]?.turma.nome,
          serie: student.matriculas[0]?.turma.serie
        },
        escola: {
          id: schoolId,
          nome: '', // Will be filled from school data
          codigo_inep: '' // Will be filled from school INEP code
        }
      }))
    } catch (error) {
      logger.error('Error generating student situation export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_student_situation_export'
      })
      throw error
    }
  }

  /**
   * Generate school data export (Dados da Escola)
   */
  private async generateSchoolDataExport(schoolId: string): Promise<SchoolCensusData> {
    try {
      const { data: school, error: schoolError } = await supabase
        .from('escolas')
        .select(`
          id,
          nome,
          endereco,
          telefone,
          tipo,
          codigo_inep:codigos_inep(codigo_inep)
        `)
        .eq('id', schoolId)
        .single()

      if (schoolError) throw schoolError

      // Get statistics
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select('id')
        .eq('turma.escola_id', schoolId)
        .eq('situacao', 'ativa')

      const { data: turmas, error: turmasError } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', schoolId)
        .eq('ativo', true)

      const { data: docentes, error: docentesError } = await supabase
        .from('users')
        .select('id')
        .eq('escola_id', schoolId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      if (matriculasError || turmasError || docentesError) {
        throw new Error('Erro ao obter estatísticas da escola')
      }

      return {
        id: school.id,
        nome: school.nome,
        codigo_inep: school.codigo_inep?.[0]?.codigo_inep,
        endereco: school.endereco,
        telefone: school.telefone,
        tipo: school.tipo,
        dependencia_administrativa: 'municipal', // Default for municipal schools
        situacao_funcionamento: 'ativa',

        // Infrastructure (would come from additional tables in production)
        internet: true,
        biblioteca: false,
        laboratorio_informatica: false,
        quadra_esporte: false,
        patio_coberto: true,
        patio_descoberto: true,
        alimentacao_escolar: true,

        // Statistics
        total_matriculas: matriculas?.length || 0,
        total_turmas: turmas?.length || 0,
        total_docentes: docentes?.length || 0
      }
    } catch (error) {
      logger.error('Error generating school data export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_school_data_export'
      })
      throw error
    }
  }

  /**
   * Generate class data export (Dados da Turma)
   */
  private async generateClassDataExport(schoolId: string, year: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          turno,
          capacidade,
          professor:users(
            id,
            nome,
            codigo_inep:codigos_inep(codigo_inep)
          ),
          matriculas(id),
          codigo_inep:codigos_inep(codigo_inep)
        `)
        .eq('escola_id', schoolId)
        .eq('ano_letivo', year)
        .eq('ativo', true)

      if (error) throw error

      return data.map(turma => ({
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        turno: turma.turno,
        capacidade: turma.capacidade,
        total_matriculas: turma.matriculas?.length || 0,
        codigo_inep: turma.codigo_inep?.[0]?.codigo_inep,
        professor: {
          id: turma.professor?.id,
          nome: turma.professor?.nome,
          codigo_inep: turma.professor?.codigo_inep?.[0]?.codigo_inep
        }
      }))
    } catch (error) {
      logger.error('Error generating class data export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_class_data_export'
      })
      throw error
    }
  }

  /**
   * Generate teacher data export (Dados do Docente)
   */
  private async generateTeacherDataExport(schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nome,
          email,
          codigo_inep:codigos_inep(codigo_inep),
          turmas(id, nome, serie)
        `)
        .eq('escola_id', schoolId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      if (error) throw error

      return data.map(professor => ({
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        codigo_inep: professor.codigo_inep?.[0]?.codigo_inep,
        turmas_atribuidas: professor.turmas?.length || 0,
        turmas: professor.turmas?.map(t => ({
          id: t.id,
          nome: t.nome,
          serie: t.serie
        })) || []
      }))
    } catch (error) {
      logger.error('Error generating teacher data export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_teacher_data_export'
      })
      throw error
    }
  }

  /**
   * Generate manager data export (Dados do Gestor)
   */
  private async generateManagerDataExport(schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nome,
          email,
          tipo_usuario,
          codigo_inep:codigos_inep(codigo_inep)
        `)
        .eq('escola_id', schoolId)
        .in('tipo_usuario', ['diretor', 'secretario'])
        .eq('ativo', true)

      if (error) throw error

      return data.map(gestor => ({
        id: gestor.id,
        nome: gestor.nome,
        email: gestor.email,
        funcao: gestor.tipo_usuario,
        codigo_inep: gestor.codigo_inep?.[0]?.codigo_inep
      }))
    } catch (error) {
      logger.error('Error generating manager data export', error as Error, {
        feature: 'inep-integration',
        action: 'generate_manager_data_export'
      })
      throw error
    }
  }

  // ===== VALIDATION AND UTILITIES =====

  /**
   * Validate INEP code format
   */
  private validateINEPCodeFormat(code: string, entityType: string): boolean {
    const cleanCode = code.replace(/[^\d]/g, '')

    switch (entityType) {
      case 'escola':
        return cleanCode.length === 8
      case 'aluno':
      case 'professor':
        return cleanCode.length === 11
      case 'turma':
        return cleanCode.length === 8
      default:
        return false
    }
  }

  /**
   * Generate file hash for integrity verification
   */
  private async generateFileHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get export history for school
   */
  async getExportHistory(schoolId: string, limit: number = 20): Promise<EducacensoExport[]> {
    try {
      const { data, error } = await supabase
        .from('educacenso_exports')
        .select('*')
        .eq('escola_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as EducacensoExport[]
    } catch (error) {
      logger.error('Error fetching export history', error as Error, {
        feature: 'inep-integration',
        action: 'get_export_history'
      })
      throw error
    }
  }

  /**
   * Check data compliance for Educacenso
   */
  async checkEducacensoCompliance(schoolId: string): Promise<{
    compliant: boolean
    issues: Array<{
      type: 'error' | 'warning'
      entity: string
      message: string
    }>
  }> {
    try {
      const issues: Array<{ type: 'error' | 'warning'; entity: string; message: string }> = []

      // Check school INEP code
      const schoolINEP = await this.getINEPCodeForEntity('escola', schoolId)
      if (!schoolINEP) {
        issues.push({
          type: 'error',
          entity: 'escola',
          message: 'Escola não possui código INEP registrado'
        })
      }

      // Check students without CPF (for older students)
      const { data: studentsWithoutCPF, error: cpfError } = await supabase
        .from('alunos')
        .select('id, nome_completo, data_nascimento')
        .is('cpf', null)
        .eq('ativo', true)

      if (cpfError) throw cpfError

      studentsWithoutCPF?.forEach(student => {
        const age = new Date().getFullYear() - new Date(student.data_nascimento).getFullYear()
        if (age >= 11) { // CPF required for students 11+
          issues.push({
            type: 'warning',
            entity: 'aluno',
            message: `Estudante ${student.nome_completo} (${age} anos) sem CPF cadastrado`
          })
        }
      })

      // Check teachers without INEP codes
      const { data: teachersWithoutINEP, error: teacherError } = await supabase
        .from('users')
        .select('id, nome')
        .eq('escola_id', schoolId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      if (teacherError) throw teacherError

      for (const teacher of teachersWithoutINEP || []) {
        const teacherINEP = await this.getINEPCodeForEntity('professor', teacher.id)
        if (!teacherINEP) {
          issues.push({
            type: 'warning',
            entity: 'professor',
            message: `Professor ${teacher.nome} sem código INEP`
          })
        }
      }

      const hasErrors = issues.some(issue => issue.type === 'error')

      return {
        compliant: !hasErrors,
        issues
      }
    } catch (error) {
      logger.error('Error checking Educacenso compliance', error as Error, {
        feature: 'inep-integration',
        action: 'check_educacenso_compliance'
      })
      throw error
    }
  }
}

export const inepIntegrationApi = new INEPIntegrationService()