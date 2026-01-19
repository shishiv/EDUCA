/**
 * Relatorio de Desenvolvimento Page
 * Development report writing interface with vivencias reference sidebar
 *
 * Features:
 * - Two-column layout on desktop (writer + sidebar)
 * - Single column on mobile with sheet for vivencias
 * - Campo focus syncs with sidebar filter
 * - Semester selection dropdown
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-03-PLAN.md
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Printer,
  BookOpen,
} from 'lucide-react'

// Components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { DevelopmentReportWriter, type ReportFormValues } from '@/components/diary/DevelopmentReportWriter'
import { VivenciasReference } from '@/components/diary/VivenciasReference'
import { supabase } from '@/lib/supabase'

// Types
import { type Vivencia, type CampoType } from '@/types/diario-infantil'
import { Plus } from 'lucide-react'
import { SEMESTER_CONFIG, type SemestreType } from '@/types/descriptive-report'

// ============================================================================
// Types
// ============================================================================

interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCurrentSemester(): SemestreType {
  const month = new Date().getMonth() + 1
  return month <= 7 ? 'primeiro' : 'segundo'
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function formatSemesterLabel(semestre: SemestreType, ano: number): string {
  const config = SEMESTER_CONFIG[semestre]
  return `${config.label} de ${ano}`
}

// ============================================================================
// Component
// ============================================================================

export default function RelatorioPage() {
  const params = useParams()
  const router = useRouter()
  const alunoId = params?.id as string

  // State
  const [student, setStudent] = useState<Student | null>(null)
  const [vivencias, setVivencias] = useState<Vivencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemestreType>(
    getCurrentSemester()
  )
  const [selectedYear] = useState(getCurrentYear())
  const [selectedCampo, setSelectedCampo] = useState<CampoType | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

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
      const response = await fetch(`/api/vivencias?aluno_id=${alunoId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar vivencias')
      }

      const { data } = await response.json()
      setVivencias(data || [])
    } catch (err) {
      console.error('Error loading vivencias:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vivencias'
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
  const handleSaveDraft = useCallback(async (data: ReportFormValues) => {
    // TODO: Implement actual save to API
    console.log('Saving draft:', data)
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [])

  const handleFinalize = useCallback(async (data: ReportFormValues) => {
    // TODO: Implement actual finalization to API
    console.log('Finalizing report:', data)
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [])

  const handleCampoFocus = useCallback((campo: CampoType | null) => {
    setSelectedCampo(campo)
  }, [])

  const handleFilterChange = useCallback((campo: CampoType | null) => {
    setSelectedCampo(campo)
  }, [])

  const handlePrint = useCallback(() => {
    // TODO: Implement print/PDF export
    toast.info('Exportacao PDF sera implementada em breve')
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
        <div className="grid lg:grid-cols-[1fr,350px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full hidden lg:block" />
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

  const semesterLabel = formatSemesterLabel(selectedSemester, selectedYear)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 space-y-4">
          {/* Back navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/alunos/${alunoId}/diario`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Diario Infantil
              </Link>
            </Button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile vivencias button */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Vivencias
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Vivencias de Referencia</SheetTitle>
                  </SheetHeader>
                  <VivenciasReference
                    vivencias={vivencias}
                    selectedCampo={selectedCampo}
                    onFilterChange={handleFilterChange}
                    className="h-full"
                  />
                </SheetContent>
              </Sheet>

              {/* Print button */}
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>

          {/* Title and semester */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Relatorio de Desenvolvimento
              </h1>
              <p className="text-muted-foreground mt-1">
                {student.nome_completo}
              </p>
            </div>

            {/* Semester selector */}
            <Select
              value={selectedSemester}
              onValueChange={(value) =>
                setSelectedSemester(value as SemestreType)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primeiro">
                  {SEMESTER_CONFIG.primeiro.label}
                </SelectItem>
                <SelectItem value="segundo">
                  {SEMESTER_CONFIG.segundo.label}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Empty state */}
        {vivencias.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/30 print:hidden">
            <p className="text-muted-foreground">
              Nenhuma vivencia registrada para gerar relatorio.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Registre vivencias no Diario Infantil para construir o relatorio de desenvolvimento.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/dashboard/alunos/${alunoId}/diario/novo`}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar primeira vivencia
              </Link>
            </Button>
          </div>
        )}

        {/* Report content */}
        {vivencias.length > 0 && (
          <div className="grid lg:grid-cols-[1fr,350px] gap-6">
            {/* Writer (main area) */}
            <main>
              <DevelopmentReportWriter
                studentName={student.nome_completo}
                semesterLabel={semesterLabel}
                onSave={handleSaveDraft}
                onFinalize={handleFinalize}
                onCampoFocus={handleCampoFocus}
                vivencias={vivencias}
              />
            </main>

            {/* Sidebar (hidden on mobile) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[165px]">
                <div className="rounded-xl border border-gray-200 overflow-hidden h-[calc(100vh-200px)]">
                  <VivenciasReference
                    vivencias={vivencias}
                    selectedCampo={selectedCampo}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
