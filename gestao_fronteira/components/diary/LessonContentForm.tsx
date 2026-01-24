/**
 * Lesson Content Form Component
 * Task Group 2.2: Formulario de Conteudo Estruturado
 *
 * This component provides a structured form for teachers to document
 * lesson content aligned with BNCC (Base Nacional Comum Curricular).
 *
 * Features:
 * - Required fields: Tema, Objetivo
 * - Optional fields: Habilidades BNCC, Metodologia, Recursos, Observacoes
 * - React Hook Form + Zod validation
 * - Auto-resize textareas for long descriptions
 * - Ed. Infantil vs Ensino Fundamental differentiation
 * - Campos de Experiencia selector for Ed. Infantil
 *
 * BNCC Reference:
 * - EF: Ensino Fundamental (Elementary School)
 * - EI: Educacao Infantil (Early Childhood Education)
 */

'use client'

import React, { useCallback, useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, X, Loader2, BookOpen, Target, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BNNCSelector } from './BNNCSelector'
import {
  lessonContentFormSchema,
  type LessonContentFormData,
  transformFormDataToInput,
  EXPERIENCE_FIELD_OPTIONS,
} from '@/lib/validation/lesson-content'
import type { EducationLevel, BNNCExperienceFieldCode } from '@/types/lesson-content'

export interface LessonContentFormProps {
  /** Session ID to associate the content with */
  sessionId: string
  /** Education level - changes available fields */
  educationLevel?: EducationLevel
  /** Initial values for editing */
  initialValues?: Partial<LessonContentFormData>
  /** Callback when form is submitted successfully */
  onSubmit?: (data: ReturnType<typeof transformFormDataToInput>) => void | Promise<void>
  /** Callback when cancel button is clicked */
  onCancel?: () => void
  /** Whether the form is in loading state */
  isLoading?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** CSS class for the container */
  className?: string
}

