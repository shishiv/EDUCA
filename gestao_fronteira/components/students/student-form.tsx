/**
 * Enhanced Student Registration Form
 * Complete redesign with progressive validation, auto-save, and Brazilian compliance
 * Optimized for municipal educational administration
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { EnhancedFormProvider, EnhancedSubmitActions } from '@/components/ui/enhanced-form'
import {
  EnhancedCPFInput,
  EnhancedPhoneInput,
  EnhancedDateInput,
  EnhancedCEPInput,
  EnhancedSelectInput
} from '@/components/ui/enhanced-brazilian-inputs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  User,
  Users,
  MapPin,
  GraduationCap,
  Heart,
  FileText,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle,
  Save,
  Send
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { brazilianEducationalFieldHelp } from '@/lib/field-help/brazilian-educational-help'
import { studentFormSchema } from '@/lib/validation'

// Enhanced form schema with comprehensive validation
const enhancedStudentSchema = z.object({
  // Personal Information
  nome_completo: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  cpf: z.string()
    .min(14, 'CPF deve estar completo')
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Formato de CPF inválido'),
  rg: z.string().optional(),
  data_nascimento: z.string()
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 4 && age <= 25
    }, 'Idade deve estar entre 4 e 25 anos'),
  sexo: z.enum(['M', 'F'], {
    required_error: 'Sexo é obrigatório'
  }),
  cor_raca: z.enum(['branca', 'preta', 'parda', 'amarela', 'indigena'], {
    required_error: 'Cor/raça é obrigatória para o Educacenso'
  }),

  // Contact Information
  telefone: z.string()
    .min(14, 'Telefone deve estar completo')
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),

  // Address
  cep: z.string()
    .min(9, 'CEP deve estar completo')
    .regex(/^\d{5}-\d{3}$/, 'Formato de CEP inválido'),
  endereco: z.string().min(10, 'Endereço deve ser mais específico'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Use sigla do estado (2 letras)'),

  // Family Information
  nome_mae: z.string().min(3, 'Nome da mãe é obrigatório'),
  cpf_mae: z.string().optional(),
  telefone_mae: z.string().optional(),
  nome_pai: z.string().optional(),
  cpf_pai: z.string().optional(),
  telefone_pai: z.string().optional(),

  // Educational Information
  serie_ano: z.string().min(1, 'Série/Ano é obrigatório'),
  turno: z.enum(['matutino', 'vespertino', 'noturno', 'integral'], {
    required_error: 'Turno é obrigatório'
  }),
  escola_origem: z.string().optional(),

  // Special Needs and Health
  necessidades_especiais: z.string().optional(),
  medicamentos: z.string().optional(),
  alergias: z.string().optional(),

  // Social Programs
  bolsa_familia: z.boolean().default(false),
  nis: z.string().optional(),
  transporte_escolar: z.boolean().default(false),

  // Authorizations
  autorizacao_imagem: z.boolean().default(false),
  autorizacao_saida: z.boolean().default(false),

  // Emergency Contact
  contato_emergencia_nome: z.string().min(3, 'Nome do contato de emergência é obrigatório'),
  contato_emergencia_telefone: z.string()
    .min(14, 'Telefone de emergência deve estar completo'),
  contato_emergencia_parentesco: z.string().min(2, 'Parentesco é obrigatório')
})

type EnhancedStudentFormData = z.infer<typeof enhancedStudentSchema>

interface EnhancedStudentRegistrationFormProps {
  student?: Partial<EnhancedStudentFormData>
  onSuccess?: (student: any) => void
  onCancel?: () => void
  className?: string
}

export function EnhancedStudentRegistrationForm({
  student,
  onSuccess,
  onCancel,
  className
}: EnhancedStudentRegistrationFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState('personal')
  const [photoFile, setPhotoFile] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string>('')
  const [addressData, setAddressData] = React.useState<any>(null)

  const isEditing = !!student

  // Form default values
  const defaultValues: Partial<EnhancedStudentFormData> = {
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

  // Auto-save configuration
  const autoSaveConfig = {
    enabled: true,
    interval: 10000, // 10 seconds
    key: `student-registration-${student?.cpf || 'new'}`,
    onSave: async (data: EnhancedStudentFormData) => {
      // Save draft to localStorage or API
      logger.info('Auto-saving student data', {
        feature: 'students',
        action: 'auto_save',
        metadata: { cpf: data.cpf, hasPhoto: !!data.foto_url }
      })
      // In real implementation, this would call an API endpoint
    }
  }

  // Handle form submission
  const handleSubmit = async (data: EnhancedStudentFormData) => {
    try {
      logger.info('Submitting student data', {
        feature: 'students',
        action: 'create',
        metadata: { cpf: data.cpf, nome: data.nome_completo }
      })

      // Here you would call your API
      // const result = await studentsApi.create(data)

      toast.success('Estudante cadastrado com sucesso!')
      onSuccess?.(data)
      router.push('/dashboard/alunos')
    } catch (error) {
      logger.error('Error submitting student', error as Error, {
        feature: 'students',
        action: 'create',
        metadata: { cpf: data.cpf }
      })
      toast.error('Erro ao cadastrar estudante. Tente novamente.')
      throw error
    }
  }

  // Handle draft save
  const handleSaveDraft = async (data: EnhancedStudentFormData) => {
    try {
      logger.info('Saving draft', {
        feature: 'students',
        action: 'save_draft',
        metadata: { cpf: data.cpf, nome: data.nome_completo }
      })

      // Save to API as draft
      // const result = await studentsApi.saveDraft(data)

      toast.success('Rascunho salvo com sucesso!')
    } catch (error) {
      logger.error('Error saving draft', error as Error, {
        feature: 'students',
        action: 'save_draft',
        metadata: { cpf: data.cpf }
      })
      toast.error('Erro ao salvar rascunho.')
      throw error
    }
  }

  // Handle form validation
  const handleValidate = async (data: EnhancedStudentFormData) => {
    try {
      logger.info('Validating student data', {
        feature: 'students',
        action: 'validate',
        metadata: { cpf: data.cpf }
      })

      // Perform additional validations
      // const validation = await studentsApi.validate(data)

      toast.success('Dados validados com sucesso!')
    } catch (error) {
      logger.error('Validation failed', error as Error, {
        feature: 'students',
        action: 'validate',
        metadata: { cpf: data.cpf }
      })
      throw error
    }
  }

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle address auto-fill from CEP
  const handleAddressFound = (address: any) => {
    setAddressData(address)
    toast.success('Endereço encontrado automaticamente!')
  }

  // Select options
  const sexoOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ]

  const corRacaOptions = [
    { value: 'branca', label: 'Branca' },
    { value: 'preta', label: 'Preta' },
    { value: 'parda', label: 'Parda' },
    { value: 'amarela', label: 'Amarela' },
    { value: 'indigena', label: 'Indígena' }
  ]

  const turnoOptions = [
    { value: 'matutino', label: 'Matutino', description: '7h às 12h' },
    { value: 'vespertino', label: 'Vespertino', description: '13h às 18h' },
    { value: 'noturno', label: 'Noturno', description: '19h às 23h' },
    { value: 'integral', label: 'Integral', description: '7h às 17h' }
  ]

  const serieAnoOptions = [
    { value: '1ef', label: '1º Ano - Ensino Fundamental' },
    { value: '2ef', label: '2º Ano - Ensino Fundamental' },
    { value: '3ef', label: '3º Ano - Ensino Fundamental' },
    { value: '4ef', label: '4º Ano - Ensino Fundamental' },
    { value: '5ef', label: '5º Ano - Ensino Fundamental' },
    { value: '6ef', label: '6º Ano - Ensino Fundamental' },
    { value: '7ef', label: '7º Ano - Ensino Fundamental' },
    { value: '8ef', label: '8º Ano - Ensino Fundamental' },
    { value: '9ef', label: '9º Ano - Ensino Fundamental' },
    { value: '1em', label: '1º Ano - Ensino Médio' },
    { value: '2em', label: '2º Ano - Ensino Médio' },
    { value: '3em', label: '3º Ano - Ensino Médio' }
  ]

  return (
    <EnhancedFormProvider
      schema={enhancedStudentSchema}
      defaultValues={defaultValues}
      autoSave={autoSaveConfig}
      fieldHelp={brazilianEducationalFieldHelp}
      validationMode="progressive"
      title={isEditing ? 'Editar Cadastro de Estudante' : 'Novo Cadastro de Estudante'}
      description="Sistema de cadastro estudantil conforme padrões INEP e LGPD"
      complianceLevel="INEP"
      className={className}
    >
      <div className="space-y-6">
        {/* Photo Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto do Estudante
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={photoPreview} />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Carregar Foto
              </Button>
              <p className="text-xs text-muted-foreground">
                Opcional. Formatos aceitos: JPG, PNG (máx. 2MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Form Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pessoal
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="family" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Família
            </TabsTrigger>
            <TabsTrigger value="educational" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Educacional
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Saúde
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      placeholder="Nome completo do estudante"
                      {...register('nome_completo')}
                      className="mt-1"
                    />
                  </div>

                  <EnhancedCPFInput
                    name="cpf"
                    label="CPF"
                    helpKey="cpf"
                    required
                  />

                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      placeholder="12.345.678-9"
                      {...register('rg')}
                      className="mt-1"
                    />
                  </div>

                  <EnhancedDateInput
                    name="data_nascimento"
                    label="Data de Nascimento"
                    helpKey="data_nascimento"
                    required
                    maxDate={new Date()} // Cannot be in the future
                    minDate={new Date(new Date().getFullYear() - 25, 0, 1)} // Max 25 years old
                  />

                  <EnhancedSelectInput
                    name="sexo"
                    label="Sexo"
                    helpKey="sexo"
                    required
                    options={sexoOptions}
                  />

                  <EnhancedSelectInput
                    name="cor_raca"
                    label="Cor/Raça"
                    helpKey="cor_raca"
                    required
                    options={corRacaOptions}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EnhancedPhoneInput
                    name="telefone"
                    label="Telefone Principal"
                    helpKey="phone"
                    required
                  />

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="estudante@email.com"
                      {...register('email')}
                      className="mt-1"
                    />
                  </div>

                  <EnhancedCEPInput
                    name="cep"
                    label="CEP"
                    helpKey="cep"
                    required
                    onAddressFound={handleAddressFound}
                  />

                  <div>
                    <Label htmlFor="endereco">Endereço *</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, avenida, etc."
                      {...register('endereco')}
                      value={addressData?.logradouro || watch('endereco')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="numero">Número *</Label>
                    <Input
                      id="numero"
                      placeholder="123"
                      {...register('numero')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      placeholder="Apto 12, Casa B, etc."
                      {...register('complemento')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input
                      id="bairro"
                      placeholder="Nome do bairro"
                      {...register('bairro')}
                      value={addressData?.bairro || watch('bairro')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      placeholder="Fronteira"
                      {...register('cidade')}
                      value={addressData?.localidade || watch('cidade')}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Information Tab */}
          <TabsContent value="family">
            <Card>
              <CardHeader>
                <CardTitle>Informações Familiares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mother Information */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Informações da Mãe/Responsável Maternal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="nome_mae">Nome da Mãe *</Label>
                      <Input
                        id="nome_mae"
                        placeholder="Nome completo da mãe"
                        {...register('nome_mae')}
                        className="mt-1"
                      />
                    </div>

                    <EnhancedCPFInput
                      name="cpf_mae"
                      label="CPF da Mãe"
                      helpKey="cpf"
                    />

                    <EnhancedPhoneInput
                      name="telefone_mae"
                      label="Telefone da Mãe"
                      helpKey="phone"
                    />
                  </div>
                </div>

                <Separator />

                {/* Father Information */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Informações do Pai/Responsável Paternal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="nome_pai">Nome do Pai</Label>
                      <Input
                        id="nome_pai"
                        placeholder="Nome completo do pai (opcional)"
                        {...register('nome_pai')}
                        className="mt-1"
                      />
                    </div>

                    <EnhancedCPFInput
                      name="cpf_pai"
                      label="CPF do Pai"
                      helpKey="cpf"
                    />

                    <EnhancedPhoneInput
                      name="telefone_pai"
                      label="Telefone do Pai"
                      helpKey="phone"
                    />
                  </div>
                </div>

                <Separator />

                {/* Emergency Contact */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Contato de Emergência</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="contato_emergencia_nome">Nome do Contato *</Label>
                      <Input
                        id="contato_emergencia_nome"
                        placeholder="Nome completo"
                        {...register('contato_emergencia_nome')}
                        className="mt-1"
                      />
                    </div>

                    <EnhancedPhoneInput
                      name="contato_emergencia_telefone"
                      label="Telefone de Emergência"
                      helpKey="phone"
                      required
                    />

                    <div>
                      <Label htmlFor="contato_emergencia_parentesco">Parentesco *</Label>
                      <Input
                        id="contato_emergencia_parentesco"
                        placeholder="Avó, tio, etc."
                        {...register('contato_emergencia_parentesco')}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Educational Information Tab */}
          <TabsContent value="educational">
            <Card>
              <CardHeader>
                <CardTitle>Informações Educacionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EnhancedSelectInput
                    name="serie_ano"
                    label="Série/Ano"
                    helpKey="serie_ano"
                    required
                    options={serieAnoOptions}
                  />

                  <EnhancedSelectInput
                    name="turno"
                    label="Turno"
                    helpKey="turno"
                    required
                    options={turnoOptions}
                  />

                  <div className="md:col-span-2">
                    <Label htmlFor="escola_origem">Escola de Origem (se transferência)</Label>
                    <Input
                      id="escola_origem"
                      placeholder="Nome da escola anterior"
                      {...register('escola_origem')}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Social Programs */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Programas Sociais</h4>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="bolsa_familia"
                      {...register('bolsa_familia')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="bolsa_familia">Beneficiário do Bolsa Família</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="transporte_escolar"
                      {...register('transporte_escolar')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="transporte_escolar">Utiliza Transporte Escolar</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Information Tab */}
          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Saúde e Necessidades Especiais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="necessidades_especiais">Necessidades Educacionais Especiais</Label>
                  <Textarea
                    id="necessidades_especiais"
                    placeholder="Descreva necessidades especiais, deficiências, transtornos..."
                    {...register('necessidades_especiais')}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="medicamentos">Medicamentos de Uso Contínuo</Label>
                  <Textarea
                    id="medicamentos"
                    placeholder="Liste medicamentos, dosagens e horários..."
                    {...register('medicamentos')}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="alergias">Alergias e Restrições</Label>
                  <Textarea
                    id="alergias"
                    placeholder="Alergias alimentares, medicamentosas, etc..."
                    {...register('alergias')}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Authorizations */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Autorizações</h4>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autorizacao_imagem"
                      {...register('autorizacao_imagem')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="autorizacao_imagem">
                      Autorizo o uso de imagem em atividades pedagógicas
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autorizacao_saida"
                      {...register('autorizacao_saida')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="autorizacao_saida">
                      Autorizo saídas educacionais (passeios, excursões)
                    </Label>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Todas as informações são protegidas pela LGPD e utilizadas exclusivamente para fins educacionais.
                    As autorizações podem ser revogadas a qualquer momento.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Actions */}
        <EnhancedSubmitActions
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onValidate={handleValidate}
          submitLabel={isEditing ? "Atualizar Cadastro" : "Cadastrar Estudante"}
          draftLabel="Salvar Rascunho"
          validateLabel="Validar Dados"
        />
      </div>
    </EnhancedFormProvider>
  )
}