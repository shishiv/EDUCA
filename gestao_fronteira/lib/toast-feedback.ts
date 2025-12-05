/**
 * Centralized Toast Feedback System
 * Task 5.3.1: Implementar toasts de feedback
 *
 * This module provides consistent toast notifications across the application
 * using Sonner toast library.
 *
 * Toast Categories:
 * - Success: attendance saved, lesson created, grades saved
 * - Error: save failed, connection lost, validation errors
 * - Info: session locked, loading states
 * - Warning: approaching lock time, unsaved changes
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md - Task 5.3.1
 */

import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  /** Duration in milliseconds (default varies by type) */
  duration?: number
  /** Whether to show a dismiss button */
  dismissible?: boolean
  /** Custom action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Description text below the main message */
  description?: string
}

// ============================================================================
// Default Durations by Type
// ============================================================================

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4500,
}

// ============================================================================
// Toast Helper Functions
// ============================================================================

/**
 * Show a success toast
 * @param message - Main toast message
 * @param options - Additional options
 */
export function showSuccess(message: string, options?: ToastOptions): void {
  toast.success(message, {
    duration: options?.duration ?? DEFAULT_DURATIONS.success,
    description: options?.description,
    action: options?.action,
  })
}

/**
 * Show an error toast
 * @param message - Main toast message
 * @param options - Additional options
 */
export function showError(message: string, options?: ToastOptions): void {
  toast.error(message, {
    duration: options?.duration ?? DEFAULT_DURATIONS.error,
    description: options?.description,
    action: options?.action,
  })
}

/**
 * Show an info toast
 * @param message - Main toast message
 * @param options - Additional options
 */
export function showInfo(message: string, options?: ToastOptions): void {
  toast.info(message, {
    duration: options?.duration ?? DEFAULT_DURATIONS.info,
    description: options?.description,
    action: options?.action,
  })
}

/**
 * Show a warning toast
 * @param message - Main toast message
 * @param options - Additional options
 */
export function showWarning(message: string, options?: ToastOptions): void {
  toast.warning(message, {
    duration: options?.duration ?? DEFAULT_DURATIONS.warning,
    description: options?.description,
    action: options?.action,
  })
}

/**
 * Show a loading toast that can be updated
 * @param message - Main toast message
 * @returns Toast ID for updating/dismissing
 */
export function showLoading(message: string): string | number {
  return toast.loading(message)
}

/**
 * Dismiss a specific toast or all toasts
 * @param toastId - Optional toast ID to dismiss specific toast
 */
export function dismissToast(toastId?: string | number): void {
  if (toastId) {
    toast.dismiss(toastId)
  } else {
    toast.dismiss()
  }
}

// ============================================================================
// Diario de Classe Specific Toasts
// ============================================================================

/**
 * Toast collection for Attendance/Frequency operations
 */
export const attendanceToasts = {
  /** Single student attendance marked */
  marked: (studentName: string, status: 'presente' | 'falta' | 'atestado' | 'desmarcado') => {
    const statusLabels = {
      presente: 'presente',
      falta: 'ausente',
      atestado: 'com atestado',
      desmarcado: 'desmarcado',
    }
    showSuccess(`${studentName} marcado como ${statusLabels[status]}`, {
      duration: 2000,
    })
  },

  /** Batch attendance saved */
  batchSaved: (count: number, status: 'presente' | 'falta') => {
    showSuccess(
      `${count} aluno(s) marcado(s) como ${status === 'presente' ? 'presente(s)' : 'ausente(s)'}`,
      { duration: 3000 }
    )
  },

  /** All attendance saved */
  saved: () => {
    showSuccess('Frequencia salva com sucesso!', {
      duration: 3000,
    })
  },

  /** Attendance save failed */
  saveFailed: (reason?: string) => {
    showError('Erro ao salvar frequencia. Tente novamente.', {
      description: reason,
      duration: 5000,
    })
  },

  /** Session is locked */
  sessionLocked: () => {
    showWarning('Frequencia bloqueada. Nao e possivel fazer alteracoes.', {
      description: 'A sessao foi bloqueada apos as 18:00 ou ja foi finalizada.',
      duration: 5000,
    })
  },

  /** Approaching lock time warning */
  lockWarning: (minutesLeft: number) => {
    showWarning(`Atencao: Bloqueio automatico em ${minutesLeft} minuto(s)`, {
      description: 'Finalize as marcacoes de frequencia antes do bloqueio.',
      duration: 6000,
    })
  },

  /** Session created */
  sessionCreated: () => {
    showSuccess('Sessao de aula criada para hoje', {
      duration: 3000,
    })
  },

  /** Connection lost */
  connectionLost: () => {
    showError('Conexao perdida', {
      description: 'As alteracoes serao sincronizadas quando a conexao for restabelecida.',
      duration: 6000,
    })
  },

  /** Connection restored */
  connectionRestored: () => {
    showSuccess('Conexao restabelecida', {
      duration: 3000,
    })
  },
}

/**
 * Toast collection for Lesson Content operations
 */
