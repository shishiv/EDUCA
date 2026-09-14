/**
 * Attendance Report Excel Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Generates Excel reports for attendance and Bolsa Família compliance
 * using ExcelJS library - full styling support included.
 */

import ExcelJS from 'exceljs';
import { downloadFilename } from './download-filename';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateBR } from '@/lib/date-utils';
import type { ClassAttendanceReport } from '@/lib/reports/attendance-reports';
import type {
  BolsaFamiliaReport,
  BolsaFamiliaStatus,
  BolsaFamiliaStudent,
  MunicipalMarginResolution,
} from '@/lib/reports/bolsa-familia-reports';
import {
  ATENCAO,
  CONFORMIDADE,
  getFrequencyPolicyLabel,
  getFrequencyPolicyStatus,
} from '@/lib/attendance/attendance-policy';

// ============================================================================
// TYPES
// ============================================================================

export interface ExcelStyles {
  headerBgColor: string;
  headerTextColor: string;
  alternateBgColor: string;
  riskBgColor: string;
  warningBgColor: string;
  successBgColor: string;
}

// ============================================================================
// DEFAULT STYLES
// ============================================================================

const DEFAULT_STYLES: ExcelStyles = {
  headerBgColor: 'FF2980B9',
  headerTextColor: 'FFFFFFFF',
  alternateBgColor: 'FFF5F5F5',
  riskBgColor: 'FFFEE2E2',
  warningBgColor: 'FFFEF3C7',
  successBgColor: 'FFDCFCE7',
};

const BOLSA_FAMILIA_STYLES: ExcelStyles = {
  headerBgColor: 'FFD97706',
  headerTextColor: 'FFFFFFFF',
  alternateBgColor: 'FFFEF3C7',
  riskBgColor: 'FFFEE2E2',
  warningBgColor: 'FFFEF3C7',
  successBgColor: 'FFDCFCE7',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Set column widths for a worksheet
 */
function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, columnIndex) => {
    const column = worksheet.getColumn(columnIndex + 1);
    column.width = width;
  });
}

/**
 * Apply header styling to a row
 */
function styleHeaderRow(row: ExcelJS.Row, bgColor: string = '2980B9'): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Save workbook to file
 */
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  // Keep the filename on a native link, independent of a shared window.saveAs.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadFilename(name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

/**
 * Get status text based on percentage
 */
function getStatusText(percentual: number): string {
  return getFrequencyPolicyLabel(getFrequencyPolicyStatus(percentual));
}

const BOLSA_STATUS_LABELS = {
  CRITICO: 'NÃO CONFORME',
  ALERTA: 'ALERTA MUNICIPAL',
  CONFORME: 'CONFORME',
} satisfies Record<BolsaFamiliaStatus, string>;

function displayResolutionValue<T>(value: T | null, fallback: string): T | string {
  return value ?? fallback;
}

function formatResolutionDetails(resolution: MunicipalMarginResolution): string {
  return `crítico ${displayResolutionValue(resolution.criticalPercent, 'não configurada')}%, alerta ${displayResolutionValue(resolution.warningPercent, 'não configurada')}%, precedência ${displayResolutionValue(resolution.precedence, 'n/a')}, origem ${displayResolutionValue(resolution.source, 'não informada')}, fallback ${resolution.fallback ? 'sim' : 'não'}, definido por ${displayResolutionValue(resolution.definedBy, 'sistema')} em ${displayResolutionValue(resolution.definedAt, 'n/a')}`;
}

function formatResolutionMargin(resolution: MunicipalMarginResolution): string {
  return `${resolution.municipalityId}: crítico ${displayResolutionValue(resolution.criticalPercent, 'não configurada')}%, alerta ${displayResolutionValue(resolution.warningPercent, 'não configurada')}%, origem ${displayResolutionValue(resolution.source, 'não informada')}`;
}

function getBolsaStudentFillColor(status: BolsaFamiliaStatus, index: number): string | null {
  if (status === 'CRITICO') return 'FFFEE2E2';
  if (status === 'ALERTA') return 'FFFEF3C7';
  if (index % 2 === 1) return 'FFF5F5F5';
  return null;
}

function addBolsaStudentRow(
  worksheet: ExcelJS.Worksheet,
  student: BolsaFamiliaStudent,
  index: number,
): void {
  const statusLabel = BOLSA_STATUS_LABELS[student.status];
  const row = worksheet.addRow([
    student.nome,
    student.nis || '-',
    student.turmaNome,
    student.escolaNome,
    student.presencas,
    student.faltas,
    student.atestados,
    student.totalAulas,
    student.percentual,
    displayResolutionValue(student.pisoLegalPercent, '-'),
    student.statusLegal,
    displayResolutionValue(student.margemMunicipalCriticaPercent, '-'),
    displayResolutionValue(student.margemMunicipalAlertaPercent, '-'),
    `${statusLabel} (${displayResolutionValue(student.margemMunicipalOrigem, 'sem origem')})`,
  ]);

  const fillColor = getBolsaStudentFillColor(student.status, index);
  if (fillColor === null) return;

  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor },
    };
  });
}
// ============================================================================
// ATTENDANCE REPORT EXCEL
// ============================================================================

/**
 * Generate Excel for class attendance report
 */
