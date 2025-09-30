# TypeScript Style Guide

## Configuration Requirements

### Strict Mode (Mandatory)
Always use TypeScript strict mode configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Import/Export Patterns
Use ES modules with consistent import ordering:

```typescript
// ✅ Import order
// 1. React and Next.js
import React from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. Third-party libraries
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 3. Internal utilities and configs
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// 4. Internal components
import { Button } from '@/components/ui/button'
import { StudentForm } from '@/components/students/student-form'

// 5. Types and interfaces (with type-only imports)
import type { Student, Teacher, Turma } from '@/types/educational'
```

## Type Definitions

### Brazilian Educational Domain Types
Define comprehensive types for the educational system:

```typescript
// ✅ Core educational types
export interface Student {
  id: string
  nome: string
  cpf: string
  dataNascimento: Date
  nomeResponsavel: string
  telefoneContato: string
  enderecoCompleto: string
  situacao: StudentStatus
  createdAt: Date
  updatedAt: Date
}

export type StudentStatus =
  | 'ativo'
  | 'transferido'
  | 'desistente'
  | 'concluido'

export interface Teacher {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  especialidade: string[]
  registro: string // Teacher registration number
  situacao: TeacherStatus
}

export type TeacherStatus = 'ativo' | 'inativo' | 'licenca'

export interface Turma {
  id: string
  nome: string
  ano: number
  semestre: number
  professorId: string
  escolaId: string
  capacidadeMaxima: number
  situacao: TurmaStatus
}

export type TurmaStatus = 'ativa' | 'inativa' | 'finalizada'
```

### Attendance System Types
Define strict types for attendance workflow:

```typescript
// ✅ Attendance system types
export interface AttendanceSession {
  id: string
  turmaId: string
  professorId: string
  data: Date
  status: SessionStatus
  horarioAbertura: Date
  horarioFechamento: Date | null
  observacoes?: string
}

export type SessionStatus = 'aberta' | 'fechada' | 'cancelada'

export interface AttendanceRecord {
  id: string
  sessionId: string
  alunoId: string
  presente: boolean
  observacao?: string
  registradoPor: string
  registradoEm: Date
  // Immutability fields
  readonly locked: boolean
  readonly lockReason?: string
}

// ✅ Form data types
export interface AttendanceFormData {
  sessionId: string
  records: Array<{
    alunoId: string
    presente: boolean
    observacao?: string
  }>
}
```

### Brazilian Validation Types
Create types for Brazilian-specific data validation:

```typescript
// ✅ Brazilian validation types
export type CPF = string & { readonly __brand: 'CPF' }
export type BrazilianPhone = string & { readonly __brand: 'BrazilianPhone' }
export type CEP = string & { readonly __brand: 'CEP' }

// Type guards for validation
export const isCPF = (value: string): value is CPF => {
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value) && validateCPFDigits(value)
}

export const isBrazilianPhone = (value: string): value is BrazilianPhone => {
  return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value)
}

// ✅ Address types
export interface BrazilianAddress {
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: Estado
  cep: CEP
}

export type Estado =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES'
  | 'GO' | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR'
  | 'PE' | 'PI' | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC'
  | 'SP' | 'SE' | 'TO'
```

## Function and Component Typing

### React Component Typing
Use React.FC with proper props interfaces:

```typescript
// ✅ Component typing with React.FC
import { FC, ReactNode } from 'react'

interface StudentCardProps {
  student: Student
  onEdit?: (student: Student) => void
  onDelete?: (studentId: string) => void
  className?: string
  children?: ReactNode
}

export const StudentCard: FC<StudentCardProps> = ({
  student,
  onEdit,
  onDelete,
  className,
  children
}) => {
  // Component implementation
}

// ✅ Alternative component typing
interface AttendanceGridProps {
  students: Student[]
  session: AttendanceSession
  onAttendanceChange: (studentId: string, present: boolean) => void
}

export function AttendanceGrid({
  students,
  session,
  onAttendanceChange
}: AttendanceGridProps) {
  // Component implementation
}
```

### Hook Typing
Type custom hooks properly:

```typescript
// ✅ Custom hook typing
interface UseAttendanceReturn {
  session: AttendanceSession | null
  students: Student[]
  markAttendance: (studentId: string, present: boolean) => Promise<void>
  closeSession: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useAttendance(turmaId: string): UseAttendanceReturn {
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hook implementation

  return {
    session,
    students,
    markAttendance,
    closeSession,
    isLoading,
    error
  }
}
```

### Server Action Typing
Type Server Actions with proper error handling:

```typescript
// ✅ Server Action typing
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createStudent(
  formData: FormData
): Promise<ActionResult<Student>> {
  try {
    // Validate form data
    const validatedData = studentSchema.parse({
      nome: formData.get('nome'),
      cpf: formData.get('cpf'),
      // ... other fields
    })

    // Create student
    const student = await insertStudent(validatedData)

    return { success: true, data: student }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

## Generic and Utility Types

### Educational Domain Generics
Create reusable generic types:

```typescript
// ✅ Generic types for educational entities
interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

