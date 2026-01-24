'use client'

/**
 * Class Diary Detail Component
 * Brazilian Educational Context: Detalhes da Aula do Diário de Classe
 *
 * Displays complete information about a specific class session:
 * - Session metadata (date, turma, professor, phase)
 * - Conteúdo programático (content taught)
 * - Attendance statistics with chart
 * - Per-student attendance list
 * - Legal compliance info (hash, lock status)
 *
 * Modal/Dialog component with responsive design
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Lock,
  User,
  Hash,
} from 'lucide-react'
import { getClassDetail } from '@/lib/api/class-diary'
import type { DetailedSession } from '@/lib/api/class-diary'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface ClassDiaryDetailProps {
  session_id: string | null
  open: boolean
  onClose: () => void
}

export function ClassDiaryDetail({ session_id, open, onClose }: ClassDiaryDetailProps) {
  const [session, setSession] = useState<DetailedSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch session details when dialog opens
  useEffect(() => {
    if (!open || !session_id) {
      setSession(null)
      setError(null)
      return
    }

    async function fetchSessionDetail() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getClassDetail(supabase, session_id)

      if (fetchError || !data) {
        logger.error('Error fetching session detail:', { error: fetchError })
        setError('Erro ao carregar detalhes da aula. Tente novamente.')
        setLoading(false)
        return
      }

      setSession(data)
      setLoading(false)
    }

    fetchSessionDetail()
  }, [session_id, open])

  // Get phase badge
  const getFaseBadge = (fase: string) => {
    const badgeMap = {
      planejamento: { label: 'Planejamento', variant: 'secondary' as const },
      chamada: { label: 'Chamada', variant: 'default' as const },
      finalizada: { label: 'Finalizada', variant: 'outline' as const },
      bloqueada: { label: 'Bloqueada', variant: 'destructive' as const },
    }

    return badgeMap[fase as keyof typeof badgeMap] || badgeMap.planejamento
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Detalhes da Aula
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a sessão de aula e frequência dos alunos
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Fechar
              </Button>
            </div>
          )}

          {session && !loading && (
            <div className="space-y-6">
              {/* Session Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {format(new Date(session.data_aula), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <Badge variant={getFaseBadge(session.fase).variant}>
                    {getFaseBadge(session.fase).label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{session.turma_nome}</p>
                      <p className="text-xs text-muted-foreground">{session.turma_serie}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{session.professor_nome}</p>
                      <p className="text-xs text-muted-foreground">Professor</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Observações/Conteúdo Programático */}
              {session.observacoes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Conteúdo Programático / Observações
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {session.observacoes}
                  </p>
                </div>
              )}

              {/* Attendance Statistics */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Estatísticas de Frequência</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{session.total_alunos}</p>
                    <p className="text-xs text-muted-foreground">Total de Alunos</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">
                      {session.total_presentes}
                    </p>
                    <p className="text-xs text-muted-foreground">Presentes</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                    <XCircle className="h-5 w-5 mx-auto mb-2 text-red-600" />
                    <p className="text-2xl font-bold text-red-600">
                      {session.total_ausentes}
                    </p>
                    <p className="text-xs text-muted-foreground">Ausentes</p>
                  </div>
                </div>

                {/* Attendance Percentage */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Frequência Geral</span>
                    <span
                      className={`text-2xl font-bold ${
                        session.attendance_percentage >= 75
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {session.attendance_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        session.attendance_percentage >= 75 ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${session.attendance_percentage}%` }}
                    ></div>
                  </div>
                  {session.attendance_percentage < 75 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Atenção: Frequência abaixo do mínimo legal de 75%
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Student Attendance List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Frequência por Aluno</h3>
                {session.attendance_records.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum registro de frequência encontrado para esta aula.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {session.attendance_records.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              record.presente ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          ></div>
                          <div>
                            <p className="text-sm font-medium">{record.aluno_nome}</p>
                            {record.observacoes && (
                              <p className="text-xs text-muted-foreground">
                                {record.observacoes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.is_locked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          {record.presente ? (
                            <Badge variant="outline" className="text-green-600">
                              Presente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">
                              Ausente
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legal Compliance Info */}
              {session.bloqueado && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <Lock className="h-4 w-4" />
                      Registro Bloqueado
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Este registro foi bloqueado em{' '}
                      {session.bloqueado_em &&
                        format(
                          new Date(session.bloqueado_em),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      . Conforme legislação educacional brasileira, registros de frequência
                      são documentos legais imutáveis após o bloqueio.
                    </p>
                    {session.hash_integridade && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded text-xs">
                        <Hash className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-mono text-[10px] break-all">
                            {session.hash_integridade}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            Hash de integridade para auditoria
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