export function LessonContentForm({
  sessionId,
  educationLevel = 'fundamental',
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  disabled = false,
  className,
}: LessonContentFormProps) {
  // Form setup with Zod validation
  const form = useForm({
    resolver: zodResolver(lessonContentFormSchema),
    defaultValues: {
      tema: initialValues?.tema || '',
      objetivo: initialValues?.objetivo || '',
      habilidades_bncc_input: initialValues?.habilidades_bncc_input || '',
      metodologia: initialValues?.metodologia || '',
      recursos: initialValues?.recursos || '',
      observacoes: initialValues?.observacoes || '',
      campos_experiencia: initialValues?.campos_experiencia || [],
      education_level: educationLevel,
    } as LessonContentFormData,
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
  } = form

  // Watch selected experience fields for Ed. Infantil
  const selectedExperienceFields = watch('campos_experiencia')

  // Reset form when initialValues change
  useEffect(() => {
    if (initialValues) {
      reset({
        tema: initialValues.tema || '',
        objetivo: initialValues.objetivo || '',
        habilidades_bncc_input: initialValues.habilidades_bncc_input || '',
        metodologia: initialValues.metodologia || '',
        recursos: initialValues.recursos || '',
        observacoes: initialValues.observacoes || '',
        campos_experiencia: initialValues.campos_experiencia || [],
        education_level: educationLevel,
      } as LessonContentFormData)
    }
  }, [initialValues, educationLevel, reset])

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (data: LessonContentFormData) => {
      try {
        const transformedData = transformFormDataToInput(data, sessionId)
        await onSubmit?.(transformedData)
        toast.success('Conteudo da aula salvo com sucesso!')
      } catch (error) {
        toast.error('Erro ao salvar conteudo da aula')
        throw error
      }
    },
    [sessionId, onSubmit]
  )

  // Handle experience field toggle
  const toggleExperienceField = useCallback(
    (code: BNNCExperienceFieldCode, checked: boolean) => {
      const current = form.getValues('campos_experiencia') || []
      if (checked) {
        form.setValue('campos_experiencia', [...current, code])
      } else {
        form.setValue(
          'campos_experiencia',
          current.filter((c) => c !== code)
        )
      }
    },
    [form]
  )

  // Determine if form is disabled
  const isFormDisabled = disabled || isLoading || isSubmitting

  // Helper for BNCC input placeholder based on education level
  const bnccPlaceholder = useMemo(() => {
    if (educationLevel === 'infantil') {
      return 'Ex: EI03EO01, EI02CG02'
    }
    return 'Ex: EF01MA06, EF02LP08'
  }, [educationLevel])

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn('space-y-6', className)}
      >
        {/* Education Level Indicator */}
        <Alert className="border-blue-200 bg-blue-50">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {educationLevel === 'infantil' ? (
              <>
                <strong>Educacao Infantil</strong> - Use os Campos de Experiencia
                da BNCC
              </>
            ) : (
              <>
                <strong>Ensino Fundamental</strong> - Use as habilidades BNCC por
                componente curricular
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Required Fields Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Conteudo Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tema/Conteudo */}
            <FormField
              control={control}
              name="tema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="tema" className="text-base font-medium">
                    Tema / Conteudo *
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="tema"
                      placeholder="Ex: Adicao e Subtracao com numeros naturais"
                      disabled={isFormDisabled}
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormDescription>
                    Tema principal ou conteudo trabalhado na aula
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Objetivo */}
            <FormField
              control={control}
              name="objetivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="objetivo" className="text-base font-medium">
                    Objetivo *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      id="objetivo"
                      placeholder="Ex: Desenvolver a compreensao das operacoes basicas de adicao e subtracao, relacionando-as com situacoes do cotidiano"
                      disabled={isFormDisabled}
                      {...field}
                      className="min-h-[100px] resize-y"
                    />
                  </FormControl>
                  <FormDescription>
                    Objetivo de aprendizagem da aula (minimo 10 caracteres)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Ed. Infantil - Experience Fields */}
        {educationLevel === 'infantil' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                Campo de Experiencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione os Campos de Experiencia trabalhados nesta aula:
              </p>
              <div className="space-y-3">
                {EXPERIENCE_FIELD_OPTIONS.map((field) => (
                  <div
                    key={field.code}
                    className={cn(
                      'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                      selectedExperienceFields?.includes(field.code)
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200'
                    )}
                  >
                    <Checkbox
                      id={`experience-${field.code}`}
                      checked={selectedExperienceFields?.includes(field.code)}
                      onCheckedChange={(checked) =>
                        toggleExperienceField(field.code, checked as boolean)
                      }
                      disabled={isFormDisabled}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`experience-${field.code}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {field.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {field.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BNCC Skills */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Habilidades BNCC</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="habilidades_bncc_input"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BNNCSelector
                      id="habilidades-bncc"
                      value={field.value}
                      onChange={field.onChange}
                      label="Habilidades BNCC"
                      placeholder={bnccPlaceholder}
                      educationLevel={educationLevel}
                      disabled={isFormDisabled}
                      error={errors.habilidades_bncc_input?.message}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Optional Fields */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Detalhes Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metodologia */}
            <FormField
              control={control}
              name="metodologia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="metodologia">Metodologia</FormLabel>
                  <FormControl>
                    <Textarea
                      id="metodologia"
                      placeholder="Ex: Aula expositiva dialogada com uso de material concreto"
                      disabled={isFormDisabled}
                      {...field}
                      className="min-h-[80px] resize-y"
                    />
                  </FormControl>
                  <FormDescription>
                    Metodologia ou estrategia pedagogica utilizada
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Recursos */}
            <FormField
              control={control}
              name="recursos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="recursos">Recursos</FormLabel>
                  <FormControl>
                    <Textarea
                      id="recursos"
                      placeholder="Ex: Livro didatico, material dourado, quadro branco, projetor"
                      disabled={isFormDisabled}
                      {...field}
                      className="min-h-[80px] resize-y"
                    />
                  </FormControl>
                  <FormDescription>
                    Recursos e materiais didaticos utilizados
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Observacoes */}
            <FormField
              control={control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="observacoes">Observacoes</FormLabel>
                  <FormControl>
                    <Textarea
                      id="observacoes"
                      placeholder="Ex: Alunos demonstraram boa participacao. Alguns apresentaram dificuldades na subtracao com reagrupamento."
                      disabled={isFormDisabled}
                      {...field}
                      className="min-h-[100px] resize-y"
                    />
                  </FormControl>
                  <FormDescription>
                    Observacoes sobre a aula, dificuldades encontradas ou destaques
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isFormDisabled}
            className="min-w-[140px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Conteudo
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default LessonContentForm
