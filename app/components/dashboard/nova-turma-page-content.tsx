'use client'

import { useClassroomTranslations } from '@/i18n/classroom'

import { useState, useEffect, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { useRouter } from 'next/navigation'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, GraduationCap, Users, School } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { useEscola } from '@/contexts/escola-context'
import { writeGovernedClass } from '@/lib/api/governed-management'
import { getClassDefaultCapacity } from '@/lib/api/class-capacity-settings'

interface EscolaOption {
  id: string
  nome: string
  tipo: string | null
}

interface ProfessorOption {
  id: string
  nome: string
}

const SERIES_BY_TIPO = {
  creche: ['Berçário I', 'Berçário II', 'Maternal I', 'Maternal II'],
  pre_escola: ['Pré I', 'Pré II'],
  fundamental: [
    '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
    '6º Ano', '7º Ano', '8º Ano', '9º Ano',
  ],
} as const satisfies Record<'creche' | 'pre_escola' | 'fundamental', readonly string[]>

type SchoolType = keyof typeof SERIES_BY_TIPO

function isClassShift(value: string): value is NewClassForm['turno'] {
  return value === 'matutino' || value === 'vespertino' || value === 'integral'
}

function isSchoolType(tipo: string | null): tipo is SchoolType {
  return tipo !== null && Object.hasOwn(SERIES_BY_TIPO, tipo)
}

function getSeriesForSchoolType(tipo: string | null): readonly string[] {
  return isSchoolType(tipo) ? SERIES_BY_TIPO[tipo] : []
}

type NewClassForm = {
  nome: string
  serie: string
  ano_letivo: number
  escola_id: string
  professor_id: string
  capacidade: number | null
  turno: '' | 'matutino' | 'vespertino' | 'integral'
  ativo: boolean
}

function initialClassForm(selectedEscolaId: string | null): NewClassForm {
  return {
    nome: '',
    serie: '',
    ano_letivo: new Date().getFullYear(),
    escola_id: selectedEscolaId ?? '',
    professor_id: '',
    capacidade: null,
    turno: '',
    ativo: true,
  }
}

function selectSchoolForClass(current: NewClassForm, escolaId: string): NewClassForm {
  if (current.escola_id === escolaId) return current
  return { ...current, escola_id: escolaId, professor_id: '', serie: '', capacidade: null }
}

type NovaTurmaDependencies = {
  supabaseClient: Pick<typeof supabase, 'from' | 'rpc'>
  router: Pick<ReturnType<typeof useRouter>, 'push'>
  escolaContext: ReturnType<typeof useEscola>
}

function useClassCapacityDefault(
  supabaseClient: NovaTurmaDependencies['supabaseClient'],
  schoolId: string,
  capacity: number | null,
  setFormData: Dispatch<SetStateAction<NewClassForm>>,
) {
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolId) return

    let cancelled = false
    void getClassDefaultCapacity(supabaseClient, schoolId)
      .then(capacity => {
        if (cancelled) return
        setFormData(current => current.escola_id === schoolId ? { ...current, capacidade: capacity } : current)
        setResolvedSchoolId(schoolId)
      })
      .catch(error => {
        if (cancelled) return
        logger.error('Error loading class capacity default', error instanceof Error ? error : new Error(String(error)), {
          feature: 'turmas',
          action: 'load_class_capacity_default',
        })
        toast.error('Não foi possível carregar a capacidade padrão da escola.')
        setFormData(current => current.escola_id === schoolId ? { ...current, capacidade: null } : current)
        setResolvedSchoolId(schoolId)
      })

    return () => {
      cancelled = true
    }
  }, [schoolId, setFormData, supabaseClient])

  return Boolean(schoolId) && (resolvedSchoolId !== schoolId || capacity === null)
}

function useSelectedSchoolSynchronization(
  selectedEscolaId: string | null,
  setFormData: Dispatch<SetStateAction<NewClassForm>>,
) {
  useEffect(() => {
    if (!selectedEscolaId) return
    setFormData(current => selectSchoolForClass(current, selectedEscolaId))
  }, [selectedEscolaId, setFormData])
}

