/**
 * TypeScript types for Diario de Classe (Class Diary) feature
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 1.1: Database Schema Extension
 */

// ============================================================================
// ATTENDANCE STATUS ENUM
// ============================================================================

/**
 * Three-state attendance status for Brazilian educational compliance
 * P = Presente (Present) - green
 * F = Falta (Absent) - red
 * A = Atestado (Excused absence with medical certificate) - yellow/orange
 */
export type StatusPresenca = 'P' | 'F' | 'A';

/**
 * Maps status_presenca to display properties
 */
export const STATUS_PRESENCA_CONFIG = {
  P: {
    label: 'Presente',
    shortLabel: 'P',
    color: 'green',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    textColor: '#166534',
  },
  F: {
    label: 'Falta',
    shortLabel: 'F',
    color: 'red',
    bgColor: '#fee2e2',
    borderColor: '#ef4444',
    textColor: '#991b1b',
  },
  A: {
    label: 'Atestado',
    shortLabel: 'A',
    color: 'amber',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    textColor: '#92400e',
  },
} as const;

// ============================================================================
// FREQUENCIA (ATTENDANCE) TYPES
// ============================================================================

/**
 * Extended frequencia record with three-state attendance
 */
export interface FrequenciaRecord {
  id: string;
  matricula_id: string;
  sessao_id: string | null;
  data_aula: string;
  presente: boolean;
  status_presenca: StatusPresenca | null;
  justificativa: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at?: string;
  // Immutability fields
  immutable_at?: string | null;
  legal_hash?: string | null;
  created_by?: string | null;
}

/**
 * Attendance record for grid display
 */
export interface AttendanceGridItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  matriculaId: string;
  status: StatusPresenca | null;
  justificativa?: string;
  isLocked: boolean;
  canEdit: boolean;
}

/**
 * Attendance summary statistics
 */
export interface AttendanceSummary {
  total: number;
  presentes: number;
  faltas: number;
  atestados: number;
  percentualPresenca: number;
  percentualFrequencia: number; // (presentes + atestados) / total * 100
}

// ============================================================================
// CONTEUDO_AULA (LESSON CONTENT) TYPES
// ============================================================================

/**
 * BNCC skill code format
 * EF = Ensino Fundamental (Elementary School)
 * EI = Educacao Infantil (Early Childhood Education)
 * Pattern: E[FI][year][subject][number]
 * Example: EF01MA06 (1st grade, Math, skill 06)
 */
export type BNNCSkillCode = string;

/**
 * Lesson content record linked to sessoes_aula
 */
