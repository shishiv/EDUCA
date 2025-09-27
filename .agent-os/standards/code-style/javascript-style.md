# JavaScript & React Style Guide

## Modern JavaScript Standards

### ES2024+ Features Usage
Use modern JavaScript features for clean, readable code:

```javascript
// ✅ Use optional chaining and nullish coalescing
const studentPhone = student?.telefoneContato ?? 'Não informado'
const attendanceCount = session?.attendanceRecords?.length ?? 0

// ✅ Use destructuring with default values
const {
  nome = 'Nome não informado',
  cpf,
  turma: { nome: turmaNome } = { nome: 'Turma não definida' }
} = student

// ✅ Use template literals for string formatting
const studentInfo = `Aluno: ${nome} - CPF: ${cpf} - Turma: ${turmaNome}`

// ✅ Use async/await over promises
const fetchStudentData = async (studentId) => {
  try {
    const response = await fetch(`/api/students/${studentId}`)
    const student = await response.json()
    return student
  } catch (error) {
    console.error('Erro ao buscar dados do aluno:', error)
    throw new EducationalError('Falha ao carregar dados do aluno', 'STUDENT_FETCH_ERROR')
  }
}
```

### Array and Object Methods
Use modern array methods for educational data processing:

```javascript
// ✅ Process attendance data
const calculateAttendanceRate = (attendanceRecords) => {
  const totalClasses = attendanceRecords.length
  const presentCount = attendanceRecords.filter(record => record.presente).length

  return totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0
}

// ✅ Group students by attendance status
const groupStudentsByAttendance = (students, attendanceRecords) => {
  return students.reduce((groups, student) => {
    const studentRecords = attendanceRecords.filter(
      record => record.aluno_id === student.id
    )
    const rate = calculateAttendanceRate(studentRecords)

    const status = rate >= 80 ? 'adequate' : rate >= 75 ? 'warning' : 'critical'

    if (!groups[status]) groups[status] = []
    groups[status].push({ ...student, attendanceRate: rate })

    return groups
  }, {})
}

// ✅ Find students at risk (below 80% attendance)
const getStudentsAtRisk = (students, attendanceRecords) => {
  return students
    .map(student => ({
      ...student,
      attendanceRate: calculateAttendanceRate(
        attendanceRecords.filter(record => record.aluno_id === student.id)
      )
    }))
    .filter(student => student.attendanceRate < 80)
    .sort((a, b) => a.attendanceRate - b.attendanceRate)
}
```

## React 19 Patterns

### Component Definition Patterns
Use React 19 features and modern component patterns:

```jsx
// ✅ React 19 component with TypeScript
import { useState, useTransition, useOptimistic } from 'react'

export function StudentAttendanceMarker({ student, onAttendanceChange }) {
  const [isPresent, setIsPresent] = useState(false)
  const [isPending, startTransition] = useTransition()

  // React 19: useOptimistic for immediate UI updates
  const [optimisticAttendance, setOptimisticAttendance] = useOptimistic(
    isPresent,
    (currentState, newState) => newState
  )

  const handleToggleAttendance = () => {
    const newPresence = !isPresent

    // Optimistic update for immediate feedback
    setOptimisticAttendance(newPresence)

    // Actual update with transition
    startTransition(async () => {
      try {
        await onAttendanceChange(student.id, newPresence)
        setIsPresent(newPresence)
      } catch (error) {
        // Revert optimistic update on error
        setOptimisticAttendance(isPresent)
        throw error
      }
    })
  }

  return (
    <button
      onClick={handleToggleAttendance}
      disabled={isPending}
      className={`
        attendance-button touch-manipulation min-h-[44px] px-4 py-2 rounded-lg
        ${optimisticAttendance ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}
        ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        transition-all duration-200
      `}
    >
      {isPending ? 'Salvando...' : optimisticAttendance ? 'Presente' : 'Ausente'}
    </button>
  )
}
```

### Modern Hook Patterns
Use React 19 hooks for educational workflows:

