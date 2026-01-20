import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * Compliance warning types for Brazilian educational requirements
 */
export interface ComplianceWarning {
  id: string
  type: 'bolsa-familia' | 'frequencia' | 'inep' | 'attendance-gap'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  studentId?: string
  studentName?: string
  turmaId?: string
  turmaName?: string
  attendanceRate?: number
  created_at: string
}

/**
 * Thresholds for compliance warnings
 * Based on Brazilian educational law (LDB) requirements
 */
const THRESHOLDS = {
  /** Bolsa Familia requires 85% attendance - critical at 80% */
  BOLSA_FAMILIA_CRITICAL: 80,
  /** General attendance warning threshold */
  ATTENDANCE_WARNING: 75,
  /** Days without attendance records before warning */
  ATTENDANCE_GAP_DAYS: 5,
}

/**
 * Hook to fetch and calculate compliance warnings for a school
 * Checks for:
 * - Bolsa Familia students with low attendance (< 80%)
 * - Any student with attendance below 75%
 * - Students missing required INEP fields (CPF, NIS)
 * - Classes without attendance for > 5 days
 *
 * @param escolaId - Optional school ID to filter warnings
 * @returns Query result with compliance warnings array
 */
export function useComplianceWarnings(escolaId?: string) {
  return useQuery<ComplianceWarning[]>({
    queryKey: ['compliance-warnings', escolaId],
    queryFn: async () => {
      const warnings: ComplianceWarning[] = []
      const now = new Date()

      try {
        // Get current month date range for attendance calculation
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const today = now.toISOString().split('T')[0]

        // Build turmas query based on escola filter
        let turmasQuery = supabase
          .from('turmas')
          .select('id, nome, escola_id')
          .eq('ativo', true)

        if (escolaId) {
          turmasQuery = turmasQuery.eq('escola_id', escolaId)
        }

        const { data: turmas, error: turmasError } = await turmasQuery

        if (turmasError) {
          logger.error('Error fetching turmas for compliance', turmasError, {
            feature: 'compliance',
            action: 'fetch_turmas',
          })
          return []
        }

        if (!turmas || turmas.length === 0) {
          return []
        }

        const turmaIds = turmas.map((t) => t.id)
        const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]))

        // Fetch students with active enrollments in these classes
        const { data: matriculas, error: matriculasError } = await supabase
          .from('matriculas')
          .select(
            `
            id,
            turma_id,
            aluno:alunos(
              id,
              nome_completo,
              cpf,
              nis
            )
          `
          )
          .in('turma_id', turmaIds)
          .eq('ativo', true)

        if (matriculasError) {
          logger.error('Error fetching matriculas for compliance', matriculasError, {
            feature: 'compliance',
            action: 'fetch_matriculas',
          })
          return []
        }

        // Fetch attendance records for the current month
        const { data: frequencias, error: freqError } = await supabase
          .from('frequencia')
          .select('matricula_id, status_presenca, data_aula')
          .gte('data_aula', firstDayOfMonth)
          .lte('data_aula', today)

        if (freqError) {
          logger.error('Error fetching frequencia for compliance', freqError, {
            feature: 'compliance',
            action: 'fetch_frequencia',
          })
          // Continue with empty attendance data
        }

        // Build attendance stats per matricula
        const attendanceStats = new Map<
          string,
          { total: number; present: number; lastDate: string | null }
        >()

        frequencias?.forEach((f) => {
          const stats = attendanceStats.get(f.matricula_id) || {
            total: 0,
            present: 0,
            lastDate: null,
          }
          stats.total++
          if (f.status_presenca === 'presente' || f.status_presenca === 'P') {
            stats.present++
          }
          if (!stats.lastDate || f.data_aula > stats.lastDate) {
            stats.lastDate = f.data_aula
          }
          attendanceStats.set(f.matricula_id, stats)
        })

        // Check each student for compliance issues
        matriculas?.forEach((m: any) => {
          const aluno = m.aluno
          if (!aluno) return

          const turmaName = turmaMap.get(m.turma_id) || 'Turma desconhecida'
          const stats = attendanceStats.get(m.id) || {
            total: 0,
            present: 0,
            lastDate: null,
          }

          // Calculate attendance rate
          const attendanceRate =
            stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100

          const hasNis = !!aluno.nis

          // Check 1: Bolsa Familia students with low attendance (CRITICAL)
          if (hasNis && attendanceRate < THRESHOLDS.BOLSA_FAMILIA_CRITICAL) {
            warnings.push({
              id: `bf-${aluno.id}`,
              type: 'bolsa-familia',
              severity: 'critical',
              title: 'Aluno Bolsa Familia com frequencia abaixo de 80%',
              description: `${aluno.nome_completo} (${turmaName}) - frequencia atual: ${attendanceRate}%. Risco de perda do beneficio.`,
              studentId: aluno.id,
              studentName: aluno.nome_completo,
              turmaId: m.turma_id,
              turmaName,
              attendanceRate,
              created_at: now.toISOString(),
            })
          }
          // Check 2: Any student below 75% (WARNING)
          else if (attendanceRate < THRESHOLDS.ATTENDANCE_WARNING) {
            warnings.push({
              id: `freq-${aluno.id}`,
              type: 'frequencia',
              severity: 'warning',
              title: 'Aluno com frequencia abaixo de 75%',
              description: `${aluno.nome_completo} (${turmaName}) - frequencia atual: ${attendanceRate}%. Abaixo do minimo legal.`,
              studentId: aluno.id,
              studentName: aluno.nome_completo,
              turmaId: m.turma_id,
              turmaName,
              attendanceRate,
              created_at: now.toISOString(),
            })
          }

          // Check 3: Missing INEP required fields
          if (!aluno.cpf) {
            warnings.push({
              id: `inep-cpf-${aluno.id}`,
              type: 'inep',
              severity: 'info',
              title: 'Aluno sem CPF cadastrado',
              description: `${aluno.nome_completo} (${turmaName}) - CPF obrigatorio para Educacenso.`,
              studentId: aluno.id,
              studentName: aluno.nome_completo,
              turmaId: m.turma_id,
              turmaName,
              created_at: now.toISOString(),
            })
          }
        })

        // Check 4: Classes without attendance for > 5 days
        const turmaLastAttendance = new Map<string, string>()
        frequencias?.forEach((f: any) => {
          // We need to map matricula_id back to turma_id
          const matricula = matriculas?.find((m: any) => m.id === f.matricula_id)
          if (matricula) {
            const current = turmaLastAttendance.get(matricula.turma_id)
            if (!current || f.data_aula > current) {
              turmaLastAttendance.set(matricula.turma_id, f.data_aula)
            }
          }
        })

        turmas.forEach((turma) => {
          const lastDate = turmaLastAttendance.get(turma.id)
          if (lastDate) {
            const daysSinceLastAttendance = Math.floor(
              (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceLastAttendance > THRESHOLDS.ATTENDANCE_GAP_DAYS) {
              warnings.push({
                id: `gap-${turma.id}`,
                type: 'attendance-gap',
                severity: 'warning',
                title: 'Turma sem chamada registrada ha mais de 5 dias',
                description: `${turma.nome} - ultima chamada em ${new Date(lastDate).toLocaleDateString('pt-BR')}. ${daysSinceLastAttendance} dias sem registro.`,
                turmaId: turma.id,
                turmaName: turma.nome,
                created_at: now.toISOString(),
              })
            }
          } else {
            // No attendance records at all for this class this month
            warnings.push({
              id: `noattendance-${turma.id}`,
              type: 'attendance-gap',
              severity: 'warning',
              title: 'Turma sem chamada registrada neste mes',
              description: `${turma.nome} - nenhuma chamada registrada no mes atual.`,
              turmaId: turma.id,
              turmaName: turma.nome,
              created_at: now.toISOString(),
            })
          }
        })

        // Sort by severity (critical first, then warning, then info)
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

        return warnings
      } catch (error) {
        logger.error('Error calculating compliance warnings', error as Error, {
          feature: 'compliance',
          action: 'calculate_warnings',
          metadata: { escolaId },
        })
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  })
}