function useNewClassOptions(
  supabaseClient: NovaTurmaDependencies['supabaseClient'],
  schoolId: string,
  t: ReturnType<typeof useClassroomTranslations>,
) {
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [teacherResult, setTeacherResult] = useState<{ schoolId: string, professores: ProfessorOption[] } | null>(null)

  useEffect(() => {
    async function loadEscolas() {
      try {
        const { data, error } = await supabaseClient
          .from('escolas')
          .select('id, nome, tipo')
          .eq('ativo', true)
          .order('nome')
        if (error) throw error
        setEscolas(data || [])
      } catch (err) {
        logger.error('Error loading escolas for nova turma', err instanceof Error ? err : new Error(String(err)), {
          feature: 'turmas',
          action: 'load_escolas',
        })
        toast.error(t('classes.loadError'))
      } finally {
        setLoadingSchools(false)
      }
    }
    void loadEscolas()
  }, [supabaseClient, t])

  useEffect(() => {
    if (!schoolId) return

    let cancelled = false
    async function loadProfessores() {
      const { data, error } = await supabaseClient
        .from('users')
        .select('id, nome')
        .eq('tipo_usuario', 'professor')
        .eq('escola_id', schoolId)
        .eq('ativo', true)
        .order('nome')
      if (error) {
        logger.error('Error loading professores', error, {
          feature: 'turmas',
          action: 'load_professores',
        })
        return
      }
      if (!cancelled) setTeacherResult({ schoolId, professores: data || [] })
    }
    void loadProfessores()

    return () => {
      cancelled = true
    }
  }, [schoolId, supabaseClient])

  return {
    escolas,
    professores: teacherResult?.schoolId === schoolId ? teacherResult.professores : [],
    loadingSchools,
  }
}

function getClassFormError(
  formData: NewClassForm,
  t: ReturnType<typeof useClassroomTranslations>,
): string | null {
  if (!formData.escola_id) return t('forms.selectSchool')
  if (!formData.nome.trim()) return t('forms.className')
  if (!formData.serie) return t('forms.selectSeries')
  if (!formData.turno) return t('forms.selectShift')
  if (formData.capacidade === null) return 'Não foi possível carregar a capacidade padrão da escola.'
  return null
}

function useCreateClass(
  supabaseClient: NovaTurmaDependencies['supabaseClient'],
  router: NovaTurmaDependencies['router'],
  formData: NewClassForm,
  t: ReturnType<typeof useClassroomTranslations>,
) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = getClassFormError(formData, t)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (formData.capacidade === null || !formData.turno) return

    setLoading(true)
    try {
      await writeGovernedClass(supabaseClient, null, {
        nome: formData.nome.trim(),
        serie: formData.serie,
        ano_letivo: formData.ano_letivo,
        escola_id: formData.escola_id,
        professor_id: formData.professor_id || null,
        capacidade: formData.capacidade,
        turno: formData.turno,
        ativo: formData.ativo,
      })

      toast.success(t('classes.createSuccess'))
      router.push('/dashboard/turmas')
    } catch (err) {
      logger.error('Error creating turma', err instanceof Error ? err : new Error(String(err)), {
        feature: 'turmas',
        action: 'create_turma',
      })
      toast.error(t('classes.createError'))
    } finally {
      setLoading(false)
    }
  }

  return { handleSubmit, loading }
}

function SchoolSelectionAlert({
  shouldShowSelector,
  schoolId,
}: {
  shouldShowSelector: boolean
  schoolId: string
}) {
  const t = useClassroomTranslations()
  if (!shouldShowSelector || schoolId) return null

  return (
    <Alert variant="destructive">
      <AlertDescription>
        {t('forms.selectSchool')} no menu lateral ou no formulário abaixo antes de criar uma turma.
      </AlertDescription>
    </Alert>
  )
}