interface EducationalEntity extends BaseEntity {
  escolaId: string
  situacao: string
}

// Generic list response
interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Generic form state
interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isDirty: boolean
}

// Usage examples
type StudentListResponse = ListResponse<Student>
type TeacherFormState = FormState<Teacher>
```

### Utility Types for Forms
Create utility types for form handling:

```typescript
// ✅ Form utility types
type FormFields<T> = {
  [K in keyof T]: T[K] extends string | number | boolean | Date
    ? T[K]
    : T[K] extends object
    ? FormFields<T[K]>
    : never
}

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Usage examples
type StudentFormFields = FormFields<Student>
type RequiredStudentData = RequiredFields<Student, 'nome' | 'cpf' | 'dataNascimento'>
```

## Error Handling Types

### Educational Domain Errors
Define specific error types for the educational system:

```typescript
// ✅ Educational error types
export class EducationalError extends Error {
  constructor(
    message: string,
    public code: EducationalErrorCode,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'EducationalError'
  }
}

export type EducationalErrorCode =
  | 'STUDENT_NOT_FOUND'
  | 'INVALID_CPF'
  | 'ATTENDANCE_ALREADY_MARKED'
  | 'SESSION_NOT_OPEN'
  | 'UNAUTHORIZED_TEACHER'
  | 'RETROACTIVE_ATTENDANCE_FORBIDDEN'
  | 'INVALID_ACADEMIC_YEAR'

// Error handling utilities
export const isEducationalError = (error: unknown): error is EducationalError => {
  return error instanceof EducationalError
}

export function handleEducationalError(error: unknown): string {
  if (isEducationalError(error)) {
    switch (error.code) {
      case 'RETROACTIVE_ATTENDANCE_FORBIDDEN':
        return 'Não é possível modificar presença após confirmação (não existe o esquecer)'
      case 'INVALID_CPF':
        return 'CPF inválido. Verifique o formato: XXX.XXX.XXX-XX'
      case 'UNAUTHORIZED_TEACHER':
        return 'Apenas professores da turma podem marcar presença'
      default:
        return error.message
    }
  }

  return 'Erro inesperado do sistema'
}
```

## Database and API Types

### Supabase Integration Types
Type Supabase database operations:

```typescript
// ✅ Database types for Supabase
export interface Database {
  public: {
    Tables: {
      alunos: {
        Row: Student
        Insert: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Student, 'id' | 'createdAt'>>
      }
      frequencia: {
        Row: AttendanceRecord
        Insert: Omit<AttendanceRecord, 'id' | 'registradoEm' | 'locked'>
        Update: Pick<AttendanceRecord, 'observacao'> // Very limited updates
      }
      // ... other tables
    }
  }
}

// Type-safe Supabase client
export type SupabaseClient = TypedSupabaseClient<Database>
```

### API Response Types
Define consistent API response types:

```typescript
// ✅ API response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Usage in API routes
export async function GET(): Promise<NextResponse<ApiResponse<Student[]>>> {
  try {
    const students = await getStudents()
    return NextResponse.json({
      success: true,
      data: students
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch students'
    }, { status: 500 })
  }
}
```

## Type Safety Best Practices

### Strict Null Checks
Handle null and undefined explicitly:

```typescript
// ✅ Explicit null handling
function getStudentName(student: Student | null): string {
  if (!student) {
    return 'Aluno não encontrado'
  }

  return student.nome
}

// ✅ Optional chaining with fallbacks
const studentPhone = student?.telefoneContato ?? 'Telefone não informado'
```

### Type Guards and Assertions
Use type guards for runtime type safety:

```typescript
// ✅ Type guards
export function isStudent(value: unknown): value is Student {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'nome' in value &&
    'cpf' in value &&
    typeof (value as any).nome === 'string' &&
    isCPF((value as any).cpf)
  )
}

// ✅ Assertion functions
export function assertIsStudent(value: unknown): asserts value is Student {
  if (!isStudent(value)) {
    throw new EducationalError('Invalid student data', 'INVALID_STUDENT_DATA')
  }
}
```

### Discriminated Unions
Use discriminated unions for form states and API responses:

```typescript
// ✅ Discriminated union for form states
type FormSubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: Student }
  | { status: 'error'; error: string }

function handleFormState(state: FormSubmissionState) {
  switch (state.status) {
    case 'idle':
      return <div>Preencha o formulário</div>
    case 'submitting':
      return <div>Salvando...</div>
    case 'success':
      return <div>Aluno {state.data.nome} criado com sucesso!</div>
    case 'error':
      return <div>Erro: {state.error}</div>
  }
}
```

Remember: Always prioritize type safety, Brazilian educational compliance, and clear error messages in Portuguese for the educational domain.