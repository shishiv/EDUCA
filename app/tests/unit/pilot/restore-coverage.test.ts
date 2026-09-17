import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const proofDirectory = path.resolve(process.cwd(), '../supabase/tests/pilot')
const inventory = readFileSync(path.join(proofDirectory, 'restore-coverage-v1.tsv'), 'utf8')
const rows = inventory.trim().split('\n').slice(1).map(line => line.split('\t'))

describe('partial restore coverage v1', () => {
  it('preserves the original 18-table allowlist without expanding to F07', () => {
    expect(rows.filter(([status]) => status === 'included').map(([, table]) => table)).toEqual([
      'pilot_municipality_config', 'attendance_municipal_thresholds', 'escolas', 'users',
      'turmas', 'responsaveis', 'alunos', 'aluno_responsaveis', 'matriculas', 'aulas_abertas',
      'sessoes_aula', 'frequencia', 'pilot_import_batches', 'pilot_import_approvals',
      'pilot_user_invitations', 'pilot_metric_events', 'pilot_data_tombstones', 'pilot_audit_log',
    ])
  })

  it('gives every entry a reason and explicitly excludes unrecovered core state', () => {
    for (const [status, object, reason] of rows) {
      expect(['included', 'partial', 'excluded', 'recreated']).toContain(status)
      expect(object).toBeTruthy()
      expect(reason).toBeTruthy()
    }
    const excluded = rows.filter(([status]) => status === 'excluded').map(([, object]) => object)
    expect(excluded).toEqual(expect.arrayContaining([
      'public.configs', 'public.anos_letivos', 'public.attendance_reopen_requests',
      'public.vivencias', 'public.vivencias_campos_experiencia',
      'public.relatorios_descritivos', 'public.relatorios_descritivos_vivencias', 'public.notas',
      'auth.*', 'storage.*', 'public.*', 'provider_metadata',
    ]))
  })
})
