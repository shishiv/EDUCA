/**
 * Guided Student Registration Workflow
 * Addresses High Priority UX Issue: Student registration workflow complex (10h implementation)
 * Brazilian Educational Compliance with Multi-Guardian Support
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  MapPin,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Save,
  Send,
  Home,
  Phone,
  Mail,
  Calendar,
  Shield,
  Book,
  Heart
} from 'lucide-react'
import { EnhancedFormSystem, FormFieldConfig } from './enhanced-form-system'
import { toast } from 'sonner'

// Brazilian educational validation schemas
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

// Step 1: Basic Student Information
const studentInfoSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo'),
  nome_social: z.string().optional(),
  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .refine(validateCPF, 'CPF inválido'),
  rg: z.string().min(7, 'RG deve ter pelo menos 7 dígitos'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  genero: z.enum(['masculino', 'feminino', 'outro', 'nao_informar']),
  cor_raca: z.enum(['branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarada']),
  nacionalidade: z.string().default('brasileira'),
  naturalidade: z.string().min(2, 'Naturalidade é obrigatória'),
  uf_nascimento: z.string().length(2, 'UF deve ter 2 caracteres')
})

// Step 2: Contact and Address Information
const contactInfoSchema = z.object({
  endereco_rua: z.string().min(5, 'Endereço deve ser completo'),
  endereco_numero: z.string().min(1, 'Número é obrigatório'),
  endereco_complemento: z.string().optional(),
  endereco_bairro: z.string().min(2, 'Bairro é obrigatório'),
  endereco_cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  endereco_cidade: z.string().default('Fronteira'),
  endereco_uf: z.string().default('MG'),
  telefone_principal: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  telefone_secundario: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  transporte_escolar: z.boolean().default(false),
  zona_residencia: z.enum(['urbana', 'rural'])
})

// Step 3: Guardian Information (supports multiple guardians)
const guardianSchema = z.object({
  nome_completo: z.string().min(3, 'Nome do responsável é obrigatório'),
  parentesco: z.enum(['pai', 'mae', 'avo', 'ava', 'tio', 'tia', 'outro']),
  parentesco_outro: z.string().optional(),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  rg: z.string().min(7, 'RG deve ter pelo menos 7 dígitos'),
  profissao: z.string().min(2, 'Profissão é obrigatória'),
  escolaridade: z.enum(['fundamental_incompleto', 'fundamental_completo', 'medio_incompleto', 'medio_completo', 'superior_incompleto', 'superior_completo', 'pos_graduacao']),
  telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  email: z.string().email('Email inválido').optional(),
  principal: z.boolean().default(false) // Responsável principal para contatos
})

const guardiansInfoSchema = z.object({
  responsaveis: z.array(guardianSchema).min(1, 'Pelo menos um responsável é obrigatório')
})

// Step 4: Educational Information
const educationalInfoSchema = z.object({
  escola_anterior: z.string().optional(),
  ano_ultima_serie: z.string().optional(),
  situacao_anterior: z.enum(['aprovado', 'reprovado', 'transferido', 'primeira_matricula']),
  necessidades_especiais: z.boolean().default(false),
  tipo_necessidade: z.string().optional(),
  medicacao_continua: z.boolean().default(false),
  medicacao_detalhes: z.string().optional(),
  alergia_alimentar: z.boolean().default(false),
  alergia_detalhes: z.string().optional(),
  observacoes_medicas: z.string().optional(),
  programa_social: z.boolean().default(false),
  programa_social_tipo: z.string().optional()
})

// Step 5: Document Upload
const documentsSchema = z.object({
  certidao_nascimento: z.boolean().default(false),
  rg_student: z.boolean().default(false),
  cpf_student: z.boolean().default(false),
  rg_responsavel: z.boolean().default(false),
  cpf_responsavel: z.boolean().default(false),
  comprovante_residencia: z.boolean().default(false),
  cartao_vacina: z.boolean().default(false),
  declaracao_escolar: z.boolean().default(false),
  fotos_3x4: z.boolean().default(false)
})

// Complete registration schema
const completeRegistrationSchema = studentInfoSchema
  .merge(contactInfoSchema)
  .merge(guardiansInfoSchema)
  .merge(educationalInfoSchema)
  .merge(documentsSchema)

// Registration steps configuration
interface RegistrationStep {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  schema: z.ZodSchema<any>
  fields: FormFieldConfig[]
  required: boolean
  estimatedTime: string
  brazilianContext: string
}

const registrationSteps: RegistrationStep[] = [
  {
    id: 'student-info',
    title: 'Dados do Aluno',
    subtitle: 'Informações pessoais básicas do estudante',
    icon: <User className="h-5 w-5" />,
    schema: studentInfoSchema,
    required: true,
    estimatedTime: '3-4 minutos',
    brazilianContext: 'Dados necessários para o Censo Escolar (INEP) e programas sociais',
    fields: [
      {
        name: 'nome_completo',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Nome completo conforme certidão de nascimento',
        educationalContext: 'Deve corresponder exatamente ao documento oficial',
        inepRequired: true,
        autoComplete: 'name'
      },
      {
        name: 'nome_social',
        label: 'Nome Social (opcional)',
        type: 'text',
        placeholder: 'Nome pelo qual prefere ser chamado(a)',
        educationalContext: 'Lei nº 12.852/2013 - Direito ao nome social'
      },
      {
        name: 'cpf',
        label: 'CPF',
        type: 'cpf',
        required: true,
        placeholder: '000.000.000-00',
        educationalContext: 'Necessário para Bolsa Família e programas sociais',
        inepRequired: true
      },
      {
        name: 'rg',
        label: 'RG',
        type: 'text',
        required: true,
        placeholder: 'Número do RG',
        educationalContext: 'Documento de identificação civil'
      },
      {
        name: 'data_nascimento',
        label: 'Data de Nascimento',
        type: 'date',
        required: true,
        educationalContext: 'Determina faixa etária e ano escolar adequado',
        inepRequired: true
      },
      {
        name: 'genero',
        label: 'Gênero',
        type: 'select',
        required: true,
        educationalContext: 'Informação estatística para políticas educacionais',
        inepRequired: true,
        options: [
          { value: 'masculino', label: 'Masculino' },
          { value: 'feminino', label: 'Feminino' },
          { value: 'outro', label: 'Outro' },
          { value: 'nao_informar', label: 'Não informar' }
        ]
      },
      {
        name: 'cor_raca',
        label: 'Cor/Raça (IBGE)',
        type: 'select',
        required: true,
        educationalContext: 'Classificação IBGE para políticas de igualdade racial',
        inepRequired: true,
        options: [
          { value: 'branca', label: 'Branca' },
          { value: 'preta', label: 'Preta' },
          { value: 'parda', label: 'Parda' },
          { value: 'amarela', label: 'Amarela' },
          { value: 'indigena', label: 'Indígena' },
          { value: 'nao_declarada', label: 'Não declarada' }
        ]
      },
      {
        name: 'naturalidade',
        label: 'Naturalidade',
        type: 'text',
        required: true,
        placeholder: 'Cidade onde nasceu',
        educationalContext: 'Local de nascimento para registros oficiais'
      },
      {
        name: 'uf_nascimento',
        label: 'UF de Nascimento',
        type: 'text',
        required: true,
        placeholder: 'MG',
        maxLength: 2,
        educationalContext: 'Estado onde nasceu'
      }
    ]
  },
  {
    id: 'contact-info',
    title: 'Endereço e Contato',
    subtitle: 'Informações de residência e comunicação',
    icon: <MapPin className="h-5 w-5" />,
    schema: contactInfoSchema,
    required: true,
    estimatedTime: '2-3 minutos',
    brazilianContext: 'Determina zona de atendimento, transporte escolar e comunicações de emergência',
    fields: [
      {
        name: 'endereco_rua',
        label: 'Logradouro',
        type: 'text',
        required: true,
        placeholder: 'Rua, Avenida, Praça...',
        educationalContext: 'Endereço para correspondências escolares'
      },
      {
        name: 'endereco_numero',
        label: 'Número',
        type: 'text',
        required: true,
        placeholder: '123',
        educationalContext: 'Número da residência'
      },
      {
        name: 'endereco_complemento',
        label: 'Complemento',
        type: 'text',
        placeholder: 'Apartamento, casa, lote...'
      },
      {
        name: 'endereco_bairro',
        label: 'Bairro',
        type: 'text',
        required: true,
        placeholder: 'Nome do bairro',
        educationalContext: 'Determina zona de atendimento escolar'
      },
      {
        name: 'endereco_cep',
        label: 'CEP',
        type: 'text',
        required: true,
        placeholder: '00000-000',
        educationalContext: 'Código postal para localização'
      },
      {
        name: 'zona_residencia',
        label: 'Zona de Residência',
        type: 'select',
        required: true,
        educationalContext: 'Determina políticas específicas e transporte escolar',
        inepRequired: true,
        options: [
          { value: 'urbana', label: 'Urbana' },
          { value: 'rural', label: 'Rural' }
        ]
      },
      {
        name: 'telefone_principal',
        label: 'Telefone Principal',
        type: 'tel',
        required: true,
        placeholder: '(00) 00000-0000',
        educationalContext: 'Contato prioritário para emergências',
        autoComplete: 'tel'
      },
      {
        name: 'telefone_secundario',
        label: 'Telefone Secundário',
        type: 'tel',
        placeholder: '(00) 00000-0000',
        educationalContext: 'Contato alternativo',
        autoComplete: 'tel'
      },
      {
        name: 'email',
        label: 'Email (opcional)',
        type: 'email',
        placeholder: 'email@exemplo.com',
        educationalContext: 'Para comunicações digitais e boletins online',
        autoComplete: 'email'
      },
      {
        name: 'transporte_escolar',
        label: 'Utiliza Transporte Escolar',
        type: 'select',
        educationalContext: 'Necessário para organização do transporte municipal',
        options: [
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      }
    ]
  },
  {
    id: 'guardians-info',
    title: 'Responsáveis',
    subtitle: 'Dados dos pais ou responsáveis legais',
    icon: <Users className="h-5 w-5" />,
    schema: guardiansInfoSchema,
    required: true,
    estimatedTime: '4-6 minutos',
    brazilianContext: 'Suporte a múltiplos responsáveis conforme estrutura familiar brasileira',
    fields: [] // Will be populated dynamically
  },
  {
    id: 'educational-info',
    title: 'Informações Educacionais',
    subtitle: 'Histórico escolar e necessidades especiais',
    icon: <Book className="h-5 w-5" />,
    schema: educationalInfoSchema,
    required: true,
    estimatedTime: '3-4 minutos',
    brazilianContext: 'Dados para planejamento pedagógico e inclusão educacional',
    fields: [
      {
        name: 'escola_anterior',
        label: 'Escola Anterior',
        type: 'text',
        placeholder: 'Nome da última escola frequentada',
        educationalContext: 'Para solicitação de histórico escolar'
      },
      {
        name: 'situacao_anterior',
        label: 'Situação na Escola Anterior',
        type: 'select',
        required: true,
        educationalContext: 'Determina série adequada e necessidade de recuperação',
        options: [
          { value: 'aprovado', label: 'Aprovado' },
          { value: 'reprovado', label: 'Reprovado' },
          { value: 'transferido', label: 'Transferido' },
          { value: 'primeira_matricula', label: 'Primeira matrícula' }
        ]
      },
      {
        name: 'necessidades_especiais',
        label: 'Possui Necessidades Especiais',
        type: 'select',
        educationalContext: 'Para planejamento de educação inclusiva',
        inepRequired: true,
        options: [
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'tipo_necessidade',
        label: 'Tipo de Necessidade Especial',
        type: 'textarea',
        placeholder: 'Descreva o tipo de necessidade...',
        educationalContext: 'Detalhes para adaptações pedagógicas'
      },
      {
        name: 'medicacao_continua',
        label: 'Faz Uso de Medicação Contínua',
        type: 'select',
        educationalContext: 'Para cuidados médicos durante período escolar',
        options: [
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'medicacao_detalhes',
        label: 'Detalhes da Medicação',
        type: 'textarea',
        placeholder: 'Medicamentos, horários, dosagens...',
        educationalContext: 'Informações para equipe de saúde escolar'
      },
      {
        name: 'alergia_alimentar',
        label: 'Possui Alergia Alimentar',
        type: 'select',
        educationalContext: 'Para adaptação da merenda escolar',
        options: [
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'alergia_detalhes',
        label: 'Detalhes das Alergias',
        type: 'textarea',
        placeholder: 'Alimentos que causam alergia...',
        educationalContext: 'Para segurança alimentar na escola'
      },
      {
        name: 'programa_social',
        label: 'Participa de Programa Social',
        type: 'select',
        educationalContext: 'Bolsa Família, auxílios municipais, etc.',
        inepRequired: true,
        options: [
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' }
        ]
      },
      {
        name: 'programa_social_tipo',
        label: 'Tipo de Programa Social',
        type: 'text',
        placeholder: 'Bolsa Família, Auxílio...',
        educationalContext: 'Para acompanhamento de condicionalidades'
      }
    ]
  },
  {
    id: 'documents',
    title: 'Documentos',
    subtitle: 'Lista de documentos necessários para matrícula',
    icon: <FileText className="h-5 w-5" />,
    schema: documentsSchema,
    required: true,
    estimatedTime: '2-3 minutos',
    brazilianContext: 'Documentação obrigatória conforme legislação educacional brasileira',
    fields: [
      {
        name: 'certidao_nascimento',
        label: 'Certidão de Nascimento (original e cópia)',
        type: 'select',
        required: true,
        educationalContext: 'Documento obrigatório para matrícula',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'rg_student',
        label: 'RG do Aluno (original e cópia)',
        type: 'select',
        educationalContext: 'Documento de identificação civil',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'cpf_student',
        label: 'CPF do Aluno (cópia)',
        type: 'select',
        educationalContext: 'Necessário para programas sociais',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'rg_responsavel',
        label: 'RG do Responsável (original e cópia)',
        type: 'select',
        required: true,
        educationalContext: 'Identificação do responsável legal',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'cpf_responsavel',
        label: 'CPF do Responsável (cópia)',
        type: 'select',
        required: true,
        educationalContext: 'Documento do responsável legal',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'comprovante_residencia',
        label: 'Comprovante de Residência (cópia)',
        type: 'select',
        required: true,
        educationalContext: 'Comprovação de zona de atendimento',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'cartao_vacina',
        label: 'Cartão de Vacinação (cópia)',
        type: 'select',
        required: true,
        educationalContext: 'Obrigatório conforme Estatuto da Criança e Adolescente',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      },
      {
        name: 'declaracao_escolar',
        label: 'Declaração da Escola Anterior (se houver)',
        type: 'select',
        educationalContext: 'Histórico escolar para continuidade dos estudos',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' },
          { value: 'nao_aplicavel', label: 'Não se aplica' }
        ]
      },
      {
        name: 'fotos_3x4',
        label: 'Fotos 3x4 Recentes (2 unidades)',
        type: 'select',
        educationalContext: 'Para documentos escolares e carteirinha',
        options: [
          { value: 'true', label: 'Entregue' },
          { value: 'false', label: 'Pendente' }
        ]
      }
    ]
  }
]

export interface GuidedStudentRegistrationProps {
  onComplete?: (data: any) => Promise<void>
  onAutoSave?: (step: string, data: any) => Promise<void>
  initialData?: any
  className?: string
}

export const GuidedStudentRegistration: React.FC<GuidedStudentRegistrationProps> = ({
  onComplete,
  onAutoSave,
  initialData = {},
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepData, setStepData] = useState<Record<string, any>>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guardians, setGuardians] = useState<any[]>([{}])

  // Form management for current step
  const methods = useForm({
    resolver: zodResolver(registrationSteps[currentStep].schema),
    defaultValues: stepData[registrationSteps[currentStep].id] || {},
    mode: 'onChange'
  })

  // Progress calculation
  const overallProgress = Math.round(
    ((completedSteps.size + (currentStep > 0 ? 0.5 : 0)) / registrationSteps.length) * 100
  )

  // Auto-save current step data
  const handleAutoSave = useCallback(async (data: any) => {
    const stepId = registrationSteps[currentStep].id
    const updatedStepData = { ...stepData, [stepId]: data }
    setStepData(updatedStepData)

    if (onAutoSave) {
      await onAutoSave(stepId, data)
    }
  }, [currentStep, stepData, onAutoSave])

  // Navigate between steps
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < registrationSteps.length) {
      setCurrentStep(stepIndex)
    }
  }

  const goNext = () => {
    if (currentStep < registrationSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle step completion
  const handleStepSubmit = async (data: any) => {
    const stepId = registrationSteps[currentStep].id
    const updatedStepData = { ...stepData, [stepId]: data }
    setStepData(updatedStepData)

    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]))

    // Auto-save
    if (onAutoSave) {
      await onAutoSave(stepId, data)
    }

    // Move to next step or complete registration
    if (currentStep === registrationSteps.length - 1) {
      // Final submission
      if (onComplete) {
        setIsSubmitting(true)
        try {
          await onComplete(updatedStepData)
          toast.success('Matrícula realizada com sucesso!')
        } catch (error) {
          toast.error('Erro ao finalizar matrícula. Tente novamente.')
        } finally {
          setIsSubmitting(false)
        }
      }
    } else {
      goNext()
      toast.success('Etapa concluída!')
    }
  }

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Matrícula de Aluno - Fronteira/MG</h2>
        <Badge variant="outline" className="text-sm">
          {overallProgress}% concluído
        </Badge>
      </div>

      <Progress value={overallProgress} className="h-2 mb-6" />

      <div className="flex justify-between">
        {registrationSteps.map((step, index) => (
          <div
            key={step.id}
            className={`flex flex-col items-center cursor-pointer group transition-all ${
              index <= currentStep ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => index < currentStep && goToStep(index)}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${
                completedSteps.has(index)
                  ? 'bg-green-500 border-green-500 text-white'
                  : index === currentStep
                  ? 'bg-primary border-primary text-white'
                  : 'bg-background border-muted-foreground'
              } ${index < currentStep ? 'group-hover:border-primary' : ''}`}
            >
              {completedSteps.has(index) ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                step.icon
              )}
            </div>
            <span className="text-xs text-center max-w-20 leading-tight">
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render guardian fields dynamically
  const renderGuardianStep = () => {
    if (registrationSteps[currentStep].id !== 'guardians-info') {
      return null
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Responsáveis Legais</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGuardians([...guardians, {}])}
            disabled={guardians.length >= 3}
          >
            <Users className="mr-2 h-4 w-4" />
            Adicionar Responsável
          </Button>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Suporte a Múltiplos Responsáveis:</strong> O sistema permite cadastrar até 3 responsáveis legais,
            atendendo à diversidade das estruturas familiares brasileiras conforme o ECA.
          </AlertDescription>
        </Alert>

        {guardians.map((guardian, index) => (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">
                Responsável {index + 1}
                {index === 0 && <Badge className="ml-2">Principal</Badge>}
              </h4>
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGuardians(guardians.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Guardian fields would go here */}
              <div className="text-sm text-muted-foreground">
                Campos do responsável {index + 1} seriam renderizados aqui usando o EnhancedFormSystem
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const currentStepConfig = registrationSteps[currentStep]

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {renderStepIndicator()}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            {currentStepConfig.icon}
            <div>
              <CardTitle className="text-xl">{currentStepConfig.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStepConfig.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Tempo estimado: {currentStepConfig.estimatedTime}</span>
            </div>
            {currentStepConfig.required && (
              <Badge variant="secondary">Obrigatório</Badge>
            )}
          </div>

          <Alert>
            <Heart className="h-4 w-4" />
            <AlertDescription>
              <strong>Contexto Educacional:</strong> {currentStepConfig.brazilianContext}
            </AlertDescription>
          </Alert>
        </CardHeader>

        <CardContent>
          {currentStepConfig.id === 'guardians-info' ? (
            renderGuardianStep()
          ) : (
            <EnhancedFormSystem
              formId={`registration-${currentStepConfig.id}`}
              title=""
              fields={currentStepConfig.fields}
              schema={currentStepConfig.schema}
              onSubmit={handleStepSubmit}
              onAutoSave={handleAutoSave}
              defaultValues={stepData[currentStepConfig.id] || {}}
              showProgress={false}
              allowDrafts={true}
              educationalCompliance={{
                inepRequired: true,
                lgpdConsent: true,
                municipalCompliance: true
              }}
              className="border-0 shadow-none"
            />
          )}

          <Separator className="my-6" />

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={goPrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAutoSave(methods.getValues())}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Rascunho
              </Button>

              <Button
                type="submit"
                form={`registration-${currentStepConfig.id}`}
                disabled={isSubmitting}
              >
                {currentStep === registrationSteps.length - 1 ? (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Finalizando...' : 'Finalizar Matrícula'}
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration summary */}
      {currentStep > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo da Matrícula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Etapas Concluídas</p>
                <p className="text-muted-foreground">
                  {completedSteps.size} de {registrationSteps.length}
                </p>
              </div>
              <div>
                <p className="font-medium">Última Atualização</p>
                <p className="text-muted-foreground">
                  {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="font-medium">Status</p>
                <Badge variant={overallProgress === 100 ? 'default' : 'secondary'}>
                  {overallProgress === 100 ? 'Pronto para envio' : 'Em andamento'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GuidedStudentRegistration