/**
 * Deterministic receipts for the isolated EDUCA pilot capacity contract.
 *
 * Every count below comes from the pilot-capacity brief. The seed and validator
 * use these names so a changed receipt is visible in both command outputs.
 */
export const PILOT_CAPACITY_CONTRACT = Object.freeze({
  schoolCount: 1,
  classCount: 5,
  activeStudentCount: 100,
  enrollmentCount: 100,
  guardianCount: 100,
  teacherOwnerCount: 5,
  directorCount: 1,
  schoolDayCount: 20,
  canonicalSessionCount: 100,
  attendanceRowCount: 2000,
  studentsPerClass: 20,
  sessionsPerClass: 20,
  attendanceRowsPerSession: 20,
  lowAttendanceStudentIndex: 1,
  lowAttendanceAbsentDayCount: 5,
  lowAttendancePresentDayCount: 15,
  lowAttendancePercent: 75,
  attendanceAlertThresholdPercent: 80,
})

export const PILOT_CAPACITY_SEED_MARKER = 'SYNTHETIC-EDUCA-PILOT-CAPACITY'
export const PILOT_CAPACITY_SEED_ANCHOR_DATE = '2026-08-07'
export const PILOT_CAPACITY_SEED_CREATED_AT = '2026-08-10T12:00:00.000Z'
export const PILOT_CAPACITY_AUTH_PASSWORD = 'Synthetic-Only-2026!'
export const PILOT_CAPACITY_CONTACT_DOMAIN = 'synthetic.invalid'
export const PILOT_CAPACITY_SCHOOL_ID = '11000000-0000-0000-0000-000000000001'
export const PILOT_CAPACITY_DIRECTOR_EMAIL = 'diretor.capacidade@synthetic.invalid'
export const PILOT_CAPACITY_CONFIG_MARKER_ID = '18000000-0000-0000-0000-000000000001'
export const PILOT_CAPACITY_CONFIG_ANCHOR_ID = '18000000-0000-0000-0000-000000000002'

const PILOT_CAPACITY_ID_PREFIXES = Object.freeze({
  class: '12000000-0000-0000-0000-',
  guardian: '13000000-0000-0000-0000-',
  student: '14000000-0000-0000-0000-',
  enrollment: '15000000-0000-0000-0000-',
  session: '16000000-0000-0000-0000-',
  attendance: '17000000-0000-0000-0000-',
  link: '19000000-0000-0000-0000-',
})

/** Return one fixed UUID for a numbered pilot capacity entity. */
export function pilotCapacityEntityId(
  entity: keyof typeof PILOT_CAPACITY_ID_PREFIXES,
  index: number
): string {
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`PILOT_CAPACITY_ID_INVALID: ${entity} index ${index}`)
  }
  return `${PILOT_CAPACITY_ID_PREFIXES[entity]}${index.toString(16).padStart(12, '0')}`
}

/** Return the fixed class UUID for a one-based class number. */
export function pilotCapacityClassId(classIndex: number): string {
  return pilotCapacityEntityId('class', classIndex)
}

/** Return the fixed guardian UUID for a one-based guardian number. */
export function pilotCapacityGuardianId(guardianIndex: number): string {
  return pilotCapacityEntityId('guardian', guardianIndex)
}

/** Return the fixed student UUID for a one-based student number. */
export function pilotCapacityStudentId(studentIndex: number): string {
  return pilotCapacityEntityId('student', studentIndex)
}

/** Return the fixed enrollment UUID for a one-based enrollment number. */
export function pilotCapacityEnrollmentId(enrollmentIndex: number): string {
  return pilotCapacityEntityId('enrollment', enrollmentIndex)
}

/** Return the fixed canonical session UUID for a one-based session number. */
export function pilotCapacitySessionId(sessionIndex: number): string {
  return pilotCapacityEntityId('session', sessionIndex)
}

/** Return the fixed attendance UUID for a one-based attendance number. */
export function pilotCapacityAttendanceId(attendanceIndex: number): string {
  return pilotCapacityEntityId('attendance', attendanceIndex)
}

/** Return the fixed student-guardian link UUID for a one-based student number. */
export function pilotCapacityLinkId(studentIndex: number): string {
  return pilotCapacityEntityId('link', studentIndex)
}

/** Return the one-based teacher owner for a one-based class number. */
export function pilotCapacityTeacherIndexForClass(classIndex: number): number {
  return classIndex
}

/** Return a deterministic weekday window ending on the recorded anchor date. */
export function pilotCapacitySchoolDays(): string[] {
  const days: string[] = []
  const cursor = new Date(`${PILOT_CAPACITY_SEED_ANCHOR_DATE}T00:00:00.000Z`)

  while (days.length < PILOT_CAPACITY_CONTRACT.schoolDayCount) {
    const weekday = cursor.getUTCDay()
    if (weekday !== 0 && weekday !== 6) {
      days.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return days.reverse()
}

/** Return whether a student is present on a generated school day. */
export function pilotCapacityStudentPresent(studentIndex: number, schoolDayIndex: number): boolean {
  return !(
    studentIndex === PILOT_CAPACITY_CONTRACT.lowAttendanceStudentIndex
    && schoolDayIndex < PILOT_CAPACITY_CONTRACT.lowAttendanceAbsentDayCount
  )
}

/** Return the synthetic-only teacher email for a one-based teacher number. */
export function pilotCapacityTeacherEmail(teacherIndex: number): string {
  return `professor.capacidade.${teacherIndex.toString().padStart(2, '0')}@${PILOT_CAPACITY_CONTACT_DOMAIN}`
}

/** Return the synthetic-only teacher display name for a one-based teacher number. */
export function pilotCapacityTeacherName(teacherIndex: number): string {
  return `Professor Capacidade ${teacherIndex.toString().padStart(2, '0')}`
}

/** Return the synthetic-only guardian display name for a one-based guardian number. */
export function pilotCapacityGuardianName(guardianIndex: number): string {
  return `Responsavel Capacidade ${guardianIndex.toString().padStart(3, '0')}`
}

/** Return the synthetic-only student display name for a one-based student number. */
export function pilotCapacityStudentName(studentIndex: number): string {
  return `Aluno Capacidade ${studentIndex.toString().padStart(3, '0')}`
}

/** Return the fixed synthetic guardian email for a one-based guardian number. */
export function pilotCapacityGuardianEmail(guardianIndex: number): string {
  return `responsavel.capacidade.${guardianIndex.toString().padStart(3, '0')}@${PILOT_CAPACITY_CONTACT_DOMAIN}`
}

/** Return the fixed synthetic phone for a one-based guardian number. */
export function pilotCapacityGuardianPhone(guardianIndex: number): string {
  return `+55 00 90000-${guardianIndex.toString().padStart(4, '0')}`
}
