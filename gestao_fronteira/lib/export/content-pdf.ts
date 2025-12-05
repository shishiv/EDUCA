/**
 * Content Report PDF Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.4: Relatorio de Conteudo Ministrado
 *
 * Generates PDF reports for taught content (conteudo ministrado)
 * with BNCC skills summary for official archiving.
 */

import type { ContentReport, LessonContentReportItem, BNNCSkillUsage } from '@/lib/reports/content-reports';
import {
  createPDFDocument,
  addPDFHeader,
  addPDFFooter,
  addPDFTable,
  addPDFSummary,
  addPDFText,
  savePDF,
  formatShortDateBR,
  type PDFTableColumn,
  type PDFStyles,
} from './pdf-utils';

// ============================================================================
// STYLES
// ============================================================================

const CONTENT_STYLES: PDFStyles = {
  primaryColor: [30, 64, 175], // Blue-700
  headerBgColor: [59, 130, 246], // Blue-500
  headerTextColor: [255, 255, 255], // White
  alternateBgColor: [239, 246, 255], // Blue-50
  fontSize: 9,
};

const BNCC_STYLES: PDFStyles = {
  primaryColor: [88, 28, 135], // Purple-800
  headerBgColor: [147, 51, 234], // Purple-600
  headerTextColor: [255, 255, 255], // White
  alternateBgColor: [250, 245, 255], // Purple-50
  fontSize: 9,
};

// ============================================================================
// CONTENT REPORT PDF
// ============================================================================

/**
 * Generate PDF for content report with all lessons and BNCC skills
 */
export function generateContentReportPDF(
  report: ContentReport,
  schoolName?: string,
  options: {
    includeDetailedLessons?: boolean;
    includeSkillsSummary?: boolean;
    includeDisciplineSummary?: boolean;
  } = {}
): void {
  const {
    includeDetailedLessons = true,
    includeSkillsSummary = true,
    includeDisciplineSummary = true,
  } = options;

  const doc = createPDFDocument('portrait');

  // Header
  let currentY = addPDFHeader(doc, {
    title: 'Relatorio de Conteudo Ministrado',
    subtitle: report.turma
      ? `${report.turma.serie} - ${report.turma.nome}`
      : 'Todas as Turmas',
    schoolName: schoolName || report.escola?.nome,
    period: {
      start: report.periodo.inicio,
      end: report.periodo.fim,
    },
  }, CONTENT_STYLES);

  // Teacher info if available
  if (report.professor) {
    currentY = addPDFText(
      doc,
      `Professor(a): ${report.professor.nome}`,
      currentY,
      { fontSize: 10, fontStyle: 'italic', color: [100, 100, 100] }
    );
    currentY += 3;
  }

  // Summary metrics
  currentY = addPDFSummary(
    doc,
    'Resumo do Periodo',
    [
      { label: 'Total de Aulas', value: report.resumo.totalAulas, color: [219, 234, 254] },
      { label: 'Habilidades BNCC', value: report.resumo.totalHabilidadesBncc, color: [237, 233, 254] },
      { label: 'Habilidades Unicas', value: report.resumo.habilidadesUnicas, color: [220, 252, 231] },
      { label: 'Media por Aula', value: report.resumo.mediaHabilidadesPorAula.toFixed(1), color: [254, 243, 199] },
    ],
    currentY,
    CONTENT_STYLES
  );

  currentY += 5;

  // Discipline summary section
  if (includeDisciplineSummary && report.resumo.disciplinasMaisTrabalhadas.length > 0) {
    currentY = addPDFText(
      doc,
      'Disciplinas/Campos Mais Trabalhados:',
      currentY,
      { fontSize: 11, fontStyle: 'bold' }
    );
    currentY += 3;

    const disciplineText = report.resumo.disciplinasMaisTrabalhadas
      .map((d, i) => `${i + 1}. ${d.disciplina} (${d.quantidade}x)`)
      .join('  |  ');

    currentY = addPDFText(
      doc,
      disciplineText,
      currentY,
      { fontSize: 9, color: [100, 100, 100] }
    );
    currentY += 8;
  }

  // BNCC Skills Summary Table
  if (includeSkillsSummary && report.habilidadesBncc.length > 0) {
    // Check if we need a new page
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }

    const skillColumns: PDFTableColumn[] = [
      { header: 'Codigo', dataKey: 'codigo', halign: 'center', width: 25 },
      { header: 'Area/Campo', dataKey: 'descricao', halign: 'left' },
      { header: 'Vezes', dataKey: 'vezes', halign: 'center', width: 18 },
      { header: 'Nivel', dataKey: 'nivel', halign: 'center', width: 25 },
    ];

    const skillRows = report.habilidadesBncc.slice(0, 15).map((skill) => ({
      codigo: skill.codigo,
      descricao: skill.descricao.length > 40
        ? skill.descricao.substring(0, 37) + '...'
        : skill.descricao,
      vezes: skill.vezesTrabalhado,
      nivel: skill.nivel === 'fundamental' ? 'Fund.' : 'Infantil',
    }));

    currentY = addPDFTable(
      doc,
      {
        columns: skillColumns,
        rows: skillRows,
        title: 'Habilidades BNCC Trabalhadas',
        summary: report.habilidadesBncc.length > 15
          ? `Exibindo 15 de ${report.habilidadesBncc.length} habilidades (ordenadas por frequencia)`
          : `Total: ${report.habilidadesBncc.length} habilidades trabalhadas no periodo`,
      },
      currentY,
      BNCC_STYLES
    );

    currentY += 8;
  }

  // Detailed lessons table
  if (includeDetailedLessons && report.aulas.length > 0) {
    // Check if we need a new page
    if (currentY > 180) {
      doc.addPage();
      currentY = 20;
    }

    const lessonColumns: PDFTableColumn[] = [
      { header: 'Data', dataKey: 'data', halign: 'center', width: 22 },
      { header: 'Tema/Conteudo', dataKey: 'tema', halign: 'left' },
      { header: 'Objetivo', dataKey: 'objetivo', halign: 'left' },
      { header: 'Habilidades', dataKey: 'habilidades', halign: 'center', width: 25 },
    ];

    const lessonRows = report.aulas.map((aula) => ({
      data: formatShortDateBR(aula.dataAula),
      tema: aula.tema.length > 35 ? aula.tema.substring(0, 32) + '...' : aula.tema,
      objetivo: aula.objetivo.length > 40 ? aula.objetivo.substring(0, 37) + '...' : aula.objetivo,
      habilidades: aula.habilidadesBncc.length > 0
        ? aula.habilidadesBncc.slice(0, 2).join(', ') +
          (aula.habilidadesBncc.length > 2 ? ` (+${aula.habilidadesBncc.length - 2})` : '')
        : '-',
    }));

    currentY = addPDFTable(
      doc,
      {
        columns: lessonColumns,
        rows: lessonRows,
        title: 'Detalhamento das Aulas',
        summary: `Total: ${report.aulas.length} aulas registradas no periodo`,
      },
      currentY,
      CONTENT_STYLES
    );
  }

  // Compliance note
  currentY += 10;
  addPDFText(
    doc,
    'Este documento foi gerado automaticamente pelo sistema EDUCA para fins de ' +
    'registro oficial do conteudo ministrado, em conformidade com a Base Nacional ' +
    'Comum Curricular (BNCC) e a legislacao educacional brasileira.',
    currentY,
    { fontSize: 7, fontStyle: 'italic', color: [120, 120, 120] }
  );

  // Footer
  addPDFFooter(doc);

  // Save
  const turmaSlug = report.turma
    ? report.turma.nome.replace(/\s+/g, '_')
    : 'todas_turmas';
  const filename = `conteudo_ministrado_${turmaSlug}_${report.periodo.inicio}_${report.periodo.fim}`;
  savePDF(doc, filename);
}

