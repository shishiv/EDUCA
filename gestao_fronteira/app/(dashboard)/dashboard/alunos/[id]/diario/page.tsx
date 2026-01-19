/**
 * Diario Infantil Page
 * Displays child observations (vivencias) in timeline format
 *
 * Features:
 * - Student header with navigation
 * - VivenciasTimeline with grouped observations
 * - "Nova Vivencia" button
 * - Link to relatario page
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, Plus, FileText } from 'lucide-react'

// Components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VivenciasTimeline } from '@/components/diary/VivenciasTimeline'

// Types
import { type Vivencia } from '@/types/diario-infantil'

// ============================================================================
// Types
// ============================================================================

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
}

// ============================================================================
// Component
// ============================================================================

export default function DiarioInfantilPage() {
  const params = useParams()
  const router = useRouter()
  const alunoId = params?.id as string

  // State
  const [student, setStudent] = useState<Student | null>(null)
  const [vivencias, setVivencias] = useState<Vivencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load student data
  const loadStudent = useCallback(async () => {
    if (!alunoId) return

    try {
      const { data, error: studentError } = await supabase
        .from('alunos')
        .select('id, nome_completo, data_nascimento')
        .eq('id', alunoId)
        .single()

      if (studentError) throw studentError

      setStudent(data)
    } catch (err: any) {
      console.error('Error loading student:', err)
      setError('Erro ao carregar dados do aluno')
    }
  }, [alunoId])

  // Load vivencias
  const loadVivencias = useCallback(async () => {
    if (!alunoId) return

    try {
      const response = await fetch(`/api/vivencias?aluno_id=${alunoId}&limit=50`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar vivencias')
      }

      const { data } = await response.json()
      setVivencias(data || [])
    } catch (err) {
      console.error('Error loading vivencias:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vivencias'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [alunoId])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadStudent(), loadVivencias()])
      setLoading(false)
    }
    load()
  }, [loadStudent, loadVivencias])

  // Handlers
  const handleEditVivencia = useCallback((vivencia: Vivencia) => {
    // TODO: Implement edit flow
    toast.info('Edicao de vivencia sera implementada em breve')
  }, [])

  const handleDeleteVivencia = useCallback((vivencia: Vivencia) => {
    // TODO: Implement delete with confirmation
    toast.info('Exclusao de vivencia sera implementada em breve')
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !student) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-medium">Erro ao carregar pagina</p>
          <p className="text-sm mt-1">{error || 'Aluno nao encontrado'}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/alunos/${alunoId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Perfil do Aluno
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Diario Infantil
          </h1>
          <p className="text-muted-foreground mt-1">
            {student.nome_completo}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/alunos/${alunoId}/diario/relatorio`}>
              <FileText className="h-4 w-4 mr-2" />
              Relatorio
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/alunos/${alunoId}/diario/novo`}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Vivencia
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {vivencias.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            Nenhuma vivencia registrada ainda.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/dashboard/alunos/${alunoId}/diario/novo`}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar primeira vivencia
            </Link>
          </Button>
        </div>
      )}

      {/* Timeline */}
      {vivencias.length > 0 && (
        <VivenciasTimeline
          vivencias={vivencias}
          groupBy="day"
          onEditVivencia={handleEditVivencia}
          onDeleteVivencia={handleDeleteVivencia}
        />
      )}
    </div>
  )
}
