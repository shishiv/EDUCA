import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import {
  filterBolsaFamiliaConditionality,
  getAttendanceConditionality,
  isLegalAttendanceRisk,
  isMunicipalAttendanceRisk,
} from '@/lib/reports/attendance-conditionality'

/** Compliance warning types for Brazilian educational requirements. */
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
  legalThresholdPercent?: number | null
  municipalCriticalPercent?: number | null
  municipalWarningPercent?: number | null
  municipalResolutionId?: string | null
  created_at: string
}

/** Days without an attendance session before a class warning. */
const ATTENDANCE_GAP_DAYS = 5

/**
 * Fetches warnings using the canonical attendance conditionality read model.
 * Legal floors and municipality margins never come from client constants.
 */
export function useComplianceWarnings(escolaId?: string) {
  return useQuery<ComplianceWarning[]>({
    queryKey: ['compliance-warnings', escolaId],
    queryFn: async () => {
      const warnings: ComplianceWarning[] = []
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const today = now.toISOString().split('T')[0]

      try {
        let turmasQuery = supabase
          .from('turmas')
          .select('id, nome, escola_id')
          .eq('ativo', true)

        if (escolaId) turmasQuery = turmasQuery.eq('escola_id', escolaId)

        const { data: turmas, error: turmasError } = await turmasQuery
        if (turmasError) {
          logger.error('Error fetching turmas for compliance', turmasError, {
            feature: 'compliance',
            action: 'fetch_turmas',
          })
          return []
        }

        if (!turmas || turmas.length === 0) return []

        const turmaIds = turmas.map((turma) => turma.id)
        const turmaMap = new Map(turmas.map((turma) => [turma.id, turma.nome]))
        const { data: activeMatriculas, error: matriculasError } = await supabase
          .from('matriculas')
          .select('id')
          .in('turma_id', turmaIds)
          .eq('situacao', 'ativa')

        if (matriculasError) {
          logger.error('Error fetching active matriculas for compliance', matriculasError, {
            feature: 'compliance',
            action: 'fetch_active_matriculas',
          })
          return []
        }
        if (!activeMatriculas || activeMatriculas.length === 0) return []

        const conditionality = await getAttendanceConditionality(supabase, {
          startDate: firstDayOfMonth,
          endDate: today,
          escolaId,
        })

        if (conditionality.error) {
          logger.error('Error resolving attendance conditionality', new Error(conditionality.error), {
            feature: 'compliance',
            action: 'resolve_attendance_conditionality',
          })
          return []
        }

        const bolsaFamiliaRows = filterBolsaFamiliaConditionality(conditionality.data)
        for (const row of bolsaFamiliaRows) {
          if (!row.tem_dados_frequencia) continue

          const legalRisk = isLegalAttendanceRisk(row)
          const municipalRisk = isMunicipalAttendanceRisk(row)
          if (!legalRisk && !municipalRisk) continue

          const municipalMargin = row.margem_municipal_critica_percent !== null
            && row.margem_municipal_alerta_percent !== null
            ? `Margem municipal resolvida: ${row.margem_municipal_critica_percent}%/${row.margem_municipal_alerta_percent}%.`
            : 'Margem municipal não configurada.'
          const legalFloor = row.piso_legal_percent !== null
            ? `Piso legal resolvido: ${row.piso_legal_percent}%.`
            : 'Sem piso legal aplicável para esta faixa.'
          const severity = legalRisk || row.margem_municipal_status === 'CRITICO'
            ? 'critical'
            : 'warning'

          warnings.push({
            id: `bf-${row.aluno_id}-${row.matricula_id}`,
            type: 'bolsa-familia',
            severity,
            title: legalRisk
              ? 'Condicionalidade legal Bolsa Família não atendida'
              : 'Alerta municipal de frequência Bolsa Família',
            description: `${row.aluno_nome} (${row.turma_nome}) - frequência atual: ${Math.round(Number(row.percentual_frequencia))}%. ${legalFloor} ${municipalMargin}`,
            studentId: row.aluno_id,
            studentName: row.aluno_nome,
            turmaId: row.turma_id,
            turmaName: row.turma_nome,
            attendanceRate: Math.round(Number(row.percentual_frequencia)),
            legalThresholdPercent: row.piso_legal_percent,
            municipalCriticalPercent: row.margem_municipal_critica_percent,
            municipalWarningPercent: row.margem_municipal_alerta_percent,
            municipalResolutionId: row.margem_municipal_id,
            created_at: now.toISOString(),
          })
        }

        // Missing CPF remains an INEP data-quality warning, separate from
        // attendance conditionality and its canonical read model.
        const studentIds = Array.from(new Set(
          conditionality.data.map((row) => row.aluno_id),
        ))
        const { data: students } = studentIds.length > 0
          ? await supabase
            .from('alunos')
            .select('id, nome_completo, cpf')
            .in('id', studentIds)
          : { data: [] }
        const studentsWithoutCpf = students?.filter((student) => !student.cpf) ?? []

        for (const student of studentsWithoutCpf) {
          const row = conditionality.data.find((candidate) => candidate.aluno_id === student.id)
          warnings.push({
            id: `inep-cpf-${student.id}`,
            type: 'inep',
            severity: 'info',
            title: 'Aluno sem CPF cadastrado',
            description: `${student.nome_completo} (${row?.turma_nome ?? 'turma não localizada'}) - CPF obrigatório para Educacenso.`,
            studentId: student.id,
            studentName: student.nome_completo,
            turmaId: row?.turma_id,
            turmaName: row?.turma_nome,
            created_at: now.toISOString(),
          })
        }

        // A session is the canonical attendance source. This gap check avoids
        // reimplementing student percentages while retaining the class warning.
        const { data: sessions } = await supabase
          .from('sessoes_aula')
          .select('turma_id, data_aula')
          .in('turma_id', turmaIds)
          .gte('data_aula', firstDayOfMonth)
          .lte('data_aula', today)

        const lastSessionByTurma = new Map<string, string>()
        sessions?.forEach((session) => {
          const current = lastSessionByTurma.get(session.turma_id)
          if (!current || session.data_aula > current) {
            lastSessionByTurma.set(session.turma_id, session.data_aula)
          }
        })

        turmas.forEach((turma) => {
          const lastDate = lastSessionByTurma.get(turma.id)
          if (!lastDate) {
            warnings.push({
              id: `noattendance-${turma.id}`,
              type: 'attendance-gap',
              severity: 'warning',
              title: 'Turma sem chamada registrada neste mês',
              description: `${turma.nome} - nenhuma sessão registrada no mês atual.`,
              turmaId: turma.id,
              turmaName: turma.nome,
              created_at: now.toISOString(),
            })
            return
          }

          const daysSinceLastAttendance = Math.floor(
            (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
          )
          if (daysSinceLastAttendance > ATTENDANCE_GAP_DAYS) {
            warnings.push({
              id: `gap-${turma.id}`,
              type: 'attendance-gap',
              severity: 'warning',
              title: 'Turma sem chamada registrada há mais de cinco dias',
              description: `${turmaMap.get(turma.id) ?? turma.nome} - última chamada em ${new Date(lastDate).toLocaleDateString('pt-BR')}. ${daysSinceLastAttendance} dias sem registro.`,
              turmaId: turma.id,
              turmaName: turma.nome,
              created_at: now.toISOString(),
            })
          }
        })

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
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })
}
