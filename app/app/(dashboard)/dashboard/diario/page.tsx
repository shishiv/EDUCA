'use client'

/**
 * Class Diary Page
 * Brazilian Educational Context: Página do Diário de Classe
 *
 * Main page for the Class Diary (Diário de Classe) feature
 * Allows teachers, directors, and secretaries to:
 * - View historical class sessions
 * - Filter by turma, date range, status
 * - See attendance statistics
 * - View detailed session information
 *
 * Legal Compliance: This is a legal document page in Brazilian education
 * All data is auditable and immutable after locking
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ClassDiaryFilter, ClassDiaryList, ClassDiaryDetail } from '@/components/diary'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getClassDiary } from '@/lib/api/class-diary'
import type { ClassDiaryEntry, ClassDiaryFilters } from '@/lib/api/class-diary'
import { supabase as createClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export default function DiarioPage() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()

  // State
  const [entries, setEntries] = useState<ClassDiaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<ClassDiaryFilters | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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
    if (userInfo.tipo_usuario === 'professor') {
      return { professor_id: userInfo.id }
    }
    if (
      (userInfo.tipo_usuario === 'diretor' || userInfo.tipo_usuario === 'secretario') &&
      userInfo.escola_id
    ) {
      return { escola_id: userInfo.escola_id }
    }
    return {}
  }, [userInfo])

  const activeFilters = currentFilters ?? defaultFilters

  // Route protection and server actions remain the authorization boundary.
  useEffect(() => {
    if (!authLoading && !userProfile) router.push('/login')
  }, [authLoading, router, userProfile])

  // Fetch diary entries when filters change
  useEffect(() => {
    if (authLoading || !userInfo) return

    async function fetchEntries() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getClassDiary(createClient, {
        ...activeFilters,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      })

      if (fetchError || !data) {
        logger.error('Error fetching class diary:', fetchError || 'No data')
        setError('Erro ao carregar o diário de classe. Tente novamente.')
        setLoading(false)
        return
      }

      setEntries(data)
      setLoading(false)
    }

    fetchEntries()
  }, [activeFilters, authLoading, currentPage, userInfo])

  // Handle filter change
  const handleFilterChange = (filters: ClassDiaryFilters) => {
    setCurrentFilters(filters)
    setCurrentPage(1) // Reset to first page on filter change
  }

  // Handle entry click
  const handleEntryClick = (entry: ClassDiaryEntry) => {
    setSelectedSessionId(entry.id)
    setDetailDialogOpen(true)
  }

  // Handle detail dialog close
  const handleDetailClose = () => {
    setDetailDialogOpen(false)
    setSelectedSessionId(null)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Calculate total pages (estimate)
  const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage))

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Diário de Classe
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de aulas e frequência dos alunos
          </p>
        </div>
      </div>

      {/* Legal Compliance Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Documento Legal</AlertTitle>
        <AlertDescription>
          O Diário de Classe é um documento oficial na educação brasileira. Todos os
          registros são auditáveis e imutáveis após o bloqueio, conforme legislação
          educacional vigente.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      {userInfo && (
        <ClassDiaryFilter
          onFilterChange={handleFilterChange}
          initialFilters={activeFilters}
          profesor_id={
            userInfo.tipo_usuario === 'professor' ? userInfo.id : undefined
          }
          escola_id={
            userInfo.tipo_usuario === 'diretor' ||
            userInfo.tipo_usuario === 'secretario'
              ? userInfo.escola_id || undefined
              : undefined
          }
        />
      )}

      {/* Error State */}
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

      {/* Diary List */}
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

      {/* Detail Dialog */}
      <ClassDiaryDetail
        session_id={selectedSessionId}
        open={detailDialogOpen}
        onClose={handleDetailClose}
      />
    </div>
  )
}
