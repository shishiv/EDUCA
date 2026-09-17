'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, User, Users, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { studentFormSchema } from '@/lib/validation/brazilian'
import { studentsApi } from '@/lib/api/students'
import { logger } from '@/lib/logger'
import { isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { useEscola } from '@/contexts/escola-context'

const INITIAL_STUDENT_FORM = {
  nome_completo: '',
  data_nascimento: '',
  cpf: '',
  rg: '',
  sexo: '',
  endereco: '',
  telefone: '',
  email: '',
  nome_mae: '',
  nome_pai: '',
  responsavel_principal: '',
  necessidades_especiais: '',
  alergias: '',
  medicamentos: '',
  observacoes_medicas: '',
  escola_anterior: '',
  serie_pretendida: '',
  turno_preferencia: '',
  ativo: true,
}

const INITIAL_GUARDIAN_FORM = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  parentesco: '',
  endereco: '',
  profissao: '',
}

type StudentFormState = typeof INITIAL_STUDENT_FORM
type GuardianFormState = typeof INITIAL_GUARDIAN_FORM

function optionalValue(value: string): string | undefined {
  return value || undefined
}

function studentValidationInput(form: StudentFormState) {
  return {
    nome_completo: form.nome_completo.trim(),
    data_nascimento: form.data_nascimento,
    cpf: optionalValue(form.cpf),
    rg: optionalValue(form.rg),
    sexo: form.sexo,
    telefone: optionalValue(form.telefone),
    email: optionalValue(form.email),
    endereco: form.endereco.trim(),
    nome_mae: form.nome_mae.trim(),
    nome_pai: optionalValue(form.nome_pai.trim()),
    necessidades_especiais: optionalValue(form.necessidades_especiais),
  }
}

function fieldErrorId(message: string | undefined, field: string): string | undefined {
  return message ? `${field}-error` : undefined
}

function FieldError({ field, message }: { field: string; message?: string }) {
  if (!message) return null
  return <p id={`${field}-error`} className="text-sm text-red-600" role="alert">{message}</p>
}

function PilotHiddenField({ pilotMode, children }: { pilotMode: boolean; children: React.ReactNode }) {
  if (pilotMode) return null
  return <div className="space-y-2">{children}</div>
}

function SubmitButton({ loading }: { loading: boolean }) {
  const t = useTranslations('registry')
  if (loading) {
    return <Button type="submit" disabled className="w-full sm:w-auto"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Cadastrando...</Button>
  }
  return <Button type="submit" className="w-full sm:w-auto"><Save className="h-4 w-4 mr-2" />{t('labels.cadastrar-aluno')}</Button>
}

function getFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = String(issue.path[0] || 'form')
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

function getGuardianPayload(guardian: GuardianFormState, defaultRelationship: string) {
  if (!guardian.nome) return undefined
  return {
    nome: guardian.nome,
    cpf: guardian.cpf.replace(/\D/g, '') || undefined,
    telefone: guardian.telefone.replace(/\D/g, '') || undefined,
    email: guardian.email || undefined,
    endereco: guardian.endereco || undefined,
    profissao: guardian.profissao || undefined,
    grau_parentesco: guardian.parentesco || defaultRelationship,
  }
}

function getCreateErrorMessage(error: Error) {
  const message = error.message
  if (message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('cpf')) return 'CPF já cadastrado no sistema'
    if (message.includes('email')) return 'E-mail já cadastrado no sistema'
    return 'Dados já existem no sistema'
  }
  if (message.includes('violates check constraint')) {
    return 'Dados inválidos. Verifique as informações inseridas'
  }
  return message ? `Erro ao cadastrar aluno: ${message}` : 'Erro ao cadastrar aluno'
}

function SchoolSelectionAlert({ visible }: { visible: boolean }) {
  const t = useTranslations('registry')
  if (!visible) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {t('ui.selecione-uma-escola-no-menu-lateral-antes-de-cadastrar-um-aluno')}
      </AlertDescription>
    </Alert>
  )
}

