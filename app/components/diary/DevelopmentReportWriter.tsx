/**
 * DevelopmentReportWriter Component
 * Form for writing descriptive development reports per Campo de Experiencia
 *
 * Features:
 * - 5 textareas for each Campo de Experiencia
 * - Campo headers with color and emoji
 * - Character count and progress indicator
 * - Save Draft and Finalize buttons
 * - onCampoFocus callback for sidebar sync
 *
 * CRITICAL: No grades, scores, or numerical indicators
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-03-PLAN.md
 */

'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import {
  Save,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react'

// Components
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

// Types
import {
  type CampoType,
  CAMPOS_EXPERIENCIA,
  getAllCampos,
  type Vivencia,
} from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

export interface ReportFormValues {
  campo_eu: string
  campo_corpo: string
  campo_tracos: string
  campo_escuta: string
  campo_espacos: string
  observacoes_gerais: string
}

export interface DevelopmentReportWriterProps {
  /** Student name for display */
  studentName: string
  /** Semester label for display (e.g., "1o Semestre de 2026") */
  semesterLabel: string
  /** Initial values for editing */
  initialValues?: Partial<ReportFormValues>
  /** Callback when form is saved as draft */
  onSave?: (data: ReportFormValues) => Promise<void>
  /** Callback when form is finalized */
  onFinalize?: (data: ReportFormValues) => Promise<void>
  /** Callback when a campo field is focused (for sidebar sync) */
  onCampoFocus?: (campo: CampoType | null) => void
  /** Vivencias for reference (passed to parent for sidebar) */
  vivencias?: Vivencia[]
  /** Whether the form is in loading state */
  isLoading?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const MIN_CHARS_FOR_FINALIZATION = 50

const CAMPO_FIELD_MAP: Record<CampoType, keyof ReportFormValues> = {
  eu: 'campo_eu',
  corpo: 'campo_corpo',
  tracos: 'campo_tracos',
  escuta: 'campo_escuta',
  espacos: 'campo_espacos',
}

const PLACEHOLDERS: Record<CampoType, string> = {
  eu: 'Descreva como a crianca desenvolveu sua identidade pessoal, interacoes sociais e senso de coletividade durante este periodo...',
  corpo: 'Descreva o desenvolvimento motor da crianca, sua expressao corporal e participacao em atividades fisicas...',
  tracos: 'Descreva a expressao artistica da crianca, seu interesse por musica, artes visuais e manifestacoes culturais...',
  escuta: 'Descreva o desenvolvimento da linguagem oral, capacidade de comunicacao, criatividade e imaginacao...',
  espacos: 'Descreva a compreensao da crianca sobre espaco, tempo, quantidade e sua relacao com o ambiente...',
}

const DEFAULT_VALUES: ReportFormValues = {
  campo_eu: '',
  campo_corpo: '',
  campo_tracos: '',
  campo_escuta: '',
  campo_espacos: '',
  observacoes_gerais: '',
}

// ============================================================================
// Component
// ============================================================================

export function DevelopmentReportWriter({
  studentName,
  semesterLabel,
  initialValues,
  onSave,
  onFinalize,
  onCampoFocus,
  isLoading = false,
  disabled = false,
  className,
}: DevelopmentReportWriterProps) {
  // Form state
  const [values, setValues] = useState<ReportFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [focusedCampo, setFocusedCampo] = useState<CampoType | null>(null)

  const isFormDisabled = disabled || isLoading

  // Calculate progress
  const progress = useMemo(() => {
    const campos = getAllCampos()
    let filledCount = 0

    campos.forEach((campo) => {
      const fieldKey = CAMPO_FIELD_MAP[campo.key]
      const value = values[fieldKey] || ''
      if (value.trim().length >= MIN_CHARS_FOR_FINALIZATION) {
        filledCount++
      }
    })

    return {
      filled: filledCount,
      total: campos.length,
      percentage: Math.round((filledCount / campos.length) * 100),
    }
  }, [values])

  // Check if can finalize
  const canFinalize = useMemo(() => {
    const campos = getAllCampos()
    const missingFields: string[] = []

    campos.forEach((campo) => {
      const fieldKey = CAMPO_FIELD_MAP[campo.key]
      const value = values[fieldKey] || ''
      if (value.trim().length < MIN_CHARS_FOR_FINALIZATION) {
        missingFields.push(campo.shortName)
      }
    })

    return {
      canFinalize: missingFields.length === 0,
      missingFields,
    }
  }, [values])

  // Handlers
  const handleFieldChange = useCallback(
    (fieldKey: keyof ReportFormValues, value: string) => {
      setValues((prev) => ({ ...prev, [fieldKey]: value }))
    },
    []
  )

  const handleFieldFocus = useCallback(
    (campo: CampoType) => {
      setFocusedCampo(campo)
      onCampoFocus?.(campo)
    },
    [onCampoFocus]
  )

  const handleFieldBlur = useCallback(() => {
    setFocusedCampo(null)
    onCampoFocus?.(null)
  }, [onCampoFocus])

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave?.(values)
      toast.success('Rascunho salvo com sucesso!')
    } catch (error) {
      logger.error('Error saving draft', error as Error, {
        feature: 'reports',
        action: 'save_development_report_draft'
      })
      toast.error('Erro ao salvar rascunho')
    } finally {
      setIsSaving(false)
    }
  }, [values, onSave])

  const handleFinalize = useCallback(async () => {
    if (!canFinalize.canFinalize) {
      toast.error(
        `Preencha todos os campos obrigatorios: ${canFinalize.missingFields.join(', ')}`
      )
      return
    }

    setIsFinalizing(true)
    try {
      await onFinalize?.(values)
      toast.success('Relatorio finalizado com sucesso!')
    } catch (error) {
      logger.error('Error finalizing report', error as Error, {
        feature: 'reports',
        action: 'finalize_development_report'
      })
      toast.error('Erro ao finalizar relatorio')
    } finally {
      setIsFinalizing(false)
    }
  }, [values, canFinalize, onFinalize])

  const campos = getAllCampos()

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Progresso do Relatorio</span>
            <span className="text-sm font-medium text-purple-600">
              {progress.filled}/{progress.total} campos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Preencha todos os 5 Campos de Experiencia com pelo menos{' '}
            {MIN_CHARS_FOR_FINALIZATION} caracteres para finalizar
          </p>
        </CardContent>
      </Card>

      {/* Campo Fields */}
      {campos.map((campo, index) => {
        const fieldKey = CAMPO_FIELD_MAP[campo.key]
        const value = values[fieldKey] || ''
        const charCount = value.length
        const isFilled = charCount >= MIN_CHARS_FOR_FINALIZATION
        const isFocused = focusedCampo === campo.key

        return (
          <CampoField
            key={campo.key}
            index={index + 1}
            campo={campo}
            value={value}
            placeholder={PLACEHOLDERS[campo.key]}
            charCount={charCount}
            minChars={MIN_CHARS_FOR_FINALIZATION}
            isFilled={isFilled}
            isFocused={isFocused}
            disabled={isFormDisabled}
            onChange={(newValue) => handleFieldChange(fieldKey, newValue)}
            onFocus={() => handleFieldFocus(campo.key)}
            onBlur={handleFieldBlur}
          />
        )
      })}

      {/* General Observations (optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Observacoes Gerais
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Informacoes complementares sobre o desenvolvimento (opcional)
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            id="observacoes_gerais"
            value={values.observacoes_gerais}
            onChange={(e) =>
              handleFieldChange('observacoes_gerais', e.target.value)
            }
            placeholder="Informacoes adicionais, recomendacoes ou pontos de atencao..."
            disabled={isFormDisabled}
            className="min-h-[100px] resize-y"
          />
        </CardContent>
      </Card>

      {/* Finalization Warning */}
      {!canFinalize.canFinalize && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Campos Incompletos
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            Para finalizar, preencha todos os campos com pelo menos{' '}
            {MIN_CHARS_FOR_FINALIZATION} caracteres.
            <br />
            <span className="font-medium">
              Faltam: {canFinalize.missingFields.join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving || isFinalizing || isFormDisabled}
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
          onClick={handleFinalize}
          disabled={
            isSaving ||
            isFinalizing ||
            !canFinalize.canFinalize ||
            isFormDisabled
          }
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
  )
}

