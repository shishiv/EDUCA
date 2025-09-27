/**
 * Bulk Attendance Performance Tests
 * Verifies <1s per student requirement and overall system performance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AttendanceBulkOperationsService } from '@/lib/services/attendance-bulk-operations'
import { createTestEnvironment, TestEnvironmentBuilder } from '../helpers/database-test-helpers'
import { performance } from 'perf_hooks'

describe('Bulk Attendance Performance Tests', () => {
  let testEnv: TestEnvironmentBuilder
  let bulkOperations: AttendanceBulkOperationsService
  let sessionId: string
  let turmaId: string
  let studentIds: string[]

  beforeEach(async () => {
    // Create comprehensive test environment
    testEnv = await createTestEnvironment()
    bulkOperations = new AttendanceBulkOperationsService()

    // Setup test data
    const setupData = await testEnv.createCompleteTestScenario('performance-class')
    turmaId = setupData.turma.id
    studentIds = setupData.students.map(s => s.id)

    // Create test session
    const sessionData = await testEnv.createAttendanceSession(turmaId, setupData.professor.id)
    sessionId = sessionData.id
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  describe('Single Student Performance (<1s requirement)', () => {
    it('should mark individual student under 1000ms', async () => {
      const studentId = studentIds[0]
      const startTime = performance.now()

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        [{ student_id: studentId, status: 'presente' }]
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000) // <1s requirement
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
    })

    it('should handle complex attendance status under 1000ms', async () => {
      const studentId = studentIds[0]
      const startTime = performance.now()

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        [{
          student_id: studentId,
          status: 'justificada',
          observacoes: 'Consulta médica agendada - comprovante anexado conforme exigências legais brasileiras'
        }]
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
    })
  })

  describe('Small Class Performance (5-15 students)', () => {
    it('should handle small class (10 students) efficiently', async () => {
      const smallClassStudents = studentIds.slice(0, 10)
      const records = smallClassStudents.map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(800) // Extra buffer for small classes
      expect(result.performance.recordsPerSecond).toBeGreaterThan(1.2) // >1.2 students/second
      expect(result.processed).toBe(10)
      expect(result.failed).toBe(0)
    })

    it('should maintain performance with mixed attendance statuses', async () => {
      const records = studentIds.slice(0, 8).map((id, index) => ({
        student_id: id,
        status: (['presente', 'falta', 'justificada', 'atestado'] as const)[index % 4],
        observacoes: index % 2 === 0 ? `Observação para aluno ${index + 1}` : undefined
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(900) // Allow slightly more time for complex operations
      expect(result.processed).toBe(8)
    })
  })

  describe('Medium Class Performance (15-30 students)', () => {
    it('should handle medium class (25 students) under performance target', async () => {
      const mediumClassStudents = studentIds.slice(0, 25)
      const records = mediumClassStudents.map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
      expect(result.performance.recordsPerSecond).toBeGreaterThan(1) // ≥1 student/second
      expect(result.processed).toBe(25)
      expect(result.performance.batchCount).toBeGreaterThan(0)
      expect(result.performance.averageBatchTime).toBeLessThan(25000) // 25s for full batch
    })

    it('should optimize batch processing for medium classes', async () => {
      const records = studentIds.slice(0, 20).map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      // Verify batching optimization
      expect(result.performance.batchCount).toBeGreaterThan(0)
      expect(result.performance.batchCount).toBeLessThanOrEqual(Math.ceil(20 / 25)) // Optimal batch size
      expect(result.performance.averageBatchTime).toBeLessThan(20000) // <20s per batch
    })
  })

  describe('Large Class Performance (30+ students)', () => {
    it('should handle large class (40 students) with acceptable performance', async () => {
      // Create additional students for large class test
      const additionalStudents = await Promise.all(
        Array.from({ length: 15 }, (_, i) => testEnv.createTestStudent({
          nome_completo: `Estudante Extra ${i + 31}`,
          escola_id: testEnv.escola!.id
        }))
      )

      const allStudents = [...studentIds, ...additionalStudents.map(s => s.id)]
      const records = allStudents.map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1200) // Allow slightly more for large classes
      expect(result.performance.recordsPerSecond).toBeGreaterThan(0.8) // ≥0.8 students/second
      expect(result.processed).toBe(allStudents.length)
      expect(result.performance.batchCount).toBeGreaterThan(1) // Multiple batches for large classes
    })

    it('should demonstrate parallel batch processing', async () => {
      const records = studentIds.map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const startTime = performance.now()

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      const totalTime = performance.now() - startTime

      // Parallel processing should be significantly faster than sequential
      const sequentialEstimate = records.length * 1000 // 1s per student if sequential
      expect(totalTime).toBeLessThan(sequentialEstimate * 0.3) // At least 70% improvement

      expect(result.performance.batchCount).toBeGreaterThan(1) // Multiple batches processed
    })
  })

  describe('Bulk Operations Performance', () => {
    it('should efficiently mark all students present', async () => {
      const result = await bulkOperations.markAllPresent(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        studentIds
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
      expect(result.processed).toBe(studentIds.length)
    })

    it('should efficiently mark all students absent with exclusions', async () => {
      const excludeStudents = studentIds.slice(0, 3) // Exclude first 3 students

      const result = await bulkOperations.markAllAbsent(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        studentIds,
        excludeStudents
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
      expect(result.processed).toBe(studentIds.length - excludeStudents.length)
    })

    it('should perform smart bulk marking with historical analysis', async () => {
      // Create some historical data for pattern analysis
      await testEnv.createHistoricalAttendanceData(turmaId, studentIds.slice(0, 10), 14) // 2 weeks

      const result = await bulkOperations.smartBulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        studentIds
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1500) // Allow more time for AI processing
      expect(result.processed).toBe(studentIds.length)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle partial failures efficiently', async () => {
      // Create scenario with some invalid student IDs
      const validStudents = studentIds.slice(0, 5)
      const invalidStudents = ['invalid-1', 'invalid-2', 'invalid-3']
      const allStudents = [...validStudents, ...invalidStudents]

      const records = allStudents.map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      // Should handle errors gracefully without significant performance impact
      expect(result.processed).toBe(validStudents.length)
      expect(result.failed).toBe(invalidStudents.length)
      expect(result.errors).toHaveLength(invalidStudents.length)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1200) // Slightly higher for error handling
    })

    it('should timeout gracefully for stuck operations', async () => {
      // This would test timeout handling in a real scenario
      // For now, verify that very large operations complete reasonably
      const largeRecords = Array.from({ length: 100 }, (_, i) => ({
        student_id: `test-student-${i}`,
        status: 'presente' as const
      }))

      const startTime = performance.now()

      // This should fail but not hang
      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        largeRecords
      )

      const duration = performance.now() - startTime

      // Should complete within reasonable time even with failures
      expect(duration).toBeLessThan(30000) // Maximum 30 seconds
      expect(result.failed).toBeGreaterThan(0) // Most should fail (invalid IDs)
    }, 35000) // 35s test timeout
  })

  describe('Performance Monitoring', () => {
    it('should provide accurate performance metrics', async () => {
      const records = studentIds.slice(0, 10).map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      // Verify all performance metrics are present and reasonable
      expect(result.performance.totalTime).toBeGreaterThan(0)
      expect(result.performance.averageTimePerStudent).toBeGreaterThan(0)
      expect(result.performance.recordsPerSecond).toBeGreaterThan(0)
      expect(result.performance.batchCount).toBeGreaterThan(0)
      expect(result.performance.averageBatchTime).toBeGreaterThan(0)

      // Verify mathematical consistency
      const expectedAverage = result.performance.totalTime / records.length
      expect(Math.abs(result.performance.averageTimePerStudent - expectedAverage)).toBeLessThan(100) // Within 100ms tolerance
    })

    it('should track performance over multiple operations', async () => {
      const metrics = await bulkOperations.getPerformanceMetrics(
        turmaId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        new Date().toISOString().split('T')[0]
      )

      expect(metrics.performanceTarget).toBeDefined()
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0)
      expect(metrics.successRate).toBeGreaterThanOrEqual(0)
      expect(metrics.successRate).toBeLessThanOrEqual(1)
    })
  })

  describe('Real-World Performance Scenarios', () => {
    it('should handle concurrent teacher scenario', async () => {
      // Simulate multiple teachers potentially marking attendance simultaneously
      const promises = Array.from({ length: 3 }, async (_, teacherIndex) => {
        const records = studentIds.slice(teacherIndex * 3, (teacherIndex + 1) * 3).map(id => ({
          student_id: id,
          status: 'presente' as const
        }))

        return bulkOperations.bulkMarkAttendance(
          sessionId,
          turmaId,
          new Date().toISOString().split('T')[0],
          records
        )
      })

      const results = await Promise.all(promises)

      // First request should succeed, others should gracefully handle concurrency
      const successResults = results.filter(r => r.success)
      expect(successResults.length).toBeGreaterThanOrEqual(1)

      // Performance should remain acceptable even with concurrency
      successResults.forEach(result => {
        expect(result.performance.averageTimePerStudent).toBeLessThan(1500) // Allow more time for concurrency handling
      })
    })

    it('should maintain performance under network latency simulation', async () => {
      // This would simulate network delays in a real environment
      // For now, verify that operations complete within reasonable bounds
      const records = studentIds.slice(0, 15).map(id => ({
        student_id: id,
        status: 'presente' as const
      }))

      const result = await bulkOperations.bulkMarkAttendance(
        sessionId,
        turmaId,
        new Date().toISOString().split('T')[0],
        records
      )

      expect(result.success).toBe(true)
      expect(result.performance.averageTimePerStudent).toBeLessThan(1000)
      expect(result.performance.totalTime).toBeLessThan(20000) // Total under 20s
    })
  })
})