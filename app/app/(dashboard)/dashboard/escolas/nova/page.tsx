'use client'
import { useTranslations } from 'next-intl'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, School, MapPin, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { schoolsApi } from '@/lib/api/schools'
import { logger } from '@/lib/logger'

type SchoolType = 'creche' | 'pre_escola' | 'fundamental'

interface SchoolFormData {
  nome: string
  codigo: string
  tipo: '' | SchoolType
  endereco: string
  bairro: string
  cep: string
  cidade: string
  estado: string
  telefone: string
  email: string
  diretor_id: string
  observacoes: string
}

interface DirectorOption {
  id: string
  nome: string
  email: string | null
}

type NewSchoolPayload = {
  nome: string
  codigo: string
  tipo: SchoolType
  endereco: string
  telefone: string
  email?: string
  diretor_id?: string
}

function isSchoolType(value: string): value is SchoolType {
  return value === 'creche' || value === 'pre_escola' || value === 'fundamental'
}

function schoolPayloadFromForm(formData: SchoolFormData): NewSchoolPayload | null {
  const schoolType = formData.tipo
  const codigo = formData.codigo.replace(/\D/g, '')
  if (!formData.nome || !codigo || !schoolType || codigo.length !== 8) return null

  return {
    nome: formData.nome,
    codigo,
    tipo: schoolType,
    endereco: `${formData.endereco}${formData.bairro ? ` - ${formData.bairro}` : ''}, ${formData.cidade} - ${formData.estado}${formData.cep ? `, CEP: ${formData.cep}` : ''}`,
    telefone: formData.telefone.replace(/\D/g, ''),
    email: formData.email || undefined,
    diretor_id: formData.diretor_id || undefined,
  }
}

function schoolCreationErrorMessage(errorMessage: string): string {
  if (!errorMessage) return 'Erro ao cadastrar escola'
  if (!errorMessage.includes('duplicate') && !errorMessage.includes('unique')) return `Erro ao cadastrar escola: ${errorMessage}`
  return errorMessage.includes('codigo')
    ? 'Código da escola já existe no sistema'
    : 'Dados duplicados no sistema'
}

