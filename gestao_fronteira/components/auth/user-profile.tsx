'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createUserProfile, UserProfile } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, User, Shield, School, Calendar } from 'lucide-react'

interface UserProfileProps {
  editable?: boolean
  showCreateForm?: boolean
}

export function UserProfileComponent({ editable = false, showCreateForm = false }: UserProfileProps) {
  const { user, userProfile, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(showCreateForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    nome: userProfile?.nome || '',
    tipo_usuario: userProfile?.tipo_usuario || 'professor',
    escola_id: userProfile?.escola_id || '',
  })

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Usuário não autenticado</p>
        </CardContent>
      </Card>
    )
  }

  const handleSave = async () => {
    if (!user || !formData.nome || !formData.tipo_usuario) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)

    try {
      await createUserProfile({
        id: user.id,
        email: user.email || '',
        nome: formData.nome,
        tipo_usuario: formData.tipo_usuario as 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel',
        escola_id: formData.escola_id || undefined,
      })

      toast.success('Perfil salvo com sucesso!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Erro ao salvar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      diretor: 'Diretor',
      secretario: 'Secretário',
      professor: 'Professor',
      responsavel: 'Responsável',
    }
    return labels[role as keyof typeof labels] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      diretor: 'bg-purple-100 text-purple-800',
      secretario: 'bg-blue-100 text-blue-800',
      professor: 'bg-green-100 text-green-800',
      responsavel: 'bg-gray-100 text-gray-800',
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil do Usuário
        </CardTitle>
        <CardDescription>
          {showCreateForm
            ? 'Crie seu perfil para começar a usar o sistema'
            : 'Informações da sua conta no sistema'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic User Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
          </div>
        </div>

        <Separator />

        {/* Profile Information */}
        {!isEditing && userProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Nome Completo</Label>
                <p className="text-lg font-medium">{userProfile.nome}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Tipo de Usuário</Label>
                <div className="mt-1">
                  <Badge className={getRoleBadgeColor(userProfile.tipo_usuario)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleLabel(userProfile.tipo_usuario)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Escola</Label>
                <p className="flex items-center gap-2 text-sm">
                  <School className="h-4 w-4" />
                  {userProfile.escola_id || 'Todas as escolas'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <div className="mt-1">
                  <Badge variant={userProfile.ativo ? 'default' : 'secondary'}>
                    {userProfile.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Data de Criação</Label>
                <p className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>

            {editable && (
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto"
              >
                Editar Perfil
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tipo_usuario">Tipo de Usuário *</Label>
                <Select
                  value={formData.tipo_usuario}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_usuario: value as UserProfile['tipo_usuario'] })
                  }
                >
                  <SelectTrigger id="tipo_usuario">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="secretario">Secretário</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="responsavel">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="escola_id">ID da Escola (opcional)</Label>
                <Input
                  id="escola_id"
                  value={formData.escola_id || ''}
                  onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                  placeholder="ID da escola (deixe vazio para acesso a todas)"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 md:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Perfil'
                )}
              </Button>

              {!showCreateForm && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {!userProfile && !isEditing && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Perfil não encontrado</p>
            {editable && (
              <Button onClick={() => setIsEditing(true)}>
                Criar Perfil
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}