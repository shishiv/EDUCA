/**
 * Nova Vivencia Page
 * Form page for registering new child observations
 *
 * Features:
 * - VivenciaForm with validation
 * - Student info display
 * - Toast feedback on submit
 * - Redirect back to diario page
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

// Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { VivenciaForm } from '@/components/diary/VivenciaForm'

// Types
import { type VivenciaFormData } from '@/types/diario-infantil'

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

export default function NovaVivenciaPage() {
  const params = useParams()
  const router = useRouter()
  const alunoId = params?.id as string

  // State
  const [student, setStudent] = useState<Student | null>(null)
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
    } finally {
      setLoading(false)
    }
  }, [alunoId])

  // Initial load
  useEffect(() => {
    loadStudent()
  }, [loadStudent])

  // Handle form submission
  const handleSubmit = useCallback(async (data: VivenciaFormData) => {
    if (!alunoId || !student) return

    try {
      // TODO: Implement actual API call to save vivencia
      // For now, mock implementation
      console.log('Saving vivencia:', {
        aluno_id: alunoId,
        ...data,
      })

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      toast.success('Vivencia registrada com sucesso!', {
        description: `Vivencia de ${student.nome_completo} salva.`,
      })

      // Redirect back to diario page
      router.push(`/dashboard/alunos/${alunoId}/diario`)
    } catch (err: any) {
      console.error('Error saving vivencia:', err)
      toast.error('Erro ao salvar vivencia', {
        description: err.message || 'Tente novamente.',
      })
      throw err // Re-throw to keep form in submitting state
    }
  }, [alunoId, student, router])

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push(`/dashboard/alunos/${alunoId}/diario`)
  }, [router, alunoId])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !student) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
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
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/alunos/${alunoId}/diario`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Diario
          </Link>
        </Button>
      </div>

      {/* Form card */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Vivencia</CardTitle>
        </CardHeader>
        <CardContent>
          <VivenciaForm
            studentName={student.nome_completo}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  )
}