function FormValidationAlert({ visible }: { visible: boolean }) {
  const t = useTranslations('registry')
  if (!visible) return null
  return (
    <Alert variant="destructive" className="mb-6" role="alert">
      <AlertDescription>
        {t('ui.corrija-os-campos-obrigatorios-destacados-antes-de-continuar')}
      </AlertDescription>
    </Alert>
  )
}

function StudentTabsList({ pilotMode }: { pilotMode: boolean }) {
  const t = useTranslations('registry')
  return (
    <TabsList className={`grid w-full grid-cols-2 ${pilotMode ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-1 h-auto p-1`}>
      <TabsTrigger value="pessoais" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
        <User className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium">{t('labels.dados-pessoais')}</span>
      </TabsTrigger>
      <TabsTrigger value="responsavel" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
        <Users className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium">{t('labels.responsavel')}</span>
      </TabsTrigger>
      <TabsTrigger value="medicos" disabled={pilotMode} className={`${pilotMode ? 'hidden' : 'flex'} flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2`}>
        <FileText className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium">{t('labels.dados-medicos')}</span>
      </TabsTrigger>
      <TabsTrigger value="documentos" disabled={pilotMode} className={`${pilotMode ? 'hidden' : 'flex'} flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2`}>
        <Upload className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium">{t('labels.documentos')}</span>
      </TabsTrigger>
    </TabsList>
  )
}

