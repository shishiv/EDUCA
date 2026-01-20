/**
 * Diario de Classe (Class Diary) - Main Page
 * Task 2.3.1: Create main diary page with card list
 *
 * Features:
 * - Two-column layout: lesson cards (2/3) + detail panel (1/3 sticky)
 * - Class/turma selector in header
 * - "+ NOVA AULA" button for new lessons
 * - Card-based lesson history with selection
 * - Responsive: desktop two-column, tablet collapsible, mobile drawer
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see planning/visuals/diario.html
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Plus,
  ClipboardList,
  Calendar,
  PanelRightClose,
  PanelRightOpen,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LessonCard, LessonCardSkeleton, type LessonCardData } from '@/components/diary/LessonCard'
import { LessonDetailPanel, type LessonDetailData } from '@/components/diary/LessonDetailPanel'
import { NewLessonModal } from '@/components/diary/NewLessonModal'
import { useAuth } from '@/hooks/use-auth'
import { useEscola } from '@/contexts/escola-context'
import { EscolaRequiredState } from '@/components/ui/escola-required-state'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { deleteSession, updateSession } from '@/lib/api/class-diary'

// ============================================================================
// Types
// ============================================================================

interface Turma {
  id: string
  nome: string
  serie: string
  ano_letivo: number
  escola_id: string
}

interface ConteudoAula {
  id: string
  tema: string
  objetivo: string | null
  metodologia: string | null
  recursos: string | null
  observacoes: string | null
  habilidades_bncc: string[] | null
}

// ============================================================================
// Component
// ============================================================================

export default function DiarioPage() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const { selectedEscolaId, shouldShowSelector } = useEscola()

  // Determine which escola_id to use for filtering
  const escolaIdToUse = useMemo(() => {
    // Admin users with selector: use selected escola (may be null)
    if (shouldShowSelector) {
      return selectedEscolaId
    }
    // Non-admin users: use their assigned escola
    return userProfile?.escola_id || null
  }, [shouldShowSelector, selectedEscolaId, userProfile?.escola_id])

  // State
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonCardData[]>([])
  const [selectedLesson, setSelectedLesson] = useState<LessonDetailData | null>(null)

  // Modal state
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonDetailData | null>(null)
  const [editFormData, setEditFormData] = useState({ tema: '', observacoes: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Loading states
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // =========================================================================
  // Data Loading: Turmas
  // =========================================================================

  useEffect(() => {
    async function loadTurmas() {
      if (!userProfile) return

      // If admin needs escola selected but hasn't selected one, don't fetch
      if (shouldShowSelector && !escolaIdToUse) {
        setTurmas([])
        setLoadingTurmas(false)
        return
      }

      try {
        setLoadingTurmas(true)
        setError(null)

        let query = supabase
          .from('turmas')
          .select('id, nome, serie, ano_letivo, escola_id')
          .eq('ativo', true)
          .order('nome')

        // Filter by escola if we have one
        if (escolaIdToUse) {
          query = query.eq('escola_id', escolaIdToUse)
        }

        // For professors, filter by their assigned turmas
        if (userProfile.tipo_usuario === 'professor') {
          query = query.eq('professor_id', userProfile.id)
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        const formattedTurmas: Turma[] = (data || []).map((t) => ({
          id: t.id,
          nome: t.nome,
          serie: t.serie,
          ano_letivo: t.ano_letivo,
          escola_id: t.escola_id,
        }))

        setTurmas(formattedTurmas)

        // Auto-select first turma if only one available
        if (formattedTurmas.length === 1 && !selectedTurmaId) {
          setSelectedTurmaId(formattedTurmas[0].id)
        }
      } catch (err) {
        logger.error('Error loading turmas:', err as Error, {
          feature: 'diario',
          action: 'load_turmas',
        })
        setError('Erro ao carregar turmas. Tente novamente.')
      } finally {
        setLoadingTurmas(false)
      }
    }

    loadTurmas()
  }, [userProfile, selectedTurmaId, escolaIdToUse, shouldShowSelector])

  // =========================================================================
  // Data Loading: Lessons
  // =========================================================================

  const loadLessons = useCallback(async () => {
    if (!selectedTurmaId) {
      setLessons([])
      return
    }

    try {
      setLoadingLessons(true)
      setError(null)

      // Get sessions - first try with conteudo_aula, fallback to basic if table doesn't exist
      let sessions: any[] = []

      try {
        // Try to get sessions with content
        const { data: sessionsWithContent, error: sessionsError } = await supabase
          .from('sessoes_aula')
          .select(`
            id,
            data_aula,
            conteudo_programatico,
            status,
            turma_id
          `)
          .eq('turma_id', selectedTurmaId)
          .order('data_aula', { ascending: false })
          .limit(50)

        if (sessionsError) throw sessionsError
        sessions = sessionsWithContent || []

        // Try to fetch lesson content separately (if table exists)
        for (const session of sessions) {
          try {
            const { data: content } = await (supabase as any)
              .from('conteudo_aula')
              .select('id, tema, objetivo, observacoes')
              .eq('sessao_id', session.id)
              .maybeSingle()

            session.conteudo = content
          } catch {
            // Table might not exist yet, continue without content
            session.conteudo = null
          }
        }
      } catch (err) {
        logger.warn('Error loading sessions with content, falling back:', {
          feature: 'diario',
          action: 'load_lessons_fallback',
        })

        // Fallback: just get sessions without content
        const { data: basicSessions, error: basicError } = await supabase
          .from('sessoes_aula')
          .select('id, data_aula, conteudo_programatico, status, turma_id')
          .eq('turma_id', selectedTurmaId)
          .order('data_aula', { ascending: false })
          .limit(50)

        if (basicError) throw basicError
        sessions = basicSessions || []
      }

      // For each session, get attendance stats
      const lessonsWithStats: LessonCardData[] = await Promise.all(
        sessions.map(async (session: any) => {
          // Get attendance stats for this session
          const { data: attendance } = await supabase
            .from('frequencia')
            .select('id, presente, status_presenca')
            .eq('sessao_id', session.id)

          const total = attendance?.length || 0
          const presentes =
            attendance?.filter(
              (a: any) => a.status_presenca === 'P' || (a.presente && !a.status_presenca)
            ).length || 0
          const ausentes =
            attendance?.filter(
              (a: any) => a.status_presenca === 'F' || (!a.presente && !a.status_presenca)
            ).length || 0
          const atestados = attendance?.filter((a: any) => a.status_presenca === 'A').length || 0

          const content = session.conteudo

          return {
            id: session.id,
            data_aula: session.data_aula,
            tema: content?.tema || session.conteudo_programatico || 'Aula registrada',
            disciplina: null,
            resumo: content?.objetivo || null,
            objetivo: content?.objetivo || null,
            total_alunos: total,
            total_presentes: presentes,
            total_ausentes: ausentes,
            total_atestados: atestados,
            status: session.status,
          }
        })
      )

      setLessons(lessonsWithStats)
    } catch (err) {
      logger.error('Error loading lessons:', err as Error, {
        feature: 'diario',
        action: 'load_lessons',
      })
      setError('Erro ao carregar aulas. Tente novamente.')
    } finally {
      setLoadingLessons(false)
    }
  }, [selectedTurmaId])

  useEffect(() => {
    loadLessons()
  }, [loadLessons])

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleTurmaChange = (turmaId: string) => {
    setSelectedTurmaId(turmaId)
    setSelectedLesson(null)
    setLessons([])
  }

  const handleLessonClick = async (lesson: LessonCardData) => {
    try {
      setLoadingDetail(true)

      // For mobile, open the sheet
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsDetailSheetOpen(true)
      }

      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessoes_aula')
        .select(`
          id,
          data_aula,
          status,
          turma_id,
          conteudo_programatico,
          turmas (
            id,
            nome,
            serie
          )
        `)
        .eq('id', lesson.id)
        .single()

      if (sessionError) throw sessionError

      // Try to fetch content separately
      let content: ConteudoAula | null = null
      try {
        const { data: contentData } = await (supabase as any)
          .from('conteudo_aula')
          .select('id, tema, objetivo, metodologia, recursos, observacoes, habilidades_bncc')
          .eq('sessao_id', lesson.id)
          .maybeSingle()

        content = contentData
      } catch {
        // Content table might not exist
      }

      const turma = sessionData.turmas as { id: string; nome: string; serie: string } | null

      // Build detail data
      const detailData: LessonDetailData = {
        id: sessionData.id,
        sessao_id: sessionData.id,
        data_aula: sessionData.data_aula,
        tema: content?.tema || sessionData.conteudo_programatico || 'Aula registrada',
        disciplina: null,
        objetivo: content?.objetivo || null,
        metodologia: content?.metodologia || null,
        recursos: content?.recursos || null,
        observacoes: content?.observacoes || null,
        habilidades_bncc: content?.habilidades_bncc || [],
        total_alunos: lesson.total_alunos,
        total_presentes: lesson.total_presentes,
        total_ausentes: lesson.total_ausentes,
        total_atestados: lesson.total_atestados,
        status: sessionData.status,
        turma_nome: turma?.nome,
      }

      setSelectedLesson(detailData)
    } catch (err) {
      logger.error('Error loading lesson detail:', err as Error, {
        feature: 'diario',
        action: 'load_detail',
      })
      toast.error('Erro ao carregar detalhes da aula')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleEditLesson = (lesson: LessonDetailData) => {
    // Open edit modal with lesson data
    setEditingLesson(lesson)
    setEditFormData({
      tema: lesson.tema || '',
      observacoes: lesson.observacoes || '',
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingLesson) return

    setIsEditing(true)
    try {
      const { error } = await updateSession(supabase, editingLesson.id, {
        conteudo_programatico: editFormData.tema,
      })

      if (error) throw error

      // Also update conteudo_aula if it exists
      if (editingLesson.sessao_id) {
        try {
          await (supabase as any)
            .from('conteudo_aula')
            .update({
              tema: editFormData.tema,
              observacoes: editFormData.observacoes,
            })
            .eq('sessao_id', editingLesson.sessao_id)
        } catch {
          // Content table might not exist, continue
        }
      }

      toast.success('Aula atualizada com sucesso')
      setIsEditModalOpen(false)
      setEditingLesson(null)
      setSelectedLesson(null)
      loadLessons()
    } catch (err) {
      logger.error('Error updating lesson:', err as Error, {
        feature: 'diario',
        action: 'update_lesson',
      })
      toast.error('Erro ao atualizar aula')
    } finally {
      setIsEditing(false)
    }
  }

  const handleEditCancel = () => {
    setIsEditModalOpen(false)
    setEditingLesson(null)
    setEditFormData({ tema: '', observacoes: '' })
  }

  const handleDeleteLesson = async (lesson: LessonDetailData) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return

    setIsDeleting(true)
    try {
      // Use API service for delete
      const { success, error } = await deleteSession(supabase, lesson.id)

      if (!success || error) throw error || new Error('Falha ao excluir')

      toast.success('Aula excluida com sucesso')
      setSelectedLesson(null)
      loadLessons()
    } catch (err) {
      logger.error('Error deleting lesson:', err as Error, {
        feature: 'diario',
        action: 'delete_lesson',
      })
      toast.error('Erro ao excluir aula')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleNewLessonSuccess = () => {
    setIsNewLessonOpen(false)
    loadLessons()
    toast.success('Nova aula criada com sucesso!')
  }

  // =========================================================================
  // Derived State
  // =========================================================================

  const selectedTurma = useMemo(() => {
    return turmas.find((t) => t.id === selectedTurmaId)
  }, [turmas, selectedTurmaId])

  const canCreateLesson = useMemo(() => {
    if (!userProfile) return false
    return ['admin', 'professor'].includes(userProfile.tipo_usuario)
  }, [userProfile])

  // =========================================================================
  // Loading State
  // =========================================================================

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Show escola required state for admin without selection
  if (shouldShowSelector && !selectedEscolaId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-7 w-7" />
              Diario de Classe
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Registre e acompanhe o conteudo das aulas
            </p>
          </div>
        </div>
        <EscolaRequiredState
          title="Selecione uma Escola"
          description="Para acessar o diario de classe, selecione uma escola no seletor do menu lateral."
        />
      </div>
    )
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Diario de Classe
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Registre e acompanhe o conteudo das aulas
          </p>
        </div>

        {/* Turma Selector */}
        <div className="flex items-center gap-4">
          <Select
            value={selectedTurmaId || ''}
            onValueChange={handleTurmaChange}
            disabled={loadingTurmas || turmas.length === 0}
          >
            <SelectTrigger
              className="w-full md:w-[200px] bg-white"
              aria-label="Selecionar turma"
            >
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {turmas.map((turma) => (
                <SelectItem key={turma.id} value={turma.id}>
                  {turma.nome}
                  {turma.serie && (
                    <span className="text-muted-foreground ml-1">({turma.serie})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lesson List (2/3) */}
        <div className={cn('lg:col-span-2', isPanelCollapsed && 'lg:col-span-3')}>
          {/* Subheader with New Lesson Button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Aulas Registradas</h2>
            <div className="flex items-center gap-2">
              {canCreateLesson && selectedTurmaId && (
                <Button
                  onClick={() => setIsNewLessonOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">NOVA AULA</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              )}

              {/* Panel collapse toggle - desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                aria-label={isPanelCollapsed ? 'Expandir painel' : 'Recolher painel'}
              >
                {isPanelCollapsed ? (
                  <PanelRightOpen className="h-4 w-4" />
                ) : (
                  <PanelRightClose className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Lesson Cards List */}
          {loadingLessons ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <LessonCardSkeleton key={i} />
              ))}
            </div>
          ) : !selectedTurmaId ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <ClipboardList className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Selecione uma Turma</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Escolha uma turma acima para visualizar o diario de classe.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : lessons.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Nenhuma aula registrada</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Ainda nao ha aulas registradas para esta turma.
                    {canCreateLesson && ' Clique em "Nova Aula" para comecar.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  isSelected={selectedLesson?.id === lesson.id}
                  onClick={handleLessonClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Detail Panel (1/3) - Desktop only */}
        {!isPanelCollapsed && (
          <div className="hidden lg:block">
            <LessonDetailPanel
              lesson={selectedLesson}
              onEdit={handleEditLesson}
              onDelete={handleDeleteLesson}
              loading={loadingDetail}
            />
          </div>
        )}
      </div>

      {/* Mobile/Tablet - Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Detalhes da Aula</SheetTitle>
            <SheetDescription>
              Visualize informacoes completas sobre a aula selecionada
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
            {selectedLesson && (
              <div className="space-y-6">
                {/* Inline detail content for mobile */}
                <LessonDetailPanel
                  lesson={selectedLesson}
                  onEdit={handleEditLesson}
                  onDelete={handleDeleteLesson}
                  loading={loadingDetail}
                  className="border-0 shadow-none p-0"
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* New Lesson Modal */}
      <NewLessonModal
        open={isNewLessonOpen}
        onOpenChange={setIsNewLessonOpen}
        turmaId={selectedTurmaId}
        turmaName={selectedTurma?.nome}
        onSuccess={handleNewLessonSuccess}
      />

      {/* Edit Lesson Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && handleEditCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Editar Aula
            </DialogTitle>
            <DialogDescription>
              Edite as informacoes da aula selecionada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tema/Conteudo */}
            <div className="space-y-2">
              <Label htmlFor="edit-tema">Tema/Conteudo</Label>
              <Input
                id="edit-tema"
                value={editFormData.tema}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, tema: e.target.value }))}
                placeholder="Titulo do conteudo da aula"
                disabled={isEditing}
              />
            </div>

            {/* Observacoes */}
            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observacoes</Label>
              <Textarea
                id="edit-observacoes"
                value={editFormData.observacoes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observacoes adicionais sobre a aula..."
                className="min-h-[100px] resize-y"
                disabled={isEditing}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel} disabled={isEditing}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isEditing} className="bg-blue-600 hover:bg-blue-700">
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
