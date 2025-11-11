'use client'

import { useState, useEffect } from 'react'
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

export default function NovaEscolaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [diretoresDisponiveis, setDiretoresDisponiveis] = useState<Array<{
    id: string
    nome: string
    email: string | null
  }>>([])

  const [formData, setFormData] = useState({
    // Informações Básicas
    nome: '',
    codigo: '', // Código INEP (8 dígitos)
    tipo: '',

    // Endereço
    endereco: '',
    bairro: '',
    cep: '',
    cidade: 'Fronteira',
    estado: 'MG',

    // Contato
    telefone: '',
    email: '',

    // Gestão
    diretor_id: '',

    // Observações
    observacoes: ''
  })

  useEffect(() => {
    loadDiretores()
  }, [])

  const loadDiretores = async () => {
    try {
      const diretores = await schoolsApi.getAvailableDirectors() as any
      setDiretoresDisponiveis(diretores || [])
    } catch (error) {
      logger.error('Erro ao carregar diretores:', error as any)
      toast.error('Erro ao carregar lista de diretores disponíveis')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validações básicas
      if (!formData.nome || !formData.codigo || !formData.tipo) {
        toast.error('Preencha todos os campos obrigatórios')
        setLoading(false)
        return
      }

      // Validar código INEP (8 dígitos)
      const codigoLimpo = formData.codigo.replace(/\D/g, '')
      if (codigoLimpo.length !== 8) {
        toast.error('Código INEP deve ter exatamente 8 dígitos')
        setLoading(false)
        return
      }

      // Preparar dados para a API
      const enderecoCompleto = `${formData.endereco}${formData.bairro ? ' - ' + formData.bairro : ''}, ${formData.cidade} - ${formData.estado}${formData.cep ? ', CEP: ' + formData.cep : ''}`

      const schoolData = {
        nome: formData.nome,
        codigo: codigoLimpo, // Código INEP padronizado (8 dígitos)
        tipo: formData.tipo as 'creche' | 'pre_escola' | 'fundamental',
        endereco: enderecoCompleto,
        telefone: formData.telefone.replace(/\D/g, ''), // Remove formatação
        email: formData.email || undefined,
        diretor_id: formData.diretor_id || undefined,
      }

      // Criar escola via API
      await schoolsApi.createSchool(schoolData)

      toast.success('Escola cadastrada com sucesso!')
      router.push('/dashboard/escolas')
    } catch (error: any) {
      logger.error('Erro ao cadastrar escola:', error)

      // Mensagens de erro contextualizadas
      let errorMessage = 'Erro ao cadastrar escola'
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        if (error.message.includes('codigo')) {
          errorMessage = 'Código da escola já existe no sistema'
        } else {
          errorMessage = 'Dados duplicados no sistema'
        }
      } else if (error.message) {
        errorMessage = `Erro ao cadastrar escola: ${error.message}`
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nova Escola</h1>
          <p className="text-gray-600 mt-1">
            Cadastre uma nova unidade escolar no sistema
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/escolas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basicos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger value="basicos" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <School className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Dados Básicos</span>
            </TabsTrigger>
            <TabsTrigger value="endereco" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Endereço</span>
            </TabsTrigger>
            <TabsTrigger value="contato" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Contato</span>
            </TabsTrigger>
            <TabsTrigger value="gestao" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Gestão</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba: Dados Básicos */}
          <TabsContent value="basicos">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Dados principais da unidade escolar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Escola *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: CEMEI Pequenos Passos"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">Nome completo da unidade escolar</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código INEP *</Label>
                  <Input
                    id="codigo"
                    placeholder="12345678"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', formatCodigo(e.target.value))}
                    required
                    maxLength={8}
                  />
                  <p className="text-xs text-gray-500">Código INEP da escola (8 dígitos numéricos)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Ensino *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => handleInputChange('tipo', value)}
                    required
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">{getTipoLabel('creche')}</SelectItem>
                      <SelectItem value="pre_escola">{getTipoLabel('pre_escola')}</SelectItem>
                      <SelectItem value="fundamental">{getTipoLabel('fundamental')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Modalidade de ensino oferecida</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Informações adicionais sobre a escola..."
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
                <CardTitle>Localização</CardTitle>
                <CardDescription>
                  Endereço completo da unidade escolar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="endereco">Logradouro *</Label>
                  <Input
                    id="endereco"
                    placeholder="Ex: Rua das Flores, 123"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      placeholder="Ex: Centro"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
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
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
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
                <CardTitle>Informações de Contato</CardTitle>
                <CardDescription>
                  Telefone e email da escola
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(34) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', formatTelefone(e.target.value))}
                    maxLength={15}
                  />
                  <p className="text-xs text-gray-500">Telefone principal da escola</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="escola@fronteira.mg.gov.br"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Email institucional (opcional)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Gestão */}
          <TabsContent value="gestao">
            <Card>
              <CardHeader>
                <CardTitle>Gestão Escolar</CardTitle>
                <CardDescription>
                  Atribuição de diretor e informações administrativas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="diretor">Diretor(a)</Label>
                  <Select
                    value={formData.diretor_id}
                    onValueChange={(value) => handleInputChange('diretor_id', value)}
                  >
                    <SelectTrigger id="diretor">
                      <SelectValue placeholder="Selecione um diretor (opcional)" />
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
                      ? 'Nenhum diretor disponível para atribuição'
                      : `${diretoresDisponiveis.length} diretor(es) disponível(is)`}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <School className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Informação sobre Diretores
                      </p>
                      <p className="text-sm text-blue-700">
                        Apenas diretores sem escola atribuída aparecem nesta lista.
                        Para reatribuir um diretor, primeiro remova-o da escola atual.
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
                Cancelar
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
                  Cadastrar Escola
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}