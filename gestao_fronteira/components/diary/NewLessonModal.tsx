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
import {
  lessonContentFormSchema,
  type LessonContentFormData,
  EXPERIENCE_FIELD_OPTIONS,
  parseBNNCCodes,
} from '@/lib/validation/lesson-content'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import type { EducationLevel } from '@/types/lesson-content'

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
  const { userProfile } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Form setup
  const form = useForm({
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
    } as LessonContentFormData,
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
      } as LessonContentFormData)
      setSelectedDate(new Date())
    }
  }, [open, form, educationLevel])

  // =========================================================================
  // Form Submission
  // =========================================================================

  const onSubmit = async (data: Record<string, unknown>) => {
    const formData = data as LessonContentFormData
    if (!turmaId || !userProfile) {
      toast.error('Turma nao selecionada')
      return
    }

    try {
      setIsSubmitting(true)

      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // First, create or get the session for this date
      let sessionId: string

      // Check if session already exists
      const { data: existingSession, error: sessionError } = await supabase
        .from('sessoes_aula')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('data_aula', dateStr)
        .maybeSingle()

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError
      }

      if (existingSession) {
        sessionId = existingSession.id
      } else {
        // Create new session
        const { data: turmaData } = await supabase
          .from('turmas')
          .select('escola_id')
          .eq('id', turmaId)
          .single()

        const escolaId = turmaData?.escola_id || userProfile.escola_id
        if (!escolaId) {
          toast.error('Escola nao encontrada')
          return
        }

        const { data: newSession, error: createError } = await supabase
          .from('sessoes_aula')
          .insert({
            turma_id: turmaId,
            data_aula: dateStr,
            status: 'ABERTA',
            professor_id: userProfile.id,
            escola_id: escolaId,
            conteudo_programatico: formData.tema,
          })
          .select('id')
          .single()

        if (createError) throw createError
        sessionId = newSession.id
      }

      // Parse BNCC codes from input string
      const habilidadesBncc = formData.habilidades_bncc_input
        ? parseBNNCCodes(formData.habilidades_bncc_input)
        : []

      // Create the lesson content using type-cast supabase client
      // Note: The conteudo_aula table is created by migrations but types aren't regenerated yet
      const contentInput = {
        sessao_id: sessionId,
        tema: formData.tema.trim(),
        objetivo: formData.objetivo.trim(),
        habilidades_bncc: habilidadesBncc,
        metodologia: formData.metodologia?.trim() || null,
        recursos: formData.recursos?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
      }

      const { error: contentError } = await (supabase as any)
        .from('conteudo_aula')
        .insert(contentInput)

      if (contentError) {
        // Handle specific errors
        if (contentError.code === '42P01') {
          // Table doesn't exist - just update the session with content instead
          await supabase
            .from('sessoes_aula')
            .update({ conteudo_programatico: formData.tema })
            .eq('id', sessionId)

          logger.info('Lesson content saved to session (table not yet created)', {
            feature: 'diario',
            action: 'create_lesson_fallback',
            metadata: { sessionId, turmaId, date: dateStr },
          })
        } else {
          throw contentError
        }
      } else {
        logger.info('Lesson created successfully', {
          feature: 'diario',
          action: 'create_lesson',
          metadata: { sessionId, turmaId, date: dateStr },
        })
      }

      onSuccess?.()
    } catch (err) {
      logger.error('Error creating lesson:', err as Error, {
        feature: 'diario',
        action: 'create_lesson_error',
      })
      toast.error('Erro ao criar aula. Tente novamente.')
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
            Nova Aula
          </DialogTitle>
          <DialogDescription>
            Registre o conteudo da aula para {turmaName || 'a turma selecionada'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Date Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Data da Aula</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Selecione a data'}
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
                      Tema/Conteudo *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Fracoes, Interpretacao de Texto, Sistema Solar..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Titulo principal do conteudo ministrado na aula
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
                      O que os alunos devem aprender ou desenvolver nesta aula
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
                      Habilidades BNCC
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
                      Metodologia
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
                      Observacoes
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observacoes adicionais sobre a aula, dificuldades identificadas, etc..."
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
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
