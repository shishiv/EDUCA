/**
 * Unit tests for Attendance Reports API
 * Task Group 4.1: Relatorios de Frequencia
 *
 * Test Coverage:
 * - Calculate individual student attendance (calculo frequencia individual)
 * - Calculate class attendance (calculo frequencia por turma)
 * - Filter by period (filtro por periodo)
 * - Students at risk identification
 * - Attendance statistics calculation
 *
 * Uses types from types/diario-classe.ts
 */

// Mock logger BEFORE any imports
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  },
}))

import {
  generateStudentAttendanceReport,
  generateClassAttendanceReport,
  getStudentsAtRisk,
  calculateAttendancePercentage,
  type StudentAttendanceReport,
  type ClassAttendanceReport,
  type StudentAtRiskReport,
  type AttendanceReportFilters,
} from '@/lib/reports/attendance-reports'

// Mock Supabase client
const createMockChain = (resolvedValue: any) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolvedValue),
  then: jest.fn().mockResolvedValue(resolvedValue),
})

const mockSupabaseClient = {
  from: jest.fn(() => createMockChain({ data: null, error: null })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
  },
}

describe('Attendance Reports API - Relatorios de Frequencia', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Test 1: Calculate Individual Student Attendance
  // =========================================================================
  describe('Test 1: Calculo de Frequencia Individual', () => {
    it('should calculate individual student attendance correctly', async () => {
      const mockAttendanceData = [
        { status_presenca: 'P', data_aula: '2025-02-01' },
        { status_presenca: 'P', data_aula: '2025-02-02' },
        { status_presenca: 'F', data_aula: '2025-02-03' },
        { status_presenca: 'A', data_aula: '2025-02-04' },
        { status_presenca: 'P', data_aula: '2025-02-05' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await generateStudentAttendanceReport(
        mockSupabaseClient as any,
        'matricula-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        }
      )

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.presencas).toBe(3)
      expect(result.data?.faltas).toBe(1)
      expect(result.data?.atestados).toBe(1)
      expect(result.data?.totalAulas).toBe(5)
      // (3 present + 1 attestado) / 5 total = 80%
      expect(result.data?.percentual).toBe(80)
    })

    it('should return 100% attendance when all present', async () => {
      const mockAttendanceData = [
        { status_presenca: 'P', data_aula: '2025-02-01' },
        { status_presenca: 'P', data_aula: '2025-02-02' },
        { status_presenca: 'P', data_aula: '2025-02-03' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await generateStudentAttendanceReport(
        mockSupabaseClient as any,
        'matricula-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        }
      )

      expect(result.data).toBeDefined()
      expect(result.data?.percentual).toBe(100)
      expect(result.data?.faltas).toBe(0)
    })

    it('should handle empty attendance records', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await generateStudentAttendanceReport(
        mockSupabaseClient as any,
        'matricula-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        }
      )

      expect(result.data).toBeDefined()
      expect(result.data?.totalAulas).toBe(0)
      expect(result.data?.percentual).toBe(0)
    })
  })

  // =========================================================================
  // Test 2: Calculate Class Attendance (por turma)
  // =========================================================================
  describe('Test 2: Calculo de Frequencia por Turma', () => {
    it('should calculate class attendance for multiple students', async () => {
      const mockClassData = {
        id: 'turma-001',
        nome: '5A',
        serie: '5o Ano',
        matriculas: [
          {
            id: 'matricula-001',
            aluno_id: 'aluno-001',
            alunos: { id: 'aluno-001', nome_completo: 'Joao Silva' },
          },
          {
            id: 'matricula-002',
            aluno_id: 'aluno-002',
            alunos: { id: 'aluno-002', nome_completo: 'Maria Santos' },
          },
          {
            id: 'matricula-003',
            aluno_id: 'aluno-003',
            alunos: { id: 'aluno-003', nome_completo: 'Pedro Oliveira' },
          },
        ],
      }

      const mockAttendanceData = [
        // Joao - 3P, 1F (75%)
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-04' },
        // Maria - 4P (100%)
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-04' },
        // Pedro - 2P, 1F, 1A (75%)
        { matricula_id: 'matricula-003', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-003', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-003', status_presenca: 'F', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-003', status_presenca: 'A', data_aula: '2025-02-04' },
      ]

      // Mock for turma query
      const mockTurmaChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockClassData, error: null }),
      }

      // Mock for frequencia query
      const mockFrequenciaChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'turmas') return mockTurmaChain
        if (table === 'frequencia') return mockFrequenciaChain
        return createMockChain({ data: null, error: null })
      })

      const result = await generateClassAttendanceReport(
        mockSupabaseClient as any,
        'turma-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        }
      )

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.turmaId).toBe('turma-001')
      expect(result.data?.turmaNome).toBe('5A')
      expect(result.data?.students).toHaveLength(3)
      expect(result.data?.totalAlunos).toBe(3)
    })

    it('should calculate class average attendance correctly', async () => {
      const mockClassData = {
        id: 'turma-001',
        nome: '5A',
        serie: '5o Ano',
        matriculas: [
          {
            id: 'matricula-001',
            aluno_id: 'aluno-001',
            alunos: { id: 'aluno-001', nome_completo: 'Joao Silva' },
          },
          {
            id: 'matricula-002',
            aluno_id: 'aluno-002',
            alunos: { id: 'aluno-002', nome_completo: 'Maria Santos' },
          },
        ],
      }

      const mockAttendanceData = [
        // Joao - 80%
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-05' },
        // Maria - 100%
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-05' },
      ]

      const mockTurmaChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockClassData, error: null }),
      }

      const mockFrequenciaChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'turmas') return mockTurmaChain
        if (table === 'frequencia') return mockFrequenciaChain
        return createMockChain({ data: null, error: null })
      })

      const result = await generateClassAttendanceReport(
        mockSupabaseClient as any,
        'turma-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
        }
      )

      expect(result.data).toBeDefined()
      // Average: (80 + 100) / 2 = 90%
      expect(result.data?.mediaFrequencia).toBe(90)
    })
  })

  // =========================================================================
  // Test 3: Filter by Period
  // =========================================================================
  describe('Test 3: Filtro por Periodo', () => {
    it('should filter attendance by date range correctly', async () => {
      const mockAttendanceData = [
        { status_presenca: 'P', data_aula: '2025-02-01' },
        { status_presenca: 'P', data_aula: '2025-02-15' },
        { status_presenca: 'F', data_aula: '2025-02-28' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const filters: AttendanceReportFilters = {
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      }

      const result = await generateStudentAttendanceReport(
        mockSupabaseClient as any,
        'matricula-001',
        filters
      )

      expect(result.data).toBeDefined()
      expect(result.data?.periodo?.inicio).toBe('2025-02-01')
      expect(result.data?.periodo?.fim).toBe('2025-02-28')
      expect(result.data?.totalAulas).toBe(3)
    })

    it('should handle monthly period filter', async () => {
      const mockAttendanceData = [
        { status_presenca: 'P', data_aula: '2025-03-01' },
        { status_presenca: 'P', data_aula: '2025-03-10' },
        { status_presenca: 'P', data_aula: '2025-03-20' },
        { status_presenca: 'F', data_aula: '2025-03-31' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const filters: AttendanceReportFilters = {
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      }

      const result = await generateStudentAttendanceReport(
        mockSupabaseClient as any,
        'matricula-001',
        filters
      )

      expect(result.data).toBeDefined()
      expect(result.data?.totalAulas).toBe(4)
      expect(result.data?.presencas).toBe(3)
      expect(result.data?.faltas).toBe(1)
    })
  })

  // =========================================================================
  // Test 4: Students at Risk
  // =========================================================================
  describe('Test 4: Students at Risk', () => {
    it('should identify students with attendance below 80%', async () => {
      const mockClassData = {
        id: 'turma-001',
        nome: '5A',
        serie: '5o Ano',
        matriculas: [
          {
            id: 'matricula-001',
            aluno_id: 'aluno-001',
            alunos: { id: 'aluno-001', nome_completo: 'Joao Silva', nis: '12345678901' },
          },
          {
            id: 'matricula-002',
            aluno_id: 'aluno-002',
            alunos: { id: 'aluno-002', nome_completo: 'Maria Santos', nis: null },
          },
          {
            id: 'matricula-003',
            aluno_id: 'aluno-003',
            alunos: { id: 'aluno-003', nome_completo: 'Pedro Oliveira', nis: '98765432101' },
          },
        ],
      }

      const mockAttendanceData = [
        // Joao - 60% (at risk)
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-05' },
        // Maria - 100% (safe)
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-05' },
        // Pedro - 70% (at risk)
        { matricula_id: 'matricula-003', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-003', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-003', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-003', status_presenca: 'A', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-003', status_presenca: 'F', data_aula: '2025-02-05' },
      ]

      const mockTurmaChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockClassData, error: null }),
      }

      const mockFrequenciaChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'turmas') return mockTurmaChain
        if (table === 'frequencia') return mockFrequenciaChain
        return createMockChain({ data: null, error: null })
      })

      const result = await getStudentsAtRisk(
        mockSupabaseClient as any,
        'turma-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          riskThreshold: 80,
        }
      )

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      // Joao (60%) and Pedro (80%) should be at risk
      expect(result.data?.studentsAtRisk.length).toBeGreaterThanOrEqual(1)
      // Maria (100%) should NOT be at risk
      const mariaAtRisk = result.data?.studentsAtRisk.find((s: StudentAtRiskReport) => s.nome === 'Maria Santos')
      expect(mariaAtRisk).toBeUndefined()
    })

    it('should sort at-risk students by attendance percentage ascending', async () => {
      const mockClassData = {
        id: 'turma-001',
        nome: '5A',
        serie: '5o Ano',
        matriculas: [
          {
            id: 'matricula-001',
            aluno_id: 'aluno-001',
            alunos: { id: 'aluno-001', nome_completo: 'Aluno A', nis: null },
          },
          {
            id: 'matricula-002',
            aluno_id: 'aluno-002',
            alunos: { id: 'aluno-002', nome_completo: 'Aluno B', nis: null },
          },
        ],
      }

      const mockAttendanceData = [
        // Aluno A - 70%
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-05' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-06' },
        { matricula_id: 'matricula-001', status_presenca: 'P', data_aula: '2025-02-07' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-08' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-09' },
        { matricula_id: 'matricula-001', status_presenca: 'F', data_aula: '2025-02-10' },
        // Aluno B - 50%
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-01' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-02' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-03' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-04' },
        { matricula_id: 'matricula-002', status_presenca: 'P', data_aula: '2025-02-05' },
        { matricula_id: 'matricula-002', status_presenca: 'F', data_aula: '2025-02-06' },
        { matricula_id: 'matricula-002', status_presenca: 'F', data_aula: '2025-02-07' },
        { matricula_id: 'matricula-002', status_presenca: 'F', data_aula: '2025-02-08' },
        { matricula_id: 'matricula-002', status_presenca: 'F', data_aula: '2025-02-09' },
        { matricula_id: 'matricula-002', status_presenca: 'F', data_aula: '2025-02-10' },
      ]

      const mockTurmaChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockClassData, error: null }),
      }

      const mockFrequenciaChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null }),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'turmas') return mockTurmaChain
        if (table === 'frequencia') return mockFrequenciaChain
        return createMockChain({ data: null, error: null })
      })

      const result = await getStudentsAtRisk(
        mockSupabaseClient as any,
        'turma-001',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          riskThreshold: 80,
        }
      )

      expect(result.data).toBeDefined()
      expect(result.data?.studentsAtRisk.length).toBe(2)
      // Aluno B (50%) should be first (lowest percentage)
      expect(result.data?.studentsAtRisk[0].nome).toBe('Aluno B')
      expect(result.data?.studentsAtRisk[0].percentual).toBe(50)
    })
  })

  // =========================================================================
  // Test 5: Attendance Percentage Calculation Helper
  // =========================================================================
  describe('Test 5: Attendance Percentage Calculation', () => {
    it('should calculate percentage considering attestados as present', () => {
      // 3 present + 2 attestado + 5 absent = 10 total
      // (3 + 2) / 10 = 50%
      const result = calculateAttendancePercentage(3, 5, 2)
      expect(result).toBe(50)
    })

    it('should return 0 when no classes', () => {
      const result = calculateAttendancePercentage(0, 0, 0)
      expect(result).toBe(0)
    })

    it('should return 100 when all present or attestado', () => {
      const result = calculateAttendancePercentage(5, 0, 3)
      expect(result).toBe(100)
    })

    it('should round to nearest integer', () => {
      // 1 present + 2 absent = 3 total
      // 1 / 3 = 33.33...%
      const result = calculateAttendancePercentage(1, 2, 0)
      expect(result).toBe(33)
    })
  })
})
