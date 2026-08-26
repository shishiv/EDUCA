/**
 * Attendance Report PDF Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Generates PDF reports for attendance and Bolsa Família compliance.
 */

import type { ClassAttendanceReport } from '@/lib/reports/attendance-reports';
import type { BolsaFamiliaReport } from '@/lib/reports/bolsa-familia-reports';
import {
  ATENCAO,
  CONFORMIDADE,
  getFrequencyPolicyLabel,
  getFrequencyPolicyStatus,
} from '@/lib/attendance/attendance-policy';
import {
  createPDFDocument,
  addPDFHeader,
  addPDFFooter,
  addPDFTable,
  addPDFSummary,
  addPDFText,
  savePDF,
  formatPeriodLabel,
  type PDFTableColumn,
  type PDFStyles,
} from './pdf-utils';

// ============================================================================
// STYLES
// ============================================================================

const ATTENDANCE_STYLES: PDFStyles = {
  primaryColor: [31, 78, 121],
  headerBgColor: [41, 128, 185],
  headerTextColor: [255, 255, 255],
  alternateBgColor: [245, 245, 245],
  fontSize: 9,
};

const BOLSA_FAMILIA_STYLES: PDFStyles = {
  primaryColor: [180, 83, 9], // Amber/orange for BF branding
  headerBgColor: [217, 119, 6],
  headerTextColor: [255, 255, 255],
  alternateBgColor: [254, 243, 199],
  fontSize: 9,
};

// ============================================================================
// ATTENDANCE REPORT PDF
// ============================================================================

/**
 * Generate PDF for class attendance report
 */
export function generateAttendanceReportPDF(
  report: ClassAttendanceReport,
  schoolName?: string
): void {
  const doc = createPDFDocument('portrait');

  // Header
  let currentY = addPDFHeader(doc, {
    title: 'Relatório de Frequência',
    subtitle: `${report.turmaNome}${report.turmaSerie ? ` - ${report.turmaSerie}` : ''}`,
    schoolName,
    period: {
      start: report.periodo.inicio,
      end: report.periodo.fim,
    },
  }, ATTENDANCE_STYLES);

  // Summary metrics
  const atRiskCount = report.students.filter((s) => s.emRisco).length;
  currentY = addPDFSummary(
    doc,
    'Resumo',
    [
      { label: 'Total de Alunos', value: report.totalAlunos, color: [219, 234, 254] },
      { label: 'Média de Frequência', value: `${report.mediaFrequencia}%`, color: [220, 252, 231] },
      { label: 'Alunos em Risco', value: atRiskCount, color: atRiskCount > 0 ? [254, 226, 226] : [220, 252, 231] },
    ],
    currentY,
    ATTENDANCE_STYLES
  );

  currentY += 5;

  // Students table
  const columns: PDFTableColumn[] = [
    { header: 'Nome', dataKey: 'nome', halign: 'left' },
    { header: 'P', dataKey: 'presencas', halign: 'center', width: 12 },
    { header: 'F', dataKey: 'faltas', halign: 'center', width: 12 },
    { header: 'A', dataKey: 'atestados', halign: 'center', width: 12 },
    { header: 'Total', dataKey: 'total', halign: 'center', width: 15 },
    { header: '%', dataKey: 'percentual', halign: 'center', width: 15 },
    { header: 'Status', dataKey: 'status', halign: 'center', width: 20 },
  ];

  const rows = report.students.map((student) => ({
    nome: student.nome,
    presencas: student.presencas,
    faltas: student.faltas,
    atestados: student.atestados,
    total: student.totalAulas,
    percentual: `${student.percentual}%`,
    status: getFrequencyPolicyLabel(getFrequencyPolicyStatus(student.percentual)),
  }));

  currentY = addPDFTable(
    doc,
    {
      columns,
      rows,
      summary: `P = Presença, F = Falta, A = Atestado. Não conformidade = frequência abaixo de ${CONFORMIDADE}%; atenção preventiva = ${CONFORMIDADE}% a menos de ${ATENCAO}%.`,
    },
    currentY,
    ATTENDANCE_STYLES
  );

  // Footer
  addPDFFooter(doc);

  // Save
  const filename = `frequencia_${report.turmaNome.replace(/\s+/g, '_')}_${report.periodo.inicio}_${report.periodo.fim}`;
  savePDF(doc, filename);
}

// ============================================================================
// BOLSA FAMÍLIA REPORT PDF
// ============================================================================

/**
 * Generate PDF for Bolsa Família compliance report
 */
