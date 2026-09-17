/**
 * VivenciaForm Component
 * Form for registering child observations (vivencias)
 *
 * Features:
 * - Date picker (defaults to today)
 * - Multi-select Campo de Experiencia selector
 * - Description textarea with validation
 * - Optional observations field
 * - Form validation with react-hook-form + zod
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Loader2, Save, X } from 'lucide-react'

// Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CampoExperienciaSelector } from './CampoExperienciaSelector'

// Types
import {
  type CampoType,
  type VivenciaFormData,
  VIVENCIA_VALIDATION,
  VIVENCIA_ERROR_MESSAGES,
} from '@/types/diario-infantil'
import { useClassroomTranslations } from '@/i18n/classroom'

// ============================================================================
// Validation Schema
// ============================================================================

const vivenciaSchema = z.object({
  data_vivencia: z.string().min(1, VIVENCIA_ERROR_MESSAGES.dataRequired),
  campos_experiencia: z
    .array(z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos']))
    .min(1, VIVENCIA_ERROR_MESSAGES.noCampoSelected),
  descricao: z
    .string()
    .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
    .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong),
  observacoes: z
    .string()
    .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
    .optional()
    .or(z.literal('')),
})

// ============================================================================
// Types
// ============================================================================

export interface VivenciaFormProps {
  /** Form submission handler */
  onSubmit: (data: VivenciaFormData) => Promise<void>
  /** Student name for display */
  studentName: string
  /** Initial form data (for editing) */
  initialData?: Partial<VivenciaFormData>
  /** Loading state */
  isLoading?: boolean
  /** Disable form interactions */
  disabled?: boolean
  /** Cancel button handler */
  onCancel?: () => void
  /** Additional class name */
  className?: string
}

function initialVivenciaValues({
  data_vivencia = format(new Date(), 'yyyy-MM-dd'),
  campos_experiencia = [],
  descricao = '',
  observacoes = '',
}: Partial<VivenciaFormData> = {}): VivenciaFormData {
  return { data_vivencia, campos_experiencia, descricao, observacoes }
}

// ============================================================================
// Component
// ============================================================================

export function VivenciaForm({
  onSubmit,
  studentName,
  initialData,
  isLoading = false,
  disabled = false,
  onCancel,
  className,
}: VivenciaFormProps) {
  const t = useClassroomTranslations()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VivenciaFormData>({
    resolver: zodResolver(vivenciaSchema),
    defaultValues: initialVivenciaValues(initialData),
  })

  const selectedCampos = useWatch({ control, name: 'campos_experiencia' })
  const descricao = useWatch({ control, name: 'descricao' })

  const handleCamposChange = React.useCallback((campos: CampoType[]) => {
    setValue('campos_experiencia', campos, { shouldValidate: true })
  }, [setValue])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  const isDisabled = disabled || isLoading || isSubmitting
  const descricaoLength = descricao.length

  const renderDateField = () => (
    <div className="space-y-2">
      <Label htmlFor="data_vivencia">Data da Vivência <span className="text-red-500">*</span></Label>
      <Input id="data_vivencia" type="date" {...register('data_vivencia')} disabled={isDisabled} error={!!errors.data_vivencia} aria-invalid={!!errors.data_vivencia} aria-describedby="data_vivencia-error" max={format(new Date(), 'yyyy-MM-dd')} />
      {errors.data_vivencia && <p id="data_vivencia-error" role="alert" className="text-sm text-red-500">{errors.data_vivencia.message}</p>}
    </div>
  )

  const renderCamposField = () => (
    <div className="space-y-3">
      <p id="campos_experiencia-label" className="text-sm font-medium">Campos de Experiência <span className="text-red-500">*</span></p>
      <p id="campos_experiencia-hint" className="text-sm text-muted-foreground">Selecione os campos trabalhados nesta vivência (pode selecionar vários)</p>
      <CampoExperienciaSelector selectedCampos={selectedCampos} onSelectionChange={handleCamposChange} disabled={isDisabled} labelledBy="campos_experiencia-label" describedBy="campos_experiencia-hint campos_experiencia-error" />
      {errors.campos_experiencia && <p id="campos_experiencia-error" role="alert" className="text-sm text-red-500">{errors.campos_experiencia.message}</p>}
    </div>
  )

  const renderDescriptionField = () => (
    <div className="space-y-2">
      <Label htmlFor="descricao">Descrição da Vivência <span className="text-red-500">*</span></Label>
      <p className="text-sm text-muted-foreground">Descreva o que foi observado, as interações e descobertas da criança</p>
      <Textarea id="descricao" {...register('descricao')} disabled={isDisabled} aria-invalid={!!errors.descricao} aria-describedby="descricao-help" placeholder="Descreva detalhadamente a vivência observada..." rows={5} className={cn(errors.descricao && 'border-red-500 focus:ring-red-500/30 focus:border-red-500')} />
      <div className="flex justify-between text-xs">
        <span id="descricao-help" role={errors.descricao ? 'alert' : undefined} className={cn(errors.descricao ? 'text-red-500' : 'text-muted-foreground')}>
          {errors.descricao?.message || `Mínimo ${VIVENCIA_VALIDATION.minDescricaoLength} caracteres`}
        </span>
        <span className={cn('tabular-nums', descricaoLength < VIVENCIA_VALIDATION.minDescricaoLength && 'text-amber-600', descricaoLength >= VIVENCIA_VALIDATION.minDescricaoLength && 'text-green-600', descricaoLength > VIVENCIA_VALIDATION.maxDescricaoLength && 'text-red-500')}>
          {descricaoLength}/{VIVENCIA_VALIDATION.maxDescricaoLength}
        </span>
      </div>
    </div>
  )

  const renderObservationsField = () => (
    <div className="space-y-2">
      <Label htmlFor="observacoes">Observações Adicionais<span className="text-muted-foreground font-normal ml-2">(opcional)</span></Label>
      <Textarea id="observacoes" {...register('observacoes')} disabled={isDisabled} aria-invalid={!!errors.observacoes} aria-describedby="observacoes-error" placeholder="Anotações adicionais, contexto ou observações para acompanhamento..." rows={3} className={cn(errors.observacoes && 'border-red-500 focus:ring-red-500/30 focus:border-red-500')} />
      {errors.observacoes && <p id="observacoes-error" role="alert" className="text-sm text-red-500">{errors.observacoes.message}</p>}
    </div>
  )

  return (
    <form
      aria-label={`Registrar vivência de ${studentName}`}
      onSubmit={onFormSubmit}
      className={cn('space-y-6', className)}
    >
      {/* Student info */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <p className="text-sm text-muted-foreground">Registrando vivência para:</p>
        <p className="font-medium text-foreground">{studentName}</p>
      </div>

      {renderDateField()}
      {renderCamposField()}
      {renderDescriptionField()}
      {renderObservationsField()}

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            {t('diary.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isDisabled}
        >
          {isSubmitting || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('actions.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Vivência
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default VivenciaForm