// ============================================================================
// CampoField Sub-component
// ============================================================================

interface CampoFieldProps {
  index: number
  campo: ReturnType<typeof getAllCampos>[number]
  value: string
  placeholder: string
  charCount: number
  minChars: number
  isFilled: boolean
  isFocused: boolean
  disabled: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
}

function CampoField({
  index,
  campo,
  value,
  placeholder,
  charCount,
  minChars,
  isFilled,
  isFocused,
  disabled,
  onChange,
  onFocus,
  onBlur,
}: CampoFieldProps) {
  return (
    <Card
      className={cn(
        'transition-all',
        isFilled && 'border-green-200 bg-green-50/30',
        isFocused && 'ring-2 ring-purple-400 ring-offset-2'
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          {/* Number badge with campo color */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-white font-medium text-sm"
            style={{ backgroundColor: campo.color }}
          >
            {index}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span>{campo.emoji}</span>
              <span>{campo.name}</span>
              {isFilled && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {campo.description}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Textarea
            id={`campo_${campo.key}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'min-h-[150px] resize-y',
              isFilled && 'border-green-300'
            )}
          />
          <div className="flex items-center justify-end">
            <span
              className={cn(
                'text-xs',
                charCount < minChars
                  ? 'text-muted-foreground'
                  : 'text-green-600 font-medium'
              )}
            >
              {charCount} / {minChars} caracteres minimos
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DevelopmentReportWriter
