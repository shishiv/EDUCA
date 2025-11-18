'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classFormSchema, ClassFormData } from '@/lib/validators/brazilian'
import { schoolsApi } from '@/lib/api/schools'
import { classesApi } from '@/lib/api/classes'
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
  Users,
  Calendar,
  GraduationCap,
  School,
  User,
  Clock,
  AlertCircle,
  Save,
  X,
  Hash,
  Building
} from 'lucide-react'
import { toast } from 'sonner'

interface ClassCreationFormProps {
  schoolId: string
  onSuccess?: (classData: any) => void
  onCancel?: () => void
  className?: string
}

// Brazilian educational series by school type
const SERIES_BY_TYPE = {
  creche: [
    { value: 'berçario', label: 'Berçário (0-1 ano)' },
    { value: 'maternal_1', label: 'Maternal I (1-2 anos)' },
    { value: 'maternal_2', label: 'Maternal II (2-3 anos)' }
  ],
  pre_escola: [
    { value: 'pre_1', label: 'Pré I (4 anos)' },
    { value: 'pre_2', label: 'Pré II (5 anos)' }
  ],
  fundamental: [
    { value: '1_ano', label: '1º ano' },
    { value: '2_ano', label: '2º ano' },
    { value: '3_ano', label: '3º ano' },
    { value: '4_ano', label: '4º ano' },
    { value: '5_ano', label: '5º ano' },
    { value: '6_ano', label: '6º ano' },
    { value: '7_ano', label: '7º ano' },
    { value: '8_ano', label: '8º ano' },
    { value: '9_ano', label: '9º ano' }
  ]
}

const TURNO_OPTIONS = [
  { value: 'matutino', label: 'Matutino (07:00 - 12:00)' },
  { value: 'vespertino', label: 'Vespertino (13:00 - 18:00)' },
  { value: 'integral', label: 'Integral (07:00 - 17:00)' }
]

// Class name suffixes for multiple classes per series
const CLASS_SUFFIXES = ['A', 'B', 'C', 'D', 'E', 'F']

export function ClassCreationForm({
  schoolId,
  onSuccess,
  onCancel,
  className
}: ClassCreationFormProps) {
  const [loading, setLoading] = useState(false)
  const [schoolData, setSchoolData] = useState<any>(null)
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([])
  const [suggestedClassName, setSuggestedClassName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      nome: '',
      ano_letivo: new Date().getFullYear(),
      serie: '',
      escola_id: schoolId,
      capacidade: 25,
      turno: 'matutino',
    }
  })

  const watchedData = watch()

  // Load school data and teachers on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [school, teachers] = await Promise.all([
          schoolsApi.getById(schoolId),
          schoolsApi.getAvailableTeachers(schoolId)
        ])

        setSchoolData(school)
        setAvailableTeachers(teachers)
      } catch (error) {
        toast.error('Erro ao carregar dados da escola')
      }
    }

    loadData()
  }, [schoolId])

  // Generate suggested class name based on series and existing classes
  useEffect(() => {
    if (watchedData.serie && schoolData) {
      const seriesOptions = SERIES_BY_TYPE[schoolData.tipo as keyof typeof SERIES_BY_TYPE] || []
      const selectedSeries = seriesOptions.find(s => s.value === watchedData.serie)

      if (selectedSeries) {
        // For fundamental series, suggest format like "1º ano A"
        // For other levels, use full name like "Maternal I A"
        const baseName = selectedSeries.label.split(' (')[0] // Remove age info
        setSuggestedClassName(`${baseName} A`)
        setValue('nome', `${baseName} A`)
      }
    }
  }, [watchedData.serie, schoolData, setValue])

  const onSubmit = async (data: ClassFormData) => {
    setLoading(true)
    try {
      const result = await classesApi.createClass(data)

      toast.success('Turma criada com sucesso!')

      reset()
      onSuccess?.(result)
    } catch (error) {
      toast.error('Erro ao criar turma')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  const getSeriesOptions = () => {
    if (!schoolData) return []
    return SERIES_BY_TYPE[schoolData.tipo as keyof typeof SERIES_BY_TYPE] || []
  }

  const getTurnoLabel = (turno: string) => {
    const option = TURNO_OPTIONS.find(t => t.value === turno)
    return option ? option.label : turno
  }

  const getCapacidadeRecommendation = () => {
    if (!watchedData.serie) return ''

    if (watchedData.serie.includes('berçario')) return 'Recomendado: 8-12 alunos'
    if (watchedData.serie.includes('maternal')) return 'Recomendado: 12-18 alunos'
    if (watchedData.serie.includes('pre_')) return 'Recomendado: 18-25 alunos'
    return 'Recomendado: 25-30 alunos'
  }

  if (!schoolData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <School className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Carregando dados da escola...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Nova Turma - {schoolData.nome}
        </CardTitle>
        <CardDescription>
          Crie uma nova turma para o ano letivo {new Date().getFullYear()}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <Label className="text-base font-medium">Informações da Turma</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serie" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Série/Nível *
                </Label>
                <Select
                  value={watchedData.serie}
                  onValueChange={(value) => setValue('serie', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSeriesOptions().map((series) => (
                      <SelectItem key={series.value} value={series.value}>
                        {series.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serie && (
                  <p className="text-sm text-red-600 mt-1">{errors.serie.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Nome da Turma *
                </Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex: 1º ano A, Maternal I B"
                  disabled={loading}
                  className="mt-1"
                />
                {errors.nome && (
                  <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
                )}
                {suggestedClassName && (
                  <p className="text-sm text-gray-500 mt-1">
                    Sugestão: {suggestedClassName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="turno" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Turno *
                </Label>
                <Select
                  value={watchedData.turno}
                  onValueChange={(value) => setValue('turno', value as 'matutino' | 'vespertino' | 'integral')}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {TURNO_OPTIONS.map((turno) => (
                      <SelectItem key={turno.value} value={turno.value}>
                        {turno.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.turno && (
                  <p className="text-sm text-red-600 mt-1">{errors.turno.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="capacidade" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacidade *
                </Label>
                <Input
                  id="capacidade"
                  type="number"
                  {...register('capacidade', { valueAsNumber: true })}
                  min={1}
                  max={50}
                  disabled={loading}
                  className="mt-1"
                />
                {errors.capacidade && (
                  <p className="text-sm text-red-600 mt-1">{errors.capacidade.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {getCapacidadeRecommendation()}
                </p>
              </div>

              <div>
                <Label htmlFor="ano_letivo" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ano Letivo *
                </Label>
                <Input
                  id="ano_letivo"
                  type="number"
                  {...register('ano_letivo', { valueAsNumber: true })}
                  disabled={loading}
                  className="mt-1"
                />
                {errors.ano_letivo && (
                  <p className="text-sm text-red-600 mt-1">{errors.ano_letivo.message}</p>
                )}
              </div>

              {/* Teacher Assignment */}
              {availableTeachers.length > 0 && (
                <div>
                  <Label htmlFor="professor_id" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Professor
                  </Label>
                  <Select
                    value={watchedData.professor_id || ''}
                    onValueChange={(value) => setValue('professor_id', value || undefined)}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um professor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum professor atribuído</SelectItem>
                      {availableTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.professor_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.professor_id.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* School Information */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Informações da Escola
            </Label>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Escola:</span>
                  <p>{schoolData.nome}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Código:</span>
                  <p>{schoolData.codigo}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tipo:</span>
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {schoolData.tipo.charAt(0).toUpperCase() + schoolData.tipo.slice(1)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Professores disponíveis:</span>
                  <p>{availableTeachers.length} professores</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resumo da Turma</Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nome:</span>
                  <p>{watchedData.nome || 'Não informado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Série:</span>
                  <p>{getSeriesOptions().find(s => s.value === watchedData.serie)?.label || 'Não selecionada'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Turno:</span>
                  <p>{getTurnoLabel(watchedData.turno)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Capacidade:</span>
                  <p>{watchedData.capacidade} alunos</p>
                </div>
              </div>
            </div>
          </div>

          {!availableTeachers.length && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum professor cadastrado para esta escola.
                Você pode atribuir professores depois na gestão de usuários.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Criar Turma
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