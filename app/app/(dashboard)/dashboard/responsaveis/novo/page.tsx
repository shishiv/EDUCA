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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, User, Phone, Mail, Briefcase, Info } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { validateCPF, validatePhone } from '@/lib/validation/brazilian'
import { OperationalDataNotice, OptionalConsentCheckbox } from '@/components/lgpd'
import { useEscola } from '@/contexts/escola-context'

type ResponsavelFormData = {
  nome: string
  cpf: string
  telefone: string
  email: string
  parentesco: string
  endereco: string
  profissao: string
  lgpd_consentimento: boolean
}

function getValidationError(formData: ResponsavelFormData) {
  if (!formData.nome || !formData.cpf || !formData.parentesco) {
    return 'ui.preencha-todos-os-campos-obrigatorios'
  }

  if (!validateCPF(formData.cpf.replace(/\D/g, ''))) {
    return 'ui.cpf-invalido-verifique-os-dados-inseridos'
  }

  return formData.telefone && !validatePhone(formData.telefone)
    ? 'ui.telefone-invalido-informe-um-telefone-com-10-ou-11-digitos'
    : null
}

function mapResponsavelData(formData: ResponsavelFormData, selectedEscolaId: string | null) {
  return {
    nome: formData.nome,
    cpf: formData.cpf.replace(/\D/g, ''),
    telefone: formData.telefone ? formData.telefone.replace(/\D/g, '') : null,
    email: formData.email || null,
    parentesco: formData.parentesco,
    endereco: formData.endereco || null,
    profissao: formData.profissao || null,
    lgpd_consentimento: formData.lgpd_consentimento,
    lgpd_data_consentimento: formData.lgpd_consentimento ? new Date().toISOString() : null,
    escola_id: selectedEscolaId,
  }
}

function getSubmitErrorMessage(error: { message?: string }) {
  if (error.message?.includes('duplicate')) return 'CPF já cadastrado no sistema'
  return error.message ? `Erro: ${error.message}` : 'Erro ao cadastrar responsável'
}

export default function NovoResponsavelPage() {
  const t = useTranslations('registry')

  const router = useRouter()
  const { selectedEscolaId, shouldShowSelector } = useEscola()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ResponsavelFormData>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    parentesco: '',
    endereco: '',
    profissao: '',
    lgpd_consentimento: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const validationError = getValidationError(formData)
      if (validationError) {
        toast.error(t(validationError))
        return
      }

      const { data, error } = await supabase
        .from('responsaveis')
        .insert([mapResponsavelData(formData, selectedEscolaId ?? null)])
        .select('id')
        .single()

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          toast.error(t('ui.cpf-ja-cadastrado-no-sistema'))
        } else {
          throw error
        }
        return
      }

      logger.info('Responsável cadastrado:', { metadata: { responsavelId: data?.id } })
      toast.success(t('ui.responsavel-cadastrado-com-sucesso'))
      router.push('/dashboard/responsaveis')
    } catch (error: any) {
      logger.error('Erro ao cadastrar responsável:', error)
      toast.error(getSubmitErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/responsaveis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.novo-responsavel')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.cadastre-um-novo-responsavel-no-sistema')}
          </p>
        </div>
      </div>

      {/* Admin must select a school before creating a responsavel */}
      {shouldShowSelector && !selectedEscolaId && (
        <Alert variant="destructive">
          <AlertDescription>
            {t('ui.selecione-uma-escola-no-menu-lateral-antes-de-cadastrar-um-responsavel')}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Data */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('labels.dados-pessoais')}</CardTitle>
            </div>
            <CardDescription>
              {t('ui.informacoes-basicas-do-responsavel')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome">
                  {t('labels.nome-completo')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder={t('labels.nome-completo-do-responsavel')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cpf">
                  {t('labels.cpf')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <Label htmlFor="parentesco">
                  {t('labels.parentesco')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.parentesco}
                  onValueChange={(value) => handleInputChange('parentesco', value)}
                  required
                >
                  <SelectTrigger id="parentesco">
                    <SelectValue placeholder={t('labels.selecione-o-parentesco')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mae">{t('labels.mae')}</SelectItem>
                    <SelectItem value="Pai">{t('labels.pai')}</SelectItem>
                    <SelectItem value="Avo">{t('labels.avo-avo')}</SelectItem>
                    <SelectItem value="Tio">{t('labels.tia-tio')}</SelectItem>
                    <SelectItem value="Irmao">{t('labels.irmao-irma')}</SelectItem>
                    <SelectItem value="Outro">{t('labels.outro')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle>{t('labels.dados-de-contato')}</CardTitle>
            </div>
            <CardDescription>
              {t('ui.informacoes-para-comunicacao-com-o-responsavel')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">{t('labels.telefone')}</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('ui.telefone-para-contato-celular-ou-fixo')}
                </p>
              </div>

              <div>
                <Label htmlFor="email">{t('labels.e-mail')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <CardTitle>{t('labels.informacoes-adicionais')}</CardTitle>
            </div>
            <CardDescription>
              {t('ui.dados-complementares-do-responsavel')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profissao">{t('labels.profissao')}</Label>
                <Input
                  id="profissao"
                  value={formData.profissao}
                  onChange={(e) => handleInputChange('profissao', e.target.value)}
                  placeholder={t('labels.profissao-do-responsavel')}
                />
              </div>

              <div className="md:col-span-1">
                {/* Empty space for grid alignment */}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="endereco">{t('labels.endereco-completo')}</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder={t('labels.rua-numero-bairro-cidade-cep')}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Treatment Notice + Optional Consent */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('labels.tratamento-de-dados')}</CardTitle>
            </div>
            <CardDescription>
              {t('ui.informacoes-sobre-o-uso-dos-dados-cadastrados')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Operational notice - informational, does not block */}
            <OperationalDataNotice />

            {/* Optional consent - for additional communications only */}
            <OptionalConsentCheckbox
              checked={formData.lgpd_consentimento}
              onCheckedChange={(checked) => handleInputChange('lgpd_consentimento', checked)}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/responsaveis')}
            disabled={loading}
          >
            {t('labels.cancelar')}
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : t('ui.salvar-responsavel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
