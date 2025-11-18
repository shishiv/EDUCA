'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentFormSchema, StudentFormData, formatCPF, formatBrazilianPhone } from '@/lib/validators/brazilian'
import { studentsApi } from '@/lib/api/students'
import { storageApi } from '@/lib/api/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CPFInput, BrazilianPhoneInput, BrazilianDateInput, BrazilianInputHelp } from '@/components/ui/brazilian-inputs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Upload,
  Users,
  Heart,
  AlertCircle,
  Save,
  X,
  UserPlus,
  FileText,
  Camera
} from 'lucide-react'
import { toast } from 'sonner'

interface StudentRegistrationFormProps {
  student?: StudentFormData
  onSuccess?: (student: any) => void
  onCancel?: () => void
  className?: string
}

export function StudentRegistrationForm({
  student,
  onSuccess,
  onCancel,
  className
}: StudentRegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')

  const isEditing = !!student

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: student || {
      nome_completo: '',
      data_nascimento: '',
      cpf: '',
      sexo: 'M',
      telefone: '',
      email: '',
      endereco: '',
      nome_mae: '',
      nome_pai: '',
      necessidades_especiais: '',
    }
  })

  const watchedData = watch()

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true)
    try {
      // Format data
      const formattedData = {
        ...data,
        cpf: data.cpf ? formatCPF(data.cpf) : undefined,
        telefone: data.telefone ? formatBrazilianPhone(data.telefone) : undefined,
      }

      // Prepare guardian data if provided
      const guardianData = data.nome_mae ? {
        nome: data.nome_mae,
        telefone: data.telefone,
        email: data.email,
        grau_parentesco: 'mae'
      } : undefined

      let result
      if (isEditing && student?.id) {
        // Update existing student
        result = await studentsApi.update(student.id, formattedData)
      } else {
        // Create new student with guardian relationship
        result = await studentsApi.createStudent({
          ...formattedData,
          responsavel: guardianData
        })
      }

      // Handle photo upload if provided
      if (photoFile && result) {
        try {
          const photoUrl = await storageApi.uploadStudentPhoto(result.id, photoFile)

          // Update student record with photo URL
          await studentsApi.update(result.id, { foto_url: photoUrl })

        } catch (photoError) {
          toast.error('Foto não pôde ser salva, mas dados do aluno foram salvos')
        }
      }

      toast.success(isEditing ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!')

      if (!isEditing) {
        reset()
        setPhotoFile(null)
        setPhotoPreview('')
      }

      onSuccess?.(result)
    } catch (error) {
      toast.error('Erro ao salvar dados do aluno')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCancel = () => {
    reset()
    setPhotoFile(null)
    setPhotoPreview('')
    onCancel?.()
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(watchedData.data_nascimento?.toString() || '')

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? (
            <>
              <User className="h-5 w-5" />
              Editar Aluno
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Cadastro de Aluno
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Atualize as informações do aluno'
            : 'Preencha as informações para cadastrar um novo aluno'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Photo Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Foto do Aluno</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoPreview} />
                <AvatarFallback className="bg-gray-100">
                  <Camera className="h-8 w-8 text-gray-400" />
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {photoFile ? 'Alterar Foto' : 'Escolher Foto'}
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-500">
                  Arquivo JPG, PNG ou WEBP até 5MB
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-6">
            <Label className="text-base font-medium">Dados Pessoais</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome_completo" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo *
                </Label>
                <Input
                  id="nome_completo"
                  {...register('nome_completo')}
                  placeholder="Nome completo do aluno"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.nome_completo && (
                  <p className="text-sm text-red-600 mt-1">{errors.nome_completo.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="data_nascimento" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Nascimento *
                </Label>
                <BrazilianDateInput
                  id="data_nascimento"
                  {...register('data_nascimento')}
                  disabled={loading}
                  className="mt-1"
                />
                <BrazilianInputHelp
                  id="data_nascimento-help"
                  type="date"
                  isValid={errors.data_nascimento ? false : null}
                  customMessage={errors.data_nascimento?.message}
                />
                {age !== null && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    Idade: {age} anos
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="sexo" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Sexo *
                </Label>
                <Select
                  value={watchedData.sexo}
                  onValueChange={(value) => setValue('sexo', value as 'M' | 'F')}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sexo && (
                  <p className="text-sm text-red-600 mt-1">{errors.sexo.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpf">CPF (opcional)</Label>
                <CPFInput
                  id="cpf"
                  {...register('cpf')}
                  disabled={loading}
                  className="mt-1"
                  onFormattedChange={(formatted, raw) => {
                    setValue('cpf', formatted)
                  }}
                />
                <BrazilianInputHelp
                  id="cpf-help"
                  type="cpf"
                  isValid={errors.cpf ? false : null}
                  customMessage={errors.cpf?.message}
                />
              </div>

              <div>
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <BrazilianPhoneInput
                  id="telefone"
                  {...register('telefone')}
                  disabled={loading}
                  className="mt-1"
                  onFormattedChange={(formatted, raw) => {
                    setValue('telefone', formatted)
                  }}
                />
                <BrazilianInputHelp
                  id="telefone-help"
                  type="phone"
                  isValid={errors.telefone ? false : null}
                  customMessage={errors.telefone?.message}
                />
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

          {/* Family Information */}
          <div className="space-y-6">
            <Label className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dados da Família
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_mae" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Nome da Mãe *
                </Label>
                <Input
                  id="nome_mae"
                  {...register('nome_mae')}
                  placeholder="Nome completo da mãe"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.nome_mae && (
                  <p className="text-sm text-red-600 mt-1">{errors.nome_mae.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="nome_pai">Nome do Pai</Label>
                <Input
                  id="nome_pai"
                  {...register('nome_pai')}
                  placeholder="Nome completo do pai (opcional)"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.nome_pai && (
                  <p className="text-sm text-red-600 mt-1">{errors.nome_pai.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Special Needs */}
          <div className="space-y-4">
            <Label htmlFor="necessidades_especiais" className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Necessidades Especiais
            </Label>

            <Textarea
              id="necessidades_especiais"
              {...register('necessidades_especiais')}
              placeholder="Descreva qualquer necessidade especial, deficiência, condição médica ou alergia (opcional)"
              disabled={loading}
              rows={4}
            />
            {errors.necessidades_especiais && (
              <p className="text-sm text-red-600 mt-1">{errors.necessidades_especiais.message}</p>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Estas informações são confidenciais e serão usadas apenas para proporcionar
                o melhor atendimento educacional ao aluno.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Summary Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resumo do Cadastro</Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nome:</span>
                  <p>{watchedData.nome_completo || 'Não informado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Idade:</span>
                  <p>{age !== null ? `${age} anos` : 'Data de nascimento não informada'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Sexo:</span>
                  <p>{watchedData.sexo === 'M' ? 'Masculino' : 'Feminino'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Mãe:</span>
                  <p>{watchedData.nome_mae || 'Não informado'}</p>
                </div>
              </div>

              {watchedData.necessidades_especiais && (
                <div>
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Necessidades Especiais
                  </Badge>
                </div>
              )}
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
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Aluno'}
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