export function generateBolsaFamiliaReportPDF(
  report: BolsaFamiliaReport,
  schoolName?: string,
  showAllStudents = false
): void {
  const doc = createPDFDocument('landscape'); // Landscape for more columns

  // Header
  let currentY = addPDFHeader(doc, {
    title: 'Relatório Bolsa Família',
    subtitle: 'Monitoramento de Frequência Escolar',
    schoolName,
    period: {
      start: report.periodo.inicio,
      end: report.periodo.fim,
    },
  }, BOLSA_FAMILIA_STYLES);

  // Summary metrics
  currentY = addPDFSummary(
    doc,
    'Resumo de Conformidade',
    [
      { label: 'Total Bolsa Família', value: report.resumo.totalAlunosBolsaFamilia, color: [219, 234, 254] },
      { label: 'Conformes na margem municipal', value: report.resumo.conformes, color: [220, 252, 231] },
      { label: 'Em alerta municipal', value: report.resumo.emAlerta, color: [254, 243, 199] },
      { label: 'Críticos na margem municipal', value: report.resumo.emRiscoCritico, color: [254, 226, 226] },
      { label: 'Condicionalidades legais críticas', value: report.resumo.condicionalidadesLegaisCriticas, color: [254, 226, 226] },
      { label: '% Conformidade municipal', value: `${report.resumo.percentualConformidade}%`, color: [219, 234, 254] },
    ],
    currentY,
    BOLSA_FAMILIA_STYLES
  );

  currentY += 5;
  const resolutionSummary = report.resolucoesMargemMunicipal.map((resolution) =>
    `${resolution.municipalityId}: crítico ${resolution.criticalPercent ?? 'não configurada'}%, alerta ${resolution.warningPercent ?? 'não configurada'}, precedência ${resolution.precedence ?? 'n/a'}, origem ${resolution.source ?? 'não informada'}, fallback ${resolution.fallback ? 'sim' : 'não'}, definido por ${resolution.definedBy ?? 'sistema'} em ${resolution.definedAt ?? 'n/a'}`,
  ).join(' | ')
  currentY = addPDFText(
    doc,
    `Resolução das margens municipais: ${resolutionSummary || 'não configurada'}`,
    currentY,
    { fontSize: 7, fontStyle: 'italic', color: [100, 100, 100] },
  )
  currentY += 3

  // Filter students based on showAllStudents flag
  const studentsToShow = showAllStudents
    ? report.alunos
    : report.alunos.filter((s) => s.status !== 'CONFORME');

  if (studentsToShow.length === 0) {
    currentY = addPDFText(
      doc,
      'Todos os alunos do Bolsa Família estão com frequência adequada.',
      currentY,
      { fontSize: 12, fontStyle: 'italic', color: [34, 139, 34] }
    );
  } else {
    // Students table
    const columns: PDFTableColumn[] = [
      { header: 'Nome', dataKey: 'nome', halign: 'left' },
      { header: 'NIS', dataKey: 'nis', halign: 'center', width: 25 },
      { header: 'Turma', dataKey: 'turma', halign: 'left', width: 30 },
      { header: 'Escola', dataKey: 'escola', halign: 'left', width: 40 },
      { header: 'P', dataKey: 'presencas', halign: 'center', width: 10 },
      { header: 'F', dataKey: 'faltas', halign: 'center', width: 10 },
      { header: 'A', dataKey: 'atestados', halign: 'center', width: 10 },
      { header: '%', dataKey: 'percentual', halign: 'center', width: 12 },
      { header: 'Piso legal', dataKey: 'pisoLegal', halign: 'center', width: 16 },
      { header: 'Status legal', dataKey: 'statusLegal', halign: 'center', width: 24 },
      { header: 'Margem municipal', dataKey: 'margemMunicipal', halign: 'center', width: 25 },
      { header: 'Status', dataKey: 'status', halign: 'center', width: 18 },
    ];

    const rows = studentsToShow.map((student) => ({
      nome: student.nome,
      nis: student.nis || '-',
      turma: `${student.turmaNome}`,
      escola: student.escolaNome,
      presencas: student.presencas,
      faltas: student.faltas,
      atestados: student.atestados,
      percentual: `${student.percentual}%`,
      pisoLegal: student.pisoLegalPercent === null ? '-' : `${student.pisoLegalPercent}%`,
      statusLegal: student.statusLegal,
      margemMunicipal: student.margemMunicipalCriticaPercent !== null && student.margemMunicipalAlertaPercent !== null
        ? `${student.margemMunicipalCriticaPercent}%/${student.margemMunicipalAlertaPercent}%`
        : 'não configurada',
      status: student.status === 'CRITICO' ? 'CRÍTICO' : student.status === 'ALERTA' ? 'ALERTA' : 'OK',
    }));

    currentY = addPDFTable(
      doc,
      {
        columns,
        rows,
        title: showAllStudents ? 'Todos os Alunos' : 'Alunos em Risco',
        summary: 'P = Presença, F = Falta, A = Atestado (conta como presença). Piso legal e margem municipal aparecem em colunas separadas.',
      },
      currentY,
      BOLSA_FAMILIA_STYLES
    );
  }

  // Compliance note
  currentY += 10;
  addPDFText(
    doc,
    'NOTA: Para fins de conformidade com o Programa Bolsa Família, atestados médicos (A) são contabilizados como presença. ' +
    'O piso legal por faixa etária e a margem municipal de alerta precoce são resolvidos separadamente.',
    currentY,
    { fontSize: 8, fontStyle: 'italic', color: [100, 100, 100] }
  );

  // Footer
  addPDFFooter(doc);

  // Save
  const filename = `bolsa_familia_${report.periodo.inicio}_${report.periodo.fim}`;
  savePDF(doc, filename);
}

