'use client'

/**
 * Canonical Diário de Classe screen.
 *
 * This is the single product diary surface. It uses the PR88 class-diary
 * component contract, reading sessoes_aula and frequencia.sessao_id only.
 * Professor and director writes continue through the existing session policy.
 * Admin and secretary roles remain view-only.
 */

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, Plus, ShieldAlert } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  ClassDiaryDetail,
  ClassDiaryFilter,
  ClassDiaryList,
  NewLessonModal,
} from '@/components/diary'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getClassDiary } from '@/lib/api/class-diary'
import type { ClassDiaryEntry, ClassDiaryFilters } from '@/lib/api/class-diary'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/** The canonical Diário de Classe route is `/diario`; dashboard is an alias. */
export function CanonicalDiaryPage() {
  const searchParams = useSearchParams()
  const { userProfile, loading: authLoading } = useAuth()

  const [entries, setEntries] = useState<ClassDiaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<ClassDiaryFilters | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const itemsPerPage = 20
  const requestedTurmaId = searchParams.get('turma')

  const userInfo = useMemo(() => {
    if (!userProfile) return null
    return {
      id: userProfile.id,
      tipo_usuario: userProfile.tipo_usuario,
      escola_id: userProfile.escola_id,
    }
  }, [userProfile])

  const defaultFilters = useMemo<ClassDiaryFilters>(() => {
    if (!userInfo) return {}

    const filters: ClassDiaryFilters = {}
    if (userInfo.tipo_usuario === 'professor') {
      filters.professor_id = userInfo.id
    }
    if (
      (userInfo.tipo_usuario === 'diretor' || userInfo.tipo_usuario === 'secretario') &&
      userInfo.escola_id
    ) {
      filters.escola_id = userInfo.escola_id
    }
    if (requestedTurmaId) filters.turma_id = requestedTurmaId
    return filters
  }, [requestedTurmaId, userInfo])

  const activeFilters = currentFilters ?? defaultFilters
  const selectedTurmaId = activeFilters.turma_id ?? null
  const canWriteDiary = userInfo?.tipo_usuario === 'professor' || userInfo?.tipo_usuario === 'diretor'
  const isViewOnlyRole = userInfo?.tipo_usuario === 'admin' || userInfo?.tipo_usuario === 'secretario'

  useEffect(() => {
    if (authLoading || !userInfo) return

    async function fetchEntries() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getClassDiary(supabase, {
        ...activeFilters,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      })

      if (fetchError || !data) {
        logger.error(
          'Error fetching canonical class diary:',
          fetchError instanceof Error ? fetchError : new Error('No diary data returned')
        )
        setError('Erro ao carregar o diário de classe. Tente novamente.')
        setEntries([])
        setLoading(false)
        return
      }

      setEntries(data)
      setLoading(false)
    }

    void fetchEntries()
  }, [activeFilters, authLoading, currentPage, refreshToken, userInfo])

  const handleFilterChange = (filters: ClassDiaryFilters) => {
    setCurrentFilters(filters)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntryClick = (entry: ClassDiaryEntry) => {
    setSelectedSessionId(entry.id)
    setDetailDialogOpen(true)
  }

  const handleDetailClose = () => {
    setDetailDialogOpen(false)
    setSelectedSessionId(null)
  }

  const handleNewLessonSuccess = () => {
    setIsNewLessonOpen(false)
    setRefreshToken((token) => token + 1)
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage))

  if (authLoading || !userInfo) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Diário de Classe
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de aulas e frequência dos alunos
          </p>
        </div>
        {canWriteDiary && selectedTurmaId && (
          <Button onClick={() => setIsNewLessonOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Aula
          </Button>
        )}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Documento Legal</AlertTitle>
        <AlertDescription>
          O Diário de Classe é um documento oficial na educação brasileira. Todos os
          registros são auditáveis e imutáveis após o bloqueio, conforme legislação
          educacional vigente.
        </AlertDescription>
      </Alert>

      {isViewOnlyRole && (
        <Alert data-testid="diary-view-only-notice">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Perfil com acesso de visualização</AlertTitle>
          <AlertDescription>
            Seu perfil pode apenas visualizar o diário. Professores e diretores registram aulas.
          </AlertDescription>
        </Alert>
      )}

      <ClassDiaryFilter
        onFilterChange={handleFilterChange}
        initialFilters={activeFilters}
        profesor_id={userInfo.tipo_usuario === 'professor' ? userInfo.id : undefined}
        escola_id={
          userInfo.tipo_usuario === 'diretor' || userInfo.tipo_usuario === 'secretario'
            ? userInfo.escola_id || undefined
            : undefined
        }
      />

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && (
        <ClassDiaryList
          entries={entries}
          loading={loading}
          onEntryClick={handleEntryClick}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}

      <ClassDiaryDetail
        session_id={selectedSessionId}
        open={detailDialogOpen}
        onClose={handleDetailClose}
      />

      <NewLessonModal
        open={isNewLessonOpen}
        onOpenChange={setIsNewLessonOpen}
        turmaId={selectedTurmaId}
        onSuccess={handleNewLessonSuccess}
      />
    </div>
  )
}
