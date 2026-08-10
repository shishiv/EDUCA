import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { loadCanonicalAttendanceFacts, summarizeCanonicalAttendanceFacts } from '@/lib/api/canonical-attendance-facts'
import { CONFORMIDADE, ATENCAO, getFrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'

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
 * Non-frequency gap threshold. Frequency policy thresholds come from the
 * canonical attendance policy module.
 */
const ATTENDANCE_GAP_DAYS = 5

/**
 * Hook to fetch and calculate compliance warnings for a school
 * Checks for:
 * - Students below the Bolsa Família compliance threshold
 * - Students below the preventive municipal attention threshold
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
              nis,
              bolsa_familia
            )
          `
          )
          .in('turma_id', turmaIds)
          .eq('situacao', 'ativa')

        if (matriculasError) {
          logger.error('Error fetching matriculas for compliance', matriculasError, {
            feature: 'compliance',
            action: 'fetch_matriculas',
          })
          return []
        }

        const matriculaIds = (matriculas ?? []).map((matricula) => matricula.id)
        const canonicalFacts = await loadCanonicalAttendanceFacts(supabase, matriculaIds, {
          startDate: firstDayOfMonth,
          endDate: today,
        })
        const attendanceStats = summarizeCanonicalAttendanceFacts(canonicalFacts, matriculaIds)

        // Check each student for compliance issues
        matriculas?.forEach((m) => {
          const aluno = m.aluno
          if (!aluno) return

          const turmaName = turmaMap.get(m.turma_id) || 'Turma desconhecida'
          const stats = attendanceStats.get(m.id)
          if (!stats || stats.total === 0) return

          const attendanceRate = stats.percentual
          const policyStatus = getFrequencyPolicyStatus(attendanceRate)
          const isBolsaFamilia = aluno.bolsa_familia === true

          // Compliance is the legal Bolsa Família conditionality. The 85%
          // band is preventive and never changes the legal result.
          if (policyStatus === 'CRITICO') {
            warnings.push({
              id: `${isBolsaFamilia ? 'bf' : 'freq'}-${aluno.id}`,
              type: isBolsaFamilia ? 'bolsa-familia' : 'frequencia',
              severity: 'critical',
              title: isBolsaFamilia
                ? `Não conformidade Bolsa Família (frequência abaixo de ${CONFORMIDADE}%)`
                : `Não conformidade de frequência (abaixo de ${CONFORMIDADE}%)`,
              description: isBolsaFamilia
                ? `${aluno.nome_completo} (${turmaName}) - frequência atual: ${attendanceRate}%. A condicionalidade do benefício não foi atendida.`
                : `${aluno.nome_completo} (${turmaName}) - frequência atual: ${attendanceRate}%.`,
              studentId: aluno.id,
              studentName: aluno.nome_completo,
              turmaId: m.turma_id,
              turmaName,
              attendanceRate,
              created_at: now.toISOString(),
            })
          } else if (policyStatus === 'ATENCAO') {
            warnings.push({
              id: `freq-${aluno.id}`,
              type: isBolsaFamilia ? 'bolsa-familia' : 'frequencia',
              severity: 'warning',
              title: `Atenção preventiva de frequência (abaixo de ${ATENCAO}%)`,
              description: `${aluno.nome_completo} (${turmaName}) - frequência atual: ${attendanceRate}%. A condicionalidade Bolsa Família permanece atendida a partir de ${CONFORMIDADE}%.`,
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
        const turmaByMatricula = new Map((matriculas ?? []).map((m) => [m.id, m.turma_id]))
        const turmaLastAttendance = new Map<string, string>()
        canonicalFacts.forEach((fact) => {
          const turmaId = turmaByMatricula.get(fact.matriculaId)
          if (turmaId) {
            const current = turmaLastAttendance.get(turmaId)
            if (!current || fact.dataAula > current) {
              turmaLastAttendance.set(turmaId, fact.dataAula)
            }
          }
        })

        turmas.forEach((turma) => {
          const lastDate = turmaLastAttendance.get(turma.id)
          if (lastDate) {
            const daysSinceLastAttendance = Math.floor(
              (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceLastAttendance > ATTENDANCE_GAP_DAYS) {
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