/**
 * Generate PDF for BNCC skills summary only
 */
export function generateBNNCSkillsReportPDF(
  skills: BNNCSkillUsage[],
  metadata: {
    turma?: { nome: string; serie: string };
    escola?: { nome: string };
    periodo: { inicio: string; fim: string };
    professor?: { nome: string };
  }
): void {
  const doc = createPDFDocument('portrait');

  // Header - convert periodo to period format expected by PDFHeader
  let currentY = addPDFHeader(doc, {
    title: 'Relatorio de Habilidades BNCC',
    subtitle: metadata.turma
      ? `${metadata.turma.serie} - ${metadata.turma.nome}`
      : 'Todas as Turmas',
    schoolName: metadata.escola?.nome,
    period: {
      start: metadata.periodo.inicio,
      end: metadata.periodo.fim,
    },
  }, BNCC_STYLES);

  // Summary by level
  const fundamentalSkills = skills.filter((s) => s.nivel === 'fundamental');
  const infantilSkills = skills.filter((s) => s.nivel === 'infantil');

  const fundamentalTotal = fundamentalSkills.reduce((acc, s) => acc + s.vezesTrabalhado, 0);
  const infantilTotal = infantilSkills.reduce((acc, s) => acc + s.vezesTrabalhado, 0);

  currentY = addPDFSummary(
    doc,
    'Resumo por Nivel',
    [
      { label: 'Habilidades Unicas', value: skills.length, color: [219, 234, 254] },
      { label: 'Ensino Fundamental', value: fundamentalSkills.length, color: [220, 252, 231] },
      { label: 'Ed. Infantil', value: infantilSkills.length, color: [254, 243, 199] },
      { label: 'Total Trabalhado', value: fundamentalTotal + infantilTotal, color: [237, 233, 254] },
    ],
    currentY,
    BNCC_STYLES
  );

  currentY += 8;

  // Full skills table
  const skillColumns: PDFTableColumn[] = [
    { header: 'Codigo BNCC', dataKey: 'codigo', halign: 'center', width: 28 },
    { header: 'Area/Campo de Experiencia', dataKey: 'descricao', halign: 'left' },
    { header: 'Vezes Trabalhado', dataKey: 'vezes', halign: 'center', width: 25 },
    { header: 'Nivel', dataKey: 'nivel', halign: 'center', width: 22 },
  ];

  const skillRows = skills.map((skill) => ({
    codigo: skill.codigo,
    descricao: skill.descricao,
    vezes: skill.vezesTrabalhado,
    nivel: skill.nivel === 'fundamental' ? 'Fundamental' : 'Ed. Infantil',
  }));

  currentY = addPDFTable(
    doc,
    {
      columns: skillColumns,
      rows: skillRows,
      title: 'Habilidades BNCC Trabalhadas (ordenadas por frequencia)',
    },
    currentY,
    BNCC_STYLES
  );

  // BNCC explanation
  currentY += 10;
  addPDFText(
    doc,
    'LEGENDA DE CODIGOS BNCC:\n' +
    '- EF: Ensino Fundamental (ex: EF01MA06 = Fund. 1o ano, Matematica, habilidade 06)\n' +
    '- EI: Educacao Infantil (ex: EI03EO01 = Infantil 3 anos, Campo EO, habilidade 01)\n\n' +
    'Campos de Experiencia (Ed. Infantil): EO = O eu, o outro e o nos | CG = Corpo, gestos e movimentos | ' +
    'TS = Tracos, sons, cores e formas | EF = Escuta, fala, pensamento e imaginacao | ' +
    'ET = Espacos, tempos, quantidades',
    currentY,
    { fontSize: 7, fontStyle: 'italic', color: [100, 100, 100] }
  );

  // Footer
  addPDFFooter(doc);

  // Save
  const turmaSlug = metadata.turma
    ? metadata.turma.nome.replace(/\s+/g, '_')
    : 'todas_turmas';
  const filename = `habilidades_bncc_${turmaSlug}_${metadata.periodo.inicio}_${metadata.periodo.fim}`;
  savePDF(doc, filename);
}