function SchoolInfoCard({
  schoolId,
  schools,
  professors,
}: {
  schoolId: string
  schools: EscolaOption[]
  professors: ProfessorOption[]
}) {
  const t = useClassroomTranslations()
  const school = schools.find(candidate => candidate.id === schoolId)
  const series = getSeriesForSchoolType(school?.tipo ?? null)

  if (!school) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <School className="h-5 w-5" />
            <span>{t('forms.schoolInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {t('forms.selectSchool')} para ver as informações
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <School className="h-5 w-5" />
          <span>{t('forms.schoolInfo')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-gray-700">
          <p className="font-medium">{school.nome}</p>
          {school.tipo && <p className="capitalize text-gray-500">{school.tipo.replace('_', ' ')}</p>}
          <p>
            <span className="text-gray-500">{t('forms.availableTeachers')} </span>
            {professors.length}
          </p>
          <p>
            <span className="text-gray-500">{t('forms.availableSeries')} </span>
            {series.length}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function parseClassCapacityInput(value: string): number | null {
  return value === '' ? null : Number(value)
}

function isClassFormUnavailable(schoolId: string): boolean {
  return !schoolId
}

function isClassSubmitDisabled(
  loading: boolean,
  loadingSchools: boolean,
  loadingCapacity: boolean,
  capacity: number | null,
): boolean {
  return loading || loadingSchools || loadingCapacity || capacity === null
}

function getClassShift(value: string): NewClassForm['turno'] {
  return isClassShift(value) ? value : ''
}

function NoTeachersOption({
  schoolId,
  professorCount,
  label,
}: {
  schoolId: string
  professorCount: number
  label: string
}) {
  if (!schoolId || professorCount > 0) return null

  return <SelectItem value="__none" disabled>{label}</SelectItem>
}

function CreateClassButtonContent({ loading, t }: { loading: boolean, t: ReturnType<typeof useClassroomTranslations> }) {
  if (loading) {
    return (
      <>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
        Salvando…
      </>
    )
  }

  return (
    <>
      <Save className="h-4 w-4 mr-2" />
      {t('actions.create')} {t('labels.class')}
    </>
  )
}

type NewClassFormCardProps = {
  t: ReturnType<typeof useClassroomTranslations>
  formData: NewClassForm
  escolas: EscolaOption[]
  professores: ProfessorOption[]
  series: readonly string[]
  loading: boolean
  loadingSchools: boolean
  loadingCapacity: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSchoolChange: (schoolId: string) => void
  onInputChange: <K extends keyof NewClassForm>(field: K, value: NewClassForm[K]) => void
}

function NewClassFormCard({
  t,
  formData,
  escolas,
  professores,
  series,
  loading,
  loadingSchools,
  loadingCapacity,
  onSubmit,
  onSchoolChange,
  onInputChange,
}: NewClassFormCardProps) {
  const formUnavailable = isClassFormUnavailable(formData.escola_id)
  const submitDisabled = isClassSubmitDisabled(
    loading,
    loadingSchools,
    loadingCapacity,
    formData.capacidade,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5" />
          <span>{t('classes.data')}</span>
        </CardTitle>
        <CardDescription>
          {t('classes.dataHint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">{t('forms.className')} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(event) => onInputChange('nome', event.target.value)}
                placeholder="Ex: 5º Ano A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano_letivo">{t('forms.schoolYear')} *</Label>
              <Input
                id="ano_letivo"
                type="number"
                value={formData.ano_letivo}
                onChange={(event) => onInputChange('ano_letivo', parseInt(event.target.value))}
                min="2020"
                max="2030"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escola_id">{t('forms.school')} *</Label>
            <Select
              value={formData.escola_id}
              onValueChange={onSchoolChange}
              disabled={loadingSchools}
            >
              <SelectTrigger id="escola_id">
                <SelectValue placeholder={loadingSchools ? 'Carregando…' : t('forms.selectSchool')} />
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
              <Label htmlFor="serie">{t('forms.series')} *</Label>
              <Select
                value={formData.serie}
                onValueChange={(value) => onInputChange('serie', value)}
                disabled={formUnavailable}
              >
                <SelectTrigger id="serie">
                  <SelectValue placeholder={t('forms.selectSeries')} />
                </SelectTrigger>
                <SelectContent>
                  {series.map((serie) => (
                    <SelectItem key={serie} value={serie}>
                      {serie}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="turno">{t('forms.shift')} *</Label>
              <Select
                value={formData.turno}
                onValueChange={(value) => onInputChange('turno', getClassShift(value))}
              >
                <SelectTrigger id="turno">
                  <SelectValue placeholder={t('forms.selectShift')} />
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
              <Label htmlFor="professor_id">{t('forms.teacher')}</Label>
              <Select
                value={formData.professor_id}
                onValueChange={(value) => onInputChange('professor_id', value)}
                disabled={formUnavailable}
              >
                <SelectTrigger id="professor_id">
                  <SelectValue placeholder={t('forms.selectTeacher')} />
                </SelectTrigger>
                <SelectContent>
                  {professores.map((professor) => (
                    <SelectItem key={professor.id} value={professor.id}>
                      {professor.nome}
                    </SelectItem>
                  ))}
                  <NoTeachersOption
                    schoolId={formData.escola_id}
                    professorCount={professores.length}
                    label={t('forms.noTeacher')}
                  />
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidade">{t('forms.capacity')} *</Label>
              <Input
                id="capacidade"
                type="number"
                value={formData.capacidade ?? ''}
                onChange={(event) => onInputChange('capacidade', parseClassCapacityInput(event.target.value))}
                min="1"
                max="50"
                disabled={formUnavailable || loadingCapacity}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => onInputChange('ativo', checked)}
            />
            <Label htmlFor="ativo">{t('forms.active')}</Label>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/turmas">{t('actions.cancel')}</Link>
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              <CreateClassButtonContent loading={loading} t={t} />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function NovaTurmaPageContent({
  supabaseClient,
  router,
  escolaContext,
}: NovaTurmaDependencies) {
  const t = useClassroomTranslations()
  const { selectedEscolaId, shouldShowSelector } = escolaContext
  const [formData, setFormData] = useState(() => initialClassForm(selectedEscolaId))

  useSelectedSchoolSynchronization(selectedEscolaId, setFormData)
  const loadingCapacity = useClassCapacityDefault(
    supabaseClient,
    formData.escola_id,
    formData.capacidade,
    setFormData,
  )
  const { escolas, professores, loadingSchools } = useNewClassOptions(
    supabaseClient,
    formData.escola_id,
    t,
  )
  const { handleSubmit, loading } = useCreateClass(supabaseClient, router, formData, t)

  const handleInputChange = <K extends keyof NewClassForm>(field: K, value: NewClassForm[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectedEscola = escolas.find(escola => escola.id === formData.escola_id)
  const series = getSeriesForSchoolType(selectedEscola?.tipo ?? null)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/turmas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('actions.back')}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('classes.newTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('classes.newSubtitle')}</p>
        </div>
      </div>

      <SchoolSelectionAlert
        shouldShowSelector={shouldShowSelector}
        schoolId={formData.escola_id}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NewClassFormCard
            t={t}
            formData={formData}
            escolas={escolas}
            professores={professores}
            series={series}
            loading={loading}
            loadingSchools={loadingSchools}
            loadingCapacity={loadingCapacity}
            onSubmit={handleSubmit}
            onSchoolChange={(schoolId) => {
              if (!escolas.some(escola => escola.id === schoolId)) return
              setFormData(current => selectSchoolForClass(current, schoolId))
            }}
            onInputChange={handleInputChange}
          />
        </div>

        <div className="space-y-6">
          <SchoolInfoCard
            schoolId={formData.escola_id}
            schools={escolas}
            professors={professores}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{t('labels.capacity')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold text-blue-600">{formData.capacidade ?? '-'} alunos</p>
              <p className="text-sm text-gray-600">{t('forms.capacityInfo')}</p>
              <p className="text-sm font-medium text-gray-700">{t('forms.recommendations')}</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>{t('forms.recommendationNursery')}</li>
                <li>{t('forms.recommendationPreschool')}</li>
                <li>{t('forms.recommendationElementary')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