```jsx
// ✅ Custom hook for attendance session management
import { useState, useCallback, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useAttendanceSession(turmaId) {
  const [session, setSession] = useState(null)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Query current session
  const { data: currentSession, isLoading } = useQuery({
    queryKey: ['attendance-session', turmaId],
    queryFn: () => fetchCurrentSession(turmaId),
    enabled: !!turmaId,
  })

  // Mutation to open new session
  const openSessionMutation = useMutation({
    mutationFn: (sessionData) => openAttendanceSession(sessionData),
    onSuccess: (newSession) => {
      setSession(newSession)
      queryClient.invalidateQueries(['attendance-session', turmaId])
    },
    onError: (error) => {
      console.error('Erro ao abrir sessão:', error)
    }
  })

  // Open new attendance session
  const openSession = useCallback((professorId) => {
    if (currentSession?.status === 'aberta') {
      throw new EducationalError(
        'Já existe uma sessão aberta para esta turma hoje',
        'SESSION_ALREADY_OPEN'
      )
    }

    startTransition(() => {
      openSessionMutation.mutate({
        turma_id: turmaId,
        professor_id: professorId,
        data: new Date().toISOString().split('T')[0],
        status: 'aberta'
      })
    })
  }, [turmaId, currentSession, openSessionMutation])

  // Close session with immutability enforcement
  const closeSession = useCallback(async () => {
    if (!session) {
      throw new EducationalError('Nenhuma sessão ativa encontrada', 'NO_ACTIVE_SESSION')
    }

    startTransition(async () => {
      try {
        await closeAttendanceSession(session.id)
        setSession(null)
        queryClient.invalidateQueries(['attendance-session', turmaId])
      } catch (error) {
        console.error('Erro ao fechar sessão:', error)
        throw error
      }
    })
  }, [session, turmaId, queryClient])

  return {
    session: session || currentSession,
    isLoading,
    isPending,
    openSession,
    closeSession,
    canOpenSession: !currentSession || currentSession.status !== 'aberta'
  }
}
```

### Form Handling with React Hook Form
Integrate React Hook Form with Brazilian validation:

```jsx
// ✅ Student registration form with Brazilian validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function StudentRegistrationForm({ onSubmit }) {
  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      dataNascimento: '',
      telefoneContato: '',
      nomeResponsavel: '',
      enderecoCompleto: ''
    }
  })

  const { handleSubmit, formState: { errors, isSubmitting } } = form

  // React 19: useFormStatus for better form state
  const onFormSubmit = async (data) => {
    try {
      // Format Brazilian data
      const formattedData = {
        ...data,
        cpf: formatCPF(data.cpf),
        telefoneContato: formatBrazilianPhone(data.telefoneContato),
        dataNascimento: new Date(data.dataNascimento)
      }

      await onSubmit(formattedData)
    } catch (error) {
      // Handle Brazilian educational domain errors
      if (error.code === 'DUPLICATE_CPF') {
        form.setError('cpf', {
          type: 'manual',
          message: 'Este CPF já está cadastrado no sistema'
        })
      } else {
        form.setError('root', {
          type: 'manual',
          message: 'Erro ao cadastrar aluno. Tente novamente.'
        })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium mb-2">
            Nome Completo *
          </label>
          <input
            {...form.register('nome')}
            id="nome"
            type="text"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o nome completo do aluno"
          />
          {errors.nome && (
            <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cpf" className="block text-sm font-medium mb-2">
            CPF *
          </label>
          <input
            {...form.register('cpf')}
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {errors.cpf && (
            <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Cadastrando...' : 'Cadastrar Aluno'}
      </button>
    </form>
  )
}
```

## State Management Patterns

### Zustand Store for Educational State
Use Zustand for global state management:

