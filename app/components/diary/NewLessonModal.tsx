/**
 * NewLessonModal Component - Modal for creating new lessons
 * Task 2.3.4: Create new lesson modal
 *
 * Features:
 * - Dialog using shadcn/ui Dialog component
 * - Integrated LessonContentForm
 * - Date selector
 * - Green "+ NOVA AULA" triggering
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/diario.html
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  BookOpen,
  Target,
  BookMarked,
  FileText,
  Lightbulb,
  MessageSquare,
  Loader2,
  Save,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  lessonContentFormSchema,
  type LessonContentFormData,
  EXPERIENCE_FIELD_OPTIONS,
} from '@/lib/validation/lesson-content'
import { useAuth } from '@/hooks/use-auth'
import { createDiaryLessonAction } from '@/app/actions/diary/create-lesson'
import { logger } from '@/lib/logger'
import { getTodaySaoPauloDate } from '@/lib/date-utils'
import type { EducationLevel } from '@/types/lesson-content'
import { useClassroomTranslations } from '@/i18n/classroom'

// ============================================================================
// Types
// ============================================================================

interface NewLessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turmaId: string | null
  turmaName?: string
  educationLevel?: EducationLevel
  onSuccess?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function NewLessonModal({
  open,
  onOpenChange,
  turmaId,
  turmaName,
  educationLevel = 'fundamental',
  onSuccess,
}: NewLessonModalProps) {
  const t = useClassroomTranslations()
  const { userProfile } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(getTodaySaoPauloDate)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const canCreateLesson = ['professor', 'diretor'].includes(userProfile?.tipo_usuario ?? '')

  // Form setup
  const form = useForm<z.input<typeof lessonContentFormSchema>, undefined, LessonContentFormData>({
    resolver: zodResolver(lessonContentFormSchema),
    defaultValues: {
      tema: '',
      objetivo: '',
      habilidades_bncc_input: '',
      metodologia: '',
      recursos: '',
      observacoes: '',
      campos_experiencia: [],
      education_level: educationLevel,
    },
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        tema: '',
        objetivo: '',
        habilidades_bncc_input: '',
        metodologia: '',
        recursos: '',
        observacoes: '',
        campos_experiencia: [],
        education_level: educationLevel,
      })
      setSelectedDate(getTodaySaoPauloDate())
      setSubmissionError(null)
    }
  }, [open, form, educationLevel])

  // =========================================================================
  // Form Submission
  // =========================================================================

  const onSubmit = async (formData: LessonContentFormData) => {
    if (!turmaId || !userProfile) {
      toast.error('Turma nao selecionada')
      return
    }

    if (!canCreateLesson) {
      setSubmissionError('Seu perfil pode apenas visualizar o diário. Professores e diretores registram aulas.')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmissionError(null)

      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      const result = await createDiaryLessonAction({
        turmaId,
        date: dateStr,
        content: formData,
      })
      if (!result.success) {
        setSubmissionError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Aula registrada com sucesso.')
      onOpenChange(false)

      onSuccess?.()
    } catch (err) {
      const message = 'Não foi possível criar a aula. Tente novamente.'
      logger.error('Error creating lesson:', err instanceof Error ? err : new Error(message), {
        feature: 'diario',
        action: 'create_lesson_error',
      })
      setSubmissionError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-green-600" />
            {t('actions.newLesson')}
          </DialogTitle>
          <DialogDescription>
            Registre o conteudo da aula para {turmaName || 'a turma selecionada'}
          </DialogDescription>
        </DialogHeader>

        {!canCreateLesson ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t('diary.viewOnly')}</AlertTitle>
            <AlertDescription>
              {t('diary.viewOnlyHint')}
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            {submissionError && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Não foi possível registrar a aula</AlertTitle>
                <AlertDescription>{submissionError}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Date Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('diary.date')}</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setIsCalendarOpen(false)
                        }
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Tema/Conteudo */}
              <FormField
                control={form.control}
                name="tema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-blue-500" />
                      Tema/Conteúdo *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Frações, Interpretação de Texto, Sistema Solar..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Título principal do conteúdo ministrado na aula
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Objetivo */}
              <FormField
                control={form.control}
                name="objetivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Objetivo *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os objetivos de aprendizagem desta aula..."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('diary.objectiveHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Habilidades BNCC */}
              <FormField
                control={form.control}
                name="habilidades_bncc_input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      {t('diary.bnccSkills')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: EF01MA06, EF01MA08 (separe por virgula)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Codigos das habilidades da BNCC trabalhadas (separados por virgula)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos de Experiencia - Ed. Infantil */}
              {educationLevel === 'infantil' && (
                <FormField
                  control={form.control}
                  name="campos_experiencia"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        Campos de Experiencia
                      </FormLabel>
                      <div className="space-y-2">
                        {EXPERIENCE_FIELD_OPTIONS.map((field) => (
                          <FormField
                            key={field.code}
                            control={form.control}
                            name="campos_experiencia"
                            render={({ field: formField }) => (
                              <FormItem
                                key={field.code}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={formField.value?.includes(field.code)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = formField.value || []
                                      if (checked) {
                                        formField.onChange([...currentValue, field.code])
                                      } else {
                                        formField.onChange(
                                          currentValue.filter((v: string) => v !== field.code)
                                        )
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-medium cursor-pointer">
                                    {field.label}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {field.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Metodologia */}
              <FormField
                control={form.control}
                name="metodologia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      {t('diary.methodology')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva a metodologia utilizada (aula expositiva, trabalho em grupo, etc.)..."
                        className="min-h-[60px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recursos */}
              <FormField
                control={form.control}
                name="recursos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      Recursos Utilizados
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Livro didatico, material dourado, projetor..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observacoes */}
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      {t('labels.observations')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais sobre a aula, dificuldades identificadas, etc..."
                        className="min-h-[60px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </form>
            </Form>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('diary.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || !canCreateLesson}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Aula
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
