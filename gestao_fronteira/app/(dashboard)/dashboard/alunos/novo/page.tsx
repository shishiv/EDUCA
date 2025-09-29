'use client'

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
import { studentsApi } from '@/lib/api/students'

export default function NovoAlunoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Dados pessoais
    nome_completo: '',
    data_nascimento: '',
    cpf: '',
    rg: '',
    sexo: '',
    endereco: '',
    telefone: '',
    email: '',
    
    // Dados familiares
    nome_mae: '',
    nome_pai: '',
    responsavel_principal: '',
    
    // Dados médicos/especiais
    necessidades_especiais: '',
    alergias: '',
    medicamentos: '',
    observacoes_medicas: '',
    
    // Dados escolares
    escola_anterior: '',
    serie_pretendida: '',
    turno_preferencia: '',
    
    // Status
    ativo: true
  })

  const [responsavelData, setResponsavelData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    parentesco: '',
    endereco: '',
    profissao: '',
    renda_familiar: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Prepare student data in API format
      const studentData = {
        nome_completo: formData.nome_completo,
        data_nascimento: formData.data_nascimento,
        cpf: formData.cpf?.replace(/\D/g, '') || undefined, // Clean CPF
        sexo: formData.sexo as 'M' | 'F',
        telefone: formData.telefone?.replace(/\D/g, '') || undefined, // Clean phone
        email: formData.email || undefined,
        endereco: formData.endereco,
        nome_mae: formData.nome_mae,
        nome_pai: formData.nome_pai || undefined,
        necessidades_especiais: formData.necessidades_especiais || undefined,
      }

      // Prepare guardian data if provided
      let guardianData = undefined
      if (responsavelData.nome) {
        guardianData = {
          nome: responsavelData.nome,
          telefone: responsavelData.telefone?.replace(/\D/g, '') || undefined,
          email: responsavelData.email || undefined,
          grau_parentesco: responsavelData.parentesco || 'Responsável',
        }
      }

      // Create student via API
      const createdStudent = await studentsApi.createStudent({
        ...studentData,
        responsavel: guardianData,
      })

      toast.success('Aluno cadastrado com sucesso!')
      router.push('/dashboard/alunos')
    } catch (error: any) {
      console.error('Erro ao cadastrar aluno:', error)

      // Enhanced error handling with Brazilian context
      let errorMessage = 'Erro ao cadastrar aluno'
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        if (error.message.includes('cpf')) {
          errorMessage = 'CPF já cadastrado no sistema'
        } else if (error.message.includes('email')) {
          errorMessage = 'E-mail já cadastrado no sistema'
        } else {
          errorMessage = 'Dados já existem no sistema'
        }
      } else if (error.message?.includes('violates check constraint')) {
        errorMessage = 'Dados inválidos. Verifique as informações inseridas'
      } else if (error.message) {
        errorMessage = `Erro ao cadastrar aluno: ${error.message}`
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleResponsavelChange = (field: string, value: any) => {
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
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Aluno</h1>
          <p className="text-gray-600 mt-1">
            Cadastre um novo aluno no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="pessoais" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger value="pessoais" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Dados Pessoais</span>
            </TabsTrigger>
            <TabsTrigger value="responsavel" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Responsável</span>
            </TabsTrigger>
            <TabsTrigger value="medicos" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Dados Médicos</span>
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 py-3 px-2">
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm font-medium">Documentos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>
                      Dados básicos de identificação do aluno
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="nome_completo">Nome Completo *</Label>
                        <Input
                          id="nome_completo"
                          value={formData.nome_completo}
                          onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                          placeholder="Digite o nome completo do aluno"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                        <Input
                          id="data_nascimento"
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sexo">Sexo *</Label>
                        <Select value={formData.sexo} onValueChange={(value) => handleInputChange('sexo', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o sexo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input
                          id="rg"
                          value={formData.rg}
                          onChange={(e) => handleInputChange('rg', e.target.value)}
                          placeholder="Digite o RG"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço Completo</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        placeholder="Rua, número, bairro, cidade"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={formData.telefone}
                          onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                          placeholder="(34) 99999-0000"
                          maxLength={15}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
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
                        <Label htmlFor="nome_mae">Nome da Mãe</Label>
                        <Input
                          id="nome_mae"
                          value={formData.nome_mae}
                          onChange={(e) => handleInputChange('nome_mae', e.target.value)}
                          placeholder="Nome completo da mãe"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="nome_pai">Nome do Pai</Label>
                        <Input
                          id="nome_pai"
                          value={formData.nome_pai}
                          onChange={(e) => handleInputChange('nome_pai', e.target.value)}
                          placeholder="Nome completo do pai"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados Escolares</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="serie_pretendida">Série Pretendida</Label>
                      <Select value={formData.serie_pretendida} onValueChange={(value) => handleInputChange('serie_pretendida', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a série" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="berçário">Berçário</SelectItem>
                          <SelectItem value="maternal">Maternal</SelectItem>
                          <SelectItem value="pre_i">Pré I</SelectItem>
                          <SelectItem value="pre_ii">Pré II</SelectItem>
                          <SelectItem value="1_ano">1º Ano</SelectItem>
                          <SelectItem value="2_ano">2º Ano</SelectItem>
                          <SelectItem value="3_ano">3º Ano</SelectItem>
                          <SelectItem value="4_ano">4º Ano</SelectItem>
                          <SelectItem value="5_ano">5º Ano</SelectItem>
                          <SelectItem value="6_ano">6º Ano</SelectItem>
                          <SelectItem value="7_ano">7º Ano</SelectItem>
                          <SelectItem value="8_ano">8º Ano</SelectItem>
                          <SelectItem value="9_ano">9º Ano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="turno_preferencia">Turno de Preferência</Label>
                      <Select value={formData.turno_preferencia} onValueChange={(value) => handleInputChange('turno_preferencia', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o turno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="matutino">Matutino</SelectItem>
                          <SelectItem value="vespertino">Vespertino</SelectItem>
                          <SelectItem value="integral">Integral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="escola_anterior">Escola Anterior</Label>
                      <Input
                        id="escola_anterior"
                        value={formData.escola_anterior}
                        onChange={(e) => handleInputChange('escola_anterior', e.target.value)}
                        placeholder="Nome da escola anterior"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                      />
                      <Label htmlFor="ativo">Aluno ativo</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responsavel">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Responsável</CardTitle>
                <CardDescription>
                  Informações do responsável legal pelo aluno
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resp_nome">Nome Completo *</Label>
                    <Input
                      id="resp_nome"
                      value={responsavelData.nome}
                      onChange={(e) => handleResponsavelChange('nome', e.target.value)}
                      placeholder="Nome completo do responsável"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="resp_parentesco">Parentesco *</Label>
                    <Select value={responsavelData.parentesco} onValueChange={(value) => handleResponsavelChange('parentesco', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="avo">Avô/Avó</SelectItem>
                        <SelectItem value="tio">Tio/Tia</SelectItem>
                        <SelectItem value="responsavel_legal">Responsável Legal</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resp_cpf">CPF *</Label>
                    <Input
                      id="resp_cpf"
                      value={responsavelData.cpf}
                      onChange={(e) => handleResponsavelChange('cpf', formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="resp_telefone">Telefone *</Label>
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
                    <Label htmlFor="resp_email">Email</Label>
                    <Input
                      id="resp_email"
                      type="email"
                      value={responsavelData.email}
                      onChange={(e) => handleResponsavelChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="resp_profissao">Profissão</Label>
                    <Input
                      id="resp_profissao"
                      value={responsavelData.profissao}
                      onChange={(e) => handleResponsavelChange('profissao', e.target.value)}
                      placeholder="Profissão do responsável"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp_endereco">Endereço</Label>
                  <Input
                    id="resp_endereco"
                    value={responsavelData.endereco}
                    onChange={(e) => handleResponsavelChange('endereco', e.target.value)}
                    placeholder="Endereço completo do responsável"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp_renda">Renda Familiar</Label>
                  <Select value={responsavelData.renda_familiar} onValueChange={(value) => handleResponsavelChange('renda_familiar', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa de renda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ate_1_salario">Até 1 salário mínimo</SelectItem>
                      <SelectItem value="1_a_2_salarios">1 a 2 salários mínimos</SelectItem>
                      <SelectItem value="2_a_3_salarios">2 a 3 salários mínimos</SelectItem>
                      <SelectItem value="3_a_5_salarios">3 a 5 salários mínimos</SelectItem>
                      <SelectItem value="acima_5_salarios">Acima de 5 salários mínimos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medicos">
            <Card>
              <CardHeader>
                <CardTitle>Informações Médicas e Especiais</CardTitle>
                <CardDescription>
                  Dados importantes sobre saúde e necessidades especiais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="necessidades_especiais">Necessidades Educacionais Especiais</Label>
                  <Textarea
                    id="necessidades_especiais"
                    value={formData.necessidades_especiais}
                    onChange={(e) => handleInputChange('necessidades_especiais', e.target.value)}
                    placeholder="Descreva as necessidades especiais do aluno, se houver"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alergias">Alergias</Label>
                  <Textarea
                    id="alergias"
                    value={formData.alergias}
                    onChange={(e) => handleInputChange('alergias', e.target.value)}
                    placeholder="Liste as alergias conhecidas"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicamentos">Medicamentos em Uso</Label>
                  <Textarea
                    id="medicamentos"
                    value={formData.medicamentos}
                    onChange={(e) => handleInputChange('medicamentos', e.target.value)}
                    placeholder="Liste os medicamentos que o aluno faz uso regular"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes_medicas">Observações Médicas Gerais</Label>
                  <Textarea
                    id="observacoes_medicas"
                    value={formData.observacoes_medicas}
                    onChange={(e) => handleInputChange('observacoes_medicas', e.target.value)}
                    placeholder="Outras informações médicas relevantes"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>Upload de Documentos</CardTitle>
                <CardDescription>
                  Anexe os documentos necessários para a matrícula
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Documentos Obrigatórios */}
                <div className="space-y-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-lg text-gray-900">Documentos Obrigatórios</h4>
                    <p className="text-sm text-gray-600 mt-1">Necessários para completar a matrícula</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">Certidão de Nascimento</p>
                      <Button variant="outline" size="sm" className="w-full">
                        Selecionar Arquivo
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">Cartão de Vacina</p>
                      <Button variant="outline" size="sm" className="w-full">
                        Selecionar Arquivo
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-3">Comprovante de Residência</p>
                      <Button variant="outline" size="sm" className="w-full">
                        Selecionar Arquivo
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Documentos Opcionais */}
                <div className="space-y-6">
                  <div className="border-l-4 border-gray-400 pl-4">
                    <h4 className="font-semibold text-lg text-gray-900">Documentos Opcionais</h4>
                    <p className="text-sm text-gray-600 mt-1">Podem ser anexados posteriormente</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">Foto 3x4</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Selecionar Arquivo
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">Histórico Escolar</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Selecionar Arquivo
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-3">Laudos Médicos</p>
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Selecionar Arquivo
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
                  Cadastrar Aluno
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}