// ============================================================================
// INDIVIDUAL STUDENT REPORT PDF
// ============================================================================

export interface StudentReportData {
  studentName: string;
  studentId: string;
  className: string;
  classYear?: string;
  schoolName?: string;
  period: { start: string; end: string };
  attendance: {
    presencas: number;
    faltas: number;
    atestados: number;
    totalAulas: number;
    percentual: number;
  };
  dailyRecords: Array<{
    date: string;
    status: 'P' | 'F' | 'A' | null;
  }>;
  municipalCriticalPercent?: number | null;
  municipalWarningPercent?: number | null;
  legalMinimumPercent?: number | null;
}

/**
 * Generate PDF for individual student attendance report
 */
export function generateStudentReportPDF(data: StudentReportData): void {
  const doc = createPDFDocument('portrait');

  // Header
  let currentY = addPDFHeader(doc, {
    title: 'Relatório Individual de Frequência',
    subtitle: data.studentName,
    schoolName: data.schoolName,
    period: data.period,
  }, ATTENDANCE_STYLES);

  // Student info
  currentY = addPDFText(
    doc,
    `Turma: ${data.className}${data.classYear ? ` - ${data.classYear}` : ''}`,
    currentY,
    { fontSize: 11, fontStyle: 'bold' }
  );

  currentY += 5;

  // Thresholds come from the canonical read model when available. The
  // application policy remains the fallback for legacy callers without them.
  const hasMunicipalResolution = data.municipalCriticalPercent !== null
    && data.municipalCriticalPercent !== undefined
    && data.municipalWarningPercent !== null
    && data.municipalWarningPercent !== undefined;
  const hasLegalFloor = data.legalMinimumPercent !== null
    && data.legalMinimumPercent !== undefined;
  const riskStatus: 'CONFORME' | 'ATENCAO' | 'CRITICO' = hasMunicipalResolution
    ? data.attendance.percentual < data.municipalCriticalPercent!
      ? 'CRITICO'
      : data.attendance.percentual < data.municipalWarningPercent! ? 'ATENCAO' : 'CONFORME'
    : hasLegalFloor
      ? data.attendance.percentual < data.legalMinimumPercent! ? 'CRITICO' : 'CONFORME'
      : getFrequencyPolicyStatus(data.attendance.percentual);
  const riskColor: [number, number, number] =
    riskStatus === 'CRITICO' ? [254, 226, 226] :
    riskStatus === 'ATENCAO' ? [254, 243, 199] : [220, 252, 231];
  const riskLabel = hasMunicipalResolution
    ? 'Margem municipal'
    : hasLegalFloor
      ? 'Piso legal'
      : getFrequencyPolicyLabel(riskStatus);

  currentY = addPDFSummary(
    doc,
    'Resumo de Frequência',
    [
      { label: 'Presenças', value: data.attendance.presencas, color: [220, 252, 231] },
      { label: 'Faltas', value: data.attendance.faltas, color: [254, 226, 226] },
      { label: 'Atestados', value: data.attendance.atestados, color: [254, 243, 199] },
      { label: 'Total', value: data.attendance.totalAulas, color: [219, 234, 254] },
      { label: riskLabel, value: `${data.attendance.percentual}%`, color: riskColor },
    ],
    currentY,
    ATTENDANCE_STYLES
  );

  currentY += 5;

  // Daily records table
  if (data.dailyRecords.length > 0) {
    const columns: PDFTableColumn[] = [
      { header: 'Data', dataKey: 'date', halign: 'center', width: 30 },
      { header: 'Status', dataKey: 'status', halign: 'center', width: 20 },
      { header: 'Descrição', dataKey: 'description', halign: 'left' },
    ];

    const statusDescriptions: Record<string, string> = {
      P: 'Presente',
      F: 'Falta',
      A: 'Atestado',
    };

    const rows = data.dailyRecords.map((record) => ({
      date: record.date,
      status: record.status || '-',
      description: record.status ? statusDescriptions[record.status] || 'Não registrado' : 'Não registrado',
    }));

    currentY = addPDFTable(
      doc,
      {
        columns,
        rows,
        title: 'Registro Diário',
      },
      currentY,
      ATTENDANCE_STYLES
    );
  }

  // Footer
  addPDFFooter(doc);

  // Save
  const safeName = data.studentName.replace(/\s+/g, '_').substring(0, 30);
  const filename = `frequencia_${safeName}_${data.period.start}_${data.period.end}`;
  savePDF(doc, filename);
}
