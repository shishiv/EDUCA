/**
 * Descriptive Report Form Component
 * Task Group 3.2: Relatorios Descritivos (Ed. Infantil)
 *
 * This component provides a form for teachers to create and edit
 * descriptive reports for Early Childhood Education students,
 * based on BNCC's 5 Experience Fields (Campos de Experiencia).
 *
 * Features:
 * - 5 textareas for Experience Fields
 * - Auto-save draft functionality
 * - Progress indicator
 * - Finalization validation
 * - Visual feedback for completion status
 */

'use client'

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Save,
  CheckCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Clock,
  PenLine,
  Lock,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  descriptiveReportDraftSchema,
  type DescriptiveReportDraftFormData,
  canFinalize,
  transformFormDataToInput,
  transformApiDataToForm,
  calculateFormProgress,
} from '@/lib/validation/descriptive-report'
import {
  EXPERIENCE_FIELDS_CONFIG,
  REPORT_STATUS_CONFIG,
  type ReportStatus,
  type DescriptiveReport,
  type ExperienceFieldKey,
} from '@/types/descriptive-report'

// ============================================================================
// TYPES
// ============================================================================

export interface DescriptiveReportFormProps {
  /** Report ID for editing (undefined for new report) */
  reportId?: string
  /** Student name for display */
  studentName: string
  /** Semester label for display */
  semesterLabel: string
  /** Initial values for editing */
  initialValues?: Partial<DescriptiveReport>
  /** Current report status */
  status?: ReportStatus
  /** Callback when form is saved as draft */
  onSaveDraft?: (data: ReturnType<typeof transformFormDataToInput>) => Promise<void>
  /** Callback when form is finalized */
  onFinalize?: (data: ReturnType<typeof transformFormDataToInput>) => Promise<void>
  /** Callback when cancel button is clicked */
  onCancel?: () => void
  /** Whether the form is in loading state */
  isLoading?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Auto-save interval in milliseconds (0 to disable) */
  autoSaveInterval?: number
  /** CSS class for the container */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DescriptiveReportForm({
  reportId,
  studentName,
  semesterLabel,
  initialValues,
  status = 'rascunho',
  onSaveDraft,
  onFinalize,
  onCancel,
  isLoading = false,
  disabled = false,
  autoSaveInterval = 30000, // 30 seconds default
  className,
}: DescriptiveReportFormProps) {
  // State
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Form setup
  const form = useForm<DescriptiveReportDraftFormData>({
    resolver: zodResolver(descriptiveReportDraftSchema),
    defaultValues: transformApiDataToForm(initialValues || null),
  })

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
    getValues,
  } = form

  // Watch all fields for progress calculation
  const watchedFields = watch()

  // Calculate progress
  const progress = useMemo(() => {
    return calculateFormProgress(watchedFields)
  }, [watchedFields])

  // Check finalization eligibility
  const finalizationStatus = useMemo(() => {
    return canFinalize(watchedFields)
  }, [watchedFields])

  // Is finalized?
  const isFinalized = status === 'finalizado'

  // Is form disabled?
  const isFormDisabled = disabled || isLoading || isFinalized

  // Reset form when initialValues change
  useEffect(() => {
    if (initialValues) {
      reset(transformApiDataToForm(initialValues))
      setHasUnsavedChanges(false)
    }
  }, [initialValues, reset])