export const lessonToasts = {
  /** Lesson created successfully */
  created: () => {
    showSuccess('Nova aula criada com sucesso!', {
      duration: 3000,
    })
  },

  /** Lesson content saved */
  contentSaved: () => {
    showSuccess('Conteudo da aula salvo com sucesso!', {
      duration: 3000,
    })
  },

  /** Lesson deleted */
  deleted: () => {
    showSuccess('Aula excluida com sucesso', {
      duration: 3000,
    })
  },

  /** Lesson creation failed */
  createFailed: (reason?: string) => {
    showError('Erro ao criar aula. Tente novamente.', {
      description: reason,
      duration: 5000,
    })
  },

  /** Content save failed */
  saveFailed: (reason?: string) => {
    showError('Erro ao salvar conteudo da aula', {
      description: reason,
      duration: 5000,
    })
  },

  /** Delete failed */
  deleteFailed: (reason?: string) => {
    showError('Erro ao excluir aula', {
      description: reason,
      duration: 5000,
    })
  },

  /** Loading lesson details */
  loadingDetail: () => {
    return showLoading('Carregando detalhes da aula...')
  },

  /** Detail load failed */
  detailLoadFailed: () => {
    showError('Erro ao carregar detalhes da aula', {
      duration: 5000,
    })
  },

  /** Edit info placeholder */
  editNotAvailable: () => {
    showInfo('Funcao de edicao sera implementada em breve', {
      duration: 3000,
    })
  },
}

/**
 * Toast collection for Grade operations
 */
export const gradeToasts = {
  /** Grades saved */
  saved: () => {
    showSuccess('Notas salvas com sucesso!', {
      duration: 3000,
    })
  },

  /** Grade save failed */
  saveFailed: (reason?: string) => {
    showError('Erro ao salvar notas. Tente novamente.', {
      description: reason,
      duration: 5000,
    })
  },

  /** Invalid grade value */
  invalidValue: () => {
    showWarning('Nota invalida. Digite um valor entre 0 e 10.', {
      duration: 4000,
    })
  },
}

/**
 * Toast collection for Descriptive Report operations
 */
export const reportToasts = {
  /** Draft saved */
  draftSaved: () => {
    showSuccess('Rascunho salvo com sucesso!', {
      duration: 3000,
    })
  },

  /** Report finalized */
  finalized: () => {
    showSuccess('Relatorio finalizado com sucesso!', {
      description: 'O relatorio foi salvo e nao pode mais ser alterado.',
      duration: 4000,
    })
  },

  /** Draft save failed */
  draftSaveFailed: () => {
    showError('Erro ao salvar rascunho', {
      duration: 5000,
    })
  },

  /** Finalization failed */
  finalizationFailed: () => {
    showError('Erro ao finalizar relatorio', {
      duration: 5000,
    })
  },

  /** Missing required fields */
  missingFields: (fields: string[]) => {
    showWarning(`Preencha todos os campos obrigatorios`, {
      description: `Faltam: ${fields.join(', ')}`,
      duration: 5000,
    })
  },

  /** Auto-save indicator */
  autoSaving: () => {
    return showLoading('Salvando automaticamente...')
  },
}

/**
 * Toast collection for Export operations
 */
export const exportToasts = {
  /** PDF export started */
  pdfStarted: () => {
    return showLoading('Gerando PDF...')
  },

  /** PDF export completed */
  pdfCompleted: () => {
    showSuccess('PDF gerado com sucesso!', {
      duration: 3000,
    })
  },

  /** Excel export started */
  excelStarted: () => {
    return showLoading('Gerando planilha Excel...')
  },

  /** Excel export completed */
  excelCompleted: () => {
    showSuccess('Planilha Excel gerada com sucesso!', {
      duration: 3000,
    })
  },

  /** Export failed */
  exportFailed: (format: 'PDF' | 'Excel') => {
    showError(`Erro ao gerar ${format}. Tente novamente.`, {
      duration: 5000,
    })
  },
}

/**
 * Toast collection for General/Data operations
 */
export const dataToasts = {
  /** Data loading failed */
  loadFailed: (entity: string) => {
    showError(`Erro ao carregar ${entity}. Tente novamente.`, {
      duration: 5000,
    })
  },

  /** Data not found */
  notFound: (entity: string) => {
    showInfo(`${entity} nao encontrado(a)`, {
      duration: 4000,
    })
  },

  /** Selection required */
  selectionRequired: (entity: string) => {
    showInfo(`Selecione ${entity} para continuar`, {
      duration: 3000,
    })
  },

  /** Unsaved changes warning */
  unsavedChanges: () => {
    showWarning('Voce tem alteracoes nao salvas', {
      description: 'Salve suas alteracoes antes de sair.',
      duration: 4000,
    })
  },

  /** Validation error */
  validationError: (message: string) => {
    showError(message, {
      duration: 4000,
    })
  },
}

// ============================================================================
// Export default object for convenience
// ============================================================================

export const feedback = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  dismiss: dismissToast,
  attendance: attendanceToasts,
  lesson: lessonToasts,
  grade: gradeToasts,
  report: reportToasts,
  export: exportToasts,
  data: dataToasts,
}

export default feedback
