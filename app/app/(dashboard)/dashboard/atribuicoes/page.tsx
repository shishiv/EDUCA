/**
 * Teacher Assignment Management Page
 * Allows admin to view and manage teacher-turma assignments
 *
 * Features:
 * - Grid view of all turmas in selected escola
 * - Visual status (assigned/unassigned)
 * - Modal for assignment using existing TeacherAssignment component
 *
 * @see ROL-03 requirement
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEscola } from '@/contexts/escola-context'
import { useDemoMode } from '@/contexts/demo-mode-context'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { TeacherAssignment } from '@/components/classes/teacher-assignment'

// Components
import { PageHeader } from '@/components/layout/enhanced-breadcrumbs'
import { EscolaRequiredState } from '@/components/ui/escola-required-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  GraduationCap,
  UserPlus,
  Presentation
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface TurmaWithTeacher {
  id: string
  nome: string
  serie: string
  turno: string
  ano_letivo: number
  professor: {
    id: string
    nome: string
    email: string
  } | null
}

export default function AtribuicoesPage() {
  const { selectedEscolaId, selectedEscola, shouldShowSelector } = useEscola()
  const { isDemoMode, demoTurmaId, enterDemoMode, canUseDemoMode } = useDemoMode()
  const { userProfile } = useAuth()
  const router = useRouter()

  // State
  const [turmas, setTurmas] = useState<TurmaWithTeacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTurma, setSelectedTurma] = useState<TurmaWithTeacher | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Stats
  const assignedCount = turmas.filter(t => t.professor).length
  const unassignedCount = turmas.filter(t => !t.professor).length

  // Load turmas for selected escola
  const loadTurmas = useCallback(async () => {
    if (!selectedEscolaId) {
      setTurmas([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          turno,
          ano_letivo,
          professor:users!professor_id(id, nome, email)
        `)
        .eq('escola_id', selectedEscolaId)
        .eq('ativo', true)
        .order('serie')
        .order('nome')

      if (queryError) {
        throw queryError
      }

      // Transform data - professor comes as object or null
      const transformed = (data || []).map(turma => ({
        ...turma,
        professor: turma.professor ? {
          id: (turma.professor as unknown as { id: string }).id,
          nome: (turma.professor as unknown as { nome: string }).nome,
          email: (turma.professor as unknown as { email: string }).email,
        } : null
      }))

      setTurmas(transformed)
    } catch (err) {
      logger.error('[Atribuicoes] Error loading turmas', err as Error, {
        feature: 'atribuicoes',
        action: 'load_turmas',
        metadata: { escolaId: selectedEscolaId }
      })
      setError('Erro ao carregar turmas')
    } finally {
      setLoading(false)
    }
  }, [selectedEscolaId])

  // Load on mount and when escola changes
  useEffect(() => {
    loadTurmas()
  }, [loadTurmas])

  // Handle assignment change
  const handleAssignmentChange = useCallback(() => {
    setIsDialogOpen(false)
    setSelectedTurma(null)
    loadTurmas() // Refresh the list
  }, [loadTurmas])

  // Handle opening assignment dialog
  const openAssignmentDialog = useCallback((turma: TurmaWithTeacher) => {
    setSelectedTurma(turma)
    setIsDialogOpen(true)
  }, [])

  // Handle entering demo mode for a turma
  const handleEnterDemoMode = useCallback((turmaId: string) => {
    enterDemoMode(turmaId)
    router.push(`/dashboard/turmas/${turmaId}/chamada`)
  }, [enterDemoMode, router])

  // Show escola required state for admin without selection
  if (shouldShowSelector && !selectedEscolaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Atribuicao de Professores"
          description="Gerencie as atribuicoes de professores as turmas"
        />
        <EscolaRequiredState
          title="Selecione uma escola"
          description="Para gerenciar atribuicoes de professores, primeiro selecione uma escola no menu acima."
        />
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Atribuicao de Professores"
          description="Gerencie as atribuicoes de professores as turmas"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Atribuicao de Professores"
          description="Gerencie as atribuicoes de professores as turmas"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-800">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadTurmas}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Atribuicao de Professores"
        description={
          selectedEscola
            ? `Gerencie as atribuicoes de professores - ${selectedEscola.nome}`
            : "Gerencie as atribuicoes de professores as turmas"
        }
      />

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignedCount}</p>
              <p className="text-sm text-muted-foreground">Com professor</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unassignedCount}</p>
              <p className="text-sm text-muted-foreground">Sem professor</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{turmas.length}</p>
              <p className="text-sm text-muted-foreground">Total de turmas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {turmas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Nenhuma turma encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esta escola ainda nao possui turmas cadastradas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Turma grid */}
      {turmas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map(turma => (
            <Card
              key={turma.id}
              className={cn(
                "transition-all hover:shadow-md cursor-pointer",
                turma.professor
                  ? "border-green-200 hover:border-green-300"
                  : "border-amber-200 hover:border-amber-300"
              )}
              onClick={() => openAssignmentDialog(turma)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{turma.nome}</CardTitle>
                  {turma.professor ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Atribuido
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>{turma.serie}</span>
                  <span>-</span>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {turma.turno}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {turma.professor ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{turma.professor.nome}</span>
                    </div>
                    {canUseDemoMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEnterDemoMode(turma.id)
                        }}
                      >
                        <Presentation className="h-4 w-4 mr-1" />
                        Demo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAssignmentDialog(turma)
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Atribuir
                    </Button>
                    {canUseDemoMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEnterDemoMode(turma.id)
                        }}
                      >
                        <Presentation className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTurma?.professor ? 'Alterar Professor' : 'Atribuir Professor'}
            </DialogTitle>
          </DialogHeader>
          {selectedTurma && selectedEscolaId && (
            <TeacherAssignment
              classId={selectedTurma.id}
              currentTeacherId={selectedTurma.professor?.id}
              schoolId={selectedEscolaId}
              onAssignmentChange={handleAssignmentChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
