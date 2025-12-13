'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usersApi } from '@/lib/api/users'
import { schoolsApi } from '@/lib/api/schools'
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
import { ArrowLeft, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { logger } from '@/lib/logger'

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    tipo_usuario: '',
    escola_id: '',
    ativo: true
  })

  const [escolas, setEscolas] = useState<any[]>([])
  useEffect(() => {
    loadEscolas()
  }, [])

  const loadEscolas = async () => {
    try {
      const data = await schoolsApi.getAll()
      setEscolas(data)
    } catch (error) {
      // logger.error("Erro ao carregar escolas:", error)
      toast.error("Erro ao carregar lista de escolas")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await usersApi.createUser({
        id: crypto.randomUUID(),
        nome: formData.nome,
        email: formData.email,
        tipo_usuario: formData.tipo_usuario as "admin" | "diretor" | "secretario" | "professor" | "responsavel",
        escola_id: formData.escola_id || undefined
      })
      
      toast.success('Usuário criado com sucesso!')
      router.push('/dashboard/usuarios')
    } catch (error) {
      toast.error('Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/usuarios">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Usuário</h1>
          <p className="text-gray-600 mt-1">
            Cadastre um novo usuário no sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Dados do Usuário</span>
              </CardTitle>
              <CardDescription>
                Preencha as informações básicas do usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Digite o nome completo"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="usuario@fronteira.mg.gov.br"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_usuario">Tipo de Usuário *</Label>
                    <Select value={formData.tipo_usuario} onValueChange={(value) => handleInputChange('tipo_usuario', value)}>
                      <SelectTrigger id="tipo_usuario">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="diretor">Diretor</SelectItem>
                        <SelectItem value="secretario">Secretário</SelectItem>
                        <SelectItem value="professor">Professor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="escola">Escola</Label>
                    <Select
                      value={formData.escola_id}
                      onValueChange={(value) => handleInputChange('escola_id', value)}
                      disabled={formData.tipo_usuario === 'admin' || formData.tipo_usuario === 'secretario'}
                    >
                      <SelectTrigger id="escola">
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
                    {(formData.tipo_usuario === 'admin' || formData.tipo_usuario === 'secretario') && (
                      <p className="text-sm text-gray-500">
                        Este tipo de usuário tem acesso a todas as escolas
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  />
                  <Label htmlFor="ativo">Usuário ativo</Label>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/usuarios">
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
                        Salvar Usuário
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
              <CardTitle>Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tipos de Usuário</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Administrador:</strong> Acesso total ao sistema</div>
                  <div><strong>Diretor:</strong> Gestão da escola específica</div>
                  <div><strong>Secretário:</strong> Operações administrativas</div>
                  <div><strong>Professor:</strong> Gestão de turmas e alunos</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Senha Padrão</h4>
                <p className="text-sm text-gray-600">
                  A senha padrão será "123456". O usuário deverá alterá-la no primeiro acesso.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}