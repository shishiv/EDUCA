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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Save, UserCheck, Search, Users, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Aluno {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf?: string
  sexo: 'M' | 'F'
  responsavel: string
}

interface Turma {
  id: string
  nome: string
  serie: string
  escola: string
  professor: string
  capacidade: number
  matriculados: number
  turno: string
}

const mockAlunos: Aluno[] = [
  {
    id: '1',
    nome_completo: 'Pedro Silva Santos',
    data_nascimento: '2020-03-15',
    sexo: 'M',
    responsavel: 'José da Silva'
  },
  {
    id: '2',
    nome_completo: 'Julia Oliveira Costa',
    data_nascimento: '2019-07-22',
    sexo: 'F',
    responsavel: 'Maria Oliveira'
  },
  {
    id: '3',
    nome_completo: 'Ana Carolina Ferreira',
    data_nascimento: '2018-05-12',
    sexo: 'F',
    responsavel: 'Lucia Ferreira'
  },
  {
    id: '4',
    nome_completo: 'Gabriel Souza Lima',
    data_nascimento: '2016-09-30',
    cpf: '12345678905',
    sexo: 'M',
    responsavel: 'Patricia Souza'
  }
]

const mockTurmas: Turma[] = [
  {
    id: '1',
    nome: 'Berçário A',
    serie: 'Berçário',
    escola: 'CEMEI Pequenos Passos',
    professor: 'Lucia Cardoso Oliveira',
    capacidade: 15,
    matriculados: 12,
    turno: 'integral'
  },
  {
    id: '2',
    nome: 'Pré I A',
    serie: 'Pré I',
    escola: 'EMEI Jardim da Infância',
    professor: 'Fernanda Alves Santos',
    capacidade: 25,
    matriculados: 23,
    turno: 'matutino'
  },
  {
    id: '3',
    nome: '5º Ano A',
    serie: '5º Ano',
    escola: 'EMEF Professor João Silva',
    professor: 'José Roberto Lima',
    capacidade: 30,
    matriculados: 25,
    turno: 'matutino'
  }
]

export default function NovaMatriculaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchAluno, setSearchAluno] = useState('')
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState({
    aluno_id: '',
    turma_id: '',
    ano_letivo: new Date().getFullYear(),
    data_matricula: new Date().toISOString().split('T')[0],
    observacoes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simular criação da matrícula
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Matrícula realizada com sucesso!')
      router.push('/dashboard/matriculas')
    } catch (error) {
      toast.error('Erro ao realizar matrícula')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSelectAluno = (aluno: Aluno) => {
    setSelectedAluno(aluno)
    setFormData(prev => ({ ...prev, aluno_id: aluno.id }))
    setSearchAluno('')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const filteredAlunos = mockAlunos.filter(aluno =>
    aluno.nome_completo.toLowerCase().includes(searchAluno.toLowerCase()) ||
    aluno.responsavel.toLowerCase().includes(searchAluno.toLowerCase()) ||
    aluno.cpf?.includes(searchAluno)
  )

  const selectedTurma = mockTurmas.find(t => t.id === formData.turma_id)
  const vagasDisponiveis = selectedTurma ? selectedTurma.capacidade - selectedTurma.matriculados : 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/matriculas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Matrícula</h1>
          <p className="text-gray-600 mt-1">
            Realize uma nova matrícula no sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seleção do Aluno */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Selecionar Aluno</span>
                </CardTitle>
                <CardDescription>
                  Busque e selecione o aluno para matrícula
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedAluno ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por nome, responsável ou CPF..."
                        value={searchAluno}
                        onChange={(e) => setSearchAluno(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {searchAluno && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {filteredAlunos.map((aluno) => (
                          <div
                            key={aluno.id}
                            onClick={() => handleSelectAluno(aluno)}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(aluno.nome_completo)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{aluno.nome_completo}</div>
                              <div className="text-sm text-gray-500">
                                {calculateAge(aluno.data_nascimento)} anos • 
                                {aluno.sexo === 'M' ? ' Masculino' : ' Feminino'} • 
                                Resp: {aluno.responsavel}
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredAlunos.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            Nenhum aluno encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(selectedAluno.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{selectedAluno.nome_completo}</div>
                        <div className="text-sm text-gray-600">
                          {calculateAge(selectedAluno.data_nascimento)} anos • 
                          Resp: {selectedAluno.responsavel}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAluno(null)
                        setFormData(prev => ({ ...prev, aluno_id: '' }))
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados da Matrícula */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>Dados da Matrícula</span>
                </CardTitle>
                <CardDescription>
                  Preencha as informações da matrícula
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="turma_id">Turma *</Label>
                    <Select value={formData.turma_id} onValueChange={(value) => handleInputChange('turma_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTurmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{turma.nome} - {turma.serie}</span>
                              <Badge variant="outline" className="ml-2">
                                {turma.capacidade - turma.matriculados} vagas
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <Label htmlFor="data_matricula">Data da Matrícula *</Label>
                  <Input
                    id="data_matricula"
                    type="date"
                    value={formData.data_matricula}
                    onChange={(e) => handleInputChange('data_matricula', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Observações sobre a matrícula"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/matriculas">
                  Cancelar
                </Link>
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !selectedAluno || !formData.turma_id}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Realizar Matrícula
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Informações da Turma */}
        <div className="space-y-6">
          {selectedTurma && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5" />
                  <span>Informações da Turma</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium text-lg">{selectedTurma.nome}</div>
                  <div className="text-sm text-gray-500">{selectedTurma.serie}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Escola:</span> {selectedTurma.escola}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Professor:</span> {selectedTurma.professor}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Turno:</span> {selectedTurma.turno}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Ocupação</span>
                    <span className="text-sm text-gray-600">
                      {selectedTurma.matriculados}/{selectedTurma.capacidade}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(selectedTurma.matriculados / selectedTurma.capacidade) * 100}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-center">
                    <Badge variant={vagasDisponiveis > 0 ? 'default' : 'destructive'}>
                      {vagasDisponiveis} vagas disponíveis
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Documentos Necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Certidão de Nascimento</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Cartão de Vacina</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Comprovante de Residência</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Foto 3x4 (opcional)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Histórico Escolar (se houver)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}