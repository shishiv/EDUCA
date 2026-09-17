import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const proofDirectory = path.resolve(process.cwd(), '../supabase/tests/pilot')
const inventory = readFileSync(path.join(proofDirectory, 'restore-coverage-v2.tsv'), 'utf8')
const rows = inventory.trim().split('\n').slice(1).map(line => line.split('\t'))

describe('partial restore coverage v2', () => {
  it('bounds the reviewed core replay without including other product domains', () => {
    expect(rows.filter(([status]) => status === 'included').map(([, table]) => table)).toEqual([
      'pilot_municipality_config', 'attendance_municipal_thresholds', 'escolas', 'users',
      'configs', 'anos_letivos', 'turmas', 'responsaveis', 'alunos', 'aluno_responsaveis',
      'matriculas', 'aulas_abertas', 'sessoes_aula', 'conteudo_aula', 'frequencia',
      'attendance_reopen_requests', 'vivencias', 'vivencias_campos_experiencia',
      'relatorios_descritivos', 'relatorios_descritivos_vivencias',
      'pilot_import_batches', 'pilot_import_approvals',
      'pilot_user_invitations', 'pilot_metric_events', 'pilot_data_tombstones', 'pilot_audit_log',
    ])
  })

  it('gives every entry a reason and explicitly excludes unrecovered domains', () => {
    for (const [status, object, reason] of rows) {
      expect(['included', 'partial', 'excluded', 'recreated']).toContain(status)
      expect(object).toBeTruthy()
      expect(reason).toBeTruthy()
    }
    const excluded = rows.filter(([status]) => status === 'excluded').map(([, object]) => object)
    expect(excluded).toEqual(expect.arrayContaining([
      'public.disciplinas', 'public.pilot_data_treatment_agreements', 'public.audit_trail',
      'public.audit_sessoes_aula', 'public.audit_logs', 'public.notas',
      'auth.*', 'storage.*', 'public.*', 'provider_metadata',
    ]))
  })
})