/**
 * Generate PDF for a single lesson detail (for archiving)
 */
export function generateLessonDetailPDF(
  lesson: LessonContentReportItem,
  schoolName?: string
): void {
  const doc = createPDFDocument('portrait');

  // Header
  let currentY = addPDFHeader(doc, {
    title: 'Registro de Aula',
    subtitle: `${lesson.turmaSerie} - ${lesson.turmaNome}`,
    schoolName: schoolName || lesson.escolaNome,
  }, CONTENT_STYLES);

  // Lesson metadata
  currentY = addPDFText(
    doc,
    `Data: ${formatShortDateBR(lesson.dataAula)}`,
    currentY,
    { fontSize: 11, fontStyle: 'bold' }
  );
  currentY += 2;

  if (lesson.professorNome) {
    currentY = addPDFText(
      doc,
      `Professor(a): ${lesson.professorNome}`,
      currentY,
      { fontSize: 10, color: [100, 100, 100] }
    );
    currentY += 5;
  }

  // Tema
  currentY = addPDFText(
    doc,
    'TEMA/CONTEUDO:',
    currentY,
    { fontSize: 10, fontStyle: 'bold', color: [30, 64, 175] }
  );
  currentY = addPDFText(doc, lesson.tema, currentY, { fontSize: 10 });
  currentY += 5;

  // Objetivo
  currentY = addPDFText(
    doc,
    'OBJETIVO:',
    currentY,
    { fontSize: 10, fontStyle: 'bold', color: [30, 64, 175] }
  );
  currentY = addPDFText(doc, lesson.objetivo, currentY, { fontSize: 10 });
  currentY += 5;

  // Habilidades BNCC
  if (lesson.habilidadesBncc.length > 0) {
    currentY = addPDFText(
      doc,
      'HABILIDADES BNCC:',
      currentY,
      { fontSize: 10, fontStyle: 'bold', color: [88, 28, 135] }
    );
    currentY = addPDFText(
      doc,
      lesson.habilidadesBncc.join(', '),
      currentY,
      { fontSize: 10 }
    );
    currentY += 5;
  }

  // Metodologia
  if (lesson.metodologia) {
    currentY = addPDFText(
      doc,
      'METODOLOGIA:',
      currentY,
      { fontSize: 10, fontStyle: 'bold', color: [30, 64, 175] }
    );
    currentY = addPDFText(doc, lesson.metodologia, currentY, { fontSize: 10 });
    currentY += 5;
  }

  // Recursos
  if (lesson.recursos) {
    currentY = addPDFText(
      doc,
      'RECURSOS UTILIZADOS:',
      currentY,
      { fontSize: 10, fontStyle: 'bold', color: [30, 64, 175] }
    );
    currentY = addPDFText(doc, lesson.recursos, currentY, { fontSize: 10 });
    currentY += 5;
  }

  // Observacoes
  if (lesson.observacoes) {
    currentY = addPDFText(
      doc,
      'OBSERVACOES:',
      currentY,
      { fontSize: 10, fontStyle: 'bold', color: [30, 64, 175] }
    );
    currentY = addPDFText(doc, lesson.observacoes, currentY, { fontSize: 10 });
  }

  // Footer
  addPDFFooter(doc);

  // Save
  const dateSlug = lesson.dataAula.replace(/-/g, '');
  const filename = `aula_${lesson.turmaNome.replace(/\s+/g, '_')}_${dateSlug}`;
  savePDF(doc, filename);
}
