/**
 * Enhanced Form System for Brazilian Educational Management
 * Features: Progressive validation, auto-save, field-level help, session management
 * Optimized for municipal administrative workflows and classroom tablet usage
 */

'use client'

import * as React from 'react'
import { useForm, FormProvider, useFormContext, UseFormProps, FieldPath, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  HelpCircle,
  Loader2,
  Shield,
  FileText,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { debounce } from 'lodash'

// Auto-save configuration types
interface AutoSaveConfig {
  enabled: boolean
  interval: number // milliseconds
  onSave: (data: any) => Promise<void>
  key: string // unique identifier for session storage
}

// Field help configuration
interface FieldHelpConfig {
  title: string
  description: string
  examples?: string[]
  validation?: string
  compliance?: string // Brazilian educational compliance info
}

// Enhanced form context
interface EnhancedFormContextType {
  autoSaveConfig?: AutoSaveConfig
  isAutoSaving: boolean
  lastAutoSave: Date | null
  validationMode: 'progressive' | 'onSubmit' | 'onChange'
  fieldHelp: Record<string, FieldHelpConfig>
  formProgress: number
  submitStates: {
    isDraft: boolean
    isSubmitting: boolean
    isValidating: boolean
  }
}

const EnhancedFormContext = React.createContext<EnhancedFormContextType | null>(null)

// Enhanced form provider props
interface EnhancedFormProviderProps<T extends FieldValues> extends UseFormProps<T> {
  children: React.ReactNode
  autoSave?: AutoSaveConfig
  fieldHelp?: Record<string, FieldHelpConfig>
  validationMode?: 'progressive' | 'onSubmit' | 'onChange'
  onProgressChange?: (progress: number) => void
  className?: string
  title?: string
  description?: string
  complianceLevel?: 'INEP' | 'Municipal' | 'LGPD'
}

/**
 * Enhanced Form Provider with auto-save and progressive validation
 */
export function EnhancedFormProvider<T extends FieldValues>({
  children,
  autoSave,
  fieldHelp = {},
  validationMode = 'progressive',
  onProgressChange,
  className,
  title,
  description,
  complianceLevel,
  ...formProps
}: EnhancedFormProviderProps<T>) {
  const [isAutoSaving, setIsAutoSaving] = React.useState(false)
  const [lastAutoSave, setLastAutoSave] = React.useState<Date | null>(null)
  const [formProgress, setFormProgress] = React.useState(0)
  const [submitStates, setSubmitStates] = React.useState({
    isDraft: false,
    isSubmitting: false,
    isValidating: false
  })

  // Initialize form with enhanced configuration
  const methods = useForm<T>({
    ...formProps,
    mode: validationMode === 'progressive' ? 'onChange' : formProps.mode || 'onSubmit',
    resolver: formProps.resolver || (formProps.schema ? zodResolver(formProps.schema) : undefined)
  })

  const { watch, getValues, formState } = methods

  // Auto-save functionality
  const performAutoSave = React.useCallback(async () => {
    if (!autoSave?.enabled || !autoSave.onSave) return

    try {
      setIsAutoSaving(true)
      const currentData = getValues()

      // Store in session storage for recovery
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `enhanced-form-${autoSave.key}`,
          JSON.stringify({
            data: currentData,
            timestamp: new Date().toISOString(),
            progress: formProgress
          })
        )
      }

      await autoSave.onSave(currentData)
      setLastAutoSave(new Date())

      toast.success('Rascunho salvo automaticamente', {
        icon: <Save className="h-4 w-4" />,
        duration: 2000
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
      toast.error('Falha ao salvar rascunho automaticamente')
    } finally {
      setIsAutoSaving(false)
    }
  }, [autoSave, getValues, formProgress])

  // Debounced auto-save
  const debouncedAutoSave = React.useMemo(
    () => debounce(performAutoSave, autoSave?.interval || 5000),
    [performAutoSave, autoSave?.interval]
  )

  // Watch form changes for auto-save
  React.useEffect(() => {
    if (!autoSave?.enabled) return

    const subscription = watch(() => {
      debouncedAutoSave()
    })

    return () => {
      subscription.unsubscribe()
      debouncedAutoSave.cancel()
    }
  }, [watch, debouncedAutoSave, autoSave?.enabled])

  // Calculate form progress
  React.useEffect(() => {
    const fieldsWithValues = Object.keys(getValues()).filter(key => {
      const value = getValues(key as FieldPath<T>)
      return value !== '' && value !== null && value !== undefined
    })

    const totalFields = Object.keys(formProps.defaultValues || {}).length
    const progress = totalFields > 0 ? (fieldsWithValues.length / totalFields) * 100 : 0

    setFormProgress(Math.round(progress))
    onProgressChange?.(progress)
  }, [watch(), getValues, formProps.defaultValues, onProgressChange])

  // Load saved draft on mount
  React.useEffect(() => {
    if (!autoSave?.enabled || typeof window === 'undefined') return

    const savedData = sessionStorage.getItem(`enhanced-form-${autoSave.key}`)
    if (savedData) {
      try {
        const { data, timestamp, progress } = JSON.parse(savedData)
        const savedTime = new Date(timestamp)
        const hoursSinceLastSave = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60)

        if (hoursSinceLastSave < 24) { // Offer to restore if less than 24 hours old
          toast.info(
            `Rascunho encontrado de ${savedTime.toLocaleTimeString('pt-BR')}. Deseja restaurar?`,
            {
              action: {
                label: 'Restaurar',
                onClick: () => {
                  methods.reset(data)
                  setFormProgress(progress || 0)
                  toast.success('Rascunho restaurado com sucesso')
                }
              },
              duration: 10000
            }
          )
        }
      } catch (error) {
        console.error('Failed to load saved draft:', error)
      }
    }
  }, [autoSave?.enabled, autoSave?.key, methods])

  const contextValue: EnhancedFormContextType = {
    autoSaveConfig: autoSave,
    isAutoSaving,
    lastAutoSave,
    validationMode,
    fieldHelp,
    formProgress,
    submitStates
  }

  return (
    <TooltipProvider>
      <EnhancedFormContext.Provider value={contextValue}>
        <FormProvider {...methods}>
          <Card className={cn("w-full", className)}>
            {(title || description || complianceLevel) && (
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    {title && <CardTitle className="text-xl font-semibold">{title}</CardTitle>}
                    {description && <CardDescription className="mt-1">{description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2">
                    {complianceLevel && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {complianceLevel}
                      </Badge>
                    )}
                    {formProgress > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {formProgress}% completo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {formProgress > 0 && (
                  <div className="space-y-2">
                    <Progress value={formProgress} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Progresso do formulário</span>
                      {autoSave?.enabled && (
                        <div className="flex items-center gap-1">
                          {isAutoSaving ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</>
                          ) : lastAutoSave ? (
                            <><CheckCircle className="h-3 w-3 text-green-600" /> Salvo às {lastAutoSave.toLocaleTimeString('pt-BR')}</>
                          ) : (
                            <><Clock className="h-3 w-3" /> Auto-save ativo</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
            )}

            <CardContent className="space-y-6">
              {children}
            </CardContent>
          </Card>
        </FormProvider>
      </EnhancedFormContext.Provider>
    </TooltipProvider>
  )
}

/**
 * Hook to access enhanced form context
 */
export function useEnhancedForm() {
  const context = React.useContext(EnhancedFormContext)
  if (!context) {
    throw new Error('useEnhancedForm must be used within an EnhancedFormProvider')
  }
  return context
}

/**
 * Enhanced form field with progressive validation and help
 */
interface EnhancedFormFieldProps {
  name: string
  children: React.ReactNode
  helpKey?: string
  className?: string
  showValidation?: boolean
  required?: boolean
}

export function EnhancedFormField({
  name,
  children,
  helpKey,
  className,
  showValidation = true,
  required = false
}: EnhancedFormFieldProps) {
  const { fieldHelp, validationMode } = useEnhancedForm()
  const { formState } = useFormContext()
  const error = formState.errors[name]
  const touchedField = formState.touchedFields[name]
  const isValid = !error && touchedField

  const help = helpKey ? fieldHelp[helpKey] : null

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {children}
        </div>

        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">{help.title}</h4>
                <p className="text-sm">{help.description}</p>
                {help.examples && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Exemplos:</p>
                    {help.examples.map((example, idx) => (
                      <code key={idx} className="block text-xs bg-muted px-2 py-1 rounded">
                        {example}
                      </code>
                    ))}
                  </div>
                )}
                {help.compliance && (
                  <Alert className="mt-2">
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Conformidade:</strong> {help.compliance}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {showValidation && validationMode === 'progressive' && touchedField && (
          <div className="flex items-center">
            {isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message as string}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Enhanced submit button with multiple action support
 */
interface EnhancedSubmitActionsProps {
  onSubmit: (data: any) => Promise<void>
  onSaveDraft?: (data: any) => Promise<void>
  onValidate?: (data: any) => Promise<void>
  submitLabel?: string
  draftLabel?: string
  validateLabel?: string
  className?: string
  disabled?: boolean
}

export function EnhancedSubmitActions({
  onSubmit,
  onSaveDraft,
  onValidate,
  submitLabel = "Enviar",
  draftLabel = "Salvar Rascunho",
  validateLabel = "Validar",
  className,
  disabled = false
}: EnhancedSubmitActionsProps) {
  const { submitStates } = useEnhancedForm()
  const { handleSubmit, getValues, trigger } = useFormContext()
  const [currentAction, setCurrentAction] = React.useState<string>('')

  const handleAction = async (action: 'submit' | 'draft' | 'validate') => {
    setCurrentAction(action)

    try {
      if (action === 'validate') {
        const isValid = await trigger()
        if (isValid && onValidate) {
          await onValidate(getValues())
          toast.success('Formulário validado com sucesso')
        }
      } else if (action === 'draft' && onSaveDraft) {
        await onSaveDraft(getValues())
        toast.success('Rascunho salvo com sucesso')
      } else if (action === 'submit') {
        await handleSubmit(onSubmit)()
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error)
      toast.error(`Falha ao ${action === 'submit' ? 'enviar' : action === 'draft' ? 'salvar rascunho' : 'validar'}`)
    } finally {
      setCurrentAction('')
    }
  }

  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t", className)}>
      <Button
        type="submit"
        onClick={() => handleAction('submit')}
        disabled={disabled || !!currentAction}
        className="flex items-center gap-2"
      >
        {currentAction === 'submit' && <Loader2 className="h-4 w-4 animate-spin" />}
        <FileText className="h-4 w-4" />
        {submitLabel}
      </Button>

      {onSaveDraft && (
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAction('draft')}
          disabled={disabled || !!currentAction}
          className="flex items-center gap-2"
        >
          {currentAction === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          {draftLabel}
        </Button>
      )}

      {onValidate && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleAction('validate')}
          disabled={disabled || !!currentAction}
          className="flex items-center gap-2"
        >
          {currentAction === 'validate' && <Loader2 className="h-4 w-4 animate-spin" />}
          <Zap className="h-4 w-4" />
          {validateLabel}
        </Button>
      )}

      <div className="flex-1" />

      <div className="text-sm text-muted-foreground">
        {submitStates.isSubmitting && "Enviando..."}
        {submitStates.isValidating && "Validando..."}
        {submitStates.isDraft && "Salvando rascunho..."}
      </div>
    </div>
  )
}