/**
 * Export Module Index
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 * Task Group 4.4: Relatorio de Conteudo Ministrado
 *
 * Centralized exports for PDF and Excel generation utilities.
 */

// PDF utilities
export {
  createPDFDocument,
  addPDFHeader,
  addPDFFooter,
  addPDFTable,
  addPDFSummary,
  addPDFText,
  savePDF,
  getPDFBlob,
  getPDFBase64,
  formatDateBR,
  formatShortDateBR,
  formatPeriodLabel,
  type PDFHeader,
  type PDFFooter,
  type PDFTableColumn,
  type PDFTableData,
  type PDFStyles,
} from './pdf-utils';

// Attendance PDF exports
export {
  generateAttendanceReportPDF,
  generateBolsaFamiliaReportPDF,
  generateStudentReportPDF,
  type StudentReportData,
} from './attendance-pdf';

// Content PDF exports (Task Group 4.4)
export {
  generateContentReportPDF,
  generateBNNCSkillsReportPDF,
  generateLessonDetailPDF,
} from './content-pdf';

// Excel exports
export {
  generateAttendanceReportExcel,
  generateBolsaFamiliaReportExcel,
  type ExcelStyles,
} from './attendance-excel';
