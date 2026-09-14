import type { DescriptiveReportEmissionSource } from '@/lib/reports/descriptive-report-emission'
import type { NarrativeSnapshot } from '@/lib/reports/narrative-sources'

export function narrativeSnapshotFixture(): NarrativeSnapshot {
  return {
    versao: 'vivencias-v1', algoritmo: 'SHA-256/postgresql-jsonb-v1', fingerprint: 'a'.repeat(64),
    capturado_por: '20000000-0000-0000-0000-000000000001', capturado_em: '2026-08-01T12:00:00Z',
    periodo: { ano_letivo_id: '29000000-0000-0000-0000-000000000001', escola_id: '21000000-0000-0000-0000-000000000001', ano: 2026,
      chave: 'primeiro', nome: 'Semestre sintético', data_inicio: '2026-02-01', data_fim: '2026-07-31' },
    fontes: [{ id: '27000000-0000-0000-0000-000000000001', escola_id: '21000000-0000-0000-0000-000000000001',
      aluno_id: '23000000-0000-0000-0000-000000000001', matricula_id: '24000000-0000-0000-0000-000000000001',
      turma_id: '22000000-0000-0000-0000-000000000001', professor_id: '20000000-0000-0000-0000-000000000001',
      data_vivencia: '2026-03-10', campos_experiencia: ['eu', 'corpo'], descricao: 'A criança sintética explorou movimentos e compartilhou descobertas com os colegas.',
      observacoes: 'Observação sintética capturada.', escopo: 'individual', created_by: '20000000-0000-0000-0000-000000000001',
      updated_by: '20000000-0000-0000-0000-000000000001', created_at: '2026-03-10T12:00:00Z', updated_at: '2026-03-10T12:00:00Z' }],
  }
}

export function narrativeEmissionFixture(): DescriptiveReportEmissionSource {
  const snapshot = narrativeSnapshotFixture()
  return {
    report: { id: '28000000-0000-0000-0000-000000000001', ano_letivo: 2026, semestre: 'primeiro',
      matricula_id: snapshot.fontes[0].matricula_id, turma_id: snapshot.fontes[0].turma_id, professor_id: snapshot.capturado_por,
      status: 'finalizado', campo_eu_outro_nos: 'A criança sintética participa das rodas de conversa e demonstra autonomia progressiva.',
      campo_corpo_gestos: 'A criança sintética explora movimentos e trajetos durante as brincadeiras coletivas.',
      campo_tracos_sons: 'A criança sintética combina formas, cores e sons com interesse e curiosidade.',
      campo_escuta_fala: 'A criança sintética amplia a escuta e compartilha histórias com seus colegas.',
      campo_espacos_tempos: 'A criança sintética compara quantidades e observa transformações ao seu redor.',
      observacoes_gerais: '  Observação sintética  ', finalizado_em: snapshot.capturado_em, finalizado_por: snapshot.capturado_por,
      created_at: snapshot.capturado_em, updated_at: snapshot.capturado_em, created_by: snapshot.capturado_por, fontes_snapshot: snapshot },
    snapshot,
    student: { id: snapshot.fontes[0].aluno_id, nome_completo: 'Criança Sintética', data_nascimento: '2021-03-21' },
    turma: { id: snapshot.fontes[0].turma_id, nome: 'Pré II Sintético', serie: 'Pré II' },
    escola: { id: snapshot.periodo.escola_id, nome: 'Escola Sintética', codigo: 'SYN-1' },
    professor: { id: snapshot.capturado_por, nome: 'Professora Sintética' },
    releaseRevision: 'test-revision', actor: { id: snapshot.capturado_por, name: 'Professora Sintética', role: 'professor',
      schoolId: snapshot.periodo.escola_id, email: 'professora@synthetic.invalid' },
  }
}