export interface ConteudoAula {
  id: string;
  sessao_id: string;
  tema: string;
  objetivo: string;
  habilidades_bncc: BNNCSkillCode[];
  metodologia: string | null;
  recursos: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Lesson content form data (for creating/updating)
 */
export interface ConteudoAulaFormData {
  tema: string;
  objetivo: string;
  habilidades_bncc: BNNCSkillCode[];
  metodologia?: string;
  recursos?: string;
  observacoes?: string;
}

/**
 * Detailed lesson content view (from vw_conteudo_aula_detalhado)
 */
export interface ConteudoAulaDetalhado extends ConteudoAula {
  // Session information
  data_aula: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  status_sessao: SessaoStatus;
  // Class information
  turma_id: string;
  turma_nome: string;
  turma_serie: string;
  ano_letivo: number;
  // School information
  escola_id: string;
  escola_nome: string;
  // Teacher information
  professor_id: string;
  professor_nome: string;
}

// ============================================================================
// SESSOES_AULA (CLASS SESSION) TYPES
// ============================================================================

/**
 * Session status for three-phase workflow
 */
export type SessaoStatus = 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA';

/**
 * Class session record
 */
export interface SessaoAula {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina_id: string | null;
  data_aula: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: SessaoStatus;
  criada_em: string;
  aberta_em: string | null;
  fechada_em: string | null;
  cancelada_em: string | null;
  auto_fechamento_agendado: string | null;
  observacoes_fechamento: string | null;
  conteudo_ministrado: string | null;
  hash_legal: string | null;
  tempo_total_aula: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Session with related data for UI display
 */
export interface SessaoAulaComDetalhes extends SessaoAula {
  turma?: {
    id: string;
    nome: string;
    serie: string;
    ano_letivo: number;
  };
  escola?: {
    id: string;
    nome: string;
  };
  professor?: {
    id: string;
    nome: string;
  };
  disciplina?: {
    id: string;
    nome: string;
    codigo: string;
  };
  conteudo?: ConteudoAula;
  frequenciaResumo?: AttendanceSummary;
}

// ============================================================================
// BNCC REFERENCE TYPES
// ============================================================================

/**
 * BNCC subject codes
 */
export const BNCC_SUBJECT_CODES = {
  // Ensino Fundamental
  LP: 'Lingua Portuguesa',
  MA: 'Matematica',
  CI: 'Ciencias',
  HI: 'Historia',
  GE: 'Geografia',
  AR: 'Arte',
  EF: 'Educacao Fisica',
  ER: 'Ensino Religioso',
  LI: 'Lingua Inglesa',
  // Educacao Infantil - Campos de Experiencia
  EO: 'O eu, o outro e o nos',
  CG: 'Corpo, gestos e movimentos',
  TS: 'Tracos, sons, cores e formas',
  EF_EI: 'Escuta, fala, pensamento e imaginacao',
  ET: 'Espacos, tempos, quantidades, relacoes e transformacoes',
} as const;

/**
 * BNCC skill reference (optional lookup)
 */
export interface BNNCSkill {
  codigo: string;
  descricao: string;
  ano_escolar: string;
  componente_curricular: string;
  unidade_tematica?: string;
  objeto_conhecimento?: string;
}

// ============================================================================
// BOLSA FAMILIA TYPES
// ============================================================================

/**
 * Student at risk for Bolsa Familia compliance
 */
export interface AlunoRiscoBolsaFamilia {
  alunoId: string;
  alunoNome: string;
  nis: string;
  turmaId: string;
  turmaNome: string;
  frequenciaPercentual: number;
  totalFaltas: number;
  totalAtestados: number;
  emRisco: boolean; // < 80% attendance
}

// ============================================================================
// UI/UX HELPER TYPES
// ============================================================================

/**
 * Attendance cell state for grid
 */
export interface AttendanceCellState {
  status: StatusPresenca | null;
  isLoading: boolean;
  isLocked: boolean;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Session lock status
 */
export interface SessionLockStatus {
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  reason: 'time' | 'manual' | 'session_closed' | null;
  canUnlock: boolean;
}

/**
 * Time validation result
 */
export interface TimeValidation {
  isBefore18h: boolean;
  currentTime: string;
  timezone: string;
  canEdit: boolean;
  message: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API response for attendance operations
 */
export interface AttendanceApiResponse {
  success: boolean;
  data?: FrequenciaRecord[];
  error?: string;
  summary?: AttendanceSummary;
}

/**
 * API response for lesson content operations
 */
export interface ConteudoAulaApiResponse {
  success: boolean;
  data?: ConteudoAula;
  error?: string;
}

/**
 * API response for session operations
 */
export interface SessaoApiResponse {
  success: boolean;
  data?: SessaoAula;
  error?: string;
  lockStatus?: SessionLockStatus;
}

// ============================================================================
// FORM VALIDATION SCHEMAS (Zod-compatible)
// ============================================================================

/**
 * Validation rules for attendance status
 */
export const ATTENDANCE_VALIDATION = {
  validStatuses: ['P', 'F', 'A'] as StatusPresenca[],
  maxJustificativaLength: 500,
  maxObservacoesLength: 1000,
} as const;

/**
 * Validation rules for lesson content
 */
export const CONTEUDO_VALIDATION = {
  minTemaLength: 3,
  maxTemaLength: 200,
  minObjetivoLength: 10,
  maxObjetivoLength: 500,
  maxHabilidadesBNCC: 10,
  maxMetodologiaLength: 1000,
  maxRecursosLength: 500,
  maxObservacoesLength: 1000,
  bnccSkillPattern: /^E[FI][0-9]{2}[A-Z]{2}[0-9]{2}$/,
} as const;
