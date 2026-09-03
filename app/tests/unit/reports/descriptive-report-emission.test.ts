import { describe, expect, it } from 'vitest'
import {
  buildDescriptiveReportEmissionData,
  type DescriptiveReportEmissionSource,
} from '@/lib/reports/descriptive-report-emission'

const source: DescriptiveReportEmissionSource = {
  report: {
    id: 'report-1',
    ano_letivo: 2026,
    semestre: 'primeiro',
    observacoes_gerais: '  Desenvolvimento consistente  ',
    professor_id: 'teacher-1',
  },
  fields: [
    { label: 'O eu, o outro e o nos', value: 'Campo um' },
    { label: 'Corpo, gestos e movimentos', value: 'Campo dois' },
    { label: 'Tracos, sons, cores e formas', value: 'Campo três' },
    { label: 'Escuta, fala, pensamento e imaginacao', value: 'Campo quatro' },
    { label: 'Espacos, tempos, quantidades, relacoes e transformacoes', value: 'Campo cinco' },
  ],
  student: {
    id: 'student-1',
    nome_completo: 'Criança Sintética',
    data_nascimento: '2021-01-10',
  },
  turma: { id: 'class-1', nome: 'Pré II', serie: 'Infantil' },
  escola: { id: 'school-1', nome: 'Escola Sintética', codigo: 'SYN-1' },
  professor: { id: 'teacher-1', nome: 'Professora Sintética' },
  periodo: { inicio: '2026-02-01', fim: '2026-07-31', label: '1 Semestre de 2026' },
  content: {
    periodo: { inicio: '2026-02-01', fim: '2026-07-31' },
    turma: { id: 'class-1', nome: 'Pré II', serie: 'Infantil' },
    escola: { id: 'school-1', nome: 'Escola Sintética' },
    professor: { id: 'teacher-1', nome: 'Professora Sintética' },
    resumo: {
      totalAulas: 1,
      totalHabilidadesBncc: 1,
      habilidadesUnicas: 1,
      mediaHabilidadesPorAula: 1,
      disciplinasMaisTrabalhadas: [{ disciplina: 'Espacos, tempos, quantidades', quantidade: 1 }],
    },
    aulas: [{
      id: 'lesson-1',
      sessaoId: 'session-1',
      dataAula: '2026-02-10',
      tema: 'Formas',
      objetivo: 'Reconhecer formas',
      habilidadesBncc: ['EI03ET01'],
      metodologia: 'Blocos',
      recursos: null,
      observacoes: null,
      turmaNome: 'Pré II',
      turmaSerie: 'Infantil',
      professorNome: 'Professora Sintética',
      escolaNome: 'Escola Sintética',
      disciplinaCodigo: null,
      disciplinaNome: null,
      createdAt: '2026-02-10T12:00:00.000Z',
    }],
    habilidadesBncc: [{
      codigo: 'EI03ET01',
      descricao: 'Espacos, tempos, quantidades - EI03ET01',
      vezesTrabalhado: 1,
      datasTrabalho: ['2026-02-10'],
      nivel: 'infantil',
    }],
    geradoEm: '2026-08-01T00:00:00.000Z',
  },
  releaseRevision: 'revision-1',
  actor: {
    id: 'issuer-1',
    name: 'Secretária Sintética',
    role: 'secretario',
    schoolId: 'school-1',
    email: 'secretaria@synthetic.invalid',
  },
}

describe('descriptive report emission assembly', () => {
  it('maps finalized report context to the PDF data contract', () => {
    expect(buildDescriptiveReportEmissionData(source)).toEqual({
      report: {
        id: 'report-1',
        anoLetivo: 2026,
        semestre: 'primeiro',
        observacoesGerais: 'Desenvolvimento consistente',
        fields: [
          { label: 'O eu, o outro e o nos', value: 'Campo um' },
          { label: 'Corpo, gestos e movimentos', value: 'Campo dois' },
          { label: 'Tracos, sons, cores e formas', value: 'Campo três' },
          { label: 'Escuta, fala, pensamento e imaginacao', value: 'Campo quatro' },
          { label: 'Espacos, tempos, quantidades, relacoes e transformacoes', value: 'Campo cinco' },
        ],
      },
      student: { id: 'student-1', nome: 'Criança Sintética', dataNascimento: '2021-01-10' },
      turma: { id: 'class-1', nome: 'Pré II', serie: 'Infantil' },
      escola: { id: 'school-1', nome: 'Escola Sintética', codigo: 'SYN-1' },
      professor: { id: 'teacher-1', nome: 'Professora Sintética' },
      periodo: { inicio: '2026-02-01', fim: '2026-07-31', label: '1 Semestre de 2026' },
      conteudoMinistrado: source.content,
      provenance: {
        releaseRevision: 'revision-1',
        environment: 'local synthetic pilot rehearsal',
        canonicalSource: "public.conteudo_aula via generateContentReport (from('conteudo_aula'))",
        fingerprintAlgorithm: 'MD5',
        canonicalRowCount: 1,
        canonicalContentFingerprint: '6d9242a7109daf2bfa5c5e17765ca987',
      },
      issuer: {
        actorId: 'issuer-1',
        actorName: 'Secretária Sintética',
        actorRole: 'secretario',
        actorEmail: 'secretaria@synthetic.invalid',
        reportId: 'report-1',
        reportProfessorId: 'teacher-1',
      },
    })
  })
})