export default function NovaEscolaPage() {
  const t = useTranslations('registry')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [diretoresDisponiveis, setDiretoresDisponiveis] = useState<DirectorOption[]>([])

  const [formData, setFormData] = useState<SchoolFormData>({
    // Informações Básicas
    nome: '',
    codigo: '', // Código INEP (8 dígitos)
    tipo: '',

    // Endereço
    endereco: '',
    bairro: '',
    cep: '',
    cidade: t('labels.cidade'),
    estado: 'MG',

    // Contato
    telefone: '',
    email: '',

    // Gestão
    diretor_id: '',

    // Observações
    observacoes: ''
  })

  const loadDiretores = useCallback(async () => {
    try {
      setDiretoresDisponiveis(await schoolsApi.getAvailableDirectors() ?? [])
    } catch (error) {
      logger.error('Erro ao carregar diretores:', error instanceof Error ? error : String(error))
      toast.error(t('ui.erro-ao-carregar-lista-de-diretores-disponiveis'))
    }
  }, [t])

  useEffect(() => {
    void loadDiretores()
  }, [loadDiretores])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const schoolData = schoolPayloadFromForm(formData)
      if (!schoolData) {
        toast.error(t('ui.codigo-inep-deve-ter-exatamente-8-digitos'))
        return
      }

      // Criar escola via API
      await schoolsApi.createSchool(schoolData)

      toast.success(t('ui.escola-cadastrada-com-sucesso'))
      router.push('/dashboard/escolas')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Erro ao cadastrar escola:', error instanceof Error ? error : errorMessage)

      toast.error(schoolCreationErrorMessage(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = <Field extends keyof SchoolFormData>(field: Field, value: SchoolFormData[Field]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15)
  }

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9)
  }

  const formatCodigo = (value: string) => {
    // Formata código INEP (8 dígitos numéricos)
    return value
      .replace(/\D/g, '')
      .slice(0, 8)
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'creche':
        return 'Creche (0-3 anos)'
      case 'pre_escola':
        return 'Pré-Escola (4-5 anos)'
      case 'fundamental':
        return 'Ensino Fundamental (6-14 anos)'
      default:
        return tipo
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('labels.nova-escola')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.cadastre-uma-nova-unidade-escolar-no-sistema')}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/escolas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basicos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger value="basicos" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <School className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">{t('labels.dados-basicos')}</span>
            </TabsTrigger>
            <TabsTrigger value="endereco" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">{t('labels.endereco')}</span>
            </TabsTrigger>
            <TabsTrigger value="contato" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">{t('labels.contato')}</span>
            </TabsTrigger>
            <TabsTrigger value="gestao" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">{t('labels.gestao')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba: Dados Básicos */}
          <TabsContent value="basicos">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.informacoes-basicas')}</CardTitle>
                <CardDescription>
                  {t('ui.dados-principais-da-unidade-escolar')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">{t('labels.nome-da-escola-2')}</Label>
                  <Input
                    id="nome"
                    placeholder={t('labels.ex-cemei-pequenos-passos')}
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">{t('labels.nome-completo-da-unidade-escolar')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">{t('labels.codigo-inep-2')}</Label>
                  <Input
                    id="codigo"
                    placeholder="12345678"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', formatCodigo(e.target.value))}
                    required
                    maxLength={8}
                  />
                  <p className="text-xs text-gray-500">{t('labels.codigo-inep-da-escola-8-digitos-numericos')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">{t('labels.tipo-de-ensino')}</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => {
                      if (isSchoolType(value)) handleInputChange('tipo', value)
                    }}
                    required
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder={t('labels.selecione-o-tipo')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">{getTipoLabel('creche')}</SelectItem>
                      <SelectItem value="pre_escola">{getTipoLabel('pre_escola')}</SelectItem>
                      <SelectItem value="fundamental">{getTipoLabel('fundamental')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">{t('labels.modalidade-de-ensino-oferecida')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">{t('labels.observacoes')}</Label>
                  <Textarea
                    id="observacoes"
                    placeholder={t('labels.informacoes-adicionais-sobre-a-escola')}
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Endereço */}
          <TabsContent value="endereco">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.localizacao')}</CardTitle>
                <CardDescription>
                  {t('ui.endereco-completo-da-unidade-escolar')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="endereco">{t('labels.logradouro')}</Label>
                  <Input
                    id="endereco"
                    placeholder={t('labels.ex-rua-das-flores-123')}
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bairro">{t('labels.bairro')}</Label>
                    <Input
                      id="bairro"
                      placeholder={t('labels.ex-centro')}
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">{t('labels.cep')}</Label>
                    <Input
                      id="cep"
                      placeholder="38290-000"
                      value={formData.cep}
                      onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                      maxLength={9}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">{t('labels.cidade')}</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">{t('labels.estado')}</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Contato */}
          <TabsContent value="contato">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.informacoes-de-contato')}</CardTitle>
                <CardDescription>
                  {t('ui.telefone-e-email-da-escola')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="telefone">{t('labels.telefone')}</Label>
                  <Input
                    id="telefone"
                    placeholder="(34) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', formatTelefone(e.target.value))}
                    maxLength={15}
                  />
                  <p className="text-xs text-gray-500">{t('labels.telefone-principal-da-escola')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('labels.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="escola@municipio.edu.br"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">{t('labels.email-institucional-opcional')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Gestão */}
          <TabsContent value="gestao">
            <Card>
              <CardHeader>
                <CardTitle>{t('labels.gestao-escolar')}</CardTitle>
                <CardDescription>
                  {t('ui.atribuicao-de-diretor-e-informacoes-administrativas')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="diretor">{t('labels.diretor-a')}</Label>
                  <Select
                    value={formData.diretor_id}
                    onValueChange={(value) => handleInputChange('diretor_id', value)}
                  >
                    <SelectTrigger id="diretor">
                      <SelectValue placeholder={t('labels.selecione-um-diretor-opcional')} />
                    </SelectTrigger>
                    <SelectContent>
                      {diretoresDisponiveis.map((diretor) => (
                        <SelectItem key={diretor.id} value={diretor.id}>
                          {diretor.nome} - {diretor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {diretoresDisponiveis.length === 0
                      ? t('ui.nenhum-diretor-disponivel-para-atribuicao')
                      : `${diretoresDisponiveis.length} disponíveis`}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <School className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        {t('ui.informacao-sobre-diretores')}
                      </p>
                      <p className="text-sm text-blue-700">
                        {t('ui.apenas-diretores-sem-escola-atribuida-aparecem-nesta-lista-para-reatribu')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/dashboard/escolas">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('labels.cancelar')}
              </Link>
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cadastrando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('ui.cadastrar-escola')}
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}