export async function generateAttendanceReportExcel(
  report: ClassAttendanceReport,
  schoolName?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão Educacional';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Frequência');

  // Title rows
  worksheet.addRow(['Relatório de Frequência']);
  worksheet.addRow([`${report.turmaNome}${report.turmaSerie ? ` - ${report.turmaSerie}` : ''}`]);
  worksheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    worksheet.addRow([`Escola: ${schoolName}`]);
  }
  worksheet.addRow([]); // Empty row

  // Summary
  worksheet.addRow([
    `Total: ${report.totalAlunos} alunos`,
    `Média: ${report.mediaFrequencia}%`,
    `Em Risco: ${report.alunosEmRisco}`,
  ]);
  worksheet.addRow([]); // Empty row

  // Header row
  const headerRow = worksheet.addRow(['Nome', 'P', 'F', 'A', 'Total', '%', 'Status']);
  styleHeaderRow(headerRow);

  // Data rows
  report.students.forEach((student, index) => {
    const row = worksheet.addRow([
      student.nome,
      student.presencas,
      student.faltas,
      student.atestados,
      student.totalAulas,
      student.percentual,
      getStatusText(student.percentual),
    ]);

    // Alternate row colors
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      });
    }

    // Highlight policy bands
    if (student.percentual < CONFORMIDADE) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      });
    } else if (student.percentual < ATENCAO) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' },
        };
      });
    }
  });

  worksheet.addRow([]); // Empty row
  worksheet.addRow([`Legenda: P = Presença, F = Falta, A = Atestado. Não conformidade = frequência < ${CONFORMIDADE}%; atenção preventiva = ${CONFORMIDADE}% a < ${ATENCAO}%.`]);
  worksheet.addRow([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  // Set column widths
  setColumnWidths(worksheet, [35, 10, 10, 10, 10, 12, 12]);

  // Style title
  worksheet.getRow(1).font = { bold: true, size: 14 };

  // Save
  const filename = `frequencia_${report.turmaNome.replace(/\s+/g, '_')}_${report.periodo.inicio}_${report.periodo.fim}`;
  await saveWorkbook(workbook, filename);
}

// ============================================================================
// BOLSA FAMÍLIA REPORT EXCEL
// ============================================================================

/**
 * Generate Excel for Bolsa Família compliance report
 */
export async function generateBolsaFamiliaReportExcel(
  report: BolsaFamiliaReport,
  schoolName?: string,
  showAllStudents = true
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão Educacional';
  workbook.created = new Date();

  // ========================
  // Sheet 1: Resumo
  // ========================
  const summarySheet = workbook.addWorksheet('Resumo');

  summarySheet.addRow(['Relatório Bolsa Família - Resumo']);
  summarySheet.getRow(1).font = { bold: true, size: 14 };

  summarySheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    summarySheet.addRow([`Escola: ${schoolName}`]);
  }
  summarySheet.addRow([]); // Empty row

  const summaryHeaderRow = summarySheet.addRow(['Métrica', 'Valor']);
  styleHeaderRow(summaryHeaderRow, 'D97706');

  summarySheet.addRow(['Total Bolsa Família', report.resumo.totalAlunosBolsaFamilia]);
  summarySheet.addRow(['Conformes na margem municipal', report.resumo.conformes]);
  summarySheet.addRow(['Em alerta municipal', report.resumo.emAlerta]);
  summarySheet.addRow(['Críticos na margem municipal', report.resumo.emRiscoCritico]);
  summarySheet.addRow(['Condicionalidades legais críticas', report.resumo.condicionalidadesLegaisCriticas]);
  summarySheet.addRow(['Sem condicionalidade legal aplicável', report.resumo.semCondicionalidadeLegal]);
  summarySheet.addRow(['% Conformidade municipal', `${report.resumo.percentualConformidade}%`]);
  for (const resolution of report.resolucoesMargemMunicipal) {
    summarySheet.addRow([
      `Resolução municipal ${resolution.municipalityId}`,
      formatResolutionDetails(resolution),
    ]);
  }

  setColumnWidths(summarySheet, [32, 80]);

  // ========================
  // Sheet 2: Alunos
  // ========================
  const studentsSheet = workbook.addWorksheet('Alunos');

  studentsSheet.addRow(['Relatório Bolsa Família - Alunos']);
  studentsSheet.getRow(1).font = { bold: true, size: 14 };

  studentsSheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  studentsSheet.addRow([]); // Empty row

  // Header
  const studentsHeaderRow = studentsSheet.addRow([
    'Nome', 'NIS', 'Turma', 'Escola', 'P', 'F', 'A', 'Total', '%',
    'Piso legal', 'Status legal', 'Margem crítica', 'Margem alerta', 'Status municipal',
  ]);
  styleHeaderRow(studentsHeaderRow, 'D97706');

  // Filter students
  const studentsToShow = showAllStudents
    ? report.alunos
    : report.alunos.filter((s) => s.status !== 'CONFORME');

  // Data rows
  studentsToShow.forEach((student, index) => {
    addBolsaStudentRow(studentsSheet, student, index);
  });

  studentsSheet.addRow([]); // Empty row
  const marginSummary = report.resolucoesMargemMunicipal.map(formatResolutionMargin).join(' | ')
  studentsSheet.addRow(['Legenda: P = Presença, F = Falta, A = Atestado (conta como presença).']);
  studentsSheet.addRow([`Margens municipais resolvidas: ${marginSummary || 'não configuradas'}`]);
  studentsSheet.addRow([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  setColumnWidths(studentsSheet, [35, 15, 20, 30, 8, 8, 8, 10, 10, 12, 28, 16, 16, 24]);

  // Save
  const filename = `bolsa_familia_${report.periodo.inicio}_${report.periodo.fim}`;
  await saveWorkbook(workbook, filename);
}

// Re-export styles for API compatibility
export { DEFAULT_STYLES, BOLSA_FAMILIA_STYLES };
