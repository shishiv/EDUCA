import { describe, expect, it } from 'vitest'
import {
  createDashboardStatsService,
  type DashboardStatsReader,
} from '@/lib/api/dashboard-stats'

const schoolA = '00000000-0000-0000-0000-000000000001'
const schoolB = '00000000-0000-0000-0000-000000000002'

const academicYear = {
  year: 2027,
  startDate: '2027-01-01',
  endDate: '2027-12-31',
  configured: true,
}

function createSyntheticReader(): DashboardStatsReader {
  const classesBySchool = new Map([
    [schoolA, [
      { id: 'class-current-a', professorId: 'teacher-a' },
    ]],
    [schoolB, [
      { id: 'class-current-b', professorId: 'teacher-b' },
    ]],
  ])
  const enrollmentsByClass = new Map([
    ['class-current-a', [
      { id: 'enrollment-a-1', studentId: 'student-a-1' },
      { id: 'enrollment-a-2', studentId: 'student-a-2' },
    ]],
    ['class-current-b', [
      { id: 'enrollment-b', studentId: 'student-b' },
    ]],
  ])
  const attendanceByEnrollment = new Map([
    ['enrollment-a-1', [
      {
        id: 'attendance-a-1',
        matriculaId: 'enrollment-a-1',
        sessaoId: 'session-a-1',
        dataAula: '2027-02-03',
        presente: true,
        statusPresenca: 'PRESENTE',
        justificativa: null,
      },
    ]],
    ['enrollment-a-2', [
      {
        id: 'attendance-a-2',
        matriculaId: 'enrollment-a-2',
        sessaoId: 'session-a-2',
        dataAula: '2027-02-03',
        presente: false,
        statusPresenca: 'FALTA',
        justificativa: null,
      },
    ]],
    ['enrollment-b', [
      {
        id: 'attendance-b',
        matriculaId: 'enrollment-b',
        sessaoId: 'session-b',
        dataAula: '2027-02-03',
        presente: true,
        statusPresenca: 'PRESENTE',
        justificativa: null,
      },
    ]],
  ])

  return {
    async getActiveClasses(escolaId, year) {
      return year === academicYear.year ? classesBySchool.get(escolaId) ?? [] : []
    },
    async getActiveSchoolCount(escolaId) {
      return classesBySchool.has(escolaId) ? 1 : 0
    },
    async getActiveEnrollments(classIds, year) {
      if (year !== academicYear.year) return []
      return classIds.flatMap((classId) => enrollmentsByClass.get(classId) ?? [])
    },
    async getActiveTeacherCount(teacherIds) {
      return teacherIds.length
    },
    async getAttendanceFacts(enrollmentIds) {
      return enrollmentIds.flatMap((enrollmentId) => attendanceByEnrollment.get(enrollmentId) ?? [])
    },
  }
}

describe('dashboard stats', () => {
  it('excludes historical classes and enrollments from current-year totals', async () => {
    const service = createDashboardStatsService(createSyntheticReader())

    await expect(service.getStats({ escolaId: schoolA, academicYear })).resolves.toEqual({
      totalAlunos: 2,
      totalEscolas: 1,
      totalTurmas: 1,
      totalProfessores: 1,
      frequenciaGeral: 50,
    })
  })

  it('does not mix another school into current-year totals', async () => {
    const service = createDashboardStatsService(createSyntheticReader())

    await expect(service.getStats({ escolaId: schoolB, academicYear })).resolves.toEqual({
      totalAlunos: 1,
      totalEscolas: 1,
      totalTurmas: 1,
      totalProfessores: 1,
      frequenciaGeral: 100,
    })
  })
})
