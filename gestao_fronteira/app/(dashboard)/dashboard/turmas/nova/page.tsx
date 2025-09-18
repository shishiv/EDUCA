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
import { ArrowLeft, Save, GraduationCap, Users, School } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NovaTurmaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    serie: '',
    ano_letivo: new Date().getFullYear(),
    escola_id: '',
    professor_id: '',
    capacidade: 25,
    turno: '',
    observacoes: '',
    ativo: true
  })

  const escolas = [
    { id: '1', nome: 'CEMEI Pequenos Passos', tipo: 'creche' },
    { id: '2', nome: 'EMEI Jardim da Infância', tipo: 'pre_escola' },
    { id: '3', nome: 'EMEF Professor João Silva', tipo: 'fundamental' }
  ]

  const professores = [
    { id: '1', nome: 'Lucia Cardoso Oliveira', escola_id: '1' },
    { id: '2', nome: 'Ana Paula Santos', escola_id: '1' },
    { id: '3', nome: 'Fernanda Alves Santos', escola_id: '2' },
    { id: '4', nome: 'Roberto Silva Lima', escola_id: '2' },
    { id: '5', nome: 'Mariana Costa Pereira', escola_id: '3' },
    { id: '6', nome: 'José Roberto Lima', escola_id: '3' }
  ]

  const series = {
    creche: ['Berçário', 'Maternal'],
    pre_escola: ['Pré I', 'Pré II'],
    fundamental: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano']
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simular criação da turma
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Turma criada com sucesso!')
      router.push('/dashboard/turmas')
    } catch (error) {
      toast.error('Erro ao criar turma')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getEscolaTipo = () => {
    const escola = escolas.find(e => e.id === formData.escola_id)
    return escola?.tipo || ''
  }

  const getProfessoresFiltrados = () => {
    return professores.filter(p => p.escola_id === formData.escola_id)
  }

  const getSeriesPorTipo = () => {
    const tipo = getEscolaTipo()
    return series[tipo as keyof typeof series] || []
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/turmas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Turma</h1>
          <p className="text-gray-600 mt-1">
            Crie uma nova turma no sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Dados da Turma</span>
              </CardTitle>
              <CardDescription>
                Preencha as informações básicas da turma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Turma *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Ex: 5º Ano A"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ano_letivo">Ano Letivo *</Label>
                    <Input
                      id="ano_letivo"
                      type="number"
                      value={formData.ano_letivo}
                      onChange={(e) => handleInputChange('ano_letivo', parseInt(e.target.value))}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="escola_id">Escola *</Label>
                  <Select value={formData.escola_id} onValueChange={(value) => {
                    handleInputChange('escola_id', value)
                    handleInputChange('professor_id', '') // Reset professor when school changes
                    handleInputChange('serie', '') // Reset serie when school changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {escolas.map((escola) => (
                        <SelectItem key={escola.id} value={escola.id}>
                          {escola.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie">Série *</Label>
                    <Select 
                      value={formData.serie} 
                      onValueChange={(value) => handleInputChange('serie', value)}
                      disabled={!formData.escola_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a série" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSeriesPorTipo().map((serie) => (
                          <SelectItem key={serie} value={serie}>
                            {serie}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turno">Turno *</Label>
                    <Select value={formData.turno} onValueChange={(value) => handleInputChange('turno', value)}>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professor_id">Professor Responsável</Label>
                    <Select 
                      value={formData.professor_id} 
                      onValueChange={(value) => handleInputChange('professor_id', value)}
                      disabled={!formData.escola_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o professor" />
                      </SelectTrigger>
                      <SelectContent>
                        {getProfessoresFiltrados().map((professor) => (
                          <SelectItem key={professor.id} value={professor.id}>
                            {professor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacidade">Capacidade Máxima *</Label>
                    <Input
                      id="capacidade"
                      type="number"
                      value={formData.capacidade}
                      onChange={(e) => handleInputChange('capacidade', parseInt(e.target.value))}
                      min="1"
                      max="50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Observações adicionais sobre a turma"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  />
                  <Label htmlFor="ativo">Turma ativa</Label>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/turmas">
                      Cancelar
                    </Link>
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Criar Turma
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <School className="h-5 w-5" />
                <span>Informações da Escola</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.escola_id ? (
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">
                      {escolas.find(e => e.id === formData.escola_id)?.nome}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {getEscolaTipo().replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div><strong>Professores disponíveis:</strong> {getProfessoresFiltrados().length}</div>
                    <div><strong>Séries disponíveis:</strong> {getSeriesPorTipo().length}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Selecione uma escola para ver as informações
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Capacidade</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-blue-600">
                  {formData.capacidade} alunos
                </div>
                <div className="text-sm text-gray-600">
                  Capacidade máxima da turma
                </div>
                <div className="text-xs text-gray-500">
                  Recomendações por tipo:
                  <ul className="mt-1 space-y-1">
                    <li>• Berçário/Maternal: 15-20 alunos</li>
                    <li>• Pré-escola: 20-25 alunos</li>
                    <li>• Fundamental: 25-30 alunos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}