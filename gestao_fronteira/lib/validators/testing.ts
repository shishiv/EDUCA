/**
 * Testing utilities for Brazilian educational validation
 * Provides test data generators and validation helpers for TDD approach
 */

import { z } from 'zod'
import type {
  StudentFormData,
  AttendanceStatus,
  ComponentType,
  PerformanceThreshold
} from './index'

/**
 * Test data generators for Brazilian educational context
 */

/**
 * Generates valid Brazilian CPF for testing
 * @param pattern Optional pattern for specific testing scenarios
 * @returns Valid CPF string
 */
export function generateTestCPF(pattern?: 'valid' | 'invalid' | 'formatted'): string {
  if (pattern === 'invalid') {
    return '11111111111' // Known invalid CPF
  }

  if (pattern === 'formatted') {
    return '123.456.789-01'
  }

  // Generate a valid CPF for testing
  const cpfDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  // Calculate first digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += cpfDigits[i] * (10 - i)
  }
  let remainder = 11 - (sum % 11)
  cpfDigits[9] = remainder >= 10 ? 0 : remainder

  // Calculate second digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += cpfDigits[i] * (11 - i)
  }
  remainder = 11 - (sum % 11)
  cpfDigits[10] = remainder >= 10 ? 0 : remainder

  return cpfDigits.join('')
}

/**
 * Generates valid Brazilian phone number for testing
 * @param type Phone type (mobile or landline)
 * @returns Valid phone string
 */
export function generateTestPhone(type: 'mobile' | 'landline' = 'mobile'): string {
  if (type === 'mobile') {
    return '34999887766' // Valid mobile format
  }
  return '3432211234' // Valid landline format
}

/**
 * Generates test student data
 * @param overrides Optional field overrides
 * @returns Complete student test data
 */
export function generateTestStudent(overrides?: Partial<StudentFormData>): StudentFormData {
  const baseData: StudentFormData = {
    nome_completo: 'João Silva Santos',
    data_nascimento: new Date('2010-05-15'),
    cpf: generateTestCPF('valid'),
    rg: '123456789',
    sexo: 'M',
    telefone: generateTestPhone('mobile'),
    email: 'joao.silva@email.com',
    endereco: 'Rua das Flores, 123, Centro, Fronteira-MG',
    nome_mae: 'Maria Silva Santos',
    nome_pai: 'José Silva Santos',
    necessidades_especiais: undefined
  }

  return { ...baseData, ...overrides }
}

/**
 * Generates test attendance scenarios
 * @param count Number of attendance records to generate
 * @param attendanceRate Desired attendance rate (0-100)
 * @returns Array of attendance records
 */
export function generateTestAttendance(
  count: number = 20,
  attendanceRate: number = 85
): Array<{ status: AttendanceStatus; data: Date }> {
  const records: Array<{ status: AttendanceStatus; data: Date }> = []
  const presentCount = Math.floor((count * attendanceRate) / 100)

  // Generate dates for the last `count` school days
  const today = new Date()
  let currentDate = new Date(today)
  let schoolDays = 0

  while (schoolDays < count) {
    currentDate.setDate(currentDate.getDate() - 1)

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue
    }

    const status: AttendanceStatus = schoolDays < presentCount ? 'presente' : 'falta'
    records.unshift({
      status,
      data: new Date(currentDate)
    })

    schoolDays++
  }

  // Add some variety with late arrivals and justified absences
  const lateCount = Math.max(1, Math.floor(count * 0.05))
  const justifiedCount = Math.max(1, Math.floor(count * 0.03))

  for (let i = 0; i < lateCount && i < records.length; i++) {
    if (records[i].status === 'presente') {
      records[i].status = 'atraso'
    }
  }

  for (let i = 0; i < justifiedCount && i < records.length; i++) {
    if (records[i].status === 'falta') {
      records[i].status = 'justificada'
    }
  }

  return records
}

/**
 * Generates performance test scenarios
 * @param componentType Component being tested
 * @param targetLevel Target performance level
 * @returns Performance test data
 */
export function generatePerformanceTest(
  componentType: ComponentType,
  targetLevel: PerformanceThreshold = 'good'
): {
  loadTime: number
  memoryUsage: number
  sessionDuration: number
  apiCalls: Array<{ endpoint: string; responseTime: number }>
} {
  const performanceMultipliers = {
    excellent: 0.5,
    good: 0.8,
    fair: 1.2,
    poor: 2.0
  }

  const baseMetrics = {
    dashboard: { loadTime: 2000, memory: 80, apiTime: 400 },
    attendance: { loadTime: 800, memory: 40, apiTime: 200 },
    'student-form': { loadTime: 1200, memory: 60, apiTime: 300 },
    reports: { loadTime: 3000, memory: 120, apiTime: 800 },
    navigation: { loadTime: 300, memory: 20, apiTime: 100 }
  }

  const base = baseMetrics[componentType]
  const multiplier = performanceMultipliers[targetLevel]

  return {
    loadTime: Math.round(base.loadTime * multiplier),
    memoryUsage: Math.round(base.memory * multiplier),
    sessionDuration: 120, // 2 hours typical session
    apiCalls: [
      {
        endpoint: `/api/${componentType}`,
        responseTime: Math.round(base.apiTime * multiplier)
      }
    ]
  }
}

/**
 * Creates test scenarios for accessibility validation
 * @param compliance Target compliance level
 * @returns Accessibility test scenarios
 */
