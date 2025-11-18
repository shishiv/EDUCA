'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUser, useUpdateUser, useUserRoleHelpers } from '@/hooks/use-users-query'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  User,
  Mail,
  Shield,
  School,
  AlertCircle,
  Save,
  X,
  UserPlus
} from 'lucide-react'
import { UserProfile } from '@/lib/auth'

// Form validation schema
const userFormSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  tipo_usuario: z.enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel'], {
    message: 'Selecione um tipo de usuário'
  }),
  escola_id: z.string().optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  user?: UserProfile
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

export function UserForm({ user, onSuccess, onCancel, className }: UserFormProps) {
  const { userProfile: currentUser } = useAuth()
  const { getRoleLabel, getRoleColor, canUserManageRole } = useUserRoleHelpers()

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const isEditing = !!user
  const isLoading = createUserMutation.isPending || updateUserMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nome: user?.nome || '',
      email: user?.email || '',
      tipo_usuario: (user?.tipo_usuario as 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel') || 'professor',
      escola_id: user?.escola_id || '',
    }
  })

  const watchedRole = watch('tipo_usuario')

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        // Update existing user
        await updateUserMutation.mutateAsync({
          id: user.id,
          data: {
            nome: data.nome,
            email: data.email,
            tipo_usuario: data.tipo_usuario,
            escola_id: data.escola_id || null,
          }
        })
      } else {
        // Create new user
        const userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        await createUserMutation.mutateAsync({
          id: userId,
          nome: data.nome,
          email: data.email,
          tipo_usuario: data.tipo_usuario,
          escola_id: data.escola_id || undefined,
        })

        // Reset form after creation
        reset()
      }

      onSuccess?.()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  // Available roles based on current user permissions
  const availableRoles = [
    'admin',
    'diretor',
    'secretario',
    'professor',
    'responsavel'
  ].filter(role => {
    if (!currentUser) return false
    return canUserManageRole(currentUser.tipo_usuario, role)
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? (
            <>
              <User className="h-5 w-5" />
              Editar Usuário
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Novo Usuário
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Atualize as informações do usuário'
            : 'Preencha as informações para criar um novo usuário'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo *
              </Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Nome completo do usuário"
                disabled={isLoading}
                className="mt-1"
              />
              {errors.nome && (
                <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@fronteira.mg.gov.br"
                disabled={isLoading}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                O usuário receberá um convite por email para definir a senha
              </p>
            </div>
          </div>

          <Separator />

          {/* Role and Permissions */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="tipo_usuario" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Tipo de Usuário *
              </Label>
              <Select
                value={watchedRole}
                onValueChange={(value) => setValue('tipo_usuario', value as any)}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o tipo de usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(role)} variant="outline">
                          {getRoleLabel(role)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo_usuario && (
                <p className="text-sm text-red-600 mt-1">{errors.tipo_usuario.message}</p>
              )}
            </div>

            {/* Role Description */}
            {watchedRole && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{getRoleLabel(watchedRole)}:</strong>{' '}
                  {getRoleDescription(watchedRole)}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="escola_id" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Escola (Opcional)
              </Label>
              <Input
                id="escola_id"
                {...register('escola_id')}
                placeholder="ID da escola ou deixe vazio para todas"
                disabled={isLoading}
                className="mt-1"
              />
              <p className="text-sm text-gray-600 mt-1">
                Deixe vazio para permitir acesso a todas as escolas (somente admins)
              </p>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resumo do Usuário</Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{watch('nome') || 'Nome não informado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                <span>{watch('email') || 'Email não informado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-600" />
                <Badge className={getRoleColor(watchedRole)} variant="outline">
                  {getRoleLabel(watchedRole)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-gray-600" />
                <span>{watch('escola_id') || 'Todas as escolas'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
            </LoadingButton>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Helper function to get role descriptions
function getRoleDescription(role: string): string {
  const descriptions = {
    admin: 'Acesso completo ao sistema, pode gerenciar usuários, escolas e todas as funcionalidades',
    diretor: 'Gerencia uma escola específica, pode ver relatórios e gerenciar professores da sua escola',
    secretario: 'Gerencia matrículas, alunos e dados administrativos da escola',
    professor: 'Registra frequência, notas e observações dos alunos de suas turmas',
    responsavel: 'Visualiza informações dos seus filhos matriculados (frequência, notas, comunicados)'
  }

  return descriptions[role as keyof typeof descriptions] || 'Descrição não disponível'
}