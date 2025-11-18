'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { schoolFormSchema, SchoolFormData, formatBrazilianPhone } from '@/lib/validators/brazilian'
import { schoolsApi } from '@/lib/api/schools'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  Building2,
  MapPin,
  Phone,
  Hash,
  Users,
  User,
  AlertCircle,
  Save,
  X,
  School,
  FileText,
  Building
} from 'lucide-react'
import { toast } from 'sonner'

interface SchoolRegistrationFormProps {
  school?: SchoolFormData & { id?: string }
  onSuccess?: (school: any) => void
  onCancel?: () => void
  className?: string
  availableDirectors?: { id: string; nome: string; email: string }[]
}

export function SchoolRegistrationForm({
  school,
  onSuccess,
  onCancel,
  className,
  availableDirectors = []
}: SchoolRegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('')

  const isEditing = !!school?.id

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: school || {
      nome: '',
      codigo: '',
      endereco: '',
      telefone: '',
      tipo: 'fundamental',
    }
  })

  const watchedData = watch()

  const onSubmit = async (data: SchoolFormData) => {
    setLoading(true)
    try {
      // Format data
      const formattedData = {
        ...data,
        telefone: formatBrazilianPhone(data.telefone),
      }

      let result
      if (isEditing && school?.id) {
        // Update existing school
        result = await schoolsApi.update(school.id, formattedData)

        // Update director assignment if changed
        if (selectedDirectorId && selectedDirectorId !== school.diretor_id) {
          await schoolsApi.assignDirector(school.id, selectedDirectorId)
        }
      } else {
        // Create new school with director
        result = await schoolsApi.createSchool({
          ...formattedData,
          diretor_id: selectedDirectorId || undefined
        })
      }

      toast.success(isEditing ? 'Escola atualizada com sucesso!' : 'Escola cadastrada com sucesso!')

      if (!isEditing) {
        reset()
        setSelectedDirectorId('')
      }

      onSuccess?.(result)
    } catch (error) {
      toast.error('Erro ao salvar dados da escola')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    setSelectedDirectorId('')
    onCancel?.()
  }

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case 'creche': return 'Creche (0-3 anos)'
      case 'pre_escola': return 'Pré-escola (4-5 anos)'
      case 'fundamental': return 'Ensino Fundamental (6-14 anos)'
      default: return type
    }
  }

  const getSchoolTypeColor = (type: string) => {
    switch (type) {
      case 'creche': return 'bg-pink-50 border-pink-200 text-pink-700'
      case 'pre_escola': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'fundamental': return 'bg-green-50 border-green-200 text-green-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Building2 className="h-5 w-5" />
              Editar Escola
            </>
          ) : (
            <>
              <School className="h-5 w-5" />
              Cadastro de Escola
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Atualize as informações da escola'
            : 'Preencha as informações para cadastrar uma nova escola'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <Label className="text-base font-medium">Informações Básicas</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Nome da Escola *
                </Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Nome completo da escola"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.nome && (
                  <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="codigo" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Código da Escola *
                </Label>
                <Input
                  id="codigo"
                  {...register('codigo')}
                  placeholder="Código único (ex: ESC001)"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.codigo && (
                  <p className="text-sm text-red-600 mt-1">{errors.codigo.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Código único para identificação da escola
                </p>
              </div>

              <div>
                <Label htmlFor="tipo" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tipo de Escola *
                </Label>
                <Select
                  value={watchedData.tipo}
                  onValueChange={(value) => setValue('tipo', value as 'creche' | 'pre_escola' | 'fundamental')}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo de escola" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creche">Creche (0-3 anos)</SelectItem>
                    <SelectItem value="pre_escola">Pré-escola (4-5 anos)</SelectItem>
                    <SelectItem value="fundamental">Ensino Fundamental (6-14 anos)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-sm text-red-600 mt-1">{errors.tipo.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone *
                </Label>
                <Input
                  id="telefone"
                  {...register('telefone')}
                  placeholder="(34) 99999-9999"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.telefone && (
                  <p className="text-sm text-red-600 mt-1">{errors.telefone.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="endereco" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço Completo *
              </Label>
              <Textarea
                id="endereco"
                {...register('endereco')}
                placeholder="Rua, número, bairro, cidade - CEP"
                disabled={loading}
                className="mt-1"
                rows={3}
              />
              {errors.endereco && (
                <p className="text-sm text-red-600 mt-1">{errors.endereco.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Director Assignment */}
          {availableDirectors.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Diretor da Escola
              </Label>

              <Select
                value={selectedDirectorId}
                onValueChange={setSelectedDirectorId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um diretor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum diretor selecionado</SelectItem>
                  {availableDirectors.map((director) => (
                    <SelectItem key={director.id} value={director.id}>
                      {director.nome} - {director.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O diretor pode ser atribuído posteriormente através do painel de administração.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Separator />

          {/* Summary Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resumo do Cadastro</Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nome:</span>
                  <p>{watchedData.nome || 'Não informado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Código:</span>
                  <p>{watchedData.codigo || 'Não informado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tipo:</span>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={getSchoolTypeColor(watchedData.tipo)}
                    >
                      {getSchoolTypeLabel(watchedData.tipo)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Diretor:</span>
                  <p>
                    {selectedDirectorId
                      ? availableDirectors.find(d => d.id === selectedDirectorId)?.nome || 'Selecionado'
                      : 'Não atribuído'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Escola'}
            </LoadingButton>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
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