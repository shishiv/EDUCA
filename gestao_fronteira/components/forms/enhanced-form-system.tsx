/**
 * Enhanced Form System with Progressive Validation and Auto-Save
 * Addresses High Priority UX Issue: Form UX problems (8h implementation)
 * Brazilian Educational Compliance Implementation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  AlertCircle,
  Save,
  Clock,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

// Brazilian validation utilities
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '')
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleanCPF.charAt(10))
}

const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '')
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const formatPhone = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '')
  if (cleanValue.length <= 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

// Form field types with Brazilian educational context
export interface FormFieldConfig {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'cpf' | 'date' | 'select' | 'textarea'
  placeholder?: string
  helpText?: string
  required?: boolean
  validation?: z.ZodSchema
  options?: { value: string; label: string }[]
  educationalContext?: string // Brazilian educational explanation
  inepRequired?: boolean // Required for INEP reporting
  autoComplete?: string
  maxLength?: number
  formatOnChange?: (value: string) => string
}

// Generic form data type
export type FormData = Record<string, unknown>

export interface EnhancedFormProps<TFormData extends FormData = FormData> {
  formId: string
  title: string
  subtitle?: string
  fields: FormFieldConfig[]
  schema: z.ZodSchema<TFormData>
  onSubmit: (data: TFormData) => Promise<void>
  onAutoSave?: (data: TFormData) => Promise<void>
  defaultValues?: Partial<TFormData>
  showProgress?: boolean
  allowDrafts?: boolean
  educationalCompliance?: {
    inepRequired?: boolean
    lgpdConsent?: boolean
    municipalCompliance?: boolean
  }
  sessionTimeout?: number // minutes
  className?: string
}

// Auto-save hook with generic type
const useAutoSave = <TFormData extends FormData = FormData>(
  formData: TFormData | undefined,
  onAutoSave?: (data: TFormData) => Promise<void>,
  delay: number = 3000
) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const triggerAutoSave = useCallback(async () => {
    if (!onAutoSave || !formData) return

    setSaveStatus('saving')
    try {
      await onAutoSave(formData)
      setSaveStatus('saved')
      setLastSaved(new Date())

      // Reset to idle after showing saved status
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      console.error('Auto-save failed:', error)
    }
  }, [formData, onAutoSave])

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (formData && Object.keys(formData).length > 0) {
      timeoutRef.current = setTimeout(triggerAutoSave, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [formData, triggerAutoSave, delay])

  return { saveStatus, lastSaved }
}

// Helper function to check if value exists and is not empty
const hasFilledValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number' || typeof value === 'boolean') return true
  return false
}

// Progress calculation with generic type
const calculateProgress = <TFormData extends FormData = FormData>(
  fields: FormFieldConfig[],
  formData: TFormData
): number => {
  const requiredFields = fields.filter(field => field.required)
  const completedRequired = requiredFields.filter(field =>
    hasFilledValue(formData[field.name])
  )

  const allFields = fields.length
  const completedAll = fields.filter(field =>
    hasFilledValue(formData[field.name])
  )

  // Weight required fields more heavily
  const requiredWeight = 0.7
  const optionalWeight = 0.3

  const requiredProgress = requiredFields.length > 0
    ? (completedRequired.length / requiredFields.length) * requiredWeight
    : requiredWeight

  const optionalProgress = allFields > 0
    ? (completedAll.length / allFields) * optionalWeight
    : optionalWeight

  return Math.round((requiredProgress + optionalProgress) * 100)
}

// Type for form errors (from react-hook-form)
type FormErrors = Record<string, { message?: string } | undefined>
type TouchedFields = Record<string, boolean | undefined>

// Field validation status with typed parameters
const getFieldValidationStatus = <TFormData extends FormData = FormData>(
  fieldName: string,
  errors: FormErrors,
  touchedFields: TouchedFields,
  formData: TFormData
): 'idle' | 'valid' | 'invalid' | 'required' => {
  const hasError = errors[fieldName]
  const isTouched = touchedFields[fieldName]
  const hasValue = hasFilledValue(formData[fieldName])

  if (hasError && isTouched) return 'invalid'
  if (hasValue && !hasError) return 'valid'
  if (isTouched && !hasValue) return 'required'
  return 'idle'
}

export const EnhancedFormSystem = <TFormData extends FormData = FormData>({
  formId,
  title,
  subtitle,
  fields,
  schema,
  onSubmit,
  onAutoSave,
  defaultValues = {} as Partial<TFormData>,
  showProgress = true,
  allowDrafts = true,
  educationalCompliance,
  sessionTimeout = 30,
  className = ''
}: EnhancedFormProps<TFormData>) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [sessionWarning, setSessionWarning] = useState(false)
  const sessionTimeoutRef = useRef<NodeJS.Timeout>()

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange' // Progressive validation
  })

  const {
    handleSubmit,
    watch,
    formState: { errors, touchedFields, isValid },
    trigger,
    setValue
  } = methods

  const formData = watch()
  const { saveStatus, lastSaved } = useAutoSave(formData, onAutoSave)

  // Session timeout management
  useEffect(() => {
    const resetSessionTimeout = () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
      }

      sessionTimeoutRef.current = setTimeout(() => {
        setSessionWarning(true)
        toast.warning('Sessão expirará em 2 minutos. Salve suas alterações!', {
          duration: 5000,
          action: {
            label: 'Estender Sessão',
            onClick: () => {
              setSessionWarning(false)
              resetSessionTimeout()
            }
          }
        })
      }, (sessionTimeout - 2) * 60 * 1000) // Warning 2 minutes before timeout
    }

    resetSessionTimeout()

    // Reset timeout on any form interaction
    const handleUserActivity = () => {
      if (sessionWarning) {
        setSessionWarning(false)
      }
      resetSessionTimeout()
    }

    document.addEventListener('keypress', handleUserActivity)
    document.addEventListener('click', handleUserActivity)

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
      }
      document.removeEventListener('keypress', handleUserActivity)
      document.removeEventListener('click', handleUserActivity)
    }
  }, [sessionTimeout, sessionWarning])

  // Progress calculation
  const progress = showProgress ? calculateProgress(fields, formData) : 0

  // Handle form submission with typed data
  const handleFormSubmit = async (data: TFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      toast.success('Formulário enviado com sucesso!')
    } catch (error) {
      toast.error('Erro ao enviar formulário. Tente novamente.')
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Field-specific formatting
  const handleFieldChange = (field: FormFieldConfig, value: string) => {
    let formattedValue = value

    if (field.formatOnChange) {
      formattedValue = field.formatOnChange(value)
    } else if (field.type === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (field.type === 'tel') {
      formattedValue = formatPhone(value)
    }

    setValue(field.name, formattedValue)

    // Trigger validation after formatting
    setTimeout(() => trigger(field.name), 100)
  }

  // Render field with enhanced UX
  const renderField = (field: FormFieldConfig) => {
    const validationStatus = getFieldValidationStatus(
      field.name,
      errors,
      touchedFields,
      formData
    )

    const hasError = errors[field.name]
    const isPasswordField = field.type === 'password'
    const showPassword = showPasswords[field.name]

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={field.name}
            className={`text-sm font-medium ${
              field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''
            }`}
          >
            {field.label}
            {field.inepRequired && (
              <Badge variant="secondary" className="ml-2 text-xs">
                INEP
              </Badge>
            )}
          </Label>

          {/* Validation status indicator */}
          {validationStatus === 'valid' && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {validationStatus === 'invalid' && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}

          {/* Help text trigger */}
          {field.helpText && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              title={field.helpText}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Controller
            name={field.name}
            control={methods.control}
            render={({ field: controllerField }) => {
              if (field.type === 'select') {
                return (
                  <select
                    {...controllerField}
                    id={field.name}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      hasError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-input focus:border-primary'
                    } ${validationStatus === 'valid' ? 'border-green-500' : ''}`}
                    autoComplete={field.autoComplete}
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )
              }

              if (field.type === 'textarea') {
                return (
                  <textarea
                    {...controllerField}
                    id={field.name}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    className={`w-full rounded-md border px-3 py-2 text-sm resize-vertical min-h-[80px] ${
                      hasError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-input focus:border-primary'
                    } ${validationStatus === 'valid' ? 'border-green-500' : ''}`}
                    autoComplete={field.autoComplete}
                  />
                )
              }

              return (
                <Input
                  {...controllerField}
                  id={field.name}
                  type={isPasswordField && !showPassword ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className={`${
                    hasError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-input focus:border-primary'
                  } ${validationStatus === 'valid' ? 'border-green-500' : ''}
                  ${isPasswordField ? 'pr-10' : ''}`}
                  autoComplete={field.autoComplete}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                />
              )
            }}
          />

          {/* Password visibility toggle */}
          {isPasswordField && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPasswords(prev => ({
                ...prev,
                [field.name]: !prev[field.name]
              }))}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Field-level error message */}
        {hasError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {hasError.message}
          </p>
        )}

        {/* Educational context help */}
        {field.educationalContext && !hasError && (
          <p className="text-xs text-muted-foreground">
            💡 {field.educationalContext}
          </p>
        )}

        {/* Character count for limited fields */}
        {field.maxLength && field.type === 'textarea' && (
          <p className="text-xs text-muted-foreground text-right">
            {(formData[field.name] || '').length}/{field.maxLength}
          </p>
        )}
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <Card className={`w-full max-w-2xl mx-auto ${className}`}>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {/* Progress indicator */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso do formulário</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Auto-save status */}
          {allowDrafts && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === 'saving' && (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Salvando automaticamente...
                </>
              )}
              {saveStatus === 'saved' && lastSaved && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Salvo às {lastSaved.toLocaleTimeString('pt-BR')}
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Erro ao salvar automaticamente
                </>
              )}
            </div>
          )}

          {/* Session warning */}
          {sessionWarning && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sua sessão expirará em breve. Continue preenchendo para manter ativa.
              </AlertDescription>
            </Alert>
          )}

          {/* Educational compliance notice */}
          {educationalCompliance && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">
                📋 Conformidade Educacional
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                {educationalCompliance.inepRequired && (
                  <p>• Dados necessários para relatórios INEP/Educacenso</p>
                )}
                {educationalCompliance.lgpdConsent && (
                  <p>• Coleta de dados conforme LGPD</p>
                )}
                {educationalCompliance.municipalCompliance && (
                  <p>• Atende padrões municipais de Fronteira/MG</p>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Form fields */}
            <div className="space-y-4">
              {fields.map(renderField)}
            </div>

            {/* Form actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enviar Formulário
                  </>
                )}
              </Button>

              {allowDrafts && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onAutoSave?.(formData)}
                  disabled={saveStatus === 'saving'}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Rascunho
                </Button>
              )}
            </div>

            {/* Form completion summary */}
            {showProgress && (
              <div className="text-center text-sm text-muted-foreground">
                {progress === 100 ? (
                  <span className="text-green-600 font-medium">
                    ✅ Formulário completo e pronto para envio
                  </span>
                ) : (
                  <span>
                    {progress}% completo • {fields.filter(f => f.required).length} campos obrigatórios
                  </span>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  )
}

// Student registration form data type
interface StudentRegistrationData extends FormData {
  nome_completo: string
  cpf: string
  data_nascimento: string
  responsavel_nome: string
  responsavel_telefone: string
  endereco: string
  observacoes?: string
}

// Usage example with Brazilian educational context
export const StudentRegistrationForm: React.FC = () => {
  const studentSchema = z.object({
    nome_completo: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().refine(validateCPF, 'CPF inválido'),
    data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
    responsavel_nome: z.string().min(3, 'Nome do responsável é obrigatório'),
    responsavel_telefone: z.string().min(10, 'Telefone inválido'),
    endereco: z.string().min(10, 'Endereço deve ser completo'),
    observacoes: z.string().optional()
  }) satisfies z.ZodSchema<StudentRegistrationData>

  const fields: FormFieldConfig[] = [
    {
      name: 'nome_completo',
      label: 'Nome Completo do Aluno',
      type: 'text',
      required: true,
      placeholder: 'Digite o nome completo',
      educationalContext: 'Nome deve corresponder exatamente ao da certidão de nascimento',
      inepRequired: true,
      autoComplete: 'name'
    },
    {
      name: 'cpf',
      label: 'CPF do Aluno',
      type: 'cpf',
      required: true,
      placeholder: '000.000.000-00',
      educationalContext: 'CPF necessário para programas sociais como Bolsa Família',
      inepRequired: true,
      helpText: 'Apenas números. Será formatado automaticamente.'
    },
    {
      name: 'data_nascimento',
      label: 'Data de Nascimento',
      type: 'date',
      required: true,
      educationalContext: 'Determina a série adequada conforme idade',
      inepRequired: true
    },
    {
      name: 'responsavel_nome',
      label: 'Nome do Responsável',
      type: 'text',
      required: true,
      placeholder: 'Nome do pai, mãe ou responsável legal',
      educationalContext: 'Responsável legal pela matrícula e acompanhamento escolar',
      autoComplete: 'name'
    },
    {
      name: 'responsavel_telefone',
      label: 'Telefone do Responsável',
      type: 'tel',
      required: true,
      placeholder: '(00) 00000-0000',
      educationalContext: 'Usado para comunicações urgentes da escola',
      autoComplete: 'tel'
    },
    {
      name: 'endereco',
      label: 'Endereço Completo',
      type: 'textarea',
      required: true,
      placeholder: 'Rua, número, bairro, CEP',
      educationalContext: 'Determina zona de atendimento e transporte escolar',
      maxLength: 200
    },
    {
      name: 'observacoes',
      label: 'Observações Médicas/Pedagógicas',
      type: 'textarea',
      placeholder: 'Alergias, necessidades especiais, medicamentos...',
      educationalContext: 'Informações importantes para segurança e aprendizado',
      maxLength: 500
    }
  ]

  const handleSubmit = async (data: StudentRegistrationData) => {
    console.log('Student registration data:', data)
    // Handle submission
  }

  const handleAutoSave = async (data: StudentRegistrationData) => {
    console.log('Auto-saving student registration:', data)
    // Handle auto-save
  }

  return (
    <EnhancedFormSystem<StudentRegistrationData>
      formId="student-registration"
      title="Matrícula de Aluno"
      subtitle="Cadastro de novo aluno na rede municipal de Fronteira/MG"
      fields={fields}
      schema={studentSchema}
      onSubmit={handleSubmit}
      onAutoSave={handleAutoSave}
      showProgress={true}
      allowDrafts={true}
      educationalCompliance={{
        inepRequired: true,
        lgpdConsent: true,
        municipalCompliance: true
      }}
      sessionTimeout={30}
    />
  )
}

export default EnhancedFormSystem