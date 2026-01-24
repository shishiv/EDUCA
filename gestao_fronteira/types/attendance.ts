/**
 * Attendance Type Definitions
 *
 * This file defines the attendance status types and mappings between
 * UI representation and database values.
 *
 * UI Status: 'presente' | 'falta' | 'attestado' | 'empty'
 * DB Status: 'P' | 'F' | 'A' (stored in status_presenca column)
 *
 * @see components/attendance/AttendanceGrid.tsx
 * @see components/attendance/AttendanceCell.tsx
 */

// ============================================================================
// Status Types
// ============================================================================

/**
 * UI Attendance Status - Used in grid components for display and logic
 * - 'presente': Student was present
 * - 'falta': Student was absent
 * - 'attestado': Justified absence (medical/legal certificate)
 * - 'empty': Not yet marked
 */
export type AttendanceStatusUI = 'presente' | 'falta' | 'attestado' | 'empty';

/**
 * Database Attendance Status - Stored in status_presenca column
 * - 'P': Presente
 * - 'F': Falta
 * - 'A': Atestado
 */
export type AttendanceStatusDB = 'P' | 'F' | 'A';

/**
 * AttendanceCell Status - Used by the compact cell component
 * This matches the AttendanceCell component's expected values
 */
export type AttendanceCellStatus = 'P' | 'F' | 'A' | null;

// ============================================================================
// Status Mappings
// ============================================================================

/**
 * Map UI status to database fields for insert/update operations
 */
export const STATUS_UI_TO_DB: Record<AttendanceStatusUI, { presente: boolean; status_presenca: AttendanceStatusDB } | null> = {
  presente: { presente: true, status_presenca: 'P' },
  falta: { presente: false, status_presenca: 'F' },
  attestado: { presente: false, status_presenca: 'A' },
  empty: null,
};

/**
 * Map database status to UI status for display
 */
export const STATUS_DB_TO_UI: Record<AttendanceStatusDB, AttendanceStatusUI> = {
  P: 'presente',
  F: 'falta',
  A: 'attestado',
};

/**
 * Map UI status to cell status (for AttendanceCell component)
 */
export const STATUS_UI_TO_CELL: Record<AttendanceStatusUI, AttendanceCellStatus> = {
  presente: 'P',
  falta: 'F',
  attestado: 'A',
  empty: null,
};

/**
 * Map cell status to UI status
 */
export const STATUS_CELL_TO_UI: Record<NonNullable<AttendanceCellStatus> | 'null', AttendanceStatusUI> = {
  P: 'presente',
  F: 'falta',
  A: 'attestado',
  null: 'empty',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database status string to UI status
 */
export function dbStatusToUI(dbStatus: string | null | undefined): AttendanceStatusUI {
  if (!dbStatus) return 'empty';
  return STATUS_DB_TO_UI[dbStatus as AttendanceStatusDB] ?? 'empty';
}

/**
 * Convert UI status to database status
 * Returns null for 'empty' status
 */
export function uiStatusToDB(uiStatus: AttendanceStatusUI): AttendanceStatusDB | null {
  const mapping = STATUS_UI_TO_DB[uiStatus];
  return mapping?.status_presenca ?? null;
}

/**
 * Convert cell status to UI status
 */
export function cellStatusToUI(cellStatus: AttendanceCellStatus): AttendanceStatusUI {
  if (cellStatus === null) return 'empty';
  return STATUS_DB_TO_UI[cellStatus] ?? 'empty';
}

/**
 * Convert UI status to cell status
 */
export function uiStatusToCell(uiStatus: AttendanceStatusUI): AttendanceCellStatus {
  return STATUS_UI_TO_CELL[uiStatus];
}

// ============================================================================
// Status Labels (Portuguese)
// ============================================================================

/**
 * Human-readable labels for UI status
 */
export const STATUS_LABELS: Record<AttendanceStatusUI, string> = {
  presente: 'Presente',
  falta: 'Ausente',
  attestado: 'Atestado',
  empty: 'Nao marcado',
};

/**
 * Human-readable labels for database status
 */
export const STATUS_DB_LABELS: Record<AttendanceStatusDB, string> = {
  P: 'Presente',
  F: 'Falta',
  A: 'Atestado',
};
