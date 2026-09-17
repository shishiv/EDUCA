'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { VivenciaForm } from '@/components/diary/VivenciaForm'
import { VivenciasTimeline } from '@/components/diary/VivenciasTimeline'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { canAccessRoute } from '@/lib/route-policy'
import { supabase } from '@/lib/supabase'
import type { Vivencia, VivenciaFormData } from '@/types/diario-infantil'

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
}

interface DiaryBackLink {
  href: string
  label: 'profile' | 'diary'
}

interface DiaryHeaderProps {
  studentName: string
  backLink: DiaryBackLink
  newVivenciaPath: string
  reportPath: string
  canWriteVivencias: boolean
  canReadReport: boolean
}

interface DiaryTimelineProps {
  vivencias: Vivencia[]
  newVivenciaPath: string
  canWriteVivencias: boolean
  onEditVivencia(vivencia: Vivencia): void
  onDeleteVivencia(vivencia: Vivencia): void
}

interface EditVivenciaDialogProps {
  studentName: string
  vivencia: Vivencia | null
  open: boolean
  loading: boolean
  onOpenChange(open: boolean): void
  onSubmit(data: VivenciaFormData): Promise<void>
  onCancel(): void
}

interface DeleteVivenciaDialogProps {
  open: boolean
  loading: boolean
  onOpenChange(open: boolean): void
  onConfirm(): Promise<void>
  onCancel(): void
}

const apiErrorSchema = z.object({ error: z.string() })
const vivenciaSchema = z.object({
  id: z.string(),
  escola_id: z.string(),
  aluno_id: z.string(),
  matricula_id: z.string(),
  turma_id: z.string(),
  professor_id: z.string(),
  data_vivencia: z.string(),
  campos_experiencia: z.array(z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])),
  descricao: z.string(),
  observacoes: z.string().nullable(),
  escopo: z.enum(['individual', 'coletiva']),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})
const vivenciasResponseSchema = z.object({ data: z.array(vivenciaSchema) })

function getDiaryBackLink(profilePath: string, role?: string): DiaryBackLink {
  if (canAccessRoute(profilePath, role)) return { href: profilePath, label: 'profile' }
  return { href: '/diario', label: 'diary' }
}

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

async function fetchVivencias(alunoId: string): Promise<Vivencia[]> {
  const response = await fetch(`/api/vivencias?aluno_id=${alunoId}&limit=50`)
  if (!response.ok) throw new Error(await readApiError(response, 'Erro ao carregar vivencias'))
  return vivenciasResponseSchema.parse(await response.json()).data
}

function DiaryLoading() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