export default function NovoAlunoPage() {
  const t = useTranslations('registry')
  const router = useRouter()
  // The demo database uses the canonical schema and synthetic seed. Keep the
  // pilot-only field restrictions for municipal pilots, but expose this CRUD
  // capability in the demo without changing auth, role or school checks.
  const pilotMode = isPilotModeEnabled() && !isDemoSandboxEnabled()
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<StudentFormState>(INITIAL_STUDENT_FORM)
  const [responsavelData, setResponsavelData] = useState<GuardianFormState>(INITIAL_GUARDIAN_FORM)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const validationResult = studentFormSchema.safeParse(studentValidationInput(formData))

    if (!validationResult.success) {
      setFieldErrors(getFieldErrors(validationResult.error.issues))
      toast.error(t('ui.corrija-os-campos-obrigatorios-antes-de-continuar'))
      return
    }

    setLoading(true)

    try {
      const studentData = {
        ...validationResult.data,
        cpf: validationResult.data.cpf?.replace(/\D/g, ''),
        telefone: validationResult.data.telefone?.replace(/\D/g, ''),
        data_nascimento: formData.data_nascimento,
        sexo: validationResult.data.sexo,
        necessidades_especiais: pilotMode ? undefined : validationResult.data.necessidades_especiais || undefined,
      }
      await studentsApi.createStudent({
        ...studentData,
        responsavel: getGuardianPayload(responsavelData, t('labels.responsavel')),
        escola_id_override: selectedEscolaId ?? undefined,
      })

      toast.success(t('ui.aluno-cadastrado-com-sucesso'))
      router.push('/dashboard/alunos')
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Erro ao cadastrar aluno')
      logger.error('Erro ao cadastrar aluno:', failure)
      toast.error(getCreateErrorMessage(failure))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = <K extends keyof StudentFormState>(field: K, value: StudentFormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleResponsavelChange = <K extends keyof GuardianFormState>(field: K, value: GuardianFormState[K]) => {
    setResponsavelData(prev => ({ ...prev, [field]: value }))
  }

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/alunos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.novo-aluno')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.cadastre-um-novo-aluno-no-sistema')}
          </p>
        </div>
      </div>

      <SchoolSelectionAlert visible={shouldShowSelector && !selectedEscolaId} />

      <form onSubmit={handleSubmit} noValidate>
        <FormValidationAlert visible={Object.keys(fieldErrors).length > 0} />
        <Tabs defaultValue="pessoais" className="space-y-6">
          <StudentTabsList pilotMode={pilotMode} />

          <TabsContent value="pessoais">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('labels.informacoes-pessoais')}</CardTitle>
                    <CardDescription>
                      {t('ui.dados-basicos-de-identificacao-do-aluno')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="nome_completo">{t('labels.nome-completo-2')}</Label>
                        <Input
                          id="nome_completo"
                          value={formData.nome_completo}
                          onChange={(e) => handleInputChange('nome_completo', e.target.value)}
 placeholder={t('labels.digite-o-nome-completo-do-aluno')}
 aria-invalid={Boolean(fieldErrors.nome_completo)}
 aria-describedby={fieldErrorId(fieldErrors.nome_completo, 'nome_completo')}
 required
                        />
                        <FieldError field="nome_completo" message={fieldErrors.nome_completo} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="data_nascimento">{t('labels.data-de-nascimento-2')}</Label>
                        <Input
                          id="data_nascimento"
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                          aria-invalid={Boolean(fieldErrors.data_nascimento)}
                          aria-describedby={fieldErrorId(fieldErrors.data_nascimento, 'data_nascimento')}
                          required
                        />
                        <FieldError field="data_nascimento" message={fieldErrors.data_nascimento} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sexo">{t('labels.sexo-2')}</Label>
                        <Select value={formData.sexo} onValueChange={(value) => handleInputChange('sexo', value)}>
                          <SelectTrigger
                            id="sexo"
                            aria-invalid={Boolean(fieldErrors.sexo)}
                            aria-describedby={fieldErrorId(fieldErrors.sexo, 'sexo')}
                          >
                            <SelectValue placeholder={t('labels.selecione-o-sexo')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">{t('labels.masculino')}</SelectItem>
                            <SelectItem value="F">{t('labels.feminino')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError field="sexo" message={fieldErrors.sexo} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">{t('labels.cpf')}</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          aria-invalid={Boolean(fieldErrors.cpf)}
                          aria-describedby={fieldErrorId(fieldErrors.cpf, 'cpf')}
                        />
                        <FieldError field="cpf" message={fieldErrors.cpf} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rg">{t('labels.rg')}</Label>
                        <Input
                          id="rg"
                          value={formData.rg}
                          onChange={(e) => handleInputChange('rg', e.target.value)}
                          placeholder={t('labels.digite-o-rg')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endereco">{t('labels.endereco-completo-2')}</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        placeholder={t('labels.rua-numero-bairro-cidade')}
                        aria-invalid={Boolean(fieldErrors.endereco)}
                        aria-describedby={fieldErrorId(fieldErrors.endereco, 'endereco')}
                        required
                      />
                      <FieldError field="endereco" message={fieldErrors.endereco} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="telefone">{t('labels.telefone')}</Label>
                        <Input
                          id="telefone"
                          value={formData.telefone}
                          onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                          placeholder="(34) 99999-0000"
                          maxLength={15}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">{t('labels.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome_mae">{t('labels.nome-da-mae')}</Label>
                        <Input
                          id="nome_mae"
                          value={formData.nome_mae}
                          onChange={(e) => handleInputChange('nome_mae', e.target.value)}
                          placeholder={t('labels.nome-completo-da-mae')}
                          aria-invalid={Boolean(fieldErrors.nome_mae)}
                          aria-describedby={fieldErrorId(fieldErrors.nome_mae, 'nome_mae')}
                          required
                        />
                        <FieldError field="nome_mae" message={fieldErrors.nome_mae} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nome_pai">{t('labels.nome-do-pai')}</Label>
                        <Input
                          id="nome_pai"
                          value={formData.nome_pai}
                          onChange={(e) => handleInputChange('nome_pai', e.target.value)}
                          placeholder={t('labels.nome-completo-do-pai')}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('labels.dados-escolares')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="serie_pretendida">{t('labels.serie-pretendida')}</Label>
                      <Select value={formData.serie_pretendida} onValueChange={(value) => handleInputChange('serie_pretendida', value)}>
                        <SelectTrigger id="serie_pretendida">
                          <SelectValue placeholder={t('labels.selecione-a-serie')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="berçário">{t('labels.bercario')}</SelectItem>
                          <SelectItem value="maternal">{t('labels.maternal')}</SelectItem>
                          <SelectItem value="pre_i">{t('labels.pre-i')}</SelectItem>
                          <SelectItem value="pre_ii">{t('labels.pre-ii')}</SelectItem>
                          <SelectItem value="1_ano">{t('labels.1o-ano')}</SelectItem>
                          <SelectItem value="2_ano">{t('labels.2o-ano')}</SelectItem>
                          <SelectItem value="3_ano">{t('labels.3o-ano')}</SelectItem>
                          <SelectItem value="4_ano">{t('labels.4o-ano')}</SelectItem>
                          <SelectItem value="5_ano">{t('labels.5o-ano')}</SelectItem>
                          <SelectItem value="6_ano">{t('labels.6o-ano')}</SelectItem>
                          <SelectItem value="7_ano">{t('labels.7o-ano')}</SelectItem>
                          <SelectItem value="8_ano">{t('labels.8o-ano')}</SelectItem>
                          <SelectItem value="9_ano">{t('labels.9o-ano')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="turno_preferencia">{t('labels.turno-de-preferencia')}</Label>
                      <Select value={formData.turno_preferencia} onValueChange={(value) => handleInputChange('turno_preferencia', value)}>
                        <SelectTrigger id="turno_preferencia">
                          <SelectValue placeholder={t('labels.selecione-o-turno')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="matutino">{t('labels.matutino')}</SelectItem>
                          <SelectItem value="vespertino">{t('labels.vespertino')}</SelectItem>
                          <SelectItem value="integral">{t('labels.integral')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="escola_anterior">{t('labels.escola-anterior')}</Label>
                      <Input
                        id="escola_anterior"
                        value={formData.escola_anterior}
                        onChange={(e) => handleInputChange('escola_anterior', e.target.value)}
                        placeholder={t('labels.nome-da-escola-anterior')}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                      />
                      <Label htmlFor="ativo">{t('labels.aluno-ativo')}</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responsavel">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.dados-do-responsavel')}</CardTitle>
                <CardDescription>
                  {t('ui.informacoes-do-responsavel-legal-pelo-aluno')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resp_nome">{t('labels.nome-completo-2')}</Label>
                    <Input
                      id="resp_nome"
                      value={responsavelData.nome}
                      onChange={(e) => handleResponsavelChange('nome', e.target.value)}
                      placeholder={t('labels.nome-completo-do-responsavel')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resp_parentesco">{t('labels.parentesco-2')}</Label>
                    <Select value={responsavelData.parentesco} onValueChange={(value) => handleResponsavelChange('parentesco', value)}>
                      <SelectTrigger id="resp_parentesco">
                        <SelectValue placeholder={t('labels.selecione-o-parentesco')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pai">{t('labels.pai')}</SelectItem>
                        <SelectItem value="mae">{t('labels.mae')}</SelectItem>
                        <SelectItem value="avo">{t('labels.avo-avo-2')}</SelectItem>
                        <SelectItem value="tio">{t('labels.tio-tia')}</SelectItem>
                        <SelectItem value="responsavel_legal">{t('labels.responsavel-legal')}</SelectItem>
                        <SelectItem value="outro">{t('labels.outro')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PilotHiddenField pilotMode={pilotMode}>
                    <Label htmlFor="resp_cpf">{t('labels.cpf-2')}</Label>
                    <Input
                      id="resp_cpf"
                      value={responsavelData.cpf}
                      onChange={(e) => handleResponsavelChange('cpf', formatCPF(e.target.value))}
 placeholder="000.000.000-00"
 maxLength={14}
 required={!pilotMode}
                    />
                  </PilotHiddenField>

                  <div className="space-y-2">
                    <Label htmlFor="resp_telefone">{t('labels.telefone-2')}</Label>
                    <Input
                      id="resp_telefone"
                      value={responsavelData.telefone}
                      onChange={(e) => handleResponsavelChange('telefone', formatPhone(e.target.value))}
                      placeholder="(34) 99999-0000"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resp_email">{t('labels.email')}</Label>
                    <Input
                      id="resp_email"
                      type="email"
                      value={responsavelData.email}
                      onChange={(e) => handleResponsavelChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <PilotHiddenField pilotMode={pilotMode}>
                    <Label htmlFor="resp_profissao">{t('labels.profissao')}</Label>
                    <Input
                      id="resp_profissao"
                      value={responsavelData.profissao}
                      onChange={(e) => handleResponsavelChange('profissao', e.target.value)}
                      placeholder={t('labels.profissao-do-responsavel')}
                    />
                  </PilotHiddenField>
                </div>

                <PilotHiddenField pilotMode={pilotMode}>
                  <Label htmlFor="resp_endereco">{t('labels.endereco')}</Label>
                  <Input
                    id="resp_endereco"
                    value={responsavelData.endereco}
                    onChange={(e) => handleResponsavelChange('endereco', e.target.value)}
                    placeholder={t('labels.endereco-completo-do-responsavel')}
                  />
                </PilotHiddenField>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medicos">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.informacoes-medicas-e-especiais')}</CardTitle>
                <CardDescription>
                  {t('ui.dados-importantes-sobre-saude-e-necessidades-especiais')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="necessidades_especiais">{t('labels.necessidades-educacionais-especiais')}</Label>
                  <Textarea
                    id="necessidades_especiais"
                    value={formData.necessidades_especiais}
                    onChange={(e) => handleInputChange('necessidades_especiais', e.target.value)}
                    placeholder={t('labels.descreva-as-necessidades-especiais-do-aluno-se-houver')}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alergias">{t('labels.alergias')}</Label>
                  <Textarea
                    id="alergias"
                    value={formData.alergias}
                    onChange={(e) => handleInputChange('alergias', e.target.value)}
                    placeholder={t('labels.liste-as-alergias-conhecidas')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicamentos">{t('labels.medicamentos-em-uso')}</Label>
                  <Textarea
                    id="medicamentos"
                    value={formData.medicamentos}
                    onChange={(e) => handleInputChange('medicamentos', e.target.value)}
                    placeholder={t('labels.liste-os-medicamentos-que-o-aluno-faz-uso-regular')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes_medicas">{t('labels.observacoes-medicas-gerais')}</Label>
                  <Textarea
                    id="observacoes_medicas"
                    value={formData.observacoes_medicas}
                    onChange={(e) => handleInputChange('observacoes_medicas', e.target.value)}
                    placeholder={t('labels.outras-informacoes-medicas-relevantes')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.upload-de-documentos')}</CardTitle>
                <CardDescription>
                  {t('ui.anexe-os-documentos-necessarios-para-a-matricula')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Documentos Obrigatórios */}
                <div className="space-y-6">
                  <div className="pb-2">
                    <h4 className="font-semibold text-lg text-gray-900">{t('labels.documentos-obrigatorios')}</h4>
                    <p className="text-sm text-gray-600 mt-1">{t('labels.necessarios-para-completar-a-matricula')}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">{t('labels.certidao-de-nascimento')}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">{t('labels.cartao-de-vacina')}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">{t('labels.comprovante-de-residencia')}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Documentos Opcionais */}
                <div className="space-y-6">
                  <div className="pb-2">
                    <h4 className="font-semibold text-lg text-gray-900">{t('labels.documentos-opcionais')}</h4>
                    <p className="text-sm text-gray-600 mt-1">{t('labels.podem-ser-anexados-posteriormente')}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">{t('labels.foto-3x4')}</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">{t('labels.historico-escolar')}</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">{t('labels.laudos-medicos')}</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        {t('ui.selecionar-arquivo')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/dashboard/alunos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('labels.cancelar')}
              </Link>
            </Button>
            <SubmitButton loading={loading} />
          </div>
        </Tabs>
      </form>
    </div>
  )
}
