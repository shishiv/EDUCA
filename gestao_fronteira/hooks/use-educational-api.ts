/**
 * Educational API Hook with Enhanced Error Handling
 *
 * Features:
 * - Automatic error handling with user-friendly messages
 * - Loading states with educational context
 * - Performance monitoring
 * - Retry logic for failed operations
 * - Educational compliance logging
 */

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from './use-auth'
import { logger, LogContext } from '@/lib/logger'
import {
  handleError,
  EducationalErrorType,
  createEducationalError,
  ErrorRecoveryAction
} from '@/lib/error-handling'
import { ApiResponse, ApiOptions } from '@/lib/api/enhanced-base'

export interface UseEducationalApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  success: boolean
  retrying: boolean
  executionTime?: number
}

export interface UseEducationalApiOptions {
  feature?: string
  autoErrorHandling?: boolean
  showToastOnSuccess?: boolean
  showToastOnError?: boolean
  enableRetry?: boolean
  maxRetries?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  logUserActions?: boolean
}

export function useEducationalApi<T = any>(
  options: UseEducationalApiOptions = {}
) {
  const { userProfile } = useAuth()
  const [state, setState] = useState<UseEducationalApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
    retrying: false
  })

  const retryCountRef = useRef(0)
  const lastOperationRef = useRef<() => Promise<ApiResponse<T>> | null>(null)

  const {
    feature = 'unknown',
    autoErrorHandling = true,
    showToastOnSuccess = true,
    showToastOnError = true,
    enableRetry = true,
    maxRetries = 2,
    onSuccess,
    onError,
    logUserActions = true
  } = options

  // Create logging context
  const createContext = useCallback((action?: string, metadata?: any): LogContext => ({
    userId: userProfile?.id,
    schoolId: userProfile?.escola_id,
    userRole: userProfile?.tipo_usuario,
    feature,
    action,
    metadata
  }), [userProfile, feature])

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
      retrying: false
    })
    retryCountRef.current = 0
    lastOperationRef.current = null
  }, [])

  // Execute API operation with enhanced error handling
  const execute = useCallback(async <R = T>(
    apiCall: () => Promise<ApiResponse<R>>,
    actionName?: string,
    customOptions?: Partial<UseEducationalApiOptions>
  ): Promise<R | null> => {
    const mergedOptions = { ...options, ...customOptions }
    const context = createContext(actionName)

    // Store the operation for potential retry
    lastOperationRef.current = apiCall as () => Promise<ApiResponse<T>>

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
      retrying: retryCountRef.current > 0
    }))

    // Log user action if enabled
    if (logUserActions && actionName) {
      logger.logUserAction(actionName, context)
    }

    try {
      const startTime = performance.now()
      const result = await apiCall()
      const executionTime = performance.now() - startTime

      if (result.success && result.data !== null) {
        // Success handling
        setState(prev => ({
          ...prev,
          data: result.data as T,
          loading: false,
          error: null,
          success: true,
          retrying: false,
          executionTime: Math.round(executionTime)
        }))

        // Log successful operation
        logger.info(`Educational API Success: ${actionName || 'operation'}`, {
          ...context,
          metadata: {
            ...result.metadata,
            executionTime: Math.round(executionTime),
            dataType: typeof result.data,
            recordCount: Array.isArray(result.data) ? result.data.length : 1
          }
        })

        // Show success toast
        if (showToastOnSuccess && actionName) {
          toast.success(getSuccessMessage(actionName), {
            description: `Operação concluída em ${Math.round(executionTime)}ms`,
            duration: 3000
          })
        }

        // Call success callback
        onSuccess?.(result.data)
        retryCountRef.current = 0

        return result.data as R

      } else {
        // API returned error
        const error = result.error || new Error('Operação falhou sem detalhes')
        throw error
      }

    } catch (error) {
      const executionTime = performance.now() - Date.now()

      // Handle the error
      let educationalError: Error

      if (autoErrorHandling) {
        educationalError = handleError(error, context, false) as Error
      } else {
        educationalError = error instanceof Error ? error : new Error(String(error))
      }

      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: educationalError,
        success: false,
        retrying: false,
        executionTime: Math.round(executionTime)
      }))

      // Show error toast
      if (showToastOnError) {
        const errorMessage = getErrorMessage(educationalError, actionName)
        toast.error(errorMessage, {
          description: enableRetry && retryCountRef.current < maxRetries ?
            `Tentativa ${retryCountRef.current + 1} de ${maxRetries + 1}` :
            'Verifique sua conexão e tente novamente',
          duration: 5000
        })
      }

      // Call error callback
      onError?.(educationalError)

      return null
    }
  }, [
    options,
    createContext,
    logUserActions,
    showToastOnSuccess,
    showToastOnError,
    autoErrorHandling,
    enableRetry,
    maxRetries,
    onSuccess,
    onError
  ])

  // Retry last operation
  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastOperationRef.current || retryCountRef.current >= maxRetries) {
      return null
    }

    retryCountRef.current++

    logger.info(`Educational API Retry: attempt ${retryCountRef.current}`, createContext('retry', {
      retryAttempt: retryCountRef.current,
      maxRetries
    }))

    return execute(lastOperationRef.current, 'retry')
  }, [maxRetries, execute, createContext])

  // Get success message for operation
  const getSuccessMessage = (action: string): string => {
    const actionMap: Record<string, string> = {
      create: 'Registro criado com sucesso',
      update: 'Registro atualizado com sucesso',
      delete: 'Registro excluído com sucesso',
      save: 'Dados salvos com sucesso',
      load: 'Dados carregados com sucesso',
      search: 'Busca realizada com sucesso',
      export: 'Exportação concluída',
      import: 'Importação concluída',

      // Educational-specific actions
      'create-student': 'Aluno cadastrado com sucesso',
      'update-student': 'Dados do aluno atualizados',
      'create-class': 'Turma criada com sucesso',
      'mark-attendance': 'Frequência registrada com sucesso',
      'open-class': 'Aula aberta com sucesso',
      'close-class': 'Aula encerrada com sucesso',
      'create-enrollment': 'Matrícula realizada com sucesso',
      'update-grades': 'Notas atualizadas com sucesso'
    }

    return actionMap[action] || 'Operação realizada com sucesso'
  }

  // Get error message for operation
  const getErrorMessage = (error: Error, action?: string): string => {
    if (action) {
      const actionMap: Record<string, string> = {
        create: 'Erro ao criar registro',
        update: 'Erro ao atualizar registro',
        delete: 'Erro ao excluir registro',
        save: 'Erro ao salvar dados',
        load: 'Erro ao carregar dados',
        search: 'Erro na busca',

        // Educational-specific actions
        'create-student': 'Erro ao cadastrar aluno',
        'update-student': 'Erro ao atualizar dados do aluno',
        'mark-attendance': 'Erro ao registrar frequência',
        'open-class': 'Erro ao abrir aula',
        'create-enrollment': 'Erro ao realizar matrícula'
      }

      const baseMessage = actionMap[action] || 'Erro na operação'
      return `${baseMessage}: ${error.message}`
    }

    return error.message
  }

  // Educational-specific convenience methods
  const markAttendance = useCallback(async (attendanceData: any) => {
    return execute(
      () => Promise.resolve({ data: attendanceData, success: true, error: null }), // Replace with actual API call
      'mark-attendance'
    )
  }, [execute])

  const createStudent = useCallback(async (studentData: any) => {
    return execute(
      () => Promise.resolve({ data: studentData, success: true, error: null }), // Replace with actual API call
      'create-student'
    )
  }, [execute])

  const openClass = useCallback(async (classId: string) => {
    return execute(
      () => Promise.resolve({ data: { classId }, success: true, error: null }), // Replace with actual API call
      'open-class'
    )
  }, [execute])

  return {
    // State
    ...state,
    canRetry: enableRetry && retryCountRef.current < maxRetries && !!lastOperationRef.current,
    retryCount: retryCountRef.current,

    // Actions
    execute,
    retry,
    reset,

    // Educational-specific methods
    markAttendance,
    createStudent,
    openClass,

    // Utilities
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
    isRetrying: state.retrying
  }
}

export default useEducationalApi