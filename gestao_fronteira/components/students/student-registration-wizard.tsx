/**
 * Student Registration Wizard
 * Guided multi-step process optimized for school secretaries
 * Reduces complexity and prevents errors in student enrollment
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Users,
  MapPin,
  GraduationCap,
  Heart,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Upload,
  Info,
  Clock,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Import step components
import { PersonalInfoStep } from './wizard-steps/personal-info-step'
import { ContactInfoStep } from './wizard-steps/contact-info-step'
import { FamilyInfoStep } from './wizard-steps/family-info-step'
import { EducationalInfoStep } from './wizard-steps/educational-info-step'
import { HealthInfoStep } from './wizard-steps/health-info-step'
import { ReviewStep } from './wizard-steps/review-step'

// Wizard step configuration
const WIZARD_STEPS = [
  {
    id: 'personal',
    title: 'Dados Pessoais',
    description: 'Informações básicas do estudante',
    icon: User,
    fields: ['nome_completo', 'cpf', 'data_nascimento', 'sexo', 'cor_raca'],
    estimatedTime: '2-3 minutos'
  },
  {
    id: 'contact',
    title: 'Contato e Endereço',
    description: 'Informações de localização',
    icon: MapPin,
    fields: ['telefone', 'email', 'cep', 'endereco', 'numero', 'bairro'],
    estimatedTime: '2-3 minutos'
  },
  {
    id: 'family',
    title: 'Informações Familiares',
    description: 'Dados dos responsáveis',
    icon: Users,
    fields: ['nome_mae', 'cpf_mae', 'nome_pai', 'contato_emergencia'],
    estimatedTime: '3-4 minutos'
  },
  {
    id: 'educational',
    title: 'Dados Educacionais',
    description: 'Série, turno e programas sociais',
    icon: GraduationCap,
    fields: ['serie_ano', 'turno', 'bolsa_familia', 'transporte_escolar'],
    estimatedTime: '1-2 minutos'
  },
  {
    id: 'health',
    title: 'Saúde e Autorizações',
    description: 'Necessidades especiais e consentimentos',
    icon: Heart,
    fields: ['necessidades_especiais', 'medicamentos', 'autorizacoes'],
    estimatedTime: '2-3 minutos'
  },
  {
    id: 'review',
    title: 'Revisão e Confirmação',
    description: 'Verificar todos os dados antes de salvar',
    icon: FileText,
    fields: [],
    estimatedTime: '1-2 minutos'
  }
] as const

type WizardStepId = typeof WIZARD_STEPS[number]['id']

// Form schema for each step
const personalInfoSchema = z.object({
  nome_completo: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(14, 'CPF deve estar completo'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  sexo: z.enum(['M', 'F'], { required_error: 'Sexo é obrigatório' }),
  cor_raca: z.enum(['branca', 'preta', 'parda', 'amarela', 'indigena'], {
    required_error: 'Cor/raça é obrigatória'
  }),
  rg: z.string().optional()
})

const contactInfoSchema = z.object({
  telefone: z.string().min(14, 'Telefone deve estar completo'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cep: z.string().min(9, 'CEP deve estar completo'),
  endereco: z.string().min(10, 'Endereço deve ser mais específico'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Use sigla do estado')
})

const familyInfoSchema = z.object({
  nome_mae: z.string().min(3, 'Nome da mãe é obrigatório'),
  cpf_mae: z.string().optional(),
  telefone_mae: z.string().optional(),
  nome_pai: z.string().optional(),
  cpf_pai: z.string().optional(),
  telefone_pai: z.string().optional(),
  contato_emergencia_nome: z.string().min(3, 'Nome do contato de emergência é obrigatório'),
  contato_emergencia_telefone: z.string().min(14, 'Telefone de emergência deve estar completo'),
  contato_emergencia_parentesco: z.string().min(2, 'Parentesco é obrigatório')
})

const educationalInfoSchema = z.object({
  serie_ano: z.string().min(1, 'Série/Ano é obrigatório'),
  turno: z.enum(['matutino', 'vespertino', 'noturno', 'integral'], {
    required_error: 'Turno é obrigatório'
  }),
  escola_origem: z.string().optional(),
  bolsa_familia: z.boolean().default(false),
  nis: z.string().optional(),
  transporte_escolar: z.boolean().default(false)
})

const healthInfoSchema = z.object({
  necessidades_especiais: z.string().optional(),
  medicamentos: z.string().optional(),
  alergias: z.string().optional(),
  autorizacao_imagem: z.boolean().default(false),
  autorizacao_saida: z.boolean().default(false)
})

// Combined schema for final validation
const completeStudentSchema = personalInfoSchema
  .merge(contactInfoSchema)
  .merge(familyInfoSchema)
  .merge(educationalInfoSchema)
  .merge(healthInfoSchema)

type StudentFormData = z.infer<typeof completeStudentSchema>

interface StudentRegistrationWizardProps {
  student?: Partial<StudentFormData>
  onSuccess?: (student: StudentFormData) => void
  onCancel?: () => void
  className?: string
}

export function StudentRegistrationWizard({
  student,
  onSuccess,
  onCancel,
  className
}: StudentRegistrationWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState<WizardStepId>('personal')
  const [completedSteps, setCompletedSteps] = React.useState<Set<WizardStepId>>(new Set())
  const [stepErrors, setStepErrors] = React.useState<Record<WizardStepId, string[]>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = React.useState<NodeJS.Timeout | null>(null)

  const isEditing = !!student

  // Initialize form with default values
  const methods = useForm<StudentFormData>({
    resolver: zodResolver(completeStudentSchema),
    mode: 'onChange',
    defaultValues: {
      sexo: 'M',
      cor_raca: 'parda',
      turno: 'matutino',
      bolsa_familia: false,
      transporte_escolar: false,
      autorizacao_imagem: false,
      autorizacao_saida: false,
      estado: 'MG',
      cidade: 'Fronteira',
      ...student
    }
  })

  const { watch, trigger, getValues } = methods

  // Get current step configuration
  const currentStepConfig = WIZARD_STEPS.find(step => step.id === currentStep)!
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep)
  const totalSteps = WIZARD_STEPS.length
  const progress = ((currentStepIndex + 1) / totalSteps) * 100

  // Auto-save functionality
  const performAutoSave = React.useCallback(async () => {
    try {
      const currentData = getValues()

      // Save to localStorage
      localStorage.setItem(
        `student-wizard-${student?.cpf || 'new'}`,
        JSON.stringify({
          data: currentData,
          currentStep,
          completedSteps: Array.from(completedSteps),
          timestamp: new Date().toISOString()
        })
      )

      // Show subtle feedback
      toast.success('Dados salvos automaticamente', {
        duration: 2000,
        icon: <Save className="h-4 w-4" />
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [getValues, currentStep, completedSteps, student?.cpf])

  // Watch form changes for auto-save
  React.useEffect(() => {
    const subscription = watch(() => {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }

      // Set new timer for auto-save
      const timer = setTimeout(performAutoSave, 10000) // Auto-save every 10 seconds
      setAutoSaveTimer(timer)
    })

    return () => {
      subscription.unsubscribe()
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [watch, autoSaveTimer, performAutoSave])

  // Load saved data on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const savedData = localStorage.getItem(`student-wizard-${student?.cpf || 'new'}`)
    if (savedData) {
      try {
        const { data, currentStep: savedStep, completedSteps: savedCompleted, timestamp } = JSON.parse(savedData)
        const saveTime = new Date(timestamp)
        const hoursSinceLastSave = (Date.now() - saveTime.getTime()) / (1000 * 60 * 60)

        if (hoursSinceLastSave < 24) {
          toast.info(
            `Dados salvos encontrados de ${saveTime.toLocaleTimeString('pt-BR')}. Deseja continuar?`,
            {
              action: {
                label: 'Continuar',
                onClick: () => {
                  methods.reset(data)
                  setCurrentStep(savedStep)
                  setCompletedSteps(new Set(savedCompleted))
                  toast.success('Progresso restaurado com sucesso')
                }
              },
              duration: 15000
            }
          )
        }
      } catch (error) {
        console.error('Failed to load saved data:', error)
      }
    }
  }, [student?.cpf, methods])

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepSchema = getStepSchema(currentStep)
    if (!stepSchema) return true

    try {
      const currentData = getValues()
      await stepSchema.parseAsync(currentData)

      // Clear errors for this step
      setStepErrors(prev => ({ ...prev, [currentStep]: [] }))
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message)
        setStepErrors(prev => ({ ...prev, [currentStep]: errorMessages }))

        // Show first error
        toast.error(errorMessages[0])
      }
      return false
    }
  }

  // Get schema for specific step
  const getStepSchema = (stepId: WizardStepId) => {
    switch (stepId) {
      case 'personal': return personalInfoSchema
      case 'contact': return contactInfoSchema
      case 'family': return familyInfoSchema
      case 'educational': return educationalInfoSchema
      case 'health': return healthInfoSchema
      default: return null
    }
  }

  // Navigate to next step
  const goToNextStep = async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) return

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]))

    // Move to next step
    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].id)
    }
  }

  // Navigate to previous step
  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].id)
    }
  }

  // Navigate to specific step
  const goToStep = (stepId: WizardStepId) => {
    setCurrentStep(stepId)
  }

  // Submit the complete form
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Validate all data
      const formData = getValues()
      const validatedData = completeStudentSchema.parse(formData)

      console.log('Submitting student data:', validatedData)

      // Here you would call your API
      // const result = await studentsApi.create(validatedData)

      // Clear saved data
      localStorage.removeItem(`student-wizard-${student?.cpf || 'new'}`)

      toast.success('Estudante cadastrado com sucesso!')
      onSuccess?.(validatedData)
      router.push('/dashboard/alunos')
    } catch (error) {
      console.error('Error submitting student:', error)
      if (error instanceof z.ZodError) {
        toast.error('Dados inválidos. Verifique os campos obrigatórios.')
      } else {
        toast.error('Erro ao cadastrar estudante. Tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return <PersonalInfoStep />
      case 'contact':
        return <ContactInfoStep />
      case 'family':
        return <FamilyInfoStep />
      case 'educational':
        return <EducationalInfoStep />
      case 'health':
        return <HealthInfoStep />
      case 'review':
        return <ReviewStep onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      default:
        return null
    }
  }

  const hasErrors = stepErrors[currentStep]?.length > 0
  const canProceed = currentStep === 'review' || completedSteps.has(currentStep)

  return (
    <FormProvider {...methods}>
      <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {isEditing ? 'Editar Cadastro de Estudante' : 'Novo Cadastro de Estudante'}
                </CardTitle>
                <CardDescription>
                  Sistema guiado de cadastro - Passo {currentStepIndex + 1} de {totalSteps}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {currentStepConfig.estimatedTime}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  INEP Compliant
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{Math.round(progress)}% concluído</span>
                <span>{completedSteps.size} de {totalSteps - 1} etapas concluídas</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-x-auto">
                {WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = completedSteps.has(step.id)
                  const isCurrent = step.id === currentStep
                  const hasStepErrors = stepErrors[step.id]?.length > 0

                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all min-w-max",
                        isCurrent && "bg-primary text-primary-foreground shadow-sm",
                        isCompleted && !isCurrent && "bg-green-100 text-green-700",
                        hasStepErrors && "bg-red-100 text-red-700",
                        !isCurrent && !isCompleted && !hasStepErrors && "hover:bg-muted"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : hasStepErrors ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{step.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                hasErrors ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              )}>
                {hasErrors ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <currentStepConfig.icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle>{currentStepConfig.title}</CardTitle>
                <CardDescription>{currentStepConfig.description}</CardDescription>
              </div>
            </div>

            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Corrija os seguintes erros antes de prosseguir:</p>
                    <ul className="list-disc list-inside text-sm">
                      {stepErrors[currentStep].map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>

          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  className="flex items-center gap-2"
                >
                  Cancelar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {currentStep !== 'review' && (
                  <Button
                    type="button"
                    onClick={() => performAutoSave()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Rascunho
                  </Button>
                )}

                {currentStep === 'review' ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {isEditing ? 'Atualizar Cadastro' : 'Finalizar Cadastro'}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    className="flex items-center gap-2"
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Help Text */}
            <Separator className="my-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                Seus dados são salvos automaticamente a cada 10 segundos.
                Use "Salvar Rascunho" para salvar manualmente e continuar depois.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  )
}