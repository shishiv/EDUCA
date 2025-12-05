/**
 * Grades Components
 * Task Group 3.1: Sistema de Notas Bimestrais (Fundamental I)
 *
 * Exports:
 * - GradeInput: Numeric input for grades (0-10)
 * - GradeDisplay: Read-only display of a grade
 * - AverageDisplay: Display of calculated average
 * - GradeGrid: Grid for grade entry by class
 */

export { GradeInput, GradeDisplay, AverageDisplay } from './GradeInput'
export { GradeGrid } from './GradeGrid'
export type { GradeInputProps } from './GradeInput'
export type { GradeGridProps, GradeChange } from './GradeGrid'