  // Track unsaved changes
  useEffect(() => {
    if (isDirty) {
      setHasUnsavedChanges(true)
    }
  }, [isDirty])

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveInterval <= 0 || isFinalized || !hasUnsavedChanges) {
      return
    }

    autoSaveTimerRef.current = setInterval(async () => {
      if (hasUnsavedChanges && onSaveDraft) {
        try {
          const data = getValues()
          const transformedData = transformFormDataToInput(data)
          await onSaveDraft(transformedData)
          setLastSaved(new Date())
          setHasUnsavedChanges(false)
        } catch {
          // Silent fail for auto-save
          console.warn('Auto-save failed')
        }
      }
    }, autoSaveInterval)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [autoSaveInterval, hasUnsavedChanges, isFinalized, onSaveDraft, getValues])

  // Handle save draft
  const handleSaveDraft = useCallback(
    async (data: DescriptiveReportDraftFormData) => {
      if (isFinalized) return

      setIsSaving(true)
      try {
        const transformedData = transformFormDataToInput(data)
        await onSaveDraft?.(transformedData)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        toast.success('Rascunho salvo com sucesso!')
      } catch (error) {
        toast.error('Erro ao salvar rascunho')
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [isFinalized, onSaveDraft]
  )

  // Handle finalize
  const handleFinalizeReport = useCallback(async () => {
    if (isFinalized) return

    const data = getValues()
    const { canFinalize: canFinal, missingFields } = canFinalize(data)

    if (!canFinal) {
      toast.error(`Preencha todos os campos obrigatorios: ${missingFields.join(', ')}`)
      return
    }

    setIsFinalizing(true)
    try {
      const transformedData = transformFormDataToInput(data)
      await onFinalize?.(transformedData)
      toast.success('Relatorio finalizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao finalizar relatorio')
      throw error
    } finally {
      setIsFinalizing(false)
    }
  }, [isFinalized, getValues, onFinalize])

  // Get field status indicator
  const getFieldStatusIcon = (key: ExperienceFieldKey) => {
    const fieldStatus = progress.fieldStatus[key]
    switch (fieldStatus) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partial':
        return <PenLine className="h-4 w-4 text-yellow-600" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleSaveDraft)}
        className={cn('space-y-6', className)}
      >
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Relatorio Descritivo
                </CardTitle>
                <CardDescription className="mt-1">
                  <span className="font-medium text-foreground">{studentName}</span>
                  {' - '}
                  {semesterLabel}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'flex items-center gap-1.5',
                  isFinalized
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                )}
              >
                {isFinalized ? (
                  <>
                    <Lock className="h-3 w-3" />
                    {REPORT_STATUS_CONFIG.finalizado.label}
                  </>
                ) : (
                  <>
                    <PenLine className="h-3 w-3" />
                    {REPORT_STATUS_CONFIG.rascunho.label}
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progresso: {progress.filledFields} de {progress.totalFields} campos
                </span>
                <span className="font-medium text-purple-600">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>

            {/* Auto-save status */}
            {!isFinalized && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {hasUnsavedChanges ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span>Alteracoes nao salvas</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Todas alteracoes salvas</span>
                    </>
                  )}
                </div>
                {lastSaved && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Ultimo salvamento: {formatLastSaved(lastSaved)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finalized Warning */}
        {isFinalized && (
          <Alert className="border-green-200 bg-green-50">
            <Lock className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Relatorio Finalizado</AlertTitle>
            <AlertDescription className="text-green-700">
              Este relatorio foi finalizado e nao pode mais ser alterado.
              Apenas a visualizacao esta disponivel.
            </AlertDescription>
          </Alert>
        )}

        {/* Experience Fields */}
        <div className="space-y-6">
          {EXPERIENCE_FIELDS_CONFIG.map((field, index) => (
            <Card
              key={field.key}
              className={cn(
                'transition-all',
                progress.fieldStatus[field.key] === 'complete' && 'border-green-200 bg-green-50/30'
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{field.label}</span>
                      {getFieldStatusIcon(field.key)}
                    </div>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {field.description}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={control}
                  name={field.key}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...formField}
                          id={field.key}
                          placeholder={field.placeholder}
                          disabled={isFormDisabled}
                          className={cn(
                            'min-h-[150px] resize-y',
                            isFinalized && 'bg-gray-50'
                          )}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between mt-2">
                        <FormMessage />
                        <span
                          className={cn(
                            'text-xs',
                            (formField.value?.length || 0) < field.minLength
                              ? 'text-muted-foreground'
                              : 'text-green-600'
                          )}
                        >
                          {formField.value?.length || 0} / {field.minLength} caracteres minimos
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* General Observations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Observacoes Gerais
            </CardTitle>
            <CardDescription>
              Observacoes adicionais sobre o desenvolvimento da crianca (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="observacoes_gerais"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      id="observacoes_gerais"
                      placeholder="Informacoes complementares sobre o desenvolvimento geral, recomendacoes ou pontos de atencao..."
                      disabled={isFormDisabled}
                      className={cn(
                        'min-h-[100px] resize-y',
                        isFinalized && 'bg-gray-50'
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Finalization Warning */}
        {!isFinalized && !finalizationStatus.canFinalize && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Campos Incompletos</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Para finalizar o relatorio, preencha todos os 5 Campos de Experiencia
              com pelo menos 50 caracteres cada.
              <br />
              <span className="font-medium">
                Faltam: {finalizationStatus.missingFields.join(', ')}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!isFinalized && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving || isFinalizing}
              >
                Voltar
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSaving || isFinalizing || !hasUnsavedChanges}
                  className="min-w-[140px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Rascunho
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalizeReport}
                  disabled={isSaving || isFinalizing || !finalizationStatus.canFinalize}
                  className="min-w-[140px] bg-green-600 hover:bg-green-700"
                >
                  {isFinalizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </Form>
  )
}

export default DescriptiveReportForm
