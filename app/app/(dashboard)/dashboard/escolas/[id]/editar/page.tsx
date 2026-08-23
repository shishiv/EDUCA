'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, School, MapPin, Phone, Users, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { schoolsApi } from '@/lib/api/schools'
import { logger } from '@/lib/logger'

export default function EditarEscolaPage() {
  const t = useTranslations('registry')
  const router = useRouter()
  const params = useParams()
  const escolaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [escola, setEscola] = useState<any>(null)
  const [diretoresDisponiveis, setDiretoresDisponiveis] = useState<Array<{
    id: string
    nome: string
    email: string
  }>>([])

  const [formData, setFormData] = useState({
    // Informações Básicas
    nome: '',
    codigo: '', // Código INEP (8 dígitos)
    tipo: '',

    // Endereço (será parseado do campo único)
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
    ativo: true,

    // Observações
    observacoes: ''
  })

  useEffect(() => {
    loadEscola()
    loadDiretores()
  }, [escolaId])

  const loadEscola = async () => {
    try {
      setLoading(true)
      const data = await schoolsApi.getById(escolaId) as any

      // Parse endereco
      const enderecoPartes = data.endereco?.split(',') || []
      const logradouro = enderecoPartes[0]?.split(' - ')[0] || ''
      const bairro = enderecoPartes[0]?.split(' - ')[1] || ''
      const cep = data.endereco?.match(/CEP:\s*(\d{5}-?\d{3})/)?.[1] || ''

      setEscola(data)
      setFormData({
        nome: data.nome || '',
        codigo: data.codigo || '',
        tipo: data.tipo || '',
        endereco: logradouro,
        bairro: bairro.trim(),
        cep: cep,
        cidade: t('labels.cidade'),
        estado: 'MG',
        telefone: formatTelefone(data.telefone || ''),
        email: data.email || '',
        diretor_id: data.diretor_id || '',
        ativo: data.ativo ?? true,
        observacoes: ''
      })
    } catch (error) {
      logger.error('Erro ao carregar escola:', error as any)
      toast.error(t('ui.erro-ao-carregar-dados-da-escola'))
      router.push('/dashboard/escolas')
    } finally {
      setLoading(false)
    }
  }

  const loadDiretores = async () => {
    try {
      const diretores = await schoolsApi.getAvailableDirectors() as any
      setDiretoresDisponiveis(diretores || [])
    } catch (error) {
      logger.error('Erro ao carregar diretores:', error as any)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validar código INEP (8 dígitos)
      const codigoLimpo = formData.codigo.replace(/\D/g, '')
      if (codigoLimpo.length !== 8) {
        toast.error(t('ui.codigo-inep-deve-ter-exatamente-8-digitos'))
        setSaving(false)
        return
      }

      // Preparar dados para a API
      const enderecoCompleto = `${formData.endereco}${formData.bairro ? ' - ' + formData.bairro : ''}, ${formData.cidade} - ${formData.estado}${formData.cep ? ', CEP: ' + formData.cep : ''}`

      const updateData = {
        nome: formData.nome,
        codigo: codigoLimpo, // Código INEP padronizado (8 dígitos)
        tipo: formData.tipo as 'creche' | 'pre_escola' | 'fundamental',
        endereco: enderecoCompleto,
        telefone: formData.telefone.replace(/\D/g, ''),
        email: formData.email || undefined,
        diretor_id: formData.diretor_id || null,
        ativo: formData.ativo,
      }

      // Atualizar escola via API
      await schoolsApi.update(escolaId, updateData)

      // Se o diretor mudou, atualizar atribuição
      if (formData.diretor_id && formData.diretor_id !== escola.diretor_id) {
        await schoolsApi.assignDirector(escolaId, formData.diretor_id)
      }

      toast.success(t('ui.escola-atualizada-com-sucesso'))
      router.push('/dashboard/escolas')
    } catch (error: any) {
      logger.error('Erro ao atualizar escola:', error)

      let errorMessage = 'Erro ao atualizar escola'
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        if (error.message.includes('codigo')) {
          errorMessage = 'Código da escola já existe no sistema'
        }
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`
      }

      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
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
    const tipos = {
      creche: 'Creche (0-3 anos)',
      pre_escola: 'Pré-Escola (4-5 anos)',
      fundamental: 'Ensino Fundamental (6-14 anos)'
    }
    return tipos[tipo as keyof typeof tipos] || tipo
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('labels.editar-escola')}</h1>
          <p className="text-gray-600 mt-1">
            {escola?.nome}
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
                    onValueChange={(value) => handleInputChange('tipo', value)}
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
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label htmlFor="ativo" className="text-base font-medium">
                      {t('ui.status-da-escola')}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {formData.ativo ? t('ui.escola-ativa-no-sistema') : t('ui.escola-inativa-no-sistema')}
                    </p>
                  </div>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  />
                </div>

                {!formData.ativo && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-orange-900">
                          {t('ui.escola-inativa')}
                        </p>
                        <p className="text-sm text-orange-700">
                          {t('ui.escolas-inativas-nao-aparecem-nas-listagens-principais-e-nao-podem-receb')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                      <SelectValue placeholder={t('labels.selecione-um-diretor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {escola?.diretor && (
                        <SelectItem value={escola.diretor_id}>
                          {escola.diretor.nome} (Atual)
                        </SelectItem>
                      )}
                      {diretoresDisponiveis.map((diretor) => (
                        <SelectItem key={diretor.id} value={diretor.id}>
                          {diretor.nome} - {diretor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {diretoresDisponiveis.length === 0 && !escola?.diretor
                      ? t('ui.nenhum-diretor-disponivel-para-atribuicao')
                      : `Diretor atual ou ${diretoresDisponiveis.length} disponíveis`}
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
                        {t('ui.ao-trocar-o-diretor-o-diretor-anterior-sera-automaticamente-desvinculado')}
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
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('ui.salvar-alteracoes-a2ca13')}
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}