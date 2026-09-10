'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { VivenciaForm } from '@/components/diary/VivenciaForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import type { VivenciaFormData } from '@/types/diario-infantil'

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
}

interface Matricula {
  turma_id: string
}

const apiErrorSchema = z.object({ error: z.string() })

async function readApiError(response: Response, fallback: string): Promise<string> {
  const result = apiErrorSchema.safeParse(await response.json().catch(() => null))
  return result.success ? result.data.error : fallback
}

async function fetchStudent(alunoId: string): Promise<Student> {
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome_completo, data_nascimento')
    .eq('id', alunoId)
    .single()

  if (error) throw error
  return data
}

async function fetchActiveEnrollment(alunoId: string): Promise<Matricula | null> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('turma_id')
    .eq('aluno_id', alunoId)
    .eq('situacao', 'ativa')
    .single()

  if (!error) return data
  logger.warn('No active matricula found', {
    feature: 'diario-infantil',
    action: 'load_matricula',
    metadata: { alunoId, error: error.message },
  })
  return null
}

async function createVivencia(
  alunoId: string,
  turmaId: string,
  data: VivenciaFormData,
): Promise<void> {
  const response = await fetch('/api/vivencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aluno_id: alunoId,
      turma_id: turmaId,
      data_vivencia: data.data_vivencia,
      campos_experiencia: data.campos_experiencia,
      descricao: data.descricao,
      observacoes: data.observacoes || null,
      escopo: 'individual',
    }),
  })

  if (!response.ok) throw new Error(await readApiError(response, 'Erro ao salvar vivencia'))
}

function NewVivenciaLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
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

function NewVivenciaError({ message, onBack }: { message: string; onBack(): void }) {
  const t = useTranslations('registry')
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">{t('labels.erro-ao-carregar-pagina')}</p>
        <p className="mt-1 text-sm">{message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('ui.voltar')}
        </Button>
      </div>
    </div>
  )
}

export default function NovaVivenciaPage() {
  const t = useTranslations('registry')
  const { id: alunoId } = useParams<{ id: string }>()
  const router = useRouter()
  const diaryPath = `/dashboard/alunos/${alunoId}/diario`
  const [student, setStudent] = useState<Student | null>(null)
  const [matricula, setMatricula] = useState<Matricula | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const handleBack = useCallback(() => router.back(), [router])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const studentData = await fetchStudent(alunoId)
      setStudent(studentData)
      setMatricula(await fetchActiveEnrollment(alunoId))
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Error loading data')
      logger.error('Error loading data', failure, {
        feature: 'diario-infantil',
        action: 'load_student_data',
        metadata: { alunoId },
      })
      setError(t('ui.erro-ao-carregar-dados-do-aluno'))
    } finally {
      setLoading(false)
    }
  }, [alunoId, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSubmit = useCallback(async (data: VivenciaFormData) => {
    if (!student) return
    if (!matricula) {
      toast.error(t('ui.aluno-nao-possui-matricula-ativa'), {
        description: 'O aluno precisa estar matriculado em uma turma para registrar vivencias.',
      })
      return
    }

    try {
      await createVivencia(alunoId, matricula.turma_id, data)
      toast.success(t('ui.vivencia-registrada-com-sucesso'), {
        description: `Vivencia de ${student.nome_completo} salva.`,
      })
      router.push(diaryPath)
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Tente novamente.')
      logger.error('Error saving vivencia', failure, {
        feature: 'diario-infantil',
        action: 'create_vivencia',
        metadata: { alunoId, turmaId: matricula.turma_id },
      })
      toast.error(t('ui.erro-ao-salvar-vivencia'), { description: failure.message })
    }
  }, [alunoId, diaryPath, matricula, router, student, t])

  const handleCancel = useCallback(() => {
    router.push(diaryPath)
  }, [diaryPath, router])

  if (loading) return <NewVivenciaLoading />
  if (error || !student) {
    return <NewVivenciaError message={error || t('ui.aluno-nao-encontrado')} onBack={handleBack} />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={diaryPath}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Diario
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('labels.registrar-vivencia')}</CardTitle>
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
