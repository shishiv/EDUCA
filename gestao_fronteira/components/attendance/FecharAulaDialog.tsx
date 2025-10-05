/**
 * FecharAulaDialog Component
 * Session closure dialog with content summary and validation
 * Brazilian educational compliance implementation
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Clock,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Shield,
  CheckCircle,
  Timer,
  FileText,
  Target,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'

interface Session {
  id: string
  turma_id: string
  professor_id: string
  disciplina_id?: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  criada_em: string
  aberta_em?: string
  fechada_em?: string
  observacoes?: string
  conteudo_programatico?: string[]
  objetivos_alcancados?: string[]
}

interface AttendanceStats {
  total: number
  presente: number
  falta: number
  justificada: number
  atestado: number
  percentualPresenca: number
  bolsaFamiliaStudents?: string[]
  bolsaFamiliaAttendance?: Record<string, { presente: boolean }>
}

interface ClosureData {
  observacoes_finais: string
  fechada_em: string
  duracao_minutos: number
  attendance_summary: AttendanceStats
  fechamento_automatico?: boolean
  motivo_fechamento?: string
  audit_trail?: {
    acao: string
    usuario_id: string
    timestamp: string
    dados_anteriores: any
    dados_posteriores: any
  }
  hash_verificacao?: string
  timestamp_hash?: string
  dados_hash?: string
}

interface FecharAulaDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ClosureData) => Promise<void>
  session: Session
  attendanceStats: AttendanceStats
  isLoading?: boolean
  className?: string
}

export function FecharAulaDialog({
  isOpen,
  onClose,
  onConfirm,
  session,
  attendanceStats,
  isLoading = false,
  className
}: FecharAulaDialogProps) {
  const [observacoesFinal, setObservacoesFinal] = useState('')
  const [forceClose, setForceClose] = useState(false)
  const [showConfirmExit, setShowConfirmExit] = useState(false)
  const [timeToAutoClose, setTimeToAutoClose] = useState<number | null>(null)
  const [isAutoClosing, setIsAutoClosing] = useState(false)

  // Character limits
  const MAX_OBSERVATIONS = 500

  // Calculate session duration
  const sessionDuration = session.aberta_em
    ? differenceInMinutes(new Date(), new Date(session.aberta_em))
    : 0

  // Check if it's near auto-closure time (18:00)
  const checkAutoClosureTime = useCallback(() => {
    const now = new Date()
    const closeTime = new Date()
    closeTime.setHours(18, 0, 0, 0) // 6 PM São Paulo time

    const minutesUntilClose = differenceInMinutes(closeTime, now)

    if (minutesUntilClose <= 0) {
      setIsAutoClosing(true)
      setTimeToAutoClose(0)
    } else if (minutesUntilClose <= 10) {
      setTimeToAutoClose(minutesUntilClose)
    } else {
      setTimeToAutoClose(null)
    }
  }, [])

  // Update auto-closure countdown
  useEffect(() => {
    checkAutoClosureTime()
    const interval = setInterval(checkAutoClosureTime, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [checkAutoClosureTime])

  // Auto-close at 18:00
  useEffect(() => {
    if (isAutoClosing && timeToAutoClose === 0 && !isLoading) {
      handleAutoClose()
    }
  }, [isAutoClosing, timeToAutoClose, isLoading])

  // Handle auto-closure
  const handleAutoClose = async () => {
    try {
      const closureData: ClosureData = {
        observacoes_finais: observacoesFinal || 'Fechamento automático às 18:00 (legislação educacional brasileira)',
        fechada_em: new Date().toISOString(),
        duracao_minutos: sessionDuration,
        attendance_summary: attendanceStats,
        fechamento_automatico: true,
        motivo_fechamento: 'Auto-fechamento às 18:00 (legislação educacional brasileira)',
        audit_trail: {
          acao: 'fechamento_automatico',
          usuario_id: session.professor_id,
          timestamp: new Date().toISOString(),
          dados_anteriores: { status: 'ABERTA' },
          dados_posteriores: { status: 'FECHADA', fechamento_automatico: true }
        },
        hash_verificacao: await generateSessionHash(),
        timestamp_hash: new Date().toISOString(),
        dados_hash: JSON.stringify({ session, attendanceStats })
      }

      await onConfirm(closureData)
    } catch (error) {
      logger.error('Erro no fechamento automático:', { error: error })
      toast.error('Erro no fechamento automático da aula')
    }
  }

  // Generate cryptographic hash for legal compliance
  const generateSessionHash = async (): Promise<string> => {
    const data = {
      session_id: session.id,
      timestamp: new Date().toISOString(),
      attendance: attendanceStats,
      professor_id: session.professor_id
    }

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(JSON.stringify(data))
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  }

  // Validate attendance completeness
  const isAttendanceComplete = () => {
    const marked = attendanceStats.presente + attendanceStats.falta +
                   attendanceStats.justificada + attendanceStats.atestado
    return marked === attendanceStats.total
  }

  // Check for low attendance
  const hasLowAttendance = () => {
    return attendanceStats.percentualPresenca < 75
  }

  // Check for Bolsa Família compliance issues
  const hasBolsaFamiliaIssues = () => {
    if (!attendanceStats.bolsaFamiliaStudents || !attendanceStats.bolsaFamiliaAttendance) {
      return false
    }

    return attendanceStats.bolsaFamiliaStudents.some(studentId => {
      const attendance = attendanceStats.bolsaFamiliaAttendance![studentId]
      return attendance && !attendance.presente
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!observacoesFinal.trim() && !forceClose) {
      toast.error('Adicione observações sobre a aula antes de fechar')
      return
    }

    try {
      const closureData: ClosureData = {
        observacoes_finais: observacoesFinal.trim(),
        fechada_em: new Date().toISOString(),
        duracao_minutos: sessionDuration,
        attendance_summary: attendanceStats,
        audit_trail: {
          acao: 'fechamento_sessao',
          usuario_id: session.professor_id,
          timestamp: new Date().toISOString(),
          dados_anteriores: { status: 'ABERTA' },
          dados_posteriores: { status: 'FECHADA' }
        },
        hash_verificacao: await generateSessionHash(),
        timestamp_hash: new Date().toISOString(),
        dados_hash: JSON.stringify({ session, attendanceStats })
      }

      await onConfirm(closureData)
    } catch (error) {
      logger.error('Erro ao fechar aula:', { error: error })
      toast.error('Erro ao fechar aula: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  // Handle dialog close with confirmation
  const handleClose = () => {
    if (observacoesFinal.trim() && !showConfirmExit) {
      setShowConfirmExit(true)
      return
    }
    onClose()
    setShowConfirmExit(false)
  }

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`max-w-4xl max-h-[90vh] overflow-y-auto ${className}`}
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-xl">
              <FileText className="h-5 w-5" />
              <span>Fechar Aula</span>
            </DialogTitle>
            <DialogDescription>
              Finalize esta sessão de aula informando o resumo das atividades.
              Este registro será permanente e não poderá ser alterado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Auto-closure warning */}
            {(timeToAutoClose !== null || isAutoClosing) && (
              <Alert variant={timeToAutoClose && timeToAutoClose <= 5 ? 'destructive' : 'default'}>
                <Timer className="h-4 w-4" />
                <AlertTitle>Fechamento Automático</AlertTitle>
                <AlertDescription>
                  {isAutoClosing ? (
                    'Fechamento obrigatório às 18:00 conforme legislação educacional brasileira.'
                  ) : (
                    `Esta aula será fechada automaticamente em ${timeToAutoClose} minutos (18:00 horário de São Paulo).`
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Session Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Informações da Sessão</span>
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Data:</strong> {format(new Date(session.data_aula), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  <p><strong>Iniciada em:</strong> {session.aberta_em ? format(new Date(session.aberta_em), 'HH:mm', { locale: ptBR }) : 'N/A'}</p>
                  <p><strong>Duração:</strong> {sessionDuration > 0 ? formatDistanceToNow(new Date(session.aberta_em!), { locale: ptBR }) : 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Resumo da Frequência</span>
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Total:</strong> {attendanceStats.total} alunos</p>
                  <p><strong>Presentes:</strong> {attendanceStats.presente} ({attendanceStats.percentualPresenca}%)</p>
                  <p><strong>Ausentes:</strong> {attendanceStats.falta}</p>
                  {attendanceStats.justificada > 0 && <p><strong>Justificadas:</strong> {attendanceStats.justificada}</p>}
                  {attendanceStats.atestado > 0 && <p><strong>Atestados:</strong> {attendanceStats.atestado}</p>}
                </div>
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="space-y-2">
              <h3 className="font-semibold">Distribuição da Frequência</h3>
              <div className="space-y-2">
                <Progress
                  value={attendanceStats.percentualPresenca}
                  className="h-3"
                  data-testid="attendance-chart"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>{attendanceStats.percentualPresenca}% presente</span>
                  <span>100%</span>
                </div>
                {/* Color-coded segments for tests */}
                <div className="flex rounded-full overflow-hidden h-2">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(attendanceStats.presente / attendanceStats.total) * 100}%` }}
                    data-testid="present-segment"
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(attendanceStats.falta / attendanceStats.total) * 100}%` }}
                    data-testid="absent-segment"
                  />
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${(attendanceStats.justificada / attendanceStats.total) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(attendanceStats.atestado / attendanceStats.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Content Summary */}
            {session.conteudo_programatico && session.conteudo_programatico.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Conteúdo Trabalhado</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {session.conteudo_programatico.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Objectives Achieved */}
            {session.objetivos_alcancados && session.objetivos_alcancados.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Objetivos Alcançados</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {session.objetivos_alcancados.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings and Validations */}
            <div className="space-y-3">
              {/* Low attendance warning */}
              {hasLowAttendance() && (
                <Alert variant="destructive" data-testid="attendance-alert">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Frequência Baixa</AlertTitle>
                  <AlertDescription>
                    A frequência de {attendanceStats.percentualPresenca}% está abaixo dos 75% mínimos exigidos pela legislação educacional brasileira.
                  </AlertDescription>
                </Alert>
              )}

              {/* Incomplete attendance warning */}
              {!isAttendanceComplete() && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Frequência Incompleta</AlertTitle>
                  <AlertDescription>
                    {attendanceStats.total - (attendanceStats.presente + attendanceStats.falta + attendanceStats.justificada + attendanceStats.atestado)} alunos não foram marcados na chamada.
                  </AlertDescription>
                </Alert>
              )}

              {/* Bolsa Família compliance issues */}
              {hasBolsaFamiliaIssues() && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção - Bolsa Família</AlertTitle>
                  <AlertDescription>
                    Há alunos beneficiários do Bolsa Família com frequência insuficiente (mínima de 85% exigida).
                  </AlertDescription>
                </Alert>
              )}

              {/* High absenteeism pattern */}
              {attendanceStats.falta > attendanceStats.presente && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Padrão Preocupante</AlertTitle>
                  <AlertDescription>
                    Alta taxa de faltas detectada. Considere investigar possíveis causas.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Final Observations */}
            <div className="space-y-2">
              <Label htmlFor="observacoes-finais" className="text-base font-semibold">
                Observações Finais *
              </Label>
              <Textarea
                id="observacoes-finais"
                placeholder="Descreva como foi a aula, participação dos alunos, dificuldades encontradas, próximos passos..."
                value={observacoesFinal}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.length <= MAX_OBSERVATIONS) {
                    setObservacoesFinal(value)
                  }
                }}
                className="min-h-[120px]"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs">
                <span className={observacoesFinal.length > MAX_OBSERVATIONS ? 'text-red-500' : 'text-muted-foreground'}>
                  {observacoesFinal.length}/{MAX_OBSERVATIONS} caracteres
                  {observacoesFinal.length > MAX_OBSERVATIONS && ' (limite excedido)'}
                </span>
                {observacoesFinal.length > MAX_OBSERVATIONS && (
                  <span className="text-red-500">Limite excedido</span>
                )}
              </div>
            </div>

            {/* Force close option for incomplete attendance */}
            {(!isAttendanceComplete() || hasLowAttendance()) && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Checkbox
                  id="force-close"
                  checked={forceClose}
                  onCheckedChange={setForceClose}
                />
                <Label htmlFor="force-close" className="text-sm">
                  Forçar fechamento mesmo com irregularidades na frequência
                </Label>
              </div>
            )}

            {/* Legal compliance notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Registro Imutável</AlertTitle>
              <AlertDescription>
                Após fechar esta aula, os registros não poderão ser alterados conforme o princípio
                "não existe o esquecer" da legislação educacional brasileira. Este é um documento oficial
                conforme a Lei de Diretrizes e Bases (LDB) e será reportado ao INEP/Educacenso.
              </AlertDescription>
            </Alert>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                (!observacoesFinal.trim() && !forceClose) ||
                ((!isAttendanceComplete() || hasLowAttendance()) && !forceClose) ||
                observacoesFinal.length > MAX_OBSERVATIONS
              }
              className="min-h-[44px] min-w-[150px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isAutoClosing ? 'Fechando Automaticamente...' : 'Fechando Aula...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isAutoClosing ? 'Fechar Automaticamente' : 'Confirmar Fechamento'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation dialog */}
      <Dialog open={showConfirmExit} onOpenChange={setShowConfirmExit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterações Não Salvas</DialogTitle>
            <DialogDescription>
              Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmExit(false)}
            >
              Continuar Editando
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowConfirmExit(false)
                onClose()
              }}
            >
              Sair sem Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}