```javascript
// ✅ Educational domain store
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const useEducationalStore = create(
  subscribeWithSelector((set, get) => ({
    // Current user and school context
    currentUser: null,
    currentSchool: null,
    userRole: null,

    // Active class session
    activeSession: null,
    selectedClass: null,

    // Students and attendance state
    students: [],
    attendanceRecords: [],

    // UI state
    isLoading: false,
    error: null,

    // Actions
    setCurrentUser: (user) => set({ currentUser: user }),

    setCurrentSchool: (school) => set({ currentSchool: school }),

    setUserRole: (role) => set({ userRole: role }),

    // Session management
    openAttendanceSession: async (sessionData) => {
      set({ isLoading: true })
      try {
        const session = await openAttendanceSessionAPI(sessionData)
        set({ activeSession: session, error: null })
      } catch (error) {
        set({ error: error.message })
        throw error
      } finally {
        set({ isLoading: false })
      }
    },

    closeAttendanceSession: async () => {
      const { activeSession } = get()
      if (!activeSession) return

      set({ isLoading: true })
      try {
        await closeAttendanceSessionAPI(activeSession.id)
        set({ activeSession: null, error: null })
      } catch (error) {
        set({ error: error.message })
        throw error
      } finally {
        set({ isLoading: false })
      }
    },

    // Student management
    addStudent: (student) => set((state) => ({
      students: [...state.students, student]
    })),

    updateStudent: (studentId, updates) => set((state) => ({
      students: state.students.map(student =>
        student.id === studentId ? { ...student, ...updates } : student
      )
    })),

    // Attendance marking
    markAttendance: async (studentId, presente) => {
      const { activeSession } = get()
      if (!activeSession) {
        throw new EducationalError('Nenhuma sessão ativa', 'NO_ACTIVE_SESSION')
      }

      try {
        const record = await markAttendanceAPI({
          session_id: activeSession.id,
          aluno_id: studentId,
          presente,
          data: new Date().toISOString().split('T')[0]
        })

        set((state) => ({
          attendanceRecords: [
            ...state.attendanceRecords.filter(r =>
              !(r.aluno_id === studentId && r.data === record.data)
            ),
            record
          ]
        }))
      } catch (error) {
        set({ error: error.message })
        throw error
      }
    },

    // Error handling
    clearError: () => set({ error: null }),

    // Reset store
    reset: () => set({
      activeSession: null,
      selectedClass: null,
      students: [],
      attendanceRecords: [],
      isLoading: false,
      error: null
    })
  }))
)

// ✅ Selector hooks for performance
export const useCurrentUser = () => useEducationalStore(state => state.currentUser)
export const useActiveSession = () => useEducationalStore(state => state.activeSession)
export const useStudents = () => useEducationalStore(state => state.students)
export const useAttendanceRecords = () => useEducationalStore(state => state.attendanceRecords)
```

### Local State Management
Use proper local state patterns:

```jsx
// ✅ Local state for UI components
import { useState, useCallback, useMemo } from 'react'

export function AttendanceGrid({ students, onAttendanceChange }) {
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState('nome')
  const [selectedStudents, setSelectedStudents] = useState(new Set())

  // Memoized filtered and sorted students
  const processedStudents = useMemo(() => {
    return students
      .filter(student =>
        student.nome.toLowerCase().includes(filter.toLowerCase()) ||
        student.cpf.includes(filter)
      )
      .sort((a, b) => {
        if (sortBy === 'nome') return a.nome.localeCompare(b.nome)
        if (sortBy === 'cpf') return a.cpf.localeCompare(b.cpf)
        return 0
      })
  }, [students, filter, sortBy])

  // Optimized selection handling
  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudents(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(studentId)) {
        newSelection.delete(studentId)
      } else {
        newSelection.add(studentId)
      }
      return newSelection
    })
  }, [])

  // Bulk attendance marking
  const markBulkAttendance = useCallback(async (presente) => {
    const promises = Array.from(selectedStudents).map(studentId =>
      onAttendanceChange(studentId, presente)
    )

    try {
      await Promise.all(promises)
      setSelectedStudents(new Set()) // Clear selection
    } catch (error) {
      console.error('Erro ao marcar presença em lote:', error)
    }
  }, [selectedStudents, onAttendanceChange])

  return (
    <div className="attendance-grid">
      {/* Filter and sort controls */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="flex-1 p-3 border rounded-lg"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-3 border rounded-lg"
        >
          <option value="nome">Ordenar por Nome</option>
          <option value="cpf">Ordenar por CPF</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedStudents.size > 0 && (
        <div className="flex gap-2 mb-4 p-4 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedStudents.size} aluno(s) selecionado(s)
          </span>
          <button
            onClick={() => markBulkAttendance(true)}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Marcar Presentes
          </button>
          <button
            onClick={() => markBulkAttendance(false)}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Marcar Ausentes
          </button>
        </div>
      )}

      {/* Student grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {processedStudents.map(student => (
          <StudentAttendanceCard
            key={student.id}
            student={student}
            isSelected={selectedStudents.has(student.id)}
            onSelect={() => toggleStudentSelection(student.id)}
            onAttendanceChange={onAttendanceChange}
          />
        ))}
      </div>
    </div>
  )
}
```

## Performance Optimization

### Memoization Patterns
Use React.memo and useMemo effectively:

```jsx
// ✅ Memoized student card component
import { memo } from 'react'

export const StudentAttendanceCard = memo(function StudentAttendanceCard({
  student,
  isSelected,
  onSelect,
  onAttendanceChange
}) {
  return (
    <div className={`student-card ${isSelected ? 'selected' : ''}`}>
      <div className="student-info">
        <h3>{student.nome}</h3>
        <p className="text-sm text-gray-600">{student.cpf}</p>
      </div>

      <div className="attendance-actions">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mr-2"
        />

        <StudentAttendanceMarker
          student={student}
          onAttendanceChange={onAttendanceChange}
        />
      </div>
    </div>
  )
})

// ✅ Memoized calculations
export function useAttendanceStatistics(students, attendanceRecords) {
  return useMemo(() => {
    const stats = students.map(student => {
      const records = attendanceRecords.filter(
        record => record.aluno_id === student.id
      )

      const totalClasses = records.length
      const presentCount = records.filter(record => record.presente).length
      const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0

      return {
        studentId: student.id,
        studentName: student.nome,
        totalClasses,
        presentCount,
        attendanceRate,
        status: attendanceRate >= 80 ? 'adequate' : attendanceRate >= 75 ? 'warning' : 'critical'
      }
    })

    const summary = {
      totalStudents: students.length,
      adequateAttendance: stats.filter(s => s.status === 'adequate').length,
      warningAttendance: stats.filter(s => s.status === 'warning').length,
      criticalAttendance: stats.filter(s => s.status === 'critical').length,
      averageAttendanceRate: stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length || 0
    }

    return { studentStats: stats, summary }
  }, [students, attendanceRecords])
}
```

## Error Handling and Logging

### Error Boundary and Logging
Implement proper error handling for educational workflows:

```jsx
// ✅ Educational error boundary
import { Component } from 'react'

export class EducationalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Educational system error:', error, errorInfo)

    // Log to audit trail for compliance
    this.logEducationalError(error, errorInfo)
  }

  logEducationalError = async (error, errorInfo) => {
    try {
      await fetch('/api/audit/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (logError) {
      console.error('Failed to log educational error:', logError)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Ops! Algo deu errado
          </h2>
          <p className="text-gray-600 mb-6">
            Ocorreu um erro inesperado no sistema educacional.
            Nossa equipe foi notificada e está trabalhando para resolver.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Recarregar Página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ✅ Error handling utilities
export const handleEducationalError = (error) => {
  if (error.code === 'RETROACTIVE_ATTENDANCE_FORBIDDEN') {
    return 'Não é possível modificar presença após confirmação (não existe o esquecer)'
  }

  if (error.code === 'UNAUTHORIZED_TEACHER') {
    return 'Apenas professores da turma podem marcar presença'
  }

  if (error.code === 'SESSION_NOT_OPEN') {
    return 'Sessão de aula não está aberta. Use "Abrir Aula" primeiro'
  }

  return error.message || 'Erro inesperado do sistema'
}
```

Remember: Always prioritize Brazilian educational compliance, performance for classroom environments, and clear Portuguese error messages in all JavaScript and React implementations.