export function generateAccessibilityTests(
  compliance: 'basic' | 'wcag-aa' | 'brazilian-full' = 'wcag-aa'
): Array<{
  name: string
  foreground: string
  background: string
  expectedValid: boolean
  purpose: string
}> {
  const testScenarios = [
    // Attendance colors
    {
      name: 'Attendance Present',
      foreground: '#22c55e',
      background: '#ffffff',
      expectedValid: true,
      purpose: 'attendance'
    },
    {
      name: 'Attendance Absent',
      foreground: '#ef4444',
      background: '#ffffff',
      expectedValid: true,
      purpose: 'attendance'
    },
    {
      name: 'Low Contrast Text',
      foreground: '#cccccc',
      background: '#ffffff',
      expectedValid: false,
      purpose: 'general'
    },
    // Performance indicators
    {
      name: 'Performance Excellent',
      foreground: '#059669',
      background: '#ffffff',
      expectedValid: true,
      purpose: 'performance'
    },
    {
      name: 'Performance Warning',
      foreground: '#ca8a04',
      background: '#ffffff',
      expectedValid: true,
      purpose: 'performance'
    }
  ]

  if (compliance === 'brazilian-full') {
    // Add more stringent tests for Brazilian compliance
    testScenarios.push(
      {
        name: 'Brazilian High Contrast',
        foreground: '#000000',
        background: '#ffffff',
        expectedValid: true,
        purpose: 'general'
      },
      {
        name: 'Educational Level Indicator',
        foreground: '#0ea5e9',
        background: '#f8fafc',
        expectedValid: true,
        purpose: 'educational'
      }
    )
  }

  return testScenarios
}

/**
 * Mock data for integration testing
 */
export const mockTestData = {
  schools: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      nome: 'EMEI Pequeno Mundo',
      codigo: 'EME001',
      tipo: 'creche' as const,
      endereco: 'Rua das Crianças, 100, Centro, Fronteira-MG',
      telefone: '3432211234'
    }
  ],

  teachers: [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      nome: 'Prof. Ana Maria',
      email: 'ana.maria@fronteira.mg.gov.br',
      tipo_usuario: 'professor' as const
    }
  ],

  classes: [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      nome: 'Maternal A',
      serie: 'Maternal',
      ano_letivo: new Date().getFullYear(),
      turno: 'matutino' as const,
      capacidade: 20
    }
  ],

  students: [
    generateTestStudent({
      nome_completo: 'Ana Clara Oliveira',
      data_nascimento: new Date('2018-03-10'),
      sexo: 'F'
    }),
    generateTestStudent({
      nome_completo: 'Pedro Henrique Silva',
      data_nascimento: new Date('2018-07-22'),
      sexo: 'M'
    })
  ]
}

/**
 * Test assertion helpers for Brazilian educational validation
 */

/**
 * Asserts that a CPF is valid and properly formatted
 * @param cpf CPF to validate
 * @param shouldBeValid Expected validity
 */
export function assertCPFValid(cpf: string, shouldBeValid: boolean = true): void {
  const { validateCPF } = require('./brazilian')
  const isValid = validateCPF(cpf)

  if (isValid !== shouldBeValid) {
    throw new Error(
      `Expected CPF ${cpf} to be ${shouldBeValid ? 'valid' : 'invalid'}, but got ${isValid}`
    )
  }
}

/**
 * Asserts that attendance rate meets Brazilian requirements
 * @param attendanceRate Attendance rate percentage
 * @param shouldMeetRequirement Expected compliance
 */
export function assertAttendanceCompliant(
  attendanceRate: number,
  shouldMeetRequirement: boolean = true
): void {
  const { validateMinimumAttendance } = require('./brazilian')
  const isCompliant = validateMinimumAttendance(attendanceRate)

  if (isCompliant !== shouldMeetRequirement) {
    throw new Error(
      `Expected attendance rate ${attendanceRate}% to ${shouldMeetRequirement ? 'meet' : 'not meet'} Brazilian requirements (75%)`
    )
  }
}

/**
 * Asserts that color contrast meets WCAG requirements
 * @param foreground Foreground color
 * @param background Background color
 * @param shouldMeetWCAG Expected WCAG compliance
 */
export function assertColorContrastCompliant(
  foreground: string,
  background: string,
  shouldMeetWCAG: boolean = true
): void {
  const { validateColorContrast } = require('./accessibility')
  const isCompliant = validateColorContrast(foreground, background, 'AA')

  if (isCompliant !== shouldMeetWCAG) {
    throw new Error(
      `Expected colors ${foreground} on ${background} to ${shouldMeetWCAG ? 'meet' : 'not meet'} WCAG 2.1 AA requirements`
    )
  }
}

/**
 * Asserts that performance meets classroom requirements
 * @param componentType Component type
 * @param loadTime Load time in milliseconds
 * @param shouldBeAcceptable Expected acceptability
 */
export function assertPerformanceAcceptable(
  componentType: ComponentType,
  loadTime: number,
  shouldBeAcceptable: boolean = true
): void {
  const { evaluatePerformance } = require('./performance')
  const result = evaluatePerformance(loadTime, componentType)

  if (result.acceptable !== shouldBeAcceptable) {
    throw new Error(
      `Expected ${componentType} performance (${loadTime}ms) to be ${shouldBeAcceptable ? 'acceptable' : 'unacceptable'} for classroom use`
    )
  }
}

// Zod schemas for test data validation

export const testScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  testData: z.any(),
  expectedResult: z.any(),
  tags: z.array(z.string()).default([])
})

export const performanceTestSchema = z.object({
  componentType: z.enum(['dashboard', 'attendance', 'student-form', 'reports', 'navigation']),
  targetLevel: z.enum(['excellent', 'good', 'fair', 'poor']),
  sessionDuration: z.number().min(0).default(120),
  concurrent: z.boolean().default(false)
})

export type TestScenario = z.infer<typeof testScenarioSchema>
export type PerformanceTest = z.infer<typeof performanceTestSchema>