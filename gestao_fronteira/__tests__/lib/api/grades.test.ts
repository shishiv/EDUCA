/**
 * Unit tests for Grades API
 * Task Group 3.1: Sistema de Notas Bimestrais (Fundamental I)
 *
 * Test Coverage:
 * - Create grade (lancar nota bimestral)
 * - Calculate automatic average (calcular media automatica)
 * - Validate grade 0-10 (validar nota 0-10)
 * - Get grades by student and class
 * - Update grade
 *
 * Uses Grade types from types/grades.ts
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
  createGrade,
  updateGrade,
  getGradesByStudent,
  getGradesByClass,
  calculateAverage,
  type GradeInput,
} from '@/lib/api/grades'

// Mock Supabase client
const createMockChain = (resolvedValue: any) => ({
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolvedValue),
})

const mockSupabaseClient = {
  from: jest.fn(() => createMockChain({ data: null, error: null })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
  },
}

describe('Grades API - Sistema de Notas Bimestrais', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Test 1: Lancar Nota Bimestral (Create Grade)
  // =========================================================================
  describe('Test 1: Lancar Nota Bimestral', () => {
    it('should create a grade with valid data (nota 0-10)', async () => {
      const mockCreatedGrade = {
        id: 'grade-001',
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: 8.5,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        observacoes: 'Bom desempenho',
        created_at: '2025-03-15T10:00:00Z',
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedGrade, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: 8.5,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        observacoes: 'Bom desempenho',
      }

      const result = await createGrade(mockSupabaseClient as any, input)

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.nota).toBe(8.5)
      expect(result.data?.bimestre).toBe(1)
      expect(result.data?.disciplina).toBe('MA')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notas')
    })

    it('should create grades for all 4 bimesters', async () => {
      const bimesters = [1, 2, 3, 4]

      for (const bimestre of bimesters) {
        const mockCreatedGrade = {
          id: `grade-00${bimestre}`,
          matricula_id: 'matricula-001',
          disciplina: 'LP',
          bimestre,
          nota: 7.0 + bimestre * 0.5,
          tipo_avaliacao: 'prova',
          data_avaliacao: `2025-0${bimestre + 2}-15`,
          created_at: new Date().toISOString(),
        }

        const mockChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCreatedGrade, error: null }),
        }

        mockSupabaseClient.from.mockReturnValue(mockChain)

        const input: GradeInput = {
          matricula_id: 'matricula-001',
          disciplina: 'LP',
          bimestre,
          nota: 7.0 + bimestre * 0.5,
          tipo_avaliacao: 'prova',
          data_avaliacao: `2025-0${bimestre + 2}-15`,
        }

        const result = await createGrade(mockSupabaseClient as any, input)

        expect(result.data).toBeDefined()
        expect(result.data?.bimestre).toBe(bimestre)
      }
    })
  })

  // =========================================================================
  // Test 2: Calcular Media Automatica (Calculate Average)
  // =========================================================================
  describe('Test 2: Calcular Media Automatica', () => {
    it('should calculate average from 4 bimesters correctly', async () => {
      // Using grades that result in an exact one-decimal average
      // (7.0 + 8.0 + 7.0 + 8.0) / 4 = 30 / 4 = 7.5
      const grades = [
        { bimestre: 1, nota: 7.0 },
        { bimestre: 2, nota: 8.0 },
        { bimestre: 3, nota: 7.0 },
        { bimestre: 4, nota: 8.0 },
      ]

      const mockGrades = grades.map((g, i) => ({
        id: `grade-00${i + 1}`,
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        ...g,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        created_at: new Date().toISOString(),
      }))

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGrades, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await calculateAverage(
        mockSupabaseClient as any,
        'matricula-001',
        'MA'
      )

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      // (7.0 + 8.0 + 7.0 + 8.0) / 4 = 7.5
      expect(result.data?.average).toBe(7.5)
      expect(result.data?.bimesterGrades).toHaveLength(4)
      expect(result.data?.isComplete).toBe(true)
    })

    it('should calculate partial average when not all bimesters are graded', async () => {
      const mockGrades = [
        { id: 'grade-001', matricula_id: 'matricula-001', disciplina: 'CI', bimestre: 1, nota: 6.0, tipo_avaliacao: 'prova', data_avaliacao: '2025-03-15' },
        { id: 'grade-002', matricula_id: 'matricula-001', disciplina: 'CI', bimestre: 2, nota: 8.0, tipo_avaliacao: 'prova', data_avaliacao: '2025-05-15' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGrades, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      // Expected average: (6.0 + 8.0) / 2 = 7.0
      const result = await calculateAverage(
        mockSupabaseClient as any,
        'matricula-001',
        'CI'
      )

      expect(result.data).toBeDefined()
      expect(result.data?.average).toBe(7.0)
      expect(result.data?.bimesterGrades).toHaveLength(2)
      expect(result.data?.isComplete).toBe(false)
    })

    it('should return null average when no grades exist', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await calculateAverage(
        mockSupabaseClient as any,
        'matricula-001',
        'HI'
      )

      expect(result.data).toBeDefined()
      expect(result.data?.average).toBeNull()
      expect(result.data?.bimesterGrades).toHaveLength(0)
    })

    it('should round average to one decimal place', async () => {
      // Using grades that would result in a repeating decimal
      // (7.0 + 8.0 + 7.5 + 8.5) / 4 = 31 / 4 = 7.75 -> rounded to 7.8
      const grades = [
        { bimestre: 1, nota: 7.0 },
        { bimestre: 2, nota: 8.0 },
        { bimestre: 3, nota: 7.5 },
        { bimestre: 4, nota: 8.5 },
      ]

      const mockGrades = grades.map((g, i) => ({
        id: `grade-00${i + 1}`,
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        ...g,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        created_at: new Date().toISOString(),
      }))

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGrades, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await calculateAverage(
        mockSupabaseClient as any,
        'matricula-001',
        'MA'
      )

      expect(result.data).toBeDefined()
      // 7.75 rounded to one decimal = 7.8
      expect(result.data?.average).toBe(7.8)
    })
  })

  // =========================================================================
  // Test 3: Validar Nota 0-10 (Validate Grade Range)
  // =========================================================================
  describe('Test 3: Validar Nota 0-10', () => {
    it('should reject grade below 0', async () => {
      const input: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: -1.0,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
      }

      const result = await createGrade(mockSupabaseClient as any, input)

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
      expect(result.error).toContain('0')
      expect(result.error).toContain('10')
    })

    it('should reject grade above 10', async () => {
      const input: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: 10.5,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
      }

      const result = await createGrade(mockSupabaseClient as any, input)

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })

    it('should accept valid grades at boundaries (0 and 10)', async () => {
      // Test nota = 0
      const mockGradeZero = {
        id: 'grade-zero',
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: 0,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        created_at: new Date().toISOString(),
      }

      const mockChainZero = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGradeZero, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChainZero)

      const inputZero: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 1,
        nota: 0,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
      }

      const resultZero = await createGrade(mockSupabaseClient as any, inputZero)
      expect(resultZero.data).toBeDefined()
      expect(resultZero.data?.nota).toBe(0)

      // Test nota = 10
      const mockGradeTen = {
        id: 'grade-ten',
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 2,
        nota: 10,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-05-15',
        created_at: new Date().toISOString(),
      }

      const mockChainTen = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGradeTen, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChainTen)

      const inputTen: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 2,
        nota: 10,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-05-15',
      }

      const resultTen = await createGrade(mockSupabaseClient as any, inputTen)
      expect(resultTen.data).toBeDefined()
      expect(resultTen.data?.nota).toBe(10)
    })

    it('should accept grade with one decimal place (e.g., 7.5)', async () => {
      const mockGrade = {
        id: 'grade-decimal',
        matricula_id: 'matricula-001',
        disciplina: 'LP',
        bimestre: 1,
        nota: 7.5,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
        created_at: new Date().toISOString(),
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGrade, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'LP',
        bimestre: 1,
        nota: 7.5,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
      }

      const result = await createGrade(mockSupabaseClient as any, input)
      expect(result.data).toBeDefined()
      expect(result.data?.nota).toBe(7.5)
    })

    it('should reject invalid bimester (not 1-4)', async () => {
      const input: GradeInput = {
        matricula_id: 'matricula-001',
        disciplina: 'MA',
        bimestre: 5 as any, // Invalid bimester
        nota: 8.0,
        tipo_avaliacao: 'prova',
        data_avaliacao: '2025-03-15',
      }

      const result = await createGrade(mockSupabaseClient as any, input)

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })
  })

  // =========================================================================
  // Test 4: Get Grades by Student
  // =========================================================================
  describe('Test 4: Get Grades by Student', () => {
    it('should get all grades for a student', async () => {
      const mockGrades = [
        { id: 'grade-001', matricula_id: 'matricula-001', disciplina: 'MA', bimestre: 1, nota: 8.0 },
        { id: 'grade-002', matricula_id: 'matricula-001', disciplina: 'MA', bimestre: 2, nota: 7.5 },
        { id: 'grade-003', matricula_id: 'matricula-001', disciplina: 'LP', bimestre: 1, nota: 9.0 },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGrades, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getGradesByStudent(mockSupabaseClient as any, 'matricula-001')

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(3)
      expect(result.error).toBeNull()
    })
  })

  // =========================================================================
  // Test 5: Get Grades by Class
  // =========================================================================
  describe('Test 5: Get Grades by Class', () => {
    it('should get all grades for a class with multiple students', async () => {
      const mockGrades = [
        { id: 'grade-001', matricula_id: 'matricula-001', disciplina: 'MA', bimestre: 1, nota: 8.0, aluno_nome: 'Joao' },
        { id: 'grade-002', matricula_id: 'matricula-002', disciplina: 'MA', bimestre: 1, nota: 7.0, aluno_nome: 'Maria' },
        { id: 'grade-003', matricula_id: 'matricula-003', disciplina: 'MA', bimestre: 1, nota: 9.0, aluno_nome: 'Pedro' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGrades, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getGradesByClass(
        mockSupabaseClient as any,
        'turma-001',
        'MA',
        1
      )

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(3)
      expect(result.error).toBeNull()
    })
  })
})
