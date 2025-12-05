/**
 * Unit tests for Lesson Content API
 * Task Group 2.1: API and Types for Lesson Content (BNCC)
 *
 * Test Coverage:
 * - Create lesson content with BNCC fields
 * - List lesson content by class/period
 * - Differentiate Ed. Infantil vs Ensino Fundamental
 * - Update and retrieve lesson content by session
 * - Get lesson content history
 *
 * Uses LessonContent types from types/lesson-content.ts
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
  createLessonContent,
  updateLessonContent,
  getLessonContentBySession,
  getLessonContentHistory,
  type LessonContentInput,
  type LessonContentFilters,
} from '@/lib/api/lesson-content'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
  },
}

describe('Lesson Content API - BNCC Aligned', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // Test 1: Create Lesson Content with BNCC Fields
  // =========================================================================
  describe('Test 1: Create Lesson Content with BNCC Fields', () => {
    it('should create lesson content with all required BNCC fields', async () => {
      const mockCreatedContent = {
        id: 'content-001',
        sessao_id: 'session-001',
        tema: 'Adicao e Subtracao de Numeros Naturais',
        objetivo: 'Compreender operacoes basicas de adicao e subtracao ate 100',
        habilidades_bncc: ['EF01MA06', 'EF01MA08'],
        metodologia: 'Aula expositiva com material dourado',
        recursos: 'Quadro branco, material dourado, livro didatico',
        observacoes: 'Alunos demonstraram boa compreensao',
        created_at: '2025-02-04T10:00:00Z',
        updated_at: '2025-02-04T10:00:00Z',
        created_by: 'user-123',
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: LessonContentInput = {
        sessao_id: 'session-001',
        tema: 'Adicao e Subtracao de Numeros Naturais',
        objetivo: 'Compreender operacoes basicas de adicao e subtracao ate 100',
        habilidades_bncc: ['EF01MA06', 'EF01MA08'],
        metodologia: 'Aula expositiva com material dourado',
        recursos: 'Quadro branco, material dourado, livro didatico',
        observacoes: 'Alunos demonstraram boa compreensao',
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.tema).toBe('Adicao e Subtracao de Numeros Naturais')
      expect(result.data?.habilidades_bncc).toEqual(['EF01MA06', 'EF01MA08'])
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conteudo_aula')
    })

    it('should fail when required fields are missing', async () => {
      const input: LessonContentInput = {
        sessao_id: 'session-001',
        tema: '', // Empty tema should fail
        objetivo: 'Objetivo valido para teste com caracteres suficientes',
        habilidades_bncc: [],
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })

    it('should validate BNCC skill code format (EF pattern)', async () => {
      const mockCreatedContent = {
        id: 'content-002',
        sessao_id: 'session-002',
        tema: 'Matematica Basica para iniciantes',
        objetivo: 'Aprender numeros naturais de 0 a 100 com exercicios praticos',
        habilidades_bncc: ['EF01MA06'], // Valid EF pattern
        created_at: '2025-02-04T10:00:00Z',
        updated_at: '2025-02-04T10:00:00Z',
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: LessonContentInput = {
        sessao_id: 'session-002',
        tema: 'Matematica Basica para iniciantes',
        objetivo: 'Aprender numeros naturais de 0 a 100 com exercicios praticos',
        habilidades_bncc: ['EF01MA06'],
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.data).toBeDefined()
      expect(result.data?.habilidades_bncc).toContain('EF01MA06')
    })
  })

  // =========================================================================
  // Test 2: List Lesson Content by Class/Period
  // =========================================================================
  describe('Test 2: List Lesson Content by Class/Period', () => {
    it('should list lesson content filtered by turma_id', async () => {
      const mockContentList = [
        {
          id: 'content-001',
          sessao_id: 'session-001',
          tema: 'Aula 1',
          objetivo: 'Objetivo 1',
          habilidades_bncc: ['EF01MA06'],
          turma_id: 'turma-001',
          data_aula: '2025-02-01',
        },
        {
          id: 'content-002',
          sessao_id: 'session-002',
          tema: 'Aula 2',
          objetivo: 'Objetivo 2',
          habilidades_bncc: ['EF01MA08'],
          turma_id: 'turma-001',
          data_aula: '2025-02-02',
        },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockContentList, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const filters: LessonContentFilters = {
        turma_id: 'turma-001',
        date_from: '2025-02-01',
        date_to: '2025-02-28',
      }

      const result = await getLessonContentHistory(mockSupabaseClient as any, filters)

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should filter lesson content by date range', async () => {
      const mockContentList = [
        {
          id: 'content-001',
          sessao_id: 'session-001',
          tema: 'Aula de Fevereiro',
          data_aula: '2025-02-15',
        },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockContentList, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const filters: LessonContentFilters = {
        date_from: '2025-02-01',
        date_to: '2025-02-28',
      }

      const result = await getLessonContentHistory(mockSupabaseClient as any, filters)

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1)
      expect(mockChain.gte).toHaveBeenCalled()
      expect(mockChain.lte).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Test 3: Differentiate Ed. Infantil vs Ensino Fundamental
  // =========================================================================
  describe('Test 3: Differentiate Ed. Infantil vs Ensino Fundamental', () => {
    it('should accept Ed. Infantil BNCC codes (EI pattern)', async () => {
      const mockCreatedContent = {
        id: 'content-ei-001',
        sessao_id: 'session-ei-001',
        tema: 'Brincadeiras e Interacoes na turma',
        objetivo: 'Desenvolver habilidades sociais atraves do brincar com colegas',
        habilidades_bncc: ['EI03EO01', 'EI03EO02'], // Ed. Infantil pattern
        created_at: '2025-02-04T10:00:00Z',
        updated_at: '2025-02-04T10:00:00Z',
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: LessonContentInput = {
        sessao_id: 'session-ei-001',
        tema: 'Brincadeiras e Interacoes na turma',
        objetivo: 'Desenvolver habilidades sociais atraves do brincar com colegas',
        habilidades_bncc: ['EI03EO01', 'EI03EO02'],
        education_level: 'infantil',
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.data).toBeDefined()
      expect(result.data?.habilidades_bncc).toEqual(['EI03EO01', 'EI03EO02'])
    })

    it('should accept Ensino Fundamental BNCC codes (EF pattern)', async () => {
      const mockCreatedContent = {
        id: 'content-ef-001',
        sessao_id: 'session-ef-001',
        tema: 'Producao de Texto Narrativo',
        objetivo: 'Desenvolver habilidades de escrita criativa com narrativas curtas',
        habilidades_bncc: ['EF01LP15', 'EF01LP16'], // Ensino Fundamental pattern
        created_at: '2025-02-04T10:00:00Z',
        updated_at: '2025-02-04T10:00:00Z',
      }

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const input: LessonContentInput = {
        sessao_id: 'session-ef-001',
        tema: 'Producao de Texto Narrativo',
        objetivo: 'Desenvolver habilidades de escrita criativa com narrativas curtas',
        habilidades_bncc: ['EF01LP15', 'EF01LP16'],
        education_level: 'fundamental',
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.data).toBeDefined()
      expect(result.data?.habilidades_bncc).toEqual(['EF01LP15', 'EF01LP16'])
    })

    it('should reject invalid BNCC codes', async () => {
      const input: LessonContentInput = {
        sessao_id: 'session-invalid',
        tema: 'Aula Invalida com conteudo',
        objetivo: 'Objetivo da aula para testar codigos invalidos',
        habilidades_bncc: ['INVALID_CODE', 'XY01ZZ99'], // Invalid patterns
      }

      const result = await createLessonContent(mockSupabaseClient as any, input)

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })
  })

  // =========================================================================
  // Test 4: Update and Retrieve Lesson Content by Session
  // =========================================================================
  describe('Test 4: Update and Retrieve Lesson Content by Session', () => {
    it('should retrieve lesson content by session ID', async () => {
      const mockContent = {
        id: 'content-001',
        sessao_id: 'session-001',
        tema: 'Aula de Matematica',
        objetivo: 'Aprender numeros naturais',
        habilidades_bncc: ['EF01MA06'],
        metodologia: 'Aula pratica',
        recursos: 'Material dourado',
        observacoes: 'Boa participacao',
        created_at: '2025-02-04T10:00:00Z',
        updated_at: '2025-02-04T10:00:00Z',
      }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getLessonContentBySession(mockSupabaseClient as any, 'session-001')

      expect(result.data).toBeDefined()
      expect(result.data?.tema).toBe('Aula de Matematica')
      expect(result.error).toBeNull()
      expect(mockChain.eq).toHaveBeenCalledWith('sessao_id', 'session-001')
    })

    it('should update lesson content successfully', async () => {
      const mockUpdatedContent = {
        id: 'content-001',
        sessao_id: 'session-001',
        tema: 'Aula de Matematica - Atualizada',
        objetivo: 'Objetivo atualizado com mais detalhes sobre o conteudo',
        habilidades_bncc: ['EF01MA06', 'EF01MA08'],
        metodologia: 'Metodologia atualizada',
        updated_at: '2025-02-04T11:00:00Z',
      }

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedContent, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const updateData = {
        tema: 'Aula de Matematica - Atualizada',
        objetivo: 'Objetivo atualizado com mais detalhes sobre o conteudo',
        habilidades_bncc: ['EF01MA06', 'EF01MA08'],
        metodologia: 'Metodologia atualizada',
      }

      const result = await updateLessonContent(
        mockSupabaseClient as any,
        'content-001',
        updateData
      )

      expect(result.data).toBeDefined()
      expect(result.data?.tema).toBe('Aula de Matematica - Atualizada')
      expect(result.error).toBeNull()
    })

    it('should return null when session has no content', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' }
        }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getLessonContentBySession(mockSupabaseClient as any, 'nonexistent-session')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  // =========================================================================
  // Test 5: Get Lesson Content History with Pagination
  // =========================================================================
  describe('Test 5: Get Lesson Content History with Pagination', () => {
    it('should return paginated lesson content history', async () => {
      const mockContentList = Array.from({ length: 10 }, (_, i) => ({
        id: `content-${i + 1}`,
        sessao_id: `session-${i + 1}`,
        tema: `Aula ${i + 1}`,
        data_aula: `2025-02-${String(i + 1).padStart(2, '0')}`,
      }))

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockContentList, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      const filters: LessonContentFilters = {
        turma_id: 'turma-001',
        limit: 10,
        offset: 0,
      }

      const result = await getLessonContentHistory(mockSupabaseClient as any, filters)

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(10)
      expect(mockChain.range).toHaveBeenCalledWith(0, 9)
    })

    it('should order lesson content by date descending', async () => {
      const mockContentList = [
        { id: 'content-1', data_aula: '2025-02-28' },
        { id: 'content-2', data_aula: '2025-02-15' },
        { id: 'content-3', data_aula: '2025-02-01' },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockContentList, error: null }),
      }

      mockSupabaseClient.from.mockReturnValue(mockChain)

      await getLessonContentHistory(mockSupabaseClient as any, { turma_id: 'turma-001' })

      expect(mockChain.order).toHaveBeenCalled()
    })
  })
})