function DiaryErrorView({ message, onBack }: { message: string; onBack(): void }) {
  const t = useTranslations('registry')
  return (
    <div className="p-4">
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

function DiaryHeader({
  studentName,
  backLink,
  newVivenciaPath,
  reportPath,
  canWriteVivencias,
  canReadReport,
}: DiaryHeaderProps) {
  const t = useTranslations('registry')
  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backLink.href}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLink.label === 'profile' ? t('ui.perfil-do-aluno') : 'Diario'}
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diario Infantil</h1>
          <p className="mt-1 text-muted-foreground">{studentName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReadReport && (
            <Button variant="outline" asChild>
              <Link href={reportPath}>
                <FileText className="mr-2 h-4 w-4" />
                Relatorio
              </Link>
            </Button>
          )}
          {canWriteVivencias && (
            <Button asChild>
              <Link href={newVivenciaPath}>
                <Plus className="mr-2 h-4 w-4" />
                {t('ui.nova-vivencia')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function DiaryTimeline({
  vivencias,
  newVivenciaPath,
  canWriteVivencias,
  onEditVivencia,
  onDeleteVivencia,
}: DiaryTimelineProps) {
  const t = useTranslations('registry')
  if (vivencias.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 py-12 text-center">
        <p className="text-muted-foreground">{t('ui.nenhuma-vivencia-registrada-ainda')}</p>
        {canWriteVivencias && (
          <Button asChild className="mt-4">
            <Link href={newVivenciaPath}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar primeira vivencia
            </Link>
          </Button>
        )}
      </div>
    )
  }

  if (canWriteVivencias) {
    return (
      <VivenciasTimeline
        vivencias={vivencias}
        groupBy="day"
        onEditVivencia={onEditVivencia}
        onDeleteVivencia={onDeleteVivencia}
      />
    )
  }

  return <VivenciasTimeline vivencias={vivencias} groupBy="day" />
}

function EditVivenciaDialog({
  studentName,
  vivencia,
  open,
  loading,
  onOpenChange,
  onSubmit,
  onCancel,
}: EditVivenciaDialogProps) {
  const t = useTranslations('registry')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('labels.editar-vivencia')}</DialogTitle>
          <DialogDescription className="sr-only">
            Edite os dados da vivencia selecionada.
          </DialogDescription>
        </DialogHeader>
        {vivencia && (
          <VivenciaForm
            onSubmit={onSubmit}
            studentName={studentName}
            initialData={{
              data_vivencia: vivencia.data_vivencia,
              campos_experiencia: vivencia.campos_experiencia,
              descricao: vivencia.descricao,
              observacoes: vivencia.observacoes || '',
            }}
            isLoading={loading}
            onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeleteVivenciaDialog({
  open,
  loading,
  onOpenChange,
  onConfirm,
  onCancel,
}: DeleteVivenciaDialogProps) {
  const t = useTranslations('registry')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('labels.excluir-vivencia')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('ui.tem-certeza-que-deseja-excluir-esta-vivencia-esta-acao-nao-pode-ser-desf')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            {t('labels.cancelar')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : t('ui.excluir')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function DiarioInfantilPage() {
  const t = useTranslations('registry')
  const { id: alunoId } = useParams<{ id: string }>()
  const router = useRouter()
  const { userProfile } = useAuth()
  const profilePath = `/dashboard/alunos/${alunoId}`
  const newVivenciaPath = `${profilePath}/diario/novo`
  const reportPath = `${profilePath}/diario/relatorio`
  const role = userProfile?.tipo_usuario
  const canWriteVivencias = canAccessRoute(newVivenciaPath, role)
  const canReadReport = canAccessRoute(reportPath, role)
  const backLink = getDiaryBackLink(profilePath, role)
  const [student, setStudent] = useState<Student | null>(null)
  const [vivencias, setVivencias] = useState<Vivencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingVivencia, setEditingVivencia] = useState<Vivencia | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [deletingVivencia, setDeletingVivencia] = useState<Vivencia | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const handleBack = useCallback(() => router.back(), [router])

  const loadStudent = useCallback(async () => {
    try {
      setStudent(await fetchStudent(alunoId))
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Error loading student')
      logger.error('Error loading student', failure, {
        feature: 'diario-infantil',
        action: 'load_student',
        metadata: { alunoId },
      })
      setError(t('ui.erro-ao-carregar-dados-do-aluno'))
    }
  }, [alunoId, t])

  const loadVivencias = useCallback(async () => {
    try {
      setVivencias(await fetchVivencias(alunoId))
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Erro ao carregar vivencias')
      logger.error('Error loading vivencias', failure, {
        feature: 'diario-infantil',
        action: 'load_vivencias',
        metadata: { alunoId },
      })
      setError(failure.message)
      toast.error(failure.message)
    }
  }, [alunoId])

  useEffect(() => {
    async function loadDiary() {
      setLoading(true)
      await Promise.all([loadStudent(), loadVivencias()])
      setLoading(false)
    }
    void loadDiary()
  }, [loadStudent, loadVivencias])

  const handleEditVivencia = useCallback((vivencia: Vivencia) => {
    setEditingVivencia(vivencia)
    setIsEditModalOpen(true)
  }, [])

  const handleEditSubmit = useCallback(async (data: VivenciaFormData) => {
    if (!editingVivencia) return
    const vivenciaId = editingVivencia.id

    try {
      setIsEditLoading(true)
      const response = await fetch(`/api/vivencias/${vivenciaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_vivencia: data.data_vivencia,
          campos_experiencia: data.campos_experiencia,
          descricao: data.descricao,
          observacoes: data.observacoes || null,
        }),
      })
      if (!response.ok) throw new Error(await readApiError(response, 'Erro ao atualizar vivência'))

      toast.success(t('ui.vivencia-atualizada-com-sucesso'))
      setIsEditModalOpen(false)
      setEditingVivencia(null)
      await loadVivencias()
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Erro ao atualizar vivência')
      logger.error('Error updating vivencia', failure, {
        feature: 'diario-infantil',
        action: 'update_vivencia',
        metadata: { vivenciaId },
      })
      toast.error(t('ui.erro-ao-atualizar-vivencia'))
    } finally {
      setIsEditLoading(false)
    }
  }, [editingVivencia, loadVivencias, t])

  const handleEditCancel = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingVivencia(null)
  }, [])

  const handleDeleteVivencia = useCallback((vivencia: Vivencia) => {
    setDeletingVivencia(vivencia)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingVivencia) return
    const vivenciaId = deletingVivencia.id

    try {
      setIsDeleteLoading(true)
      const response = await fetch(`/api/vivencias/${vivenciaId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readApiError(response, 'Erro ao excluir vivência'))

      toast.success(t('ui.vivencia-excluida-com-sucesso'))
      setIsDeleteDialogOpen(false)
      setDeletingVivencia(null)
      await loadVivencias()
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('Erro ao excluir vivência')
      logger.error('Error deleting vivencia', failure, {
        feature: 'diario-infantil',
        action: 'delete_vivencia',
        metadata: { vivenciaId },
      })
      toast.error(t('ui.erro-ao-excluir-vivencia'))
    } finally {
      setIsDeleteLoading(false)
    }
  }, [deletingVivencia, loadVivencias, t])

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteDialogOpen(false)
    setDeletingVivencia(null)
  }, [])

  if (loading) return <DiaryLoading />
  if (error || !student) {
    return <DiaryErrorView message={error || t('ui.aluno-nao-encontrado')} onBack={handleBack} />
  }

  return (
    <div className="space-y-6 p-4">
      <DiaryHeader
        studentName={student.nome_completo}
        backLink={backLink}
        newVivenciaPath={newVivenciaPath}
        reportPath={reportPath}
        canWriteVivencias={canWriteVivencias}
        canReadReport={canReadReport}
      />
      <DiaryTimeline
        vivencias={vivencias}
        newVivenciaPath={newVivenciaPath}
        canWriteVivencias={canWriteVivencias}
        onEditVivencia={handleEditVivencia}
        onDeleteVivencia={handleDeleteVivencia}
      />
      <EditVivenciaDialog
        studentName={student.nome_completo}
        vivencia={editingVivencia}
        open={isEditModalOpen}
        loading={isEditLoading}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditSubmit}
        onCancel={handleEditCancel}
      />
      <DeleteVivenciaDialog
        open={isDeleteDialogOpen}
        loading={isDeleteLoading